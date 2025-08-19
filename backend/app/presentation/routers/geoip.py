# GeoIP database management endpoints
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from datetime import datetime
import os
from ...infrastructure.timezone import get_kst_now
import shutil
from typing import Optional

from ...infrastructure.database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/geoip", tags=["GeoIP"])

# GeoIP database storage path
GEOIP_DB_PATH = "/app/data/geoip"
GEOIP_CONFIG_FILE = "/app/data/geoip/config.txt"

# Ensure directory exists
os.makedirs(GEOIP_DB_PATH, exist_ok=True)

@router.get("/status")
async def get_geoip_status(current_user = Depends(get_current_user)):
    """Get current GeoIP database status"""
    try:
        # Check if config file exists
        if os.path.exists(GEOIP_CONFIG_FILE):
            with open(GEOIP_CONFIG_FILE, 'r') as f:
                config_data = f.read().strip().split('\n')
                if len(config_data) >= 2:
                    filename = config_data[0]
                    last_updated = config_data[1]
                    
                    # Check if the database file actually exists
                    db_file_path = os.path.join(GEOIP_DB_PATH, filename)
                    if os.path.exists(db_file_path):
                        return {
                            "uploaded": True,
                            "filename": filename,
                            "last_updated": last_updated,
                            "file_size": os.path.getsize(db_file_path)
                        }
        
        return {
            "uploaded": False,
            "filename": None,
            "last_updated": None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get GeoIP status: {str(e)}"
        )

@router.post("/upload")
async def upload_geoip_database(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload GeoIP database file"""
    
    # Validate file extension
    valid_extensions = ['.mmdb', '.dat']
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    
    if file_extension not in valid_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Supported formats: {', '.join(valid_extensions)}"
        )
    
    # Validate file size (max 500MB)
    max_size = 500 * 1024 * 1024  # 500MB
    file_size = 0
    
    try:
        # Save the uploaded file
        file_path = os.path.join(GEOIP_DB_PATH, file.filename)
        
        with open(file_path, "wb") as buffer:
            while content := await file.read(8192):  # Read in 8KB chunks
                file_size += len(content)
                if file_size > max_size:
                    # Clean up partial file
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File size exceeds 500MB limit"
                    )
                buffer.write(content)
        
        # Update config file
        config_data = f"{file.filename}\n{get_kst_now().isoformat()}"
        with open(GEOIP_CONFIG_FILE, 'w') as f:
            f.write(config_data)
        
        # Reload the GeoIP service to use the new database
        from ...services.geoip_service import geoip_service
        geoip_service.reload_database()
        
        return {
            "message": "GeoIP database uploaded successfully",
            "filename": file.filename,
            "file_size": file_size,
            "uploaded_at": get_kst_now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if something went wrong
        file_path = os.path.join(GEOIP_DB_PATH, file.filename) if file.filename else ""
        if os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload GeoIP database: {str(e)}"
        )

@router.delete("/database")
async def delete_geoip_database(current_user = Depends(get_current_user)):
    """Delete current GeoIP database"""
    try:
        # Read current config
        if os.path.exists(GEOIP_CONFIG_FILE):
            with open(GEOIP_CONFIG_FILE, 'r') as f:
                config_data = f.read().strip().split('\n')
                if len(config_data) >= 1:
                    filename = config_data[0]
                    file_path = os.path.join(GEOIP_DB_PATH, filename)
                    
                    # Remove database file
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    
                    # Remove config file
                    os.remove(GEOIP_CONFIG_FILE)
                    
                    return {"message": "GeoIP database deleted successfully"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No GeoIP database found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete GeoIP database: {str(e)}"
        )