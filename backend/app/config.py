import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Environment
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    secret_key: str = Field(default="dev-secret-key", env="SECRET_KEY")
    
    # JWT
    jwt_secret_key: str = Field(default="jwt-secret-key", env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expiration_hours: int = Field(default=24, env="JWT_EXPIRATION_HOURS")
    
    # Database
    database_url: str = Field(default="sqlite:///./medrag.db", env="DATABASE_URL")
    
    # Redis & Celery
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    celery_broker_url: str = Field(default="redis://localhost:6379/0", env="CELERY_BROKER_URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/0", env="CELERY_RESULT_BACKEND")
    
    # LLM Configuration
    llm_provider: str = Field(default="mock", env="LLM_PROVIDER")
    perplexity_api_key: Optional[str] = Field(default=None, env="PERPLEXITY_API_KEY")
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    hf_api_token: Optional[str] = Field(default=None, env="HF_API_TOKEN")
    
    # Storage
    storage_provider: str = Field(default="local", env="STORAGE_PROVIDER")
    storage_path: str = Field(default="./storage", env="STORAGE_PATH")
    aws_access_key_id: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(default=None, env="AWS_SECRET_ACCESS_KEY")
    aws_bucket_name: Optional[str] = Field(default=None, env="AWS_BUCKET_NAME")
    aws_region: str = Field(default="us-east-1", env="AWS_REGION")
    
    # FAISS & Data Paths
    faiss_index_path: str = Field(default="../medrag_outputs/faiss_index.bin", env="FAISS_INDEX_PATH")
    embeddings_path: str = Field(default="../medrag_outputs/embeddings.npy", env="EMBEDDINGS_PATH")
    case_metadata_path: str = Field(default="../medrag_outputs/case_metadata.json", env="CASE_METADATA_PATH")
    knowledge_graph_path: str = Field(default="../medrag_outputs/knowledge_graph.pkl", env="KNOWLEDGE_GRAPH_PATH")
    disease_ontology_path: str = Field(default="../medrag_outputs/disease_ontology.json", env="DISEASE_ONTOLOGY_PATH")
    triplets_path: str = Field(default="../medrag_outputs/triplets.json", env="TRIPLETS_PATH")
    embedding_config_path: str = Field(default="../medrag_outputs/embedding_config.json", env="EMBEDDING_CONFIG_PATH")
    
    # API Configuration
    max_file_size_mb: int = Field(default=200, env="MAX_FILE_SIZE_MB")
    allowed_file_types: str = Field(default="pdf,docx,json,dicom,txt", env="ALLOWED_FILE_TYPES")
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:8080", env="CORS_ORIGINS")
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    prometheus_enabled: bool = Field(default=True, env="PROMETHEUS_ENABLED")
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ext.strip() for ext in self.allowed_file_types.split(",")]
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()