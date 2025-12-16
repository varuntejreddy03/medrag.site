import os
import json
import numpy as np
import faiss
from typing import List, Dict, Tuple, Optional
from loguru import logger
from sentence_transformers import SentenceTransformer
from app.config import settings

class FAISSClient:
    def __init__(self):
        self.index = None
        self.embeddings = None
        self.case_metadata = None
        self.embedding_model = None
        self.embedding_config = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize FAISS index and load metadata"""
        if self._initialized:
            return
        
        try:
            # Load FAISS index
            if os.path.exists(settings.faiss_index_path):
                self.index = faiss.read_index(settings.faiss_index_path)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
            else:
                logger.warning(f"FAISS index not found at {settings.faiss_index_path}")
                return
            
            # Load embeddings
            if os.path.exists(settings.embeddings_path):
                self.embeddings = np.load(settings.embeddings_path)
                logger.info(f"Loaded embeddings with shape {self.embeddings.shape}")
            
            # Load case metadata
            if os.path.exists(settings.case_metadata_path):
                with open(settings.case_metadata_path, 'r') as f:
                    self.case_metadata = json.load(f)
                logger.info(f"Loaded {len(self.case_metadata)} case metadata entries")
            
            # Load embedding config
            if os.path.exists(settings.embedding_config_path):
                with open(settings.embedding_config_path, 'r') as f:
                    self.embedding_config = json.load(f)
                
                # Initialize embedding model
                model_name = self.embedding_config.get('model_name', 'all-MiniLM-L6-v2')
                try:
                    self.embedding_model = SentenceTransformer(model_name)
                    logger.info(f"Initialized embedding model: {model_name}")
                except Exception as e:
                    logger.warning(f"Failed to load embedding model {model_name}: {e}")
                    self.embedding_model = None
            
            self._initialized = True
            logger.info("FAISS client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize FAISS client: {e}")
            raise
    
    def _normalize_embedding(self, embedding: np.ndarray) -> np.ndarray:
        """Normalize embedding vector"""
        norm = np.linalg.norm(embedding)
        if norm == 0:
            return embedding
        return embedding / norm
    
    async def generate_query_embedding(self, query_text: str) -> Optional[np.ndarray]:
        """Generate embedding for query text"""
        if not self.embedding_model:
            logger.warning("Embedding model not available, using mock embedding")
            # Return a mock embedding for development
            return np.random.rand(384).astype(np.float32)
        
        try:
            embedding = self.embedding_model.encode([query_text])
            return self._normalize_embedding(embedding[0].astype(np.float32))
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def search(self, query_text: str, top_k: int = 5) -> List[Dict]:
        """Search for similar cases using FAISS"""
        if not self._initialized:
            await self.initialize()
        
        if not self.index:
            logger.error("FAISS index not available")
            return []
        
        try:
            # Generate query embedding
            query_embedding = await self.generate_query_embedding(query_text)
            if query_embedding is None:
                return []
            
            # Reshape for FAISS search
            query_vector = query_embedding.reshape(1, -1)
            
            # Search
            distances, indices = self.index.search(query_vector, top_k)
            
            results = []
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx == -1:  # Invalid index
                    continue
                
                # Get case metadata
                case_id = str(idx)
                case_info = self.case_metadata.get(case_id, {}) if self.case_metadata else {}
                
                result = {
                    "case_id": case_id,
                    "similarity": float(1 - distance),  # Convert distance to similarity
                    "distance": float(distance),
                    "rank": i + 1,
                    "diagnosis": case_info.get("diagnosis", "Unknown"),
                    "symptoms": case_info.get("symptoms", []),
                    "summary": case_info.get("summary", "No summary available"),
                    "outcome": case_info.get("outcome", "Unknown")
                }
                results.append(result)
            
            logger.info(f"Found {len(results)} similar cases for query")
            return results
            
        except Exception as e:
            logger.error(f"FAISS search failed: {e}")
            return []
    
    async def get_case_details(self, case_id: str) -> Optional[Dict]:
        """Get detailed information for a specific case"""
        if not self.case_metadata:
            return None
        
        return self.case_metadata.get(case_id)
    
    def get_stats(self) -> Dict:
        """Get FAISS index statistics"""
        if not self.index:
            return {"status": "not_initialized"}
        
        return {
            "status": "initialized",
            "total_vectors": self.index.ntotal,
            "dimension": self.index.d,
            "index_type": type(self.index).__name__,
            "cases_loaded": len(self.case_metadata) if self.case_metadata else 0
        }

# Global instance
faiss_client = FAISSClient()