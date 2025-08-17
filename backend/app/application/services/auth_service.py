from fastapi import HTTPException, status
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.auth.auth import get_password_hash, verify_password, create_access_token
from app.domain.models.models import User
from app.application.dtos.dtos import UserCreate, UserLogin, Token

class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def register_user(self, user_create: UserCreate) -> User:
        if self.user_repository.get_by_email(user_create.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        if self.user_repository.get_by_username(user_create.username):
            raise HTTPException(status_code=400, detail="Username already taken")
        
        hashed_password = get_password_hash(user_create.password)
        user = User(
            username=user_create.username,
            email=user_create.email,
            password_hash=hashed_password,
            bio=user_create.bio
        )
        return self.user_repository.add(user)

    def login(self, user_login: UserLogin) -> Token:
        user = self.user_repository.get_by_username(user_login.username)
        if not user or not verify_password(user_login.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return Token(access_token=access_token, token_type="bearer")
