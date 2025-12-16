import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import numpy as np

from app.core.faiss_client import FAISSClient
from app.core.kg_client import KnowledgeGraphClient

class TestFAISSClient:
    
    @pytest.fixture
    def faiss_client(self):
        return FAISSClient()
    
    @pytest.mark.asyncio
    async def test_initialize_success(self, faiss_client):
        """Test successful FAISS client initialization"""
        with patch('os.path.exists', return_value=True), \
             patch('faiss.read_index') as mock_read_index, \
             patch('numpy.load') as mock_np_load, \
             patch('builtins.open', mock_open_json({"case_1": {"diagnosis": "test"}})):
            
            mock_index = Mock()
            mock_index.ntotal = 100
            mock_read_index.return_value = mock_index
            mock_np_load.return_value = np.random.rand(100, 384)
            
            await faiss_client.initialize()
            
            assert faiss_client._initialized is True
            assert faiss_client.index is not None
    
    @pytest.mark.asyncio
    async def test_search_with_mock_embedding(self, faiss_client):
        """Test FAISS search with mock embedding"""
        # Setup mock index
        mock_index = Mock()
        mock_index.search.return_value = (
            np.array([[0.1, 0.2, 0.3]]),  # distances
            np.array([[0, 1, 2]])         # indices
        )
        
        faiss_client.index = mock_index
        faiss_client.case_metadata = {
            "0": {"diagnosis": "GERD", "symptoms": ["chest pain"]},
            "1": {"diagnosis": "Pneumonia", "symptoms": ["cough", "fever"]},
            "2": {"diagnosis": "Anxiety", "symptoms": ["chest pain", "palpitations"]}
        }
        faiss_client._initialized = True
        
        # Mock embedding generation
        with patch.object(faiss_client, 'generate_query_embedding', 
                         return_value=np.random.rand(384).astype(np.float32)):
            
            results = await faiss_client.search("chest pain", top_k=3)
            
            assert len(results) == 3
            assert results[0]["case_id"] == "0"
            assert results[0]["diagnosis"] == "GERD"
            assert "similarity" in results[0]
    
    @pytest.mark.asyncio
    async def test_search_no_index(self, faiss_client):
        """Test search when no index is available"""
        faiss_client.index = None
        faiss_client._initialized = True
        
        results = await faiss_client.search("test query")
        
        assert results == []
    
    def test_get_stats(self, faiss_client):
        """Test getting FAISS statistics"""
        # Test uninitialized
        stats = faiss_client.get_stats()
        assert stats["status"] == "not_initialized"
        
        # Test initialized
        mock_index = Mock()
        mock_index.ntotal = 100
        mock_index.d = 384
        faiss_client.index = mock_index
        faiss_client.case_metadata = {"1": {}, "2": {}}
        
        stats = faiss_client.get_stats()
        assert stats["status"] == "initialized"
        assert stats["total_vectors"] == 100
        assert stats["dimension"] == 384
        assert stats["cases_loaded"] == 2

