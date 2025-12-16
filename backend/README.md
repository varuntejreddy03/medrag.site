# MedRAG Diagnostic API

A production-ready FastAPI backend for AI-powered medical diagnosis using Retrieval-Augmented Generation (RAG). This system combines vector similarity search, knowledge graphs, and large language models to provide intelligent diagnostic assistance.

## 🚀 Features

- **Vector Similarity Search**: FAISS-powered case retrieval from medical databases
- **Knowledge Graph Integration**: Medical knowledge traversal using NetworkX
- **LLM Integration**: Perplexity API with fallback to mock responses
- **Async Background Processing**: Celery + Redis for file processing and diagnosis
- **File Upload & Processing**: Support for PDF, DOCX, JSON, DICOM files
- **RESTful API**: Comprehensive OpenAPI documentation
- **Authentication**: JWT-based security with demo endpoints
- **Monitoring**: Prometheus metrics and health checks
- **Production Ready**: Docker containerization and deployment guides

## 📋 Prerequisites

- Python 3.10+
- Redis (for background tasks)
- Docker & Docker Compose (optional)

## 🛠️ Local Development Setup

### 1. Clone and Setup Environment

```bash
cd medrag-backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Key environment variables:
```env
PERPLEXITY_API_KEY=your-perplexity-api-key-here
LLM_PROVIDER=perplexity
REDIS_URL=redis://localhost:6379/0
FAISS_INDEX_PATH=../medrag_outputs/faiss_index.bin
EMBEDDINGS_PATH=../medrag_outputs/embeddings.npy
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using Docker Compose
docker-compose up -d redis
```

### 4. Start Celery Worker

```bash
# In a separate terminal
celery -A app.core.tasks worker --loglevel=info
```

### 5. Start API Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/v1/health

## 🐳 Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

Services:
- **API**: http://localhost:8000
- **Flower (Celery Monitor)**: http://localhost:5555
- **Redis**: localhost:6379

## 🧪 Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-mock

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

## 📚 API Documentation

### Authentication

```bash
# Login (demo credentials)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/patients"
```

### Core Endpoints

#### 1. File Upload
```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -F "files=@medical_report.pdf"
```

#### 2. Start Diagnosis
```bash
curl -X POST "http://localhost:8000/api/v1/diagnosis/start" \
  -H "Content-Type: application/json" \
  -d '{
    "complaints": ["chest pain", "shortness of breath"],
    "symptoms": ["fatigue", "dizziness"],
    "vitals": {"hr": 95, "bp": "130/85"},
    "top_k": 5
  }'
```

#### 3. Get Diagnosis Results
```bash
curl "http://localhost:8000/api/v1/diagnosis/{sessionId}"
```

#### 4. Knowledge Graph Query
```bash
curl "http://localhost:8000/api/v1/kg/{sessionId}"
```

#### 5. Export Results
```bash
curl -X POST "http://localhost:8000/api/v1/diagnosis/{sessionId}/export" \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "includeActions": true}'
```

### Response Examples

#### Diagnosis Result
```json
{
  "differentialDiagnosis": [
    {
      "condition": "Gastroesophageal Reflux Disease (GERD)",
      "confidence": 78.2,
      "description": "Acid reflux causing chest discomfort",
      "icd10": "K21.9"
    }
  ],
  "recommendedActions": [
    {
      "id": "a1",
      "text": "Order ECG to rule out cardiac causes",
      "priority": "high",
      "category": "imaging"
    }
  ],
  "followUpQuestions": [
    {
      "id": "q1",
      "text": "Does the pain worsen with deep breathing?"
    }
  ],
  "similarCases": [
    {
      "caseId": "A124",
      "similarity": 94.1,
      "diagnosis": "GERD",
      "outcome": "Recovered"
    }
  ]
}
```

## 🚀 Deployment

### Render.com Deployment

1. **Create Web Service**:
   - Connect your GitHub repository
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables**:
   ```
   ENVIRONMENT=production
   DEBUG=False
   PERPLEXITY_API_KEY=your-key-here
   REDIS_URL=redis://your-redis-url
   ```

3. **Create Worker Service**:
   - Same repository
   - Start Command: `celery -A app.core.tasks worker --loglevel=info`

4. **Add Redis**:
   - Use Render's Redis add-on or external Redis service

### Railway Deployment

1. **Deploy API**:
   ```bash
   railway login
   railway init
   railway add redis
   railway deploy
   ```

2. **Environment Variables**:
   Set via Railway dashboard or CLI:
   ```bash
   railway variables set PERPLEXITY_API_KEY=your-key
   railway variables set LLM_PROVIDER=perplexity
   ```

### Fly.io Deployment

1. **Install Fly CLI** and login
2. **Create fly.toml**:
   ```toml
   app = "medrag-api"
   
   [build]
     dockerfile = "Dockerfile"
   
   [[services]]
     http_checks = []
     internal_port = 8000
     processes = ["app"]
     protocol = "tcp"
   ```

3. **Deploy**:
   ```bash
   fly deploy
   fly redis create
   ```

## 🔧 Configuration

### LLM Providers

Switch between LLM providers via environment variables:

```env
# Perplexity (recommended)
LLM_PROVIDER=perplexity
PERPLEXITY_API_KEY=your-key

