from fastapi import APIRouter, Response
from datetime import datetime
from app.models.schemas import HealthResponse
from app.core.faiss_client import faiss_client
from app.core.kg_client import kg_client
from app.utils.prometheus_metrics import get_metrics, get_metrics_content_type
from app.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    
    # Check service status
    services = {}
    
    # Check FAISS
    try:
        faiss_stats = faiss_client.get_stats()
        services["faiss"] = faiss_stats.get("status", "unknown")
    except Exception:
        services["faiss"] = "error"
    
    # Check Knowledge Graph
    try:
        kg_stats = kg_client.get_stats()
        services["knowledge_graph"] = kg_stats.get("status", "unknown")
    except Exception:
        services["knowledge_graph"] = "error"
    
    # Check Redis (simplified)
    try:
        import redis
        r = redis.from_url(settings.redis_url)
        r.ping()
        services["redis"] = "healthy"
    except Exception:
        services["redis"] = "error"
    
    # Overall status
    overall_status = "healthy" if all(status != "error" for status in services.values()) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version="1.0.0",
        services=services
    )

@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint"""
    if not settings.prometheus_enabled:
        return {"message": "Metrics disabled"}
    
    metrics_data = get_metrics()
    return Response(
        content=metrics_data,
        media_type=get_metrics_content_type()
    )