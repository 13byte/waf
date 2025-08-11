from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import shutil
import os
import uuid

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models import User, Post, Category
from app.schemas import PostResponse, PostCreate, PostUpdate
from app.config import settings

router = APIRouter(prefix="/posts", tags=["Posts"])

UPLOAD_DIR = settings.upload_dir

def save_upload_file(upload_file: UploadFile) -> str:
    """Saves an uploaded file and returns its web-accessible path."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    ext = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
        
    return f"/uploads/{unique_filename}"

def remove_file(file_path: str):
    """Removes a file given its web-accessible path."""
    if not file_path or not file_path.startswith("/uploads/"):
        return
    
    filename = file_path.split("/")[-1]
    disk_path = os.path.join(UPLOAD_DIR, filename)
    
    if os.path.exists(disk_path):
        os.remove(disk_path)

@router.get("/", response_model=List[PostResponse])
def read_posts(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    query = db.query(Post).filter(Post.is_published == True)
    
    if category_id:
        query = query.filter(Post.category_id == category_id)
    
    if search:
        # Note: Using f-string for search is not safe against SQLi, but this is for a WAF test.
        # In a real app, use parameterized queries or safer search methods.
        query = query.filter(text(f"MATCH(title, content) AGAINST('{search}' IN NATURAL LANGUAGE MODE)"))
    
    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.get("/{post_id}", response_model=PostResponse)
def read_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post or not post.is_published:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.view_count += 1
    db.commit()
    
    return post

@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    title: str = Form(...),
    content: str = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    image_url = None
    if image:
        image_url = save_upload_file(image)

    db_post = Post(
        title=title,
        content=content,
        user_id=current_user.id,
        category_id=category_id,
        image_url=image_url
    )
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return db_post

@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    title: str = Form(...),
    content: str = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if db_post.user_id != current_user.id and current_user.role.value not in ["admin", "moderator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Update text fields
    db_post.title = title
    db_post.content = content
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_post.category_id = category_id

    # Handle image update
    if image:
        # Remove old image if it exists
        if db_post.image_url:
            remove_file(db_post.image_url)
        # Save new image
        db_post.image_url = save_upload_file(image)

    db.commit()
    db.refresh(db_post)
    
    return db_post

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if db_post.user_id != current_user.id and current_user.role.value not in ["admin", "moderator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Remove image file if it exists
    if db_post.image_url:
        remove_file(db_post.image_url)
        
    db.delete(db_post)
    db.commit()
    
    return None
