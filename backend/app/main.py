from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import time
from loguru import logger
import sys

from app.config import settings
from app.api.v1 import health, uploads, extract, patients, diagnosis, kg
from app.core.faiss_client import faiss_client
from app.core.kg_client import kg_client
from app.utils.prometheus_metrics import metrics
from app.utils.io_helpers import AuthHelper

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO" if not settings.debug else "DEBUG"
)

# Create FastAPI app
app = FastAPI(
    title="MedRAG Diagnostic API",
    description="AI-powered medical diagnostic pipeline using RAG (Retrieval-Augmented Generation)",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None
)

# Security
security = HTTPBearer(auto_error=False)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with actual allowed hosts in production
    )

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Add timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        # Record metrics
        metrics.record_request(
            method=request.method,
            endpoint=request.url.path,
            status_code=str(response.status_code),
            duration=process_time
        )
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        
        # Record error metrics
        metrics.record_request(
            method=request.method,
            endpoint=request.url.path,
            status_code="500",
            duration=process_time
        )
        
        logger.error(f"Request failed: {request.method} {request.url.path} - {str(e)}")
        raise

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    if not credentials:
        return None  # Allow anonymous access for some endpoints
    
    try:
        username = AuthHelper.verify_token(credentials.credentials)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return username
    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Optional authentication dependency
async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional authentication - returns None if no valid token"""
    if not credentials:
        return None
    
    try:
        return AuthHelper.verify_token(credentials.credentials)
    except Exception:
        return None

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting MedRAG API server...")
    
    try:
        # Initialize FAISS client
        await faiss_client.initialize()
        logger.info("FAISS client initialized")
        
        # Initialize Knowledge Graph client
        await kg_client.initialize()
        logger.info("Knowledge Graph client initialized")
        
        logger.info("MedRAG API server started successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down MedRAG API server...")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error" if settings.environment == "production" else str(exc),
            "status_code": 500,
            "path": request.url.path
        }
    )

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(uploads.router, prefix="/api/v1", tags=["File Upload"])
app.include_router(extract.router, prefix="/api/v1", tags=["Extraction"])
app.include_router(patients.router, prefix="/api/v1", tags=["Patients"])
app.include_router(diagnosis.router, prefix="/api/v1", tags=["Diagnosis"])
app.include_router(kg.router, prefix="/api/v1", tags=["Knowledge Graph"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MedRAG Diagnostic API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled",
        "health": "/api/v1/health"
    }

# Simple auth endpoints for demo
@app.post("/auth/login")
async def login(credentials: dict):
    """Simple login endpoint for demo"""
    username = credentials.get("username")
    password = credentials.get("password")
    
    # Simple demo authentication (use proper auth in production)
    if username == "demo" and password == "demo123":
        from datetime import timedelta
        token = AuthHelper.create_access_token(
            username=username,
            expires_delta=timedelta(hours=settings.jwt_expiration_hours)
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.jwt_expiration_hours * 3600
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/auth/me")
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    """Get current user information"""
    return {
        "username": current_user,
        "authenticated": True
    }

# Rate limiting (basic implementation)
from collections import defaultdict
from datetime import datetime, timedelta

request_counts = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic rate limiting middleware"""
    if settings.environment == "production":
        client_ip = request.client.host
        now = datetime.utcnow()
        
        # Clean old requests
        request_counts[client_ip] = [
            req_time for req_time in request_counts[client_ip]
            if now - req_time < timedelta(minutes=1)
        ]
        
        # Check rate limit
        if len(request_counts[client_ip]) >= settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "retry_after": 60}
            )
        
        # Add current request
        request_counts[client_ip].append(now)
    
    response = await call_next(request)
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )