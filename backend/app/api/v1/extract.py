from fastapi import APIRouter, HTTPException
from loguru import logger

from app.core.tasks import extract_file_content, get_task_status
from app.utils.prometheus_metrics import metrics

router = APIRouter()

@router.post("/extract/{file_id}")
async def trigger_extraction(file_id: str):
    """Trigger file extraction if not already started"""
    
    try:
        # Check if extraction already exists
        from app.core.tasks import task_results
        
        if file_id in task_results:
            result = task_results[file_id]
            if result["status"] == "completed":
                return {
                    "message": "Extraction already completed",
                    "fileId": file_id,
                    "status": "completed"
                }
            elif result["status"] == "error":
                # Retry extraction
                task = extract_file_content.delay(file_id, f"retry_{file_id}")
                return {
                    "message": "Extraction retried",
                    "fileId": file_id,
                    "taskId": task.id,
                    "status": "processing"
                }
        
        # Start new extraction
        task = extract_file_content.delay(file_id, file_id)
        
        # Track metrics
        metrics.record_background_task("extraction", success=True)
        
        logger.info(f"Extraction started for file: {file_id}")
        
        return {
            "message": "Extraction started",
            "fileId": file_id,
            "taskId": task.id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger extraction for file {file_id}: {e}")
        metrics.record_background_task("extraction", success=False)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@router.get("/extract/{file_id}/status")
async def get_extraction_status(file_id: str):
    """Get extraction status for a file"""
    
    try:
        from app.core.tasks import task_results
        
        if file_id in task_results:
            result = task_results[file_id]
            return {
                "fileId": file_id,
                "status": result["status"],
                "content": result.get("content"),
                "error": result.get("error")
            }
        
        return {
            "fileId": file_id,
            "status": "not_found",
            "message": "No extraction found for this file"
        }
        
    except Exception as e:
        logger.error(f"Failed to get extraction status for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/extract/{file_id}/result")
async def get_extraction_result(file_id: str):
    """Get extracted content for a file"""
    
    try:
        from app.core.tasks import task_results
        
        if file_id not in task_results:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        result = task_results[file_id]
        
        if result["status"] != "completed":
            raise HTTPException(
                status_code=400, 
                detail=f"Extraction not completed. Status: {result['status']}"
            )
        
        return {
            "fileId": file_id,
            "content": result["content"],
            "extractedAt": result.get("completed_at"),
            "status": "completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extraction result for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get result: {str(e)}")