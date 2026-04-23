from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import require_household
import models
from pydantic import BaseModel

router = APIRouter(prefix="/shopping", tags=["shopping"])

class ItemCreate(BaseModel):
    name: str
    quantity: str = "1"

@router.get("/items")
def list_items(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_household)
):
    items = db.query(models.ShoppingItem).order_by(models.ShoppingItem.added_at.desc()).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "quantity": i.quantity,
            "added_by": i.added_by.name,
            "added_at": i.added_at.isoformat() + "Z"
        }
        for i in items
    ]

@router.post("/items")
def add_item(
    item: ItemCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_household)
):
    new_item = models.ShoppingItem(
        name=item.name.strip(),
        quantity=item.quantity.strip() or "1",
        added_by_id=user.id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"id": new_item.id, "message": "Artikel hinzugefügt"}

@router.post("/items/{item_id}/purchase")
def mark_purchased(
    item_id: int,
    purchased: bool = True,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_household)
):
    item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    history = models.PurchaseHistory(
        item_name=item.name,
        quantity=item.quantity,
        purchased=purchased,
        user_id=user.id
    )
    db.add(history)
    db.delete(item)
    db.commit()
    return {"message": "Artikel verarbeitet"}

@router.get("/frequent")
def frequent_items(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_household)
):
    current_names = {i.name.lower() for i in db.query(models.ShoppingItem).all()}
    results = db.query(
        models.PurchaseHistory.item_name,
        func.count(models.PurchaseHistory.id).label('count')
    ).filter(
        models.PurchaseHistory.purchased == True
    ).group_by(
        models.PurchaseHistory.item_name
    ).order_by(
        func.count(models.PurchaseHistory.id).desc()
    ).limit(20).all()

    items = []
    for r in results:
        if r.item_name.lower() in current_names:
            continue
        last = db.query(models.PurchaseHistory).filter(
            models.PurchaseHistory.item_name == r.item_name
        ).order_by(models.PurchaseHistory.purchased_at.desc()).first()
        items.append({
            "name": r.item_name,
            "count": r.count,
            "last_quantity": last.quantity if last else "1"
        })
    return items[:8]

@router.get("/history")
def purchase_history(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_household)
):
    history = db.query(models.PurchaseHistory).filter(
        models.PurchaseHistory.purchased == True
    ).order_by(
        models.PurchaseHistory.purchased_at.desc()
    ).limit(50).all()
    return [
        {
            "id": h.id,
            "item_name": h.item_name,
            "quantity": h.quantity,
            "purchased": h.purchased,
            "user_name": db.query(models.User).filter(models.User.id == h.user_id).first().name,
            "purchased_at": h.purchased_at.isoformat() + "Z"
        }
        for h in history
    ]
