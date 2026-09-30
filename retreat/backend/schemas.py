from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Lokale Zeit Teneriffa (Atlantic/Canary), ohne Offset: "2026-10-19T07:00"
LocalDateTime = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")]
LocalDate = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
# Nur http(s) – verhindert javascript:-Links in href
Url = Annotated[str, Field(pattern=r"^https?://\S+$", max_length=1000)]

CarKind = Literal["car", "taxi"]
CarRole = Literal["driver", "co_driver", "passenger"]
Category = Literal["meal", "work", "activity", "travel"]


# --- Content (read-only, kommt aus dem Seed) ---


class Place(BaseModel):
    id: str
    name: str
    address: str | None = None
    phone: str | None = None
    distance: str | None = None
    url: str | None = None


class EventBase(BaseModel):
    start: LocalDateTime
    end: LocalDateTime
    title: str = Field(min_length=1, max_length=200)
    category: Category
    place: str | None = None
    note: str | None = Field(default=None, max_length=500)
    # Optionale Zusatzangaben (jede Kategorie; UI zeigt nur Befülltes)
    maps_url: Url | None = None
    url: Url | None = None

    @model_validator(mode="after")
    def _end_after_start(self):
        if self.end <= self.start:
            raise ValueError(f"Event '{self.title}': end muss nach start liegen")
        return self


class SeedEvent(EventBase):
    coordinator: str | None = None  # Person-Key
    participants: list[str] | Literal["alle"] = []  # Person-Keys


class EventIn(EventBase):
    coordinator_id: int | None = None
    participant_ids: list[int] = []


class EventOut(EventIn):
    id: int


class EventUpdate(BaseModel):
    """Teil-Update; wird mit dem bestehenden Termin zu EventIn gemerged."""

    start: str | None = None
    end: str | None = None
    title: str | None = None
    category: Category | None = None
    place: str | None = None
    note: str | None = None
    maps_url: str | None = None
    url: str | None = None
    coordinator_id: int | None = None
    participant_ids: list[int] | None = None


class Info(BaseModel):
    title: str
    location: str
    accommodation: str | None = None  # Place-ID der Unterkunft
    core_hours: str | None = None
    note: str | None = None


class Content(BaseModel):
    info: Info
    places: list[Place] = []
    events: list[SeedEvent] = []

    @model_validator(mode="after")
    def _place_refs_exist(self):
        ids = {p.id for p in self.places}
        refs = [e.place for e in self.events]
        refs.append(self.info.accommodation)
        missing = sorted({r for r in refs if r and r not in ids})
        if missing:
            raise ValueError(f"Unbekannte Place-IDs: {', '.join(missing)}")
        return self


# --- Seed (Import/Export) ---


class SeedCar(BaseModel):
    key: str
    name: str
    kind: CarKind = "car"
    seats: int = 5


class SeedApartment(BaseModel):
    key: str
    number: str | None = None
    name: str
    rooms_label: str | None = None
    capacity: int


class SeedPerson(BaseModel):
    key: str
    first_name: str
    last_name: str
    display_name: str | None = None
    is_orga: bool = False
    car: str | None = None  # Car-Key
    car_role: CarRole | None = None
    apartment: str | None = None  # Apartment-Key
    token: str | None = None  # nur beim Restore aus einem Export


class Seed(BaseModel):
    cars: list[SeedCar]
    apartments: list[SeedApartment]
    people: list[SeedPerson]
    content: Content

    @model_validator(mode="after")
    def _refs_exist(self):
        cars = {c.key for c in self.cars}
        apartments = {a.key for a in self.apartments}
        for p in self.people:
            if p.car and p.car not in cars:
                raise ValueError(f"{p.key}: unbekanntes Auto '{p.car}'")
            if p.apartment and p.apartment not in apartments:
                raise ValueError(f"{p.key}: unbekanntes Apartment '{p.apartment}'")
        people = {p.key for p in self.people}
        for e in self.content.events:
            keys = [] if e.participants == "alle" else list(e.participants)
            unknown = [k for k in [e.coordinator, *keys] if k and k not in people]
            if unknown:
                raise ValueError(f"Termin '{e.title}': unbekannte Personen {unknown}")
        return self


# --- API ---


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    display_name: str | None
    is_orga: bool
    car_id: int | None
    car_role: CarRole | None
    apartment_id: int | None


class CarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    kind: CarKind
    seats: int


class ApartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str | None
    name: str
    rooms_label: str | None
    capacity: int


class ContentOut(Content):
    events: list[EventOut] = []


class StateOut(BaseModel):
    me: PersonOut
    people: list[PersonOut]
    cars: list[CarOut]
    apartments: list[ApartmentOut]
    content: ContentOut


class PersonUpdate(BaseModel):
    """Nur gesetzte Felder werden übernommen; null = nicht zugeteilt."""

    car_id: int | None = None
    car_role: CarRole | None = None
    apartment_id: int | None = None
    is_orga: bool | None = None  # Orga-Rechte vergeben/entziehen
