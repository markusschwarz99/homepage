from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from database import Base

# Bewusst ohne Alembic: kurzlebige App, Schema entsteht per create_all.
# Schema-Änderung nach Go-live: export -> Volume neu -> load (siehe scripts/).


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True)
    key = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    kind = Column(String(10), nullable=False, default="car")  # car | taxi
    seats = Column(Integer, nullable=False, default=5)
    sort = Column(Integer, nullable=False, default=0)


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(Integer, primary_key=True)
    key = Column(String(50), nullable=False, unique=True)
    number = Column(String(20))
    name = Column(String(100), nullable=False)
    rooms_label = Column(String(50))
    capacity = Column(Integer, nullable=False)
    sort = Column(Integer, nullable=False, default=0)


class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True)
    key = Column(String(50), nullable=False, unique=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(100))
    token = Column(String(64), nullable=False, unique=True)
    is_orga = Column(Boolean, nullable=False, default=False)
    car_id = Column(Integer, ForeignKey("cars.id"))
    car_role = Column(String(10))  # driver | co_driver | passenger
    apartment_id = Column(Integer, ForeignKey("apartments.id"))
    sort = Column(Integer, nullable=False, default=0)

    car = relationship("Car")
    apartment = relationship("Apartment")


event_participants = Table(
    "event_participants",
    Base.metadata,
    Column("event_id", ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("person_id", ForeignKey("people.id", ondelete="CASCADE"), primary_key=True),
)


class Event(Base):
    """Programmpunkt; Zeiten als lokale Zeit Teneriffa ("2026-10-19T07:00").

    Aktivitäten sind Termine mit category="activity" und nutzen zusätzlich
    maps_url, url, Koordination und Teilnehmende."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    start = Column(String(16), nullable=False)
    end = Column(String(16), nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(10), nullable=False)  # meal | work | activity | travel
    place = Column(String(50))  # Place-ID aus dem Content
    note = Column(String(500))
    maps_url = Column(String(1000))
    url = Column(String(1000))
    coordinator_id = Column(Integer, ForeignKey("people.id"))

    coordinator = relationship("Person")
    participants = relationship("Person", secondary=event_participants, order_by="Person.sort")


class Content(Base):
    """Eine Zeile (id=1): Eckdaten und Orte als validiertes JSON.

    Die Agenda (inkl. Aktivitäten) liegt in der Tabelle `events` (Orga editierbar)."""

    __tablename__ = "content"

    id = Column(Integer, primary_key=True)
    data = Column(JSON, nullable=False)
