from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
import shutil
import os
import uuid
from app.domain.repositories.post_repository import PostRepository, CategoryRepository
from app.domain.models.models import Post, User
from app.infrastructure.config import settings

class PostService:
    def __init__(self, post_repo: PostRepository, category_repo: CategoryRepository):
        self.post_repo = post_repo
        self.category_repo = category_repo

    def _save_upload_file(self, upload_file: UploadFile) -> str:
        os.makedirs(settings.upload_dir, exist_ok=True)
        ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(settings.upload_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return f"/uploads/{unique_filename}"

    def _remove_file(self, file_path: str):
        if not file_path or not file_path.startswith("/uploads/"):
            return
        filename = file_path.split("/")[-1]
        disk_path = os.path.join(settings.upload_dir, filename)
        if os.path.exists(disk_path):
            os.remove(disk_path)

    def get_post_by_id(self, post_id: int) -> Post:
        post = self.post_repo.get_by_id(post_id)
        if not post or not post.is_published:
            raise HTTPException(status_code=404, detail="Post not found")
        post.view_count += 1
        self.post_repo.update(post)
        return post

    def get_all_posts(self, skip: int, limit: int, category_id: Optional[int], search: Optional[str]) -> List[Post]:
        return self.post_repo.get_all(skip, limit, category_id, search)

    def create_post(self, title: str, content: str, category_id: int, current_user: User, image: Optional[UploadFile]) -> Post:
        if not self.category_repo.get_by_id(category_id):
            raise HTTPException(status_code=404, detail="Category not found")
        
        image_url = self._save_upload_file(image) if image else None
        
        post = Post(
            title=title,
            content=content,
            user_id=current_user.id,
            category_id=category_id,
            image_url=image_url
        )
        return self.post_repo.add(post)

    def update_post(self, post_id: int, title: str, content: str, category_id: int, current_user: User, image: Optional[UploadFile]) -> Post:
        post = self.post_repo.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        if post.user_id != current_user.id and current_user.role.value not in ["admin", "moderator"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        if not self.category_repo.get_by_id(category_id):
            raise HTTPException(status_code=404, detail="Category not found")

        post.title = title
        post.content = content
        post.category_id = category_id

        if image:
            if post.image_url:
                self._remove_file(post.image_url)
            post.image_url = self._save_upload_file(image)

        return self.post_repo.update(post)

    def delete_post(self, post_id: int, current_user: User):
        post = self.post_repo.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        if post.user_id != current_user.id and current_user.role.value not in ["admin", "moderator"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        
        if post.image_url:
            self._remove_file(post.image_url)
            
        self.post_repo.delete(post)
