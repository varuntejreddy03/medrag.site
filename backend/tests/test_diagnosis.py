import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.core.llm_client import MockLLMClient, PerplexityClient, build_diagnosis_prompt
from app.models.schemas import DiagnosisRequest, Vitals

class TestLLMClient:
    
    @pytest.mark.asyncio
    async def test_mock_llm_client_chest_pain(self):
        """Test mock LLM client with chest pain symptoms"""
        client = MockLLMClient()
        
        prompt = "Patient has chest pain and shortness of breath"
        result = await client.generate_diagnosis(prompt)
        
        assert "differential_diagnosis" in result
        assert len(result["differential_diagnosis"]) >= 1
        assert result["differential_diagnosis"][0]["condition"] == "Gastroesophageal Reflux Disease (GERD)"
        assert "recommended_actions" in result
        assert "follow_up_questions" in result
    
    @pytest.mark.asyncio
    async def test_mock_llm_client_default(self):
        """Test mock LLM client with default symptoms"""
        client = MockLLMClient()
        
        prompt = "Patient has general symptoms"
        result = await client.generate_diagnosis(prompt)
        
        assert "differential_diagnosis" in result
        assert len(result["differential_diagnosis"]) >= 1
        assert result["differential_diagnosis"][0]["condition"] == "Viral upper respiratory infection"
    
    @pytest.mark.asyncio
    async def test_perplexity_client_fallback(self):
        """Test Perplexity client fallback on error"""
        client = PerplexityClient("fake-api-key")
        
        # Mock aiohttp to raise an exception
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.return_value.post.side_effect = Exception("API Error")
            
            result = await client.generate_diagnosis("test prompt")
            
            # Should return fallback response
            assert result["differential_diagnosis"][0]["condition"] == "Further evaluation needed"
            assert result["differential_diagnosis"][0]["confidence"] == 50.0

class TestDiagnosisPrompt:
    
    def test_build_diagnosis_prompt_basic(self):
        """Test building basic diagnosis prompt"""
        patient_data = {
            "complaints": ["chest pain"],
            "symptoms": ["shortness of breath", "fatigue"],
            "vitals": {"hr": 90, "bp": "120/80"},
            "history": {"diabetes": True}
        }
        
        similar_cases = [
            {
                "case_id": "A123",
                "diagnosis": "GERD",
                "similarity": 85.5,
                "symptoms": ["chest pain", "heartburn"],
                "outcome": "Recovered"
            }
        ]
        
        kg_triplets = [
            {
                "subject": "chest pain",
                "predicate": "symptom_of",
                "object": "GERD"
            }
        ]
        
        prompt = build_diagnosis_prompt(patient_data, similar_cases, kg_triplets)
        
        assert "chest pain" in prompt
        assert "shortness of breath" in prompt
        assert "120/80" in prompt
        assert "GERD" in prompt
        assert "A123" in prompt
        assert "INSTRUCTIONS:" in prompt
    
    def test_build_diagnosis_prompt_minimal(self):
        """Test building prompt with minimal data"""
        patient_data = {
            "complaints": ["headache"],
            "symptoms": []
        }
        
        prompt = build_diagnosis_prompt(patient_data, [], [])
        
        assert "headache" in prompt
        assert "INSTRUCTIONS:" in prompt

class TestDiagnosisWorkflow:
    
    @pytest.fixture
    def diagnosis_request(self):
        return DiagnosisRequest(
            patientId="patient-123",
            complaints=["chest pain", "difficulty breathing"],
            symptoms=["shortness of breath", "fatigue"],
            vitals=Vitals(hr=95, bp="130/85", temp=98.6),
            history={"smoking": True, "family_history": "heart disease"},
            top_k=5
        )
    
    @pytest.mark.asyncio
    async def test_diagnosis_workflow_mock(self, diagnosis_request):
        """Test complete diagnosis workflow with mocked components"""
        from app.core.faiss_client import FAISSClient
        from app.core.kg_client import KnowledgeGraphClient
        from app.core.llm_client import MockLLMClient
        
        # Mock FAISS client
        faiss_client = FAISSClient()
        faiss_client._initialized = True
        
        mock_search_results = [
            {
                "case_id": "C001",
                "similarity": 88.5,
                "diagnosis": "Myocardial Infarction",
                "symptoms": ["chest pain", "shortness of breath"],
                "outcome": "Hospitalized"
            },
            {
                "case_id": "C002", 
                "similarity": 75.2,
                "diagnosis": "GERD",
                "symptoms": ["chest pain"],
                "outcome": "Recovered"
            }
        ]
        
        # Mock KG client
        kg_client = KnowledgeGraphClient()
        kg_client._initialized = True
        
        mock_triplets = [
            {
                "subject": "chest pain",
                "predicate": "symptom_of", 
                "object": "myocardial infarction",
                "relevance_score": 2.0
            },
            {
                "subject": "shortness of breath",
                "predicate": "symptom_of",
                "object": "heart failure", 
                "relevance_score": 1.5
            }
        ]
        
        # Mock LLM client
        llm_client = MockLLMClient()
        
        # Test the workflow
        with patch.object(faiss_client, 'search', return_value=mock_search_results), \
             patch.object(kg_client, 'get_top_triplets_for_patient', return_value=mock_triplets):
            
            # Simulate search
            query_text = f"Patient complaints: {', '.join(diagnosis_request.complaints)}. Symptoms: {', '.join(diagnosis_request.symptoms)}"
            similar_cases = await faiss_client.search(query_text, diagnosis_request.top_k)
            
            # Simulate KG query
            kg_triplets = await kg_client.get_top_triplets_for_patient(diagnosis_request.symptoms, top_k=10)
            
            # Build prompt and get LLM response
            prompt = build_diagnosis_prompt(diagnosis_request.dict(), similar_cases, kg_triplets)
            llm_response = await llm_client.generate_diagnosis(prompt)
            
            # Verify results
            assert len(similar_cases) == 2
            assert similar_cases[0]["case_id"] == "C001"
            assert len(kg_triplets) == 2
            assert "differential_diagnosis" in llm_response
            assert len(llm_response["differential_diagnosis"]) >= 1
    
    def test_diagnosis_request_validation(self):
        """Test diagnosis request validation"""
        from app.utils.io_helpers import ValidationHelper
        
        # Valid request
        valid_data = {
            "complaints": ["chest pain"],
            "symptoms": ["shortness of breath"],
            "top_k": 5
        }
        errors = ValidationHelper.validate_diagnosis_request(valid_data)
        assert len(errors) == 0
        
        # Invalid request - no complaints or symptoms
        invalid_data = {
            "top_k": 5
        }
        errors = ValidationHelper.validate_diagnosis_request(invalid_data)
        assert "complaints_symptoms" in errors
        
        # Invalid top_k
        invalid_data = {
            "complaints": ["test"],
            "top_k": 25
        }
        errors = ValidationHelper.validate_diagnosis_request(invalid_data)
        assert "top_k" in errors

