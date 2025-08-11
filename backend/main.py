from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.infrastructure.config import settings
from app.presentation.routers import auth, posts, vulnerable, monitoring
import os

app = FastAPI(
    title="WAF Test API",
    description="API for ModSecurity WAF Testing",
    version=settings.api_version,
    debug=settings.debug
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

# API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(vulnerable.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "WAF Test API", "version": settings.api_version}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
