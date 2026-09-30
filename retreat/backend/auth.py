from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Person

# Zugriff über persönliche Links (?k=<token>). Das Frontend schickt den Token
# als Bearer-Header; Tokens sind 32 Byte Zufall -> kein Rate-Limit nötig.


def require_person(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Person:
    token = (authorization or "").removeprefix("Bearer ").strip()
    person = db.query(Person).filter(Person.token == token).first() if token else None
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bitte deinen persönlichen Link verwenden.",
        )
    return person


def require_orga(person: Person = Depends(require_person)) -> Person:
    if not person.is_orga:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur die Orga darf die Zuteilung ändern.",
        )
    return person
