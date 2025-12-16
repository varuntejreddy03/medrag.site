from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.schemas import PatientCreate, PatientResponse
from app.utils.io_helpers import DatabaseHelper, ValidationHelper

router = APIRouter()

@router.post("/patients", response_model=PatientResponse)
async def create_patient(patient_data: PatientCreate):
    """Create a new patient record"""
    
    try:
        # Validate patient data
        validation_errors = ValidationHelper.validate_patient_data(patient_data.dict())
        if validation_errors:
            raise HTTPException(status_code=400, detail=validation_errors)
        
        # Create patient record
        patient_id = DatabaseHelper.create_patient(patient_data.dict())
        
        logger.info(f"Created patient: {patient_id}")
        
        return PatientResponse(
            patientId=patient_id,
            status="created"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create patient: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create patient: {str(e)}")

@router.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient record by ID"""
    
    try:
        patient = DatabaseHelper.get_patient(patient_id)
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return {
            "patientId": patient["id"],
            "name": patient["name"],
            "dob": patient["dob"],
            "diagnosis": patient["diagnosis"],
            "medications": patient["medications"],
            "fileId": patient["fileId"],
            "createdAt": patient["created_at"],
            "updatedAt": patient["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get patient: {str(e)}")

@router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, updates: dict):
    """Update patient record"""
    
    try:
        # Check if patient exists
        existing_patient = DatabaseHelper.get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Update patient
        success = DatabaseHelper.update_patient(patient_id, updates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update patient")
        
        logger.info(f"Updated patient: {patient_id}")
        
        return {
            "patientId": patient_id,
            "status": "updated",
            "message": "Patient record updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update patient: {str(e)}")

@router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete patient record (soft delete)"""
    
    try:
        # Check if patient exists
        existing_patient = DatabaseHelper.get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Soft delete by marking as deleted
        success = DatabaseHelper.update_patient(patient_id, {"deleted": True})
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete patient")
        
        logger.info(f"Deleted patient: {patient_id}")
        
        return {
            "patientId": patient_id,
            "status": "deleted",
            "message": "Patient record deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")

@router.get("/patients")
async def list_patients(skip: int = 0, limit: int = 100):
    """List all patients with pagination"""
    
    try:
        from app.utils.io_helpers import patients_db
        
        # Get all non-deleted patients
        all_patients = [
            patient for patient in patients_db.values() 
            if not patient.get("deleted", False)
        ]
        
        # Apply pagination
        total = len(all_patients)
        patients = all_patients[skip:skip + limit]
        
        # Format response
        formatted_patients = []
        for patient in patients:
            formatted_patients.append({
                "patientId": patient["id"],
                "name": patient["name"],
                "dob": patient["dob"],
                "diagnosis": patient["diagnosis"],
                "createdAt": patient["created_at"]
            })
        
        return {
            "patients": formatted_patients,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Failed to list patients: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list patients: {str(e)}")