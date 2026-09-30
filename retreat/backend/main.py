from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

import models
from auth import require_orga, require_person
from database import Base, engine, get_db
from schemas import (
    ContentOut,
    EventIn,
    EventOut,
    EventUpdate,
    PersonOut,
    PersonUpdate,
    StateOut,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# Nur über den nginx-Proxy unter /api erreichbar -> keine Docs, kein CORS.
app = FastAPI(
    title="Teamretreat",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _validation_detail(errors: list[dict]) -> str:
    err = errors[0]
    field = (err.get("loc") or ("",))[-1]
    if err.get("type") == "string_pattern_mismatch" and field in ("maps_url", "url"):
        return "Links müssen mit http:// oder https:// beginnen."
    msg = str(err.get("msg", "Ungültige Eingabe")).removeprefix("Value error, ")
    return f"{field}: {msg}" if isinstance(field, str) and field not in ("body", "") else msg


# Validierungsfehler als ein lesbarer String (wie alle anderen Fehler im Frontend)
@app.exception_handler(RequestValidationError)
async def validation_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": _validation_detail(exc.errors())})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/state", response_model=StateOut)
def get_state(
    me: models.Person = Depends(require_person),
    db: Session = Depends(get_db),
):
    content = db.get(models.Content, 1)
    if content is None:
        raise HTTPException(status_code=503, detail="Noch keine Daten geladen.")
    return StateOut(
        me=PersonOut.model_validate(me),
        people=db.query(models.Person)
        .order_by(models.Person.sort, models.Person.id)
        .all(),
        cars=db.query(models.Car).order_by(models.Car.sort, models.Car.id).all(),
        apartments=db.query(models.Apartment)
        .order_by(models.Apartment.sort, models.Apartment.id)
        .all(),
        content=ContentOut.model_validate({**content.data, "events": _events(db)}),
    )


def _events(db: Session) -> list[EventOut]:
    rows = db.query(models.Event).order_by(models.Event.start, models.Event.end, models.Event.id)
    return [_event_out(e) for e in rows]


def _event_out(e: models.Event) -> EventOut:
    return EventOut(
        id=e.id,
        start=e.start,
        end=e.end,
        title=e.title,
        category=e.category,
        place=e.place,
        note=e.note,
        maps_url=e.maps_url,
        url=e.url,
        coordinator_id=e.coordinator_id,
        participant_ids=[p.id for p in e.participants],
    )


def _apply_event(db: Session, event: models.Event, data: EventIn) -> None:
    _check_place(db, data.place)
    ids = set(data.participant_ids)
    if data.coordinator_id is not None:
        ids.add(data.coordinator_id)
    people = db.query(models.Person).filter(models.Person.id.in_(ids)).all() if ids else []
    if len(people) != len(ids):
        raise HTTPException(status_code=422, detail="Unbekannte Person.")
    fields = ("start", "end", "title", "category", "place", "note", "maps_url", "url", "coordinator_id")
    for field in fields:
        setattr(event, field, getattr(data, field))
    wanted = set(data.participant_ids)
    event.participants = [p for p in people if p.id in wanted]


def _check_place(db: Session, place: str | None) -> None:
    if place is None:
        return
    content = db.get(models.Content, 1)
    ids = {p["id"] for p in (content.data.get("places", []) if content else [])}
    if place not in ids:
        raise HTTPException(status_code=422, detail="Unbekannter Ort.")


@app.post("/api/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    body: EventIn,
    _orga: models.Person = Depends(require_orga),
    db: Session = Depends(get_db),
):
    event = models.Event()
    _apply_event(db, event, body)
    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@app.patch("/api/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    body: EventUpdate,
    _orga: models.Person = Depends(require_orga),
    db: Session = Depends(get_db),
):
    event = db.get(models.Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden.")
    values = _event_out(event).model_dump(exclude={"id"})
    values.update(body.model_dump(exclude_unset=True))
    try:
        merged = EventIn.model_validate(values)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=_validation_detail(e.errors())) from None
    _apply_event(db, event, merged)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@app.delete("/api/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    _orga: models.Person = Depends(require_orga),
    db: Session = Depends(get_db),
):
    event = db.get(models.Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden.")
    db.delete(event)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _name(p: models.Person) -> str:
    return f"{p.display_name or p.first_name} {p.last_name}"


@app.patch("/api/people/{person_id}", response_model=PersonOut)
def update_person(
    person_id: int,
    body: PersonUpdate,
    _orga: models.Person = Depends(require_orga),
    db: Session = Depends(get_db),
):
    person = db.get(models.Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person nicht gefunden.")

    fields = body.model_fields_set
    car_id = body.car_id if "car_id" in fields else person.car_id
    if "car_role" in fields:
        role = body.car_role
    else:
        # Autowechsel ohne Rollenangabe -> Mitfahrer:in im neuen Auto
        role = person.car_role if car_id == person.car_id else None
    apartment_id = body.apartment_id if "apartment_id" in fields else person.apartment_id

    if not fields & {"car_id", "car_role"}:
        pass  # Auto unverändert -> nicht neu validieren (z.B. reiner Orga-Wechsel)
    elif car_id is None:
        role = None
    else:
        car = db.get(models.Car, car_id)
        if car is None:
            raise HTTPException(status_code=404, detail="Auto nicht gefunden.")
        role = role or "passenger"
        others = (
            db.query(models.Person)
            .filter(models.Person.car_id == car.id, models.Person.id != person.id)
            .all()
        )
        if car.kind == "taxi":
            if role != "passenger":
                raise _conflict("Beim Taxi gibt es nur Mitfahrende.")
        else:
            for r, label in (("driver", "Fahrer:in"), ("co_driver", "Zweitfahrer:in")):
                taken = next((o for o in others if o.car_role == r), None)
                if role == r and taken:
                    raise _conflict(f"{car.name} hat schon eine {label}: {_name(taken)}.")
            if len(others) + 1 > car.seats:
                raise _conflict(f"{car.name} ist voll ({car.seats} Plätze).")

    if apartment_id is not None and apartment_id != person.apartment_id:
        apartment = db.get(models.Apartment, apartment_id)
        if apartment is None:
            raise HTTPException(status_code=404, detail="Apartment nicht gefunden.")
        taken = (
            db.query(models.Person)
            .filter(models.Person.apartment_id == apartment.id)
            .count()
        )
        if taken + 1 > apartment.capacity:
            raise _conflict(
                f"Apartment {apartment.name} ist voll ({apartment.capacity} Plätze)."
            )

    if "is_orga" in fields and body.is_orga is not None and body.is_orga != person.is_orga:
        if not body.is_orga:
            others = (
                db.query(models.Person)
                .filter(models.Person.is_orga.is_(True), models.Person.id != person.id)
                .count()
            )
            if others == 0:
                raise _conflict("Mindestens eine Person muss in der Orga bleiben.")
        person.is_orga = body.is_orga

    person.car_id = car_id
    person.car_role = role
    person.apartment_id = apartment_id
    db.commit()
    db.refresh(person)
    return person

