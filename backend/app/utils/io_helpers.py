import json
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger

# Simple in-memory storage for development (use proper DB in production)
patients_db = {}
sessions_db = {}
feedback_db = {}

class DatabaseHelper:
    @staticmethod
    def create_patient(patient_data: Dict[str, Any]) -> str:
        """Create a new patient record"""
        patient_id = str(uuid.uuid4())
        patient_record = {
            "id": patient_id,
            "name": patient_data.get("name"),
            "dob": patient_data.get("dob"),
            "diagnosis": patient_data.get("diagnosis"),
            "medications": patient_data.get("medications", []),
            "fileId": patient_data.get("fileId"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        patients_db[patient_id] = patient_record
        logger.info(f"Created patient record: {patient_id}")
        return patient_id
    
    @staticmethod
    def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
        """Get patient record by ID"""
        return patients_db.get(patient_id)
    
    @staticmethod
    def update_patient(patient_id: str, updates: Dict[str, Any]) -> bool:
        """Update patient record"""
        if patient_id in patients_db:
            patients_db[patient_id].update(updates)
            patients_db[patient_id]["updated_at"] = datetime.utcnow().isoformat()
            return True
        return False
    
    @staticmethod
    def create_session(session_data: Dict[str, Any]) -> str:
        """Create a new diagnosis session"""
        session_id = str(uuid.uuid4())
        session_record = {
            "id": session_id,
            "patient_id": session_data.get("patientId"),
            "complaints": session_data.get("complaints", []),
            "symptoms": session_data.get("symptoms", []),
            "vitals": session_data.get("vitals"),
            "history": session_data.get("history"),
            "top_k": session_data.get("top_k", 5),
            "status": "processing",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": None
        }
        sessions_db[session_id] = session_record
        logger.info(f"Created diagnosis session: {session_id}")
        return session_id
    
    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session record by ID"""
        return sessions_db.get(session_id)
    
    @staticmethod
    def update_session(session_id: str, updates: Dict[str, Any]) -> bool:
        """Update session record"""
        if session_id in sessions_db:
            sessions_db[session_id].update(updates)
            sessions_db[session_id]["updated_at"] = datetime.utcnow().isoformat()
            return True
        return False
    
    @staticmethod
    def create_feedback(session_id: str, feedback_data: Dict[str, Any]) -> str:
        """Create feedback record"""
        feedback_id = str(uuid.uuid4())
        feedback_record = {
            "id": feedback_id,
            "session_id": session_id,
            "rating": feedback_data.get("rating"),
            "comments": feedback_data.get("comments"),
            "correct_diagnosis": feedback_data.get("correctDiagnosis"),
            "created_at": datetime.utcnow().isoformat()
        }
        feedback_db[feedback_id] = feedback_record
        logger.info(f"Created feedback record: {feedback_id}")
        return feedback_id

class AuthHelper:
    @staticmethod
    def create_access_token(username: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        try:
            import jwt
            from app.config import settings
            
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
            
            to_encode = {
                "sub": username,
                "exp": expire,
                "iat": datetime.utcnow()
            }
            
            encoded_jwt = jwt.encode(
                to_encode, 
                settings.jwt_secret_key, 
                algorithm=settings.jwt_algorithm
            )
            return encoded_jwt
        
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise
    
    @staticmethod
    def verify_token(token: str) -> Optional[str]:
        """Verify JWT token and return username"""
        try:
            import jwt
            from app.config import settings
            
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key, 
                algorithms=[settings.jwt_algorithm]
            )
            username = payload.get("sub")
            return username
        
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None

class ValidationHelper:
    @staticmethod
    def validate_diagnosis_request(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate diagnosis request data"""
        errors = {}
        
        if not data.get("complaints") and not data.get("symptoms"):
            errors["complaints_symptoms"] = "Either complaints or symptoms must be provided"
        
        if data.get("top_k") and (data["top_k"] < 1 or data["top_k"] > 20):
            errors["top_k"] = "top_k must be between 1 and 20"
        
        return errors
    
    @staticmethod
    def validate_patient_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate patient data"""
        errors = {}
        
        if not data.get("name"):
            errors["name"] = "Patient name is required"
        
        # Add more validation as needed
        
        return errors

class ResponseHelper:
    @staticmethod
    def success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
        """Create success response"""
        return {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def error_response(message: str, errors: Optional[Dict] = None, status_code: int = 400) -> Dict[str, Any]:
        """Create error response"""
        response = {
            "success": False,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if errors:
            response["errors"] = errors
        
        return response
    
    @staticmethod
    def paginated_response(data: list, page: int, per_page: int, total: int) -> Dict[str, Any]:
        """Create paginated response"""
        return {
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            },
            "timestamp": datetime.utcnow().isoformat()
        }

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    import re
    # Remove or replace unsafe characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)
    return filename.strip('-')

def generate_session_summary(session_data: Dict[str, Any]) -> str:
    """Generate a summary of the diagnosis session"""
    complaints = session_data.get("complaints", [])
    symptoms = session_data.get("symptoms", [])
    
    summary_parts = []
    
    if complaints:
        summary_parts.append(f"Complaints: {', '.join(complaints)}")
    
    if symptoms:
        summary_parts.append(f"Symptoms: {', '.join(symptoms)}")
    
    if session_data.get("vitals"):
        vitals = session_data["vitals"]
        vital_strings = []
        if vitals.get("hr"):
            vital_strings.append(f"HR: {vitals['hr']}")
        if vitals.get("bp"):
            vital_strings.append(f"BP: {vitals['bp']}")
        if vital_strings:
            summary_parts.append(f"Vitals: {', '.join(vital_strings)}")
    
    return "; ".join(summary_parts) if summary_parts else "No summary available"