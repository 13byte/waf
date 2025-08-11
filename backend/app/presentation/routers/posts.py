from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from typing import List, Optional
from app.presentation import dependencies
from app.domain.models.models import User
from app.application.dtos.dtos import PostResponse
from app.application.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.get("/", response_model=List[PostResponse])
def read_posts(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    post_service: PostService = Depends(dependencies.get_post_service)
):
    return post_service.get_all_posts(skip, limit, category_id, search)

@router.get("/{post_id}", response_model=PostResponse)
def read_post(post_id: int, post_service: PostService = Depends(dependencies.get_post_service)):
    return post_service.get_post_by_id(post_id)

@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    title: str = Form(...),
    content: str = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(dependencies.get_current_user),
    post_service: PostService = Depends(dependencies.get_post_service)
):
    return post_service.create_post(title, content, category_id, current_user, image)

@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    title: str = Form(...),
    content: str = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(dependencies.get_current_user),
    post_service: PostService = Depends(dependencies.get_post_service)
):
    return post_service.update_post(post_id, title, content, category_id, current_user, image)

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(dependencies.get_current_user),
    post_service: PostService = Depends(dependencies.get_post_service)
):
    post_service.delete_post(post_id, current_user)
    return None