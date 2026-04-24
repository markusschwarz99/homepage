from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from auth import require_member, require_admin
import models
from pydantic import BaseModel
import os
from upload_utils import save_image

router = APIRouter(prefix="/blog", tags=["blog"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PostCreate(BaseModel):
    title: str
    content: str

class PostUpdate(BaseModel):
    title: str
    content: str

@router.get("/posts")
def list_posts(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin)
):
    posts = db.query(models.BlogPost).order_by(models.BlogPost.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "author_name": p.author.name,
            "created_at": p.created_at.isoformat() + "Z"
        }
        for p in posts
    ]

@router.get("/posts/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin)
):
    post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "author_name": post.author.name,
        "created_at": post.created_at.isoformat() + "Z"
    }

@router.post("/posts")
def create_post(
    post: PostCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin)
):
    new_post = models.BlogPost(
        title=post.title,
        content=post.content,
        author_id=user.id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return {"id": new_post.id, "message": "Post erstellt"}

@router.patch("/posts/{post_id}")
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin)
):
    post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    post.title = data.title
    post.content = data.content
    db.commit()
    return {"message": "Post aktualisiert"}

@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin)
):
    post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    db.delete(post)
    db.commit()
    return {"message": "Post gelöscht"}

@router.post("/upload-image")
def upload_image(
    file: UploadFile = File(...),
    user: models.User = Depends(require_admin)
):
    filename = save_image(file, UPLOAD_DIR, prefix="blog_")
    return {"url": f"https://api.markus-schwarz.cc/uploads/{filename}"}
