from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.schemas import (
    DiagnosisRequest, DiagnosisStartResponse, DiagnosisStatusResponse, 
    DiagnosisStatus, ExportRequest, ExportResponse, FeedbackRequest, FeedbackResponse
)
from app.core.tasks import process_diagnosis, generate_report, get_task_status
from app.utils.io_helpers import DatabaseHelper, ValidationHelper
from app.utils.prometheus_metrics import metrics, increment_active_sessions, decrement_active_sessions

router = APIRouter()

@router.post("/diagnosis/start", response_model=DiagnosisStartResponse)
async def start_diagnosis(request: DiagnosisRequest):
    """Start a new diagnosis session"""
    
    try:
        # Validate request
        validation_errors = ValidationHelper.validate_diagnosis_request(request.dict())
        if validation_errors:
            raise HTTPException(status_code=400, detail=validation_errors)
        
        # Create session record
        session_id = DatabaseHelper.create_session(request.dict())
        
        # Start background diagnosis processing
        task = process_diagnosis.delay(session_id, request.dict())
        
        # Track metrics
        increment_active_sessions()
        metrics.record_background_task("diagnosis", success=True)
        
        logger.info(f"Started diagnosis session: {session_id}")
        
        return DiagnosisStartResponse(
            sessionId=session_id,
            status=DiagnosisStatus.PROCESSING
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start diagnosis: {e}")
        metrics.record_background_task("diagnosis", success=False)
        raise HTTPException(status_code=500, detail=f"Failed to start diagnosis: {str(e)}")

@router.get("/diagnosis/{session_id}", response_model=DiagnosisStatusResponse)
async def get_diagnosis_status(session_id: str):
    """Get diagnosis session status and results"""
    
    try:
        # Get session from database
        session = DatabaseHelper.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if we have results from background task
        from app.core.tasks import task_results
        
        if session_id in task_results:
            result = task_results[session_id]
            
            if result["status"] == "completed":
                # Update session in database
                DatabaseHelper.update_session(session_id, {
                    "status": "completed",
                    "result": result["result"]
                })
                
                decrement_active_sessions()
                
                return DiagnosisStatusResponse(
                    status=DiagnosisStatus.COMPLETED,
                    result=result["result"]
                )
            
            elif result["status"] == "error":
                DatabaseHelper.update_session(session_id, {
                    "status": "error",
                    "error": result.get("error")
                })
                
                decrement_active_sessions()
                
                return DiagnosisStatusResponse(
                    status=DiagnosisStatus.ERROR,
                    message=f"Diagnosis failed: {result.get('error', 'Unknown error')}"
                )
        
        # Still processing
        return DiagnosisStatusResponse(
            status=DiagnosisStatus.PROCESSING,
            message="Diagnosis in progress"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get diagnosis status for {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.post("/diagnosis/{session_id}/export", response_model=ExportResponse)
async def export_diagnosis(session_id: str, request: ExportRequest):
    """Export diagnosis results in specified format"""
    
    try:
        # Check if session exists and is completed
        session = DatabaseHelper.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Diagnosis not completed yet")
        
        # Start export task
        task = generate_report.delay(session_id, request.format.value, request.dict())
        
        # For immediate JSON export, return data directly
        if request.format.value == "json":
            from app.core.tasks import task_results
            diagnosis_result = task_results.get(session_id, {}).get("result")
            
            if diagnosis_result:
                return ExportResponse(data=diagnosis_result)
        
        # For other formats, return task info
        return ExportResponse(
            downloadUrl=f"/api/v1/diagnosis/{session_id}/download/{task.id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export diagnosis for {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/diagnosis/{session_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(session_id: str, feedback: FeedbackRequest):
    """Submit feedback for a diagnosis session"""
    
    try:
        # Check if session exists
        session = DatabaseHelper.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create feedback record
        feedback_id = DatabaseHelper.create_feedback(session_id, feedback.dict())
        
        logger.info(f"Feedback submitted for session {session_id}: {feedback_id}")
        
        return FeedbackResponse(
            message="Feedback submitted successfully",
            feedbackId=feedback_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit feedback for {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@router.get("/diagnosis/{session_id}/summary")
async def get_diagnosis_summary(session_id: str):
    """Get a summary of the diagnosis session"""
    
    try:
        session = DatabaseHelper.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        from app.utils.io_helpers import generate_session_summary
        
        summary = {
            "sessionId": session_id,
            "status": session.get("status", "unknown"),
            "createdAt": session.get("created_at"),
            "patientId": session.get("patient_id"),
            "summary": generate_session_summary(session),
            "topDiagnosis": None,
            "confidence": None
        }
        
        # Add top diagnosis if available
        if session.get("result") and session["result"].get("differentialDiagnosis"):
            top_diagnosis = session["result"]["differentialDiagnosis"][0]
            summary["topDiagnosis"] = top_diagnosis.get("condition")
            summary["confidence"] = top_diagnosis.get("confidence")
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get summary for {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@router.delete("/diagnosis/{session_id}")
async def delete_diagnosis_session(session_id: str):
    """Delete a diagnosis session"""
    
    try:
        session = DatabaseHelper.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Soft delete
        DatabaseHelper.update_session(session_id, {"deleted": True})
        
        # Clean up task results
        from app.core.tasks import task_results
        if session_id in task_results:
            del task_results[session_id]
        
        logger.info(f"Deleted diagnosis session: {session_id}")
        
        return {
            "sessionId": session_id,
            "status": "deleted",
            "message": "Session deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")