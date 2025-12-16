import json
import asyncio
from typing import Dict, Any, Optional
from celery import Celery
from loguru import logger
from app.config import settings

# Initialize Celery
celery_app = Celery(
    "medrag_tasks",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.core.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# In-memory storage for task results (use Redis in production)
task_results = {}

@celery_app.task(bind=True)
def extract_file_content(self, file_id: str, file_path: str) -> Dict[str, Any]:
    """Extract content from uploaded file"""
    try:
        self.update_state(state="PROGRESS", meta={"progress": 10, "message": "Starting extraction"})
        
        # Mock extraction process
        import time
        time.sleep(2)  # Simulate processing time
        
        self.update_state(state="PROGRESS", meta={"progress": 50, "message": "Processing file"})
        
        # Mock extracted content based on file type
        file_extension = file_path.split('.')[-1].lower()
        
        if file_extension == "pdf":
            extracted_content = {
                "type": "medical_report",
                "patient_name": "John Doe",
                "symptoms": ["chest pain", "shortness of breath"],
                "diagnosis": "Possible cardiac issue",
                "medications": ["Aspirin", "Metoprolol"],
                "text": "Patient presents with chest pain and shortness of breath..."
            }
        elif file_extension == "json":
            # Assume it's structured medical data
            extracted_content = {
                "type": "structured_data",
                "patient_name": "Jane Smith",
                "symptoms": ["fever", "cough", "fatigue"],
                "diagnosis": "Upper respiratory infection",
                "medications": ["Acetaminophen"],
                "text": "Structured medical data imported"
            }
        else:
            extracted_content = {
                "type": "unknown",
                "text": "File content extracted but format not recognized"
            }
        
        self.update_state(state="PROGRESS", meta={"progress": 90, "message": "Finalizing extraction"})
        
        # Store result
        task_results[file_id] = {
            "status": "completed",
            "content": extracted_content,
            "file_id": file_id
        }
        
        return {
            "status": "completed",
            "file_id": file_id,
            "content": extracted_content
        }
        
    except Exception as e:
        logger.error(f"File extraction failed for {file_id}: {e}")
        task_results[file_id] = {
            "status": "error",
            "error": str(e),
            "file_id": file_id
        }
        raise

@celery_app.task(bind=True)
def process_diagnosis(self, session_id: str, diagnosis_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process diagnosis request asynchronously"""
    try:
        self.update_state(state="PROGRESS", meta={"progress": 10, "message": "Starting diagnosis"})
        
        # Import here to avoid circular imports
        from app.core.faiss_client import faiss_client
        from app.core.kg_client import kg_client
        from app.core.llm_client import llm_client, build_diagnosis_prompt
        
        # Initialize clients
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def run_diagnosis():
            await faiss_client.initialize()
            await kg_client.initialize()
            
            self.update_state(state="PROGRESS", meta={"progress": 30, "message": "Searching similar cases"})
            
            # Build query from patient data
            complaints = diagnosis_data.get("complaints", [])
            symptoms = diagnosis_data.get("symptoms", [])
            query_text = f"Patient complaints: {', '.join(complaints)}. Symptoms: {', '.join(symptoms)}"
            
            # Search similar cases
            similar_cases = await faiss_client.search(query_text, diagnosis_data.get("top_k", 5))
            
            self.update_state(state="PROGRESS", meta={"progress": 50, "message": "Analyzing knowledge graph"})
            
            # Get relevant triplets
            kg_triplets = await kg_client.get_top_triplets_for_patient(symptoms, top_k=10)
            
            self.update_state(state="PROGRESS", meta={"progress": 70, "message": "Generating diagnosis"})
            
            # Build prompt and get LLM response
            prompt = build_diagnosis_prompt(diagnosis_data, similar_cases, kg_triplets)
            llm_response = await llm_client.generate_diagnosis(prompt)
            
            self.update_state(state="PROGRESS", meta={"progress": 90, "message": "Finalizing results"})
            
            # Format response
            from datetime import datetime
            import uuid
            
            result = {
                "differentialDiagnosis": [
                    {
                        "condition": diag["condition"],
                        "confidence": diag["confidence"],
                        "description": diag["description"],
                        "icd10": diag.get("icd10")
                    }
                    for diag in llm_response.get("differential_diagnosis", [])
                ],
                "recommendedActions": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": action["text"],
                        "priority": action["priority"],
                        "category": action["category"]
                    }
                    for action in llm_response.get("recommended_actions", [])
                ],
                "followUpQuestions": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": question["text"]
                    }
                    for question in llm_response.get("follow_up_questions", [])
                ],
                "similarCases": [
                    {
                        "caseId": case["case_id"],
                        "similarity": case["similarity"],
                        "diagnosis": case["diagnosis"],
                        "outcome": case.get("outcome")
                    }
                    for case in similar_cases
                ],
                "session": {
                    "sessionId": session_id,
                    "startedAt": datetime.utcnow().isoformat(),
                    "durationSec": 5.2  # Mock duration
                }
            }
            
            return result
        
        result = loop.run_until_complete(run_diagnosis())
        
        # Store result
        task_results[session_id] = {
            "status": "completed",
            "result": result,
            "session_id": session_id
        }
        
        return {
            "status": "completed",
            "session_id": session_id,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Diagnosis processing failed for {session_id}: {e}")
        task_results[session_id] = {
            "status": "error",
            "error": str(e),
            "session_id": session_id
        }
        raise

@celery_app.task(bind=True)
def generate_report(self, session_id: str, export_format: str, options: Dict[str, Any]) -> Dict[str, Any]:
    """Generate diagnosis report in specified format"""
    try:
        self.update_state(state="PROGRESS", meta={"progress": 20, "message": "Preparing report"})
        
        # Get diagnosis result
        diagnosis_result = task_results.get(session_id, {}).get("result")
        if not diagnosis_result:
            raise ValueError(f"No diagnosis result found for session {session_id}")
        
        self.update_state(state="PROGRESS", meta={"progress": 60, "message": "Generating report"})
        
        if export_format == "json":
            report_data = diagnosis_result
            download_url = None
        elif export_format == "pdf":
            # Mock PDF generation
            report_data = None
            download_url = f"/api/v1/reports/{session_id}.pdf"
        elif export_format == "hl7":
            # Mock HL7 format
            report_data = {
                "message_type": "ORU^R01",
                "patient_id": diagnosis_result["session"]["sessionId"],
                "diagnosis": diagnosis_result["differentialDiagnosis"][0]["condition"] if diagnosis_result["differentialDiagnosis"] else "Unknown"
            }
            download_url = None
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
        
        self.update_state(state="PROGRESS", meta={"progress": 90, "message": "Finalizing report"})
        
        return {
            "status": "completed",
            "format": export_format,
            "download_url": download_url,
            "data": report_data
        }
        
    except Exception as e:
        logger.error(f"Report generation failed for {session_id}: {e}")
        raise

def get_task_result(task_id: str) -> Optional[Dict[str, Any]]:
    """Get task result from storage"""
    return task_results.get(task_id)

def get_task_status(task_id: str) -> Dict[str, Any]:
    """Get task status from Celery"""
    try:
        result = celery_app.AsyncResult(task_id)
        
        if result.state == "PENDING":
            return {"status": "pending", "progress": 0}
        elif result.state == "PROGRESS":
            return {
                "status": "processing",
                "progress": result.info.get("progress", 0),
                "message": result.info.get("message", "")
            }
        elif result.state == "SUCCESS":
            return {"status": "completed", "progress": 100, "result": result.result}
        elif result.state == "FAILURE":
            return {"status": "error", "error": str(result.info)}
        else:
            return {"status": result.state, "progress": 0}
    
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        return {"status": "error", "error": str(e)}