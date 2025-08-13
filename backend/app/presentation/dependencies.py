from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.infrastructure.auth.auth import verify_token
from app.domain.models.models import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.domain.repositories.post_repository import PostRepository, CategoryRepository
from app.infrastructure.repositories.sqlalchemy_post_repository import SQLAlchemyPostRepository, SQLAlchemyCategoryRepository
from app.application.services.auth_service import AuthService
from app.application.services.post_service import PostService

security = HTTPBearer()

def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return SQLAlchemyUserRepository(db)

def get_post_repository(db: Session = Depends(get_db)) -> PostRepository:
    return SQLAlchemyPostRepository(db)

def get_category_repository(db: Session = Depends(get_db)) -> CategoryRepository:
    return SQLAlchemyCategoryRepository(db)

def get_auth_service(user_repo: UserRepository = Depends(get_user_repository)) -> AuthService:
    return AuthService(user_repo)

def get_post_service(
    post_repo: PostRepository = Depends(get_post_repository),
    category_repo: CategoryRepository = Depends(get_category_repository)
) -> PostService:
    return PostService(post_repo, category_repo)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
) -> User:
    token = credentials.credentials
    username = verify_token(token)
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = user_repo.get_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
) -> User | None:
    try:
        return get_current_user(credentials, user_repo)
    except HTTPException:
        return None
