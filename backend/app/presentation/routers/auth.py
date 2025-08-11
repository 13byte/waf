from fastapi import APIRouter, Depends
from typing import List
from app.presentation import dependencies
from app.application.dtos.dtos import UserResponse, UserCreate, Token, UserLogin
from app.application.services.auth_service import AuthService
from app.domain.repositories.user_repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, auth_service: AuthService = Depends(dependencies.get_auth_service)):
    return auth_service.register_user(user)

@router.post("/login", response_model=Token)
def login_user(user_credentials: UserLogin, auth_service: AuthService = Depends(dependencies.get_auth_service)):
    return auth_service.login(user_credentials)

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: UserResponse = Depends(dependencies.get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(dependencies.get_current_admin_user),
    user_repo: UserRepository = Depends(dependencies.get_user_repository)
):
    return user_repo.get_all(skip, limit)
