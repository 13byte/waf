from abc import ABC, abstractmethod
from typing import Optional, List
from app.domain.models.models import Post, Category

class PostRepository(ABC):
    @abstractmethod
    def get_by_id(self, post_id: int) -> Optional[Post]:
        raise NotImplementedError

    @abstractmethod
    def get_all(self, skip: int, limit: int, category_id: Optional[int], search: Optional[str]) -> List[Post]:
        raise NotImplementedError

    @abstractmethod
    def add(self, post: Post) -> Post:
        raise NotImplementedError

    @abstractmethod
    def update(self, post: Post) -> Post:
        raise NotImplementedError

    @abstractmethod
    def delete(self, post: Post):
        raise NotImplementedError

class CategoryRepository(ABC):
    @abstractmethod
    def get_by_id(self, category_id: int) -> Optional[Category]:
        raise NotImplementedError