class TestDiagnosisAPI:
    
    @pytest.mark.asyncio
    async def test_diagnosis_session_creation(self):
        """Test diagnosis session creation"""
        from app.utils.io_helpers import DatabaseHelper
        
        session_data = {
            "patientId": "patient-123",
            "complaints": ["chest pain"],
            "symptoms": ["shortness of breath"],
            "vitals": {"hr": 90},
            "top_k": 5
        }
        
        session_id = DatabaseHelper.create_session(session_data)
        
        assert session_id is not None
        assert len(session_id) > 0
        
        # Retrieve session
        retrieved_session = DatabaseHelper.get_session(session_id)
        assert retrieved_session is not None
        assert retrieved_session["patient_id"] == "patient-123"
        assert retrieved_session["complaints"] == ["chest pain"]
        assert retrieved_session["status"] == "processing"
    
    @pytest.mark.asyncio
    async def test_diagnosis_session_update(self):
        """Test diagnosis session update"""
        from app.utils.io_helpers import DatabaseHelper
        
        # Create session
        session_data = {
            "complaints": ["headache"],
            "symptoms": ["nausea"]
        }
        session_id = DatabaseHelper.create_session(session_data)
        
        # Update session
        updates = {
            "status": "completed",
            "result": {"diagnosis": "Migraine"}
        }
        success = DatabaseHelper.update_session(session_id, updates)
        
        assert success is True
        
        # Verify update
        updated_session = DatabaseHelper.get_session(session_id)
        assert updated_session["status"] == "completed"
        assert updated_session["result"]["diagnosis"] == "Migraine"
    
    def test_session_summary_generation(self):
        """Test session summary generation"""
        from app.utils.io_helpers import generate_session_summary
        
        session_data = {
            "complaints": ["chest pain", "dizziness"],
            "symptoms": ["shortness of breath"],
            "vitals": {"hr": 100, "bp": "140/90"}
        }
        
        summary = generate_session_summary(session_data)
        
        assert "chest pain" in summary
        assert "dizziness" in summary
        assert "shortness of breath" in summary
        assert "HR: 100" in summary
        assert "BP: 140/90" in summary
    
    def test_feedback_creation(self):
        """Test feedback creation"""
        from app.utils.io_helpers import DatabaseHelper
        
        feedback_data = {
            "rating": "positive",
            "comments": "Very helpful diagnosis",
            "correctDiagnosis": "GERD"
        }
        
        feedback_id = DatabaseHelper.create_feedback("session-123", feedback_data)
        
        assert feedback_id is not None
        assert len(feedback_id) > 0

# Performance test
@pytest.mark.asyncio
async def test_diagnosis_performance():
    """Test diagnosis performance with timing"""
    import time
    
    client = MockLLMClient()
    
    start_time = time.time()
    result = await client.generate_diagnosis("test prompt")
    end_time = time.time()
    
    # Mock client should respond within 2 seconds
    assert (end_time - start_time) < 2.0
    assert "differential_diagnosis" in result

# Error handling test
@pytest.mark.asyncio
async def test_diagnosis_error_handling():
    """Test diagnosis error handling"""
    from app.core.llm_client import LLMClientFactory
    from app.config import settings
    
    # Test with invalid provider
    original_provider = settings.llm_provider
    settings.llm_provider = "invalid_provider"
    
    try:
        client = LLMClientFactory.create_client()
        # Should fall back to MockLLMClient
        assert isinstance(client, MockLLMClient)
        
        result = await client.generate_diagnosis("test")
        assert "differential_diagnosis" in result
        
    finally:
        settings.llm_provider = original_provider