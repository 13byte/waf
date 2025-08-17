"""
Google OAuth authentication router
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timedelta
from typing import Optional
import os

from app.infrastructure.database import get_db
from app.domain.models.models import User
from app.infrastructure.auth import create_access_token
from app.domain.models.enums import UserRole
from app.presentation.dependencies import get_current_user
from app.infrastructure.config import settings
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Google OAuth Client ID from environment
GOOGLE_CLIENT_ID = settings.google_client_id

class GoogleTokenRequest(BaseModel):
    token: str

class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(request: GoogleTokenRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth token
    """
    # Check if Google OAuth is configured
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID environment variable."
        )
    
    try:
        print(f"Received Google token: {request.token[:50]}...")  # Debug log
        
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10  # Allow some clock skew
        )
        
        print(f"Token verified. User info: {idinfo.get('email')}")  # Debug log

        # Get user info from token
        email = idinfo.get('email')
        name = idinfo.get('name')
        google_id = idinfo.get('sub')
        picture = idinfo.get('picture')
        email_verified = idinfo.get('email_verified', False)

        if not email or not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not verified or not provided"
            )

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create new user with Google OAuth
            username = email.split('@')[0]  # Use email prefix as username
            
            # Ensure unique username
            base_username = username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

            user = User(
                username=username,
                email=email,
                google_id=google_id,
                full_name=name,
                profile_picture=picture,
                is_oauth_user=True,
                is_active=True,
                role=UserRole.USER,
                created_at=datetime.utcnow()
            )
            # OAuth users don't have passwords
            user.set_password(None)
            
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user with Google info if needed
            if not user.google_id:
                user.google_id = google_id
                user.is_oauth_user = True
            if picture and not user.profile_picture:
                user.profile_picture = picture
            if name and not user.full_name:
                user.full_name = name
            
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)

        # Create access token
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id}
        )

        return GoogleAuthResponse(
            access_token=access_token,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "profile_picture": user.profile_picture,
                "role": user.role,
                "is_oauth_user": True
            }
        )

    except ValueError as e:
        # Invalid token
        print(f"Token validation error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

@router.get("/google/config")
async def get_google_config():
    """
    Get Google OAuth configuration
    """
    return {
        "client_id": GOOGLE_CLIENT_ID,
        "enabled": bool(GOOGLE_CLIENT_ID)  # Only enabled if client ID is set
    }