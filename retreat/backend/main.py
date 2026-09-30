from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

import models
from auth import require_orga, require_person
from database import Base, engine, get_db
from schemas import ContentOut, Event, EventOut, EventUpdate, PersonOut, PersonUpdate, StateOut


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
    return [EventOut.model_validate(e) for e in rows]


def _check_place(db: Session, place: str | None) -> None:
    if place is None:
        return
    content = db.get(models.Content, 1)
    ids = {p["id"] for p in (content.data.get("places", []) if content else [])}
    if place not in ids:
        raise HTTPException(status_code=422, detail="Unbekannter Ort.")


@app.post("/api/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    body: Event,
    _orga: models.Person = Depends(require_orga),
    db: Session = Depends(get_db),
):
    _check_place(db, body.place)
    event = models.Event(**body.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


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
    values = Event.model_validate(event, from_attributes=True).model_dump()
    values.update(body.model_dump(exclude_unset=True))
    try:
        merged = Event.model_validate(values)
    except ValidationError as e:
        msg = e.errors()[0]["msg"].removeprefix("Value error, ")
        raise HTTPException(status_code=422, detail=msg) from None
    _check_place(db, merged.place)
    for key, value in merged.model_dump().items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


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

    if car_id is None:
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

    person.car_id = car_id
    person.car_role = role
    person.apartment_id = apartment_id
    db.commit()
    db.refresh(person)
    return person
