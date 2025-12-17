from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class FileStatus(str, Enum):
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    COMPLETED = "completed"
    ERROR = "error"

class DiagnosisStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ActionCategory(str, Enum):
    IMAGING = "imaging"
    LAB = "lab"
    MEDICATION = "medication"
    REFERRAL = "referral"
    LIFESTYLE = "lifestyle"

class ExportFormat(str, Enum):
    PDF = "pdf"
    JSON = "json"
    HL7 = "hl7"

class FeedbackRating(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"

# Upload Models
class FileUploadResponse(BaseModel):
    fileId: str
    status: FileStatus
    message: str

class FileProgressResponse(BaseModel):
    progress: int = Field(ge=0, le=100)
    status: FileStatus
    message: Optional[str] = None

# Patient Models
class PatientCreate(BaseModel):
    name: str
    dob: Optional[str] = None
    diagnosis: Optional[str] = None
    medications: Optional[List[str]] = None
    fileId: Optional[str] = None

class PatientResponse(BaseModel):
    patientId: str
    status: str

# Diagnosis Models
class Vitals(BaseModel):
    hr: Optional[int] = None
    bp: Optional[str] = None
    temp: Optional[float] = None
    rr: Optional[int] = None
    spo2: Optional[int] = None

class DiagnosisRequest(BaseModel):
    patientId: Optional[str] = None
    complaints: List[str]
    symptoms: List[str]
    vitals: Optional[Vitals] = None
    history: Optional[Dict[str, Any]] = None
    top_k: int = Field(default=5, ge=1, le=20)

class DiagnosisStartResponse(BaseModel):
    sessionId: str
    status: DiagnosisStatus

class DifferentialDiagnosis(BaseModel):
    condition: str
    confidence: float = Field(ge=0, le=100)
    description: str
    icd10: Optional[str] = None

class RecommendedAction(BaseModel):
    id: str
    text: str
    priority: Priority
    category: ActionCategory

class FollowUpQuestion(BaseModel):
    id: str
    text: str

class SimilarCase(BaseModel):
    caseId: str
    similarity: float = Field(ge=0, le=100)
    diagnosis: str
    outcome: Optional[str] = None

class SessionInfo(BaseModel):
    sessionId: str
    startedAt: datetime
    durationSec: float

class DiagnosisResult(BaseModel):
    differentialDiagnosis: List[DifferentialDiagnosis]
    recommendedActions: List[RecommendedAction]
    followUpQuestions: List[FollowUpQuestion]
    similarCases: List[SimilarCase]
    session: SessionInfo

class DiagnosisStatusResponse(BaseModel):
    status: DiagnosisStatus
    result: Optional[DiagnosisResult] = None
    message: Optional[str] = None

# Knowledge Graph Models
class KGNode(BaseModel):
    id: str
    label: str
    type: str
    confidence: Optional[float] = None

class KGEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: Optional[float] = None

class KnowledgeGraphResponse(BaseModel):
    nodes: List[KGNode]
    edges: List[KGEdge]

# Export Models
class ExportRequest(BaseModel):
    format: ExportFormat
    includeActions: bool = True
    selectedActions: Optional[List[str]] = None

class ExportResponse(BaseModel):
    downloadUrl: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# Feedback Models
class FeedbackRequest(BaseModel):
    rating: FeedbackRating
    comments: Optional[str] = None
    correctDiagnosis: Optional[str] = None

class FeedbackResponse(BaseModel):
    message: str
    feedbackId: str

# Health Models
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    services: Dict[str, str]

# Authentication Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserInfo(BaseModel):
    username: str
    email: Optional[str] = None
    role: str = "user"