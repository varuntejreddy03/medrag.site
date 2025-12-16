# 🚀 MedRAG Deployment Guide

This guide covers deploying the MedRAG backend to various cloud platforms with step-by-step instructions.

## 📋 Pre-deployment Checklist

- [ ] All tests pass: `python test_setup.py`
- [ ] Environment variables configured
- [ ] Data files accessible (FAISS index, embeddings, etc.)
- [ ] Redis instance available
- [ ] Perplexity API key obtained
- [ ] Domain/subdomain ready (for production)

## 🎯 Render.com Deployment (Recommended)

### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial MedRAG backend"
git remote add origin https://github.com/yourusername/medrag-backend.git
git push -u origin main
```

### Step 2: Create Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medrag-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Environment Variables
Add these in Render dashboard:
```
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key
PERPLEXITY_API_KEY=your-perplexity-api-key-here
LLM_PROVIDER=perplexity
REDIS_URL=redis://your-redis-url:6379/0
CORS_ORIGINS=https://your-frontend-domain.com
```

### Step 4: Add Redis
1. In Render dashboard: "New +" → "Redis"
2. Choose plan (free tier available)
3. Copy the Redis URL to your web service environment variables

### Step 5: Create Worker Service
1. "New +" → "Background Worker"
2. Same repository
3. **Start Command**: `celery -A app.core.tasks worker --loglevel=info --concurrency=2`
4. Same environment variables as web service

### Step 6: Upload Data Files
Since Render doesn't persist files, you have options:

**Option A: Include in Repository**
```bash
# Copy data files to repo (if small enough)
cp -r ../medrag_outputs ./data/
git add data/
git commit -m "Add data files"
git push
```

**Option B: Use Cloud Storage**
```bash
# Upload to S3/GCS and update environment variables
AWS_BUCKET_NAME=your-bucket
FAISS_INDEX_PATH=s3://your-bucket/faiss_index.bin
```

### Cost: Free tier available, $7/month for production

---

## 🚂 Railway Deployment

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project
```bash
railway init
railway add redis
```

### Step 3: Configure Environment
```bash
railway variables set ENVIRONMENT=production
railway variables set DEBUG=False
railway variables set PERPLEXITY_API_KEY=your-key
railway variables set LLM_PROVIDER=perplexity
```

### Step 4: Deploy
```bash
railway up
```

### Step 5: Add Worker
Create `railway.toml`:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"

[[services]]
name = "worker"
startCommand = "celery -A app.core.tasks worker --loglevel=info"
```

### Cost: $5/month credit, then usage-based

---

## ✈️ Fly.io Deployment

### Step 1: Install Fly CLI
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2: Initialize App
```bash
fly launch --no-deploy
```

### Step 3: Configure fly.toml
```toml
app = "medrag-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  ENVIRONMENT = "production"
  DEBUG = "False"

[[services]]
  http_checks = []
  internal_port = 8000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[processes]
  app = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
  worker = "celery -A app.core.tasks worker --loglevel=info"
```

### Step 4: Add Redis
```bash
fly redis create
# Copy the Redis URL to secrets
fly secrets set REDIS_URL=redis://your-redis-url
```

### Step 5: Set Secrets
```bash
fly secrets set PERPLEXITY_API_KEY=your-key
fly secrets set SECRET_KEY=your-secret-key
fly secrets set JWT_SECRET_KEY=your-jwt-key
```

### Step 6: Deploy
```bash
fly deploy
```

### Cost: Generous free tier, then usage-based

---

## 🐳 Docker + VPS Deployment

### Step 1: Prepare VPS
```bash
# On your VPS (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose git
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2: Clone and Configure
```bash
git clone https://github.com/yourusername/medrag-backend.git
cd medrag-backend
cp .env.example .env
# Edit .env with production values
```

### Step 3: Production Docker Compose
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build: .
    restart: unless-stopped
    ports:
      - "80:8000"
    environment:
      - ENVIRONMENT=production
      - DEBUG=False
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    volumes:
      - ./storage:/app/storage
      - ./data:/app/data
    depends_on:
      - redis

  worker:
    build: .
    restart: unless-stopped
    command: celery -A app.core.tasks worker --loglevel=info --concurrency=4
    environment:
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    volumes:
      - ./storage:/app/storage
      - ./data:/app/data
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api

volumes:
  redis_data:
```

### Step 4: Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cost: VPS cost (~$5-20/month)

---

## 🤗 Hugging Face Spaces (Demo)

For a simplified demo version:

### Step 1: Create Gradio Interface
Create `gradio_app.py`:
```python
import gradio as gr
import asyncio
from app.core.llm_client import MockLLMClient

async def diagnose(complaints, symptoms):
    client = MockLLMClient()
    prompt = f"Complaints: {complaints}. Symptoms: {symptoms}"
    result = await client.generate_diagnosis(prompt)
    
    diagnoses = result.get("differential_diagnosis", [])
    return "\n".join([f"{d['condition']}: {d['confidence']}%" for d in diagnoses])

def sync_diagnose(complaints, symptoms):
    return asyncio.run(diagnose(complaints, symptoms))

iface = gr.Interface(
    fn=sync_diagnose,
    inputs=[
        gr.Textbox(label="Chief Complaints"),
        gr.Textbox(label="Symptoms")
    ],
    outputs=gr.Textbox(label="Differential Diagnosis"),
    title="MedRAG Diagnostic Demo"
)

if __name__ == "__main__":
    iface.launch()
```

### Step 2: Create requirements.txt for HF
```
gradio
fastapi
pydantic
numpy
```

### Step 3: Upload to HF Spaces
1. Create new Space on Hugging Face
2. Upload files
3. Set to Gradio SDK

---

## 🔧 Production Optimizations

### 1. Database Migration
Replace in-memory storage with PostgreSQL:

```python
# Add to requirements.txt
asyncpg==0.29.0
databases[postgresql]==0.8.0

# Update config.py
DATABASE_URL=postgresql://user:pass@host:5432/medrag
```

### 2. File Storage Migration
Use cloud storage for production:

```python
# S3 configuration
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BUCKET_NAME=medrag-files
STORAGE_PROVIDER=s3
```

### 3. Vector Database Migration
Migrate from FAISS to managed vector DB:

```python
# Pinecone configuration
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=your-key
PINECONE_INDEX_NAME=medrag-index
```

### 4. Monitoring Setup
Add comprehensive monitoring:

```yaml
# Add to docker-compose
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 5. SSL/HTTPS Setup
Use Let's Encrypt for SSL:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Memory Issues**
   ```bash
   # Increase worker memory
   docker-compose up --scale worker=1
   # Or reduce Celery concurrency
   celery -A app.core.tasks worker --concurrency=1
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis connectivity
   redis-cli -u $REDIS_URL ping
   ```

3. **File Path Issues**
   ```bash
   # Verify data files exist
   ls -la data/
   # Update paths in .env
   ```

4. **API Key Issues**
   ```bash
   # Test Perplexity API
   curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
        https://api.perplexity.ai/chat/completions
   ```

### Health Checks
Monitor your deployment:
- **API Health**: `GET /api/v1/health`
- **Metrics**: `GET /metrics`
- **Logs**: `docker-compose logs -f api`

### Scaling
For high traffic:
1. Increase worker instances
2. Use load balancer
3. Implement caching
4. Optimize database queries
5. Use CDN for static files

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Render | 750 hrs/month | $7+/month | Production apps |
| Railway | $5 credit | Usage-based | Rapid deployment |
| Fly.io | Generous limits | Usage-based | Global deployment |
| VPS | None | $5-20/month | Full control |
| HF Spaces | Unlimited | $0 | Demos only |

## 🎯 Recommendations

- **Development**: Local Docker Compose
- **Staging**: Railway or Render
- **Production**: Render or VPS with proper monitoring
- **Demo**: Hugging Face Spaces
- **Enterprise**: VPS/Cloud with full infrastructure

Choose based on your needs, budget, and technical requirements!