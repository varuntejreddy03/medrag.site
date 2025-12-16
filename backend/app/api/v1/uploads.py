from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import uuid
from loguru import logger

from app.models.schemas import FileUploadResponse, FileProgressResponse, FileStatus
from app.core.storage import storage_client, validate_file_type, validate_file_size
from app.core.tasks import extract_file_content, get_task_status
from app.utils.prometheus_metrics import metrics
from app.config import settings

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload files for processing"""
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 10:  # Limit number of files
        raise HTTPException(status_code=400, detail="Too many files (max 10)")
    
    uploaded_files = []
    
    for file in files:
        try:
            # Validate file type
            if not validate_file_type(file.filename):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File type not allowed: {file.filename}"
                )
            
            # Read file content
            content = await file.read()
            
            # Validate file size
            if not validate_file_size(len(content)):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File too large: {file.filename} (max {settings.max_file_size_mb}MB)"
                )
            
            # Upload to storage
            file_id = await storage_client.upload_file(
                file_content=content,
                filename=file.filename,
                content_type=file.content_type or "application/octet-stream"
            )
            
            # Queue extraction task
            task = extract_file_content.delay(file_id, file.filename)
            
            # Track metrics
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
            metrics.record_file_upload(file_extension, success=True)
            
            uploaded_files.append({
                "fileId": file_id,
                "filename": file.filename,
                "taskId": task.id
            })
            
            logger.info(f"File uploaded successfully: {file_id} ({file.filename})")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to upload file {file.filename}: {e}")
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
            metrics.record_file_upload(file_extension, success=False)
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    # For simplicity, return the first file's info (extend for multiple files)
    first_file = uploaded_files[0]
    
    return FileUploadResponse(
        fileId=first_file["fileId"],
        status=FileStatus.UPLOADED,
        message=f"File uploaded successfully. Processing started."
    )

@router.get("/upload/{file_id}/progress", response_model=FileProgressResponse)
async def get_upload_progress(file_id: str):
    """Get file processing progress"""
    
    try:
        # Get task status from Celery
        # For simplicity, we'll check if we have a stored result
        from app.core.tasks import task_results
        
        # Check if we have a completed result
        if file_id in task_results:
            result = task_results[file_id]
            if result["status"] == "completed":
                return FileProgressResponse(
                    progress=100,
                    status=FileStatus.COMPLETED,
                    message="File processing completed"
                )
            elif result["status"] == "error":
                return FileProgressResponse(
                    progress=0,
                    status=FileStatus.ERROR,
                    message=f"Processing failed: {result.get('error', 'Unknown error')}"
                )
        
        # If no result yet, assume still processing
        return FileProgressResponse(
            progress=50,
            status=FileStatus.EXTRACTING,
            message="Processing file content"
        )
        
    except Exception as e:
        logger.error(f"Failed to get progress for file {file_id}: {e}")
        return FileProgressResponse(
            progress=0,
            status=FileStatus.ERROR,
            message=f"Failed to get progress: {str(e)}"
        )