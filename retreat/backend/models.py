from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String
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


class Content(Base):
    """Eine Zeile (id=1): Agenda, Orte, Aktivitäten als validiertes JSON."""

    __tablename__ = "content"

    id = Column(Integer, primary_key=True)
    data = Column(JSON, nullable=False)
