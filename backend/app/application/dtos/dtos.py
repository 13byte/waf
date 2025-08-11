from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.domain.models.enums import UserRole

class UserBase(BaseModel):
    username: str
    email: EmailStr
    bio: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    profile_image: Optional[str] = None
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    title: str
    content: str
    category_id: int
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None

class PostResponse(PostBase):
    id: int
    user_id: int
    view_count: int
    like_count: int
    created_at: datetime
    updated_at: datetime
    is_published: bool
    author: UserResponse
    category: CategoryResponse
    
    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str
    parent_id: Optional[int] = None

class CommentCreate(CommentBase):
    post_id: int

class CommentResponse(CommentBase):
    id: int
    post_id: int
    user_id: int
    like_count: int
    created_at: datetime
    author: UserResponse
    
    class Config:
        from_attributes = True

class FileResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    filepath: str
    filesize: int
    mimetype: str
    upload_time: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None