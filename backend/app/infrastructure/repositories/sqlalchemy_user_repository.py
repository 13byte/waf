from typing import Optional
from sqlalchemy.orm import Session
from app.domain.models.models import User
from app.domain.repositories.user_repository import UserRepository

class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_by_username(self, username: str) -> Optional[User]:
        return self.db_session.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db_session.query(User).filter(User.email == email).first()

    def get_all(self, skip: int, limit: int) -> list[User]:
        return self.db_session.query(User).offset(skip).limit(limit).all()

    def add(self, user: User) -> User:
        self.db_session.add(user)
        self.db_session.commit()
        self.db_session.refresh(user)
        return user
