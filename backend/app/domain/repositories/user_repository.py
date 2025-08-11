from abc import ABC, abstractmethod
from typing import Optional
from app.domain.models.models import User

class UserRepository(ABC):
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        raise NotImplementedError

    @abstractmethod
    def get_all(self, skip: int, limit: int) -> list[User]:
        raise NotImplementedError

    @abstractmethod
    def add(self, user: User) -> User:
        raise NotImplementedError
