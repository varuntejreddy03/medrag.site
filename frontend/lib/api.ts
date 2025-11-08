// API client for MedRAG backend integration

const API_BASE_URL = 'http://100.88.41.29:8000';

export interface PatientData {
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
}

export interface ManifestationsData {
  complaint: string;
  symptoms: string[];
}

export interface HistoryData {
  files: string[];
  manualHistory: string;
}

export interface DiagnosisResult {
  diagnosis: string;
  differentials: string[];
  tests: string[];
  reasoning: string;
  confidence: number;
  actions: string[];
  questions: string[];
  similar_cases: Array<{
    id: string;
    similarity: number;
    diagnosis: string;
    outcome: string;
  }>;
}

export interface CaseRecord {
  id: string;
  patient: PatientData;
  manifestations: ManifestationsData;
  history?: HistoryData;
  status: string;
  created_at: string;
  diagnosis_result?: DiagnosisResult;
  updated_at?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class MedRAGAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/');
  }

  // Quick diagnosis
  async diagnose(query: string, patientData?: Partial<PatientData>): Promise<DiagnosisResult> {
    return this.request<DiagnosisResult>('/diagnose', {
      method: 'POST',
      body: JSON.stringify({
        query,
        k: 5
      }),
    });
  }

  // Chat endpoint
  async sendChatMessage(message: string, sessionId?: string): Promise<{
    response: string;
    session_id: string;
    matches: string[];
  }> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        session_id: sessionId
      }),
    });
  }

  // Submit complete case
  async submitCase(
    patient: PatientData,
    manifestations: ManifestationsData,
    history?: HistoryData
  ): Promise<{
    case_id: string;
    status: string;
    message: string;
    diagnosis_result?: DiagnosisResult;
  }> {
    return this.request('/cases', {
      method: 'POST',
      body: JSON.stringify({
        patient,
        manifestations,
        history: history || { files: [], manualHistory: '' },
      }),
    });
  }

  // Get dashboard stats
  async getDashboardStats(): Promise<{
    total_cases: number;
    pending_cases: number;
    diagnosed_cases: number;
    recent_cases: number;
  }> {
    return this.request('/dashboard/stats');
  }

  // File upload removed - will be added in next update

  // Get case by ID
  async getCase(caseId: string): Promise<CaseRecord> {
    return this.request<CaseRecord>(`/cases/${caseId}`);
  }

  // List cases with pagination
  async listCases(page: number = 1, perPage: number = 10): Promise<{
    cases: CaseRecord[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      pages: number;
    };
  }> {
    return this.request(`/cases?page=${page}&per_page=${perPage}`);
  }

  // Regenerate diagnosis
  async regenerateDiagnosis(caseId: string): Promise<{
    case_id: string;
    status: string;
    diagnosis_result: DiagnosisResult;
  }> {
    return this.request(`/cases/${caseId}/regenerate`, {
      method: 'POST',
    });
  }

  // Submit feedback
  async submitFeedback(
    caseId: string,
    feedbackType: 'positive' | 'negative',
    rating: number,
    comments: string = ''
  ): Promise<{
    message: string;
    feedback_id: string;
  }> {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        case_id: caseId,
        feedback_type: feedbackType,
        rating,
        comments,
      }),
    });
  }

  // Export case
  async exportCase(caseId: string): Promise<any> {
    return this.request(`/export/${caseId}`);
  }

  // Send verification code
  async sendVerification(email: string): Promise<{ message: string }> {
    return this.request('/send-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Verify code
  async verifyCode(email: string, code: string): Promise<{ message: string }> {
    return this.request('/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  // Auth endpoints
  async sendAuthCode(email: string): Promise<{ message: string }> {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyAuthCode(email: string, code: string): Promise<{ message: string }> {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  // Send patient email
  async sendPatientEmail(patientData: any): Promise<{ message: string }> {
    return this.request('/send-patient-email', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  // Clear chat session
  async clearChat(sessionId: string): Promise<{ message: string }> {
    return this.request(`/chat/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const medragAPI = new MedRAGAPI();

// Helper functions for frontend
export const formatDiagnosisForUI = (diagnosis: DiagnosisResult) => {
  const baseConfidence = Math.min(100, Math.max(0, diagnosis.confidence || 85));
  return {
    primaryDiagnosis: {
      condition: diagnosis.diagnosis,
      confidence: baseConfidence,
    },
    differentialDiagnoses: diagnosis.differentials.map((diff, index) => ({
      condition: diff,
      confidence: Math.min(100, Math.max(0, baseConfidence - ((index + 1) * 15))),
    })),
    recommendedTests: diagnosis.tests,
    recommendedActions: diagnosis.actions,
    followUpQuestions: diagnosis.questions,
    similarCases: diagnosis.similar_cases,
    clinicalReasoning: diagnosis.reasoning,
  };
};

export const validatePatientForm = (formData: Partial<PatientData>): string[] => {
  const errors: string[] = [];

  if (!formData.fullName || formData.fullName.length < 2) {
    errors.push('Full name must be at least 2 characters');
  }

  if (!formData.age || formData.age < 0 || formData.age > 150) {
    errors.push('Please enter a valid age');
  }

  if (!formData.phone || formData.phone.length < 10) {
    errors.push('Phone number must be at least 10 digits');
  }

  if (!formData.email || !formData.email.includes('@')) {
    errors.push('Please enter a valid email address');
  }

  return errors;
};

export const createCaseSummary = (caseData: CaseRecord) => {
  return {
    caseId: caseData.id,
    patientName: caseData.patient.fullName,
    age: caseData.patient.age,
    gender: caseData.patient.gender,
    chiefComplaint: caseData.manifestations.complaint.substring(0, 100) + '...',
    status: caseData.status,
    createdAt: caseData.created_at,
    hasDiagnosis: !!caseData.diagnosis_result,
    primaryDiagnosis: caseData.diagnosis_result?.diagnosis,
  };
};

// Error handling utility
export const handleAPIError = (error: any): string => {
  if (error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
};