from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

import models
from auth import require_orga, require_person
from database import Base, engine, get_db
from schemas import Content, PersonOut, PersonUpdate, StateOut


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
        content=Content.model_validate(content.data),
    )


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