class TestKnowledgeGraphClient:
    
    @pytest.fixture
    def kg_client(self):
        return KnowledgeGraphClient()
    
    @pytest.mark.asyncio
    async def test_initialize_success(self, kg_client):
        """Test successful KG client initialization"""
        import networkx as nx
        
        mock_graph = nx.Graph()
        mock_graph.add_node("fever", type="symptom")
        mock_graph.add_node("pneumonia", type="disease")
        mock_graph.add_edge("fever", "pneumonia", relationship="symptom_of")
        
        with patch('os.path.exists', return_value=True), \
             patch('pickle.load', return_value=mock_graph), \
             patch('builtins.open', mock_open_json([{"subject": "fever", "predicate": "causes", "object": "pneumonia"}])):
            
            await kg_client.initialize()
            
            assert kg_client._initialized is True
            assert kg_client.graph is not None
            assert kg_client.graph.number_of_nodes() == 2
    
    @pytest.mark.asyncio
    async def test_get_subgraph_by_nodes(self, kg_client):
        """Test getting subgraph around specific nodes"""
        import networkx as nx
        
        # Create mock graph
        mock_graph = nx.Graph()
        mock_graph.add_node("fever", label="Fever", type="symptom")
        mock_graph.add_node("pneumonia", label="Pneumonia", type="disease")
        mock_graph.add_node("cough", label="Cough", type="symptom")
        mock_graph.add_edge("fever", "pneumonia", relationship="symptom_of", weight=0.8)
        mock_graph.add_edge("cough", "pneumonia", relationship="symptom_of", weight=0.9)
        
        kg_client.graph = mock_graph
        kg_client._initialized = True
        
        result = await kg_client.get_subgraph_by_nodes(["fever"], radius=2)
        
        assert "nodes" in result
        assert "edges" in result
        assert len(result["nodes"]) >= 1
    
    @pytest.mark.asyncio
    async def test_get_top_triplets_for_patient(self, kg_client):
        """Test getting relevant triplets for patient symptoms"""
        kg_client.triplets = [
            {"subject": "fever", "predicate": "symptom_of", "object": "pneumonia"},
            {"subject": "cough", "predicate": "symptom_of", "object": "pneumonia"},
            {"subject": "headache", "predicate": "symptom_of", "object": "migraine"}
        ]
        
        triplets = await kg_client.get_top_triplets_for_patient(["fever", "cough"], top_k=5)
        
        assert len(triplets) == 2
        assert all("relevance_score" in t for t in triplets)
        assert triplets[0]["relevance_score"] >= triplets[1]["relevance_score"]
    
    @pytest.mark.asyncio
    async def test_get_disease_info(self, kg_client):
        """Test getting disease information"""
        kg_client.disease_ontology = {
            "pneumonia": {
                "icd10": "J18.9",
                "description": "Infection of the lungs",
                "symptoms": ["fever", "cough", "chest pain"]
            }
        }
        
        info = await kg_client.get_disease_info("pneumonia")
        
        assert info is not None
        assert info["icd10"] == "J18.9"
        assert "fever" in info["symptoms"]
        
        # Test case insensitive
        info = await kg_client.get_disease_info("PNEUMONIA")
        assert info is not None
        
        # Test not found
        info = await kg_client.get_disease_info("nonexistent")
        assert info is None
    
    def test_get_stats(self, kg_client):
        """Test getting KG statistics"""
        import networkx as nx
        
        # Test uninitialized
        stats = kg_client.get_stats()
        assert stats["status"] == "not_initialized"
        
        # Test initialized
        mock_graph = nx.Graph()
        mock_graph.add_edge("a", "b")
        mock_graph.add_edge("b", "c")
        
        kg_client.graph = mock_graph
        kg_client.triplets = [{"a": 1}, {"b": 2}]
        kg_client.disease_ontology = {"disease1": {}}
        
        stats = kg_client.get_stats()
        assert stats["status"] == "initialized"
        assert stats["nodes"] == 3
        assert stats["edges"] == 2
        assert stats["triplets"] == 2
        assert stats["diseases"] == 1

# Helper function for mocking file operations
def mock_open_json(data):
    """Mock open function that returns JSON data"""
    import json
    from unittest.mock import mock_open
    
    if isinstance(data, dict) or isinstance(data, list):
        json_data = json.dumps(data)
    else:
        json_data = data
    
    return mock_open(read_data=json_data)

# Integration test
@pytest.mark.asyncio
async def test_search_integration():
    """Integration test for search functionality"""
    faiss_client = FAISSClient()
    
    # Mock all dependencies
    with patch('os.path.exists', return_value=True), \
         patch('faiss.read_index') as mock_read_index, \
         patch('numpy.load') as mock_np_load, \
         patch('builtins.open', mock_open_json({"0": {"diagnosis": "Test", "symptoms": ["test"]}})):
        
        mock_index = Mock()
        mock_index.ntotal = 1
        mock_index.search.return_value = (np.array([[0.1]]), np.array([[0]]))
        mock_read_index.return_value = mock_index
        mock_np_load.return_value = np.random.rand(1, 384)
        
        await faiss_client.initialize()
        
        with patch.object(faiss_client, 'generate_query_embedding', 
                         return_value=np.random.rand(384).astype(np.float32)):
            results = await faiss_client.search("test query")
            
            assert len(results) == 1
            assert results[0]["diagnosis"] == "Test"