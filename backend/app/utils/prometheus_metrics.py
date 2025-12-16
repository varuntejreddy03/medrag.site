from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from functools import wraps
import time
from typing import Callable
from loguru import logger

# Define metrics
REQUEST_COUNT = Counter(
    'medrag_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'medrag_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

FAISS_SEARCH_COUNT = Counter(
    'medrag_faiss_searches_total',
    'Total number of FAISS searches'
)

FAISS_SEARCH_DURATION = Histogram(
    'medrag_faiss_search_duration_seconds',
    'FAISS search duration in seconds'
)

LLM_REQUESTS = Counter(
    'medrag_llm_requests_total',
    'Total number of LLM requests',
    ['provider', 'status']
)

LLM_REQUEST_DURATION = Histogram(
    'medrag_llm_request_duration_seconds',
    'LLM request duration in seconds',
    ['provider']
)

ACTIVE_SESSIONS = Gauge(
    'medrag_active_sessions',
    'Number of active diagnosis sessions'
)

FILE_UPLOADS = Counter(
    'medrag_file_uploads_total',
    'Total number of file uploads',
    ['file_type', 'status']
)

BACKGROUND_TASKS = Counter(
    'medrag_background_tasks_total',
    'Total number of background tasks',
    ['task_type', 'status']
)

KG_QUERIES = Counter(
    'medrag_kg_queries_total',
    'Total number of knowledge graph queries'
)

def track_request_metrics(func: Callable) -> Callable:
    """Decorator to track request metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        # Extract request info (this is a simplified version)
        method = "GET"  # Default, should be extracted from request
        endpoint = func.__name__
        status_code = "200"
        
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            status_code = "500"
            raise
        finally:
            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    
    return wrapper

def track_faiss_search(func: Callable) -> Callable:
    """Decorator to track FAISS search metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            FAISS_SEARCH_COUNT.inc()
            return result
        finally:
            duration = time.time() - start_time
            FAISS_SEARCH_DURATION.observe(duration)
    
    return wrapper

def track_llm_request(provider: str):
    """Decorator factory to track LLM request metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                LLM_REQUESTS.labels(provider=provider, status=status).inc()
                LLM_REQUEST_DURATION.labels(provider=provider).observe(duration)
        
        return wrapper
    return decorator

def track_file_upload(file_type: str, status: str):
    """Track file upload metrics"""
    FILE_UPLOADS.labels(file_type=file_type, status=status).inc()

def track_background_task(task_type: str, status: str):
    """Track background task metrics"""
    BACKGROUND_TASKS.labels(task_type=task_type, status=status).inc()

def increment_active_sessions():
    """Increment active sessions counter"""
    ACTIVE_SESSIONS.inc()

def decrement_active_sessions():
    """Decrement active sessions counter"""
    ACTIVE_SESSIONS.dec()

def track_kg_query():
    """Track knowledge graph query"""
    KG_QUERIES.inc()

def get_metrics() -> str:
    """Get Prometheus metrics in text format"""
    return generate_latest()

def get_metrics_content_type() -> str:
    """Get Prometheus metrics content type"""
    return CONTENT_TYPE_LATEST

class MetricsCollector:
    """Centralized metrics collection"""
    
    @staticmethod
    def record_request(method: str, endpoint: str, status_code: str, duration: float):
        """Record HTTP request metrics"""
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    
    @staticmethod
    def record_faiss_search(duration: float, success: bool = True):
        """Record FAISS search metrics"""
        FAISS_SEARCH_COUNT.inc()
        FAISS_SEARCH_DURATION.observe(duration)
    
    @staticmethod
    def record_llm_request(provider: str, duration: float, success: bool = True):
        """Record LLM request metrics"""
        status = "success" if success else "error"
        LLM_REQUESTS.labels(provider=provider, status=status).inc()
        LLM_REQUEST_DURATION.labels(provider=provider).observe(duration)
    
    @staticmethod
    def record_file_upload(file_type: str, success: bool = True):
        """Record file upload metrics"""
        status = "success" if success else "error"
        FILE_UPLOADS.labels(file_type=file_type, status=status).inc()
    
    @staticmethod
    def record_background_task(task_type: str, success: bool = True):
        """Record background task metrics"""
        status = "success" if success else "error"
        BACKGROUND_TASKS.labels(task_type=task_type, status=status).inc()
    
    @staticmethod
    def update_active_sessions(count: int):
        """Update active sessions gauge"""
        ACTIVE_SESSIONS.set(count)
    
    @staticmethod
    def record_kg_query():
        """Record knowledge graph query"""
        KG_QUERIES.inc()

# Global metrics collector instance
metrics = MetricsCollector()