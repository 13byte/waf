# WAF SOC Backend API
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.infrastructure.config import settings
from app.presentation.routers import (
    auth, 
    vulnerable, 
    monitoring,
    dashboard,
    waf_config,
    websocket,
    stats,
    geoip,
    analytics,
    google_auth,
    rules,
    crs_rules
)
import os
import asyncio
from app.infrastructure.cache import cache_cleanup_task

app = FastAPI(
    title="WAF Security Operations Center API",
    description="API for WAF monitoring and security event analysis",
    version=settings.api_version,
    debug=settings.debug,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Error Page Middleware
@app.middleware("http")
async def error_page_middleware(request: Request, call_next):
    # This middleware is kept for handling custom error pages via Nginx
    original_uri = request.headers.get("x-original-uri")
    if original_uri:
        if original_uri == "/error/403":
            return JSONResponse(status_code=403, content={"error": "Forbidden", "message": "WAF blocked this request"})
        elif original_uri == "/error/404":
            return JSONResponse(status_code=404, content={"error": "Not Found"})
        elif original_uri == "/error/500":
            return JSONResponse(status_code=500, content={"error": "Internal Server Error"})
    
    response = await call_next(request)
    return response

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# API Routers - all routers define their own prefixes internally
app.include_router(auth.router, prefix="/api")  # /api/auth
app.include_router(google_auth.router, prefix="/api")  # /api/auth/google
app.include_router(vulnerable.router, prefix="/api")  # /api/vulnerable
app.include_router(monitoring.router)  # /api/security-events
app.include_router(dashboard.router)   # /api/dashboard
app.include_router(waf_config.router)  # /api/waf/config
app.include_router(websocket.router, prefix="/api")  # /api/ws
app.include_router(stats.router)  # /api/monitoring
app.include_router(geoip.router)  # /api/geoip
app.include_router(analytics.router)  # /api/analytics
app.include_router(rules.router)  # /api/rules
app.include_router(crs_rules.router)  # /api/crs-rules


@app.get("/")
def read_root():
    return {
        "message": "WAF Security Operations Center API",
        "version": settings.api_version,
        "endpoints": {
            "docs": "/api/docs",
            "health": "/health",
            "auth": "/api/auth",
            "dashboard": "/api/dashboard",
            "security_events": "/api/security-events",
            "waf_config": "/api/waf/config",
            "attack_lab": "/api/vulnerable"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with database connectivity test"""
    from app.infrastructure.database import SessionLocal
    try:
        # Test database connection
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "cache": "active",
        "version": settings.api_version
    }

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    # Start cache cleanup task
    asyncio.create_task(cache_cleanup_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=settings.backend_host, 
        port=settings.backend_port,
        log_level=settings.log_level.lower(),
        access_log=True
    )
