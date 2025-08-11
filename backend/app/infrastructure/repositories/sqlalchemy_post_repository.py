from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.domain.models.models import Post, Category
from app.domain.repositories.post_repository import PostRepository, CategoryRepository

class SQLAlchemyPostRepository(PostRepository):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_by_id(self, post_id: int) -> Optional[Post]:
        return self.db_session.query(Post).filter(Post.id == post_id).first()

    def get_all(self, skip: int, limit: int, category_id: Optional[int], search: Optional[str]) -> List[Post]:
        query = self.db_session.query(Post).filter(Post.is_published == True)
        if category_id:
            query = query.filter(Post.category_id == category_id)
        if search:
            query = query.filter(text(f"MATCH(title, content) AGAINST('{search}' IN NATURAL LANGUAGE MODE)"))
        return query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()

    def add(self, post: Post) -> Post:
        self.db_session.add(post)
        self.db_session.commit()
        self.db_session.refresh(post)
        return post

    def update(self, post: Post) -> Post:
        self.db_session.commit()
        self.db_session.refresh(post)
        return post

    def delete(self, post: Post):
        self.db_session.delete(post)
        self.db_session.commit()

class SQLAlchemyCategoryRepository(CategoryRepository):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_by_id(self, category_id: int) -> Optional[Category]:
        return self.db_session.query(Category).filter(Category.id == category_id).first()