# Mock (for development)
LLM_PROVIDER=mock

# OpenAI (future)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
```

### Storage Providers

```env
# Local storage (development)
STORAGE_PROVIDER=local
STORAGE_PATH=./storage

# AWS S3 (production)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BUCKET_NAME=medrag-files
```

### FAISS Configuration

```env
# Local FAISS (development)
FAISS_INDEX_PATH=../medrag_outputs/faiss_index.bin

# Future: Pinecone/Weaviate
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=your-key
```

## 📊 Monitoring

### Health Checks
- **API Health**: `/api/v1/health`
- **Metrics**: `/metrics` (Prometheus format)

### Metrics Tracked
- Request duration and count
- FAISS search performance
- LLM request latency
- Background task status
- Active diagnosis sessions

### Logging
Structured logging with Loguru:
```python
from loguru import logger
logger.info("Diagnosis completed", session_id=session_id, duration=duration)
```

## 🔒 Security

### Authentication
- JWT tokens with configurable expiration
- Bearer token authentication
- Demo login: `demo/demo123`

### Rate Limiting
- Configurable per-minute limits
- IP-based tracking
- 429 responses for exceeded limits

### Input Validation
- File type and size validation
- Pydantic schema validation
- SQL injection prevention

## 🧩 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │    │  Celery Worker  │    │     Redis       │
│                 │    │                 │    │                 │
│ • REST API      │◄──►│ • File Extract  │◄──►│ • Task Queue    │
│ • Auth          │    │ • Diagnosis     │    │ • Results       │
│ • Validation    │    │ • Export        │    │ • Cache         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   FAISS Index   │    │ Knowledge Graph │
│                 │    │                 │
│ • Vector Search │    │ • NetworkX      │
│ • Embeddings    │    │ • Triplets      │
│ • Case Metadata │    │ • Ontology      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │   LLM Client    │
            │                 │
            │ • Perplexity    │
            │ • OpenAI        │
            │ • Mock          │
            └─────────────────┘
```

## 💰 Cost Considerations

### Free Tier Options
- **Render**: 750 hours/month free
- **Railway**: $5/month credit
- **Fly.io**: Generous free allowances
- **Redis**: Redis Cloud free tier

### Scaling Considerations
- **FAISS → Pinecone**: For larger datasets
- **Local Storage → S3**: For production files
- **SQLite → PostgreSQL**: For production database
- **Mock LLM → Fine-tuned**: For specialized models

## 🔄 Next Steps

### Immediate Improvements
1. **Database**: Replace in-memory storage with PostgreSQL
2. **Authentication**: Implement proper user management
3. **File Processing**: Add OCR and DICOM support
4. **Caching**: Add Redis caching for frequent queries

### Advanced Features
1. **Vector Database**: Migrate to Pinecone/Weaviate
2. **Model Fine-tuning**: Custom medical LLM
3. **Real-time Updates**: WebSocket support
4. **Audit Logging**: Comprehensive audit trails
5. **Multi-tenancy**: Organization-based isolation

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Error**:
   ```bash
   # Check Redis is running
   redis-cli ping
   # Should return PONG
   ```

2. **FAISS Index Not Found**:
   ```bash
   # Verify file paths in .env
   ls -la ../medrag_outputs/
   ```

3. **Celery Worker Not Starting**:
   ```bash
   # Check Redis connection
   celery -A app.core.tasks inspect ping
   ```

4. **Import Errors**:
   ```bash
   # Ensure all dependencies installed
   pip install -r requirements.txt
   ```

### Debug Mode
Set `DEBUG=True` in `.env` for detailed error messages and auto-reload.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: `/docs` endpoint
- **Health Check**: `/api/v1/health`

---

**Built with ❤️ for medical AI applications**