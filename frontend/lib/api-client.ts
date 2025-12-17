import { API_CONFIG } from './config';

const API_URL = API_CONFIG.BASE_URL;

// Auth
export interface SignupData {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Diagnosis
export interface DiagnosisRequest {
  patient_name: string;
  patient_email: string;
  age: number;
  gender: string;
  symptoms: string;
  medical_history?: string;
}

// Chat
export interface ChatRequest {
  message: string;
  context?: string;
}

class APIClient {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private getOptions(includeCredentials = true) {
    return includeCredentials ? { credentials: 'include' as RequestCredentials } : {};
  }

  // Auth endpoints
  async signup(data: SignupData) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username: data.email, password: data.password }),
    });
    return res.json();
  }

  async login(data: LoginData) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ username: data.email, password: data.password }),
    });
    return res.json();
  }

  async logout() {
    // No logout endpoint in backend, just clear local token
    localStorage.removeItem('token');
    return { success: true };
  }

  async verifyEmail(token: string) {
    // No verify endpoint in backend
    return { success: true };
  }

  // User endpoints
  async getCurrentUser() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async updateUser(data: any) {
    const res = await fetch(`${API_URL}/api/v1/patients/${data.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Diagnosis endpoints
  async createDiagnosis(data: DiagnosisRequest) {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async getUserDiagnoses() {
    const res = await fetch(`${API_URL}/api/v1/patients`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (res.status === 403) throw new Error('Not authenticated');
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async getDiagnosis(id: string) {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/${id}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  // File upload endpoints
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('files', file);
    const res = await fetch(`${API_URL}/api/v1/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    return res.json();
  }

  async getUploadProgress(fileId: string) {
    const res = await fetch(`${API_URL}/api/v1/upload/${fileId}/progress`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async healthCheck() {
    const res = await fetch(`${API_URL}/api/v1/health`);
    return res.json();
  }

  // Diagnosis management endpoints
  async deleteDiagnosis(sessionId: string) {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async exportDiagnosis(sessionId: string, format: string = 'json') {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/${sessionId}/export`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ format }),
    });
    return res.json();
  }

  async submitFeedback(sessionId: string, feedback: any) {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/${sessionId}/feedback`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(feedback),
    });
    return res.json();
  }

  async getDiagnosisSummary(sessionId: string) {
    const res = await fetch(`${API_URL}/api/v1/diagnosis/${sessionId}/summary`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  // Knowledge Graph endpoints
  async getSessionKG(sessionId: string) {
    const res = await fetch(`${API_URL}/api/v1/kg/${sessionId}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async exploreNode(nodeId: string) {
    const res = await fetch(`${API_URL}/api/v1/kg/explore/${encodeURIComponent(nodeId)}`);
    return res.json();
  }

  async findPath(sourceNode: string, targetNode: string) {
    const res = await fetch(`${API_URL}/api/v1/kg/path/${encodeURIComponent(sourceNode)}/${encodeURIComponent(targetNode)}`);
    return res.json();
  }

  async getDiseaseInfo(diseaseName: string) {
    const res = await fetch(`${API_URL}/api/v1/kg/disease/${encodeURIComponent(diseaseName)}`);
    return res.json();
  }

  async getSymptomRelations(symptom: string) {
    const res = await fetch(`${API_URL}/api/v1/kg/symptoms/${encodeURIComponent(symptom)}`);
    return res.json();
  }

  async getKGStats() {
    const res = await fetch(`${API_URL}/api/v1/kg/stats`);
    return res.json();
  }

  async analyzeSymptoms(symptoms: string[]) {
    const res = await fetch(`${API_URL}/api/v1/kg/analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ symptoms }),
    });
    return res.json();
  }

  // Patient endpoints
  async createPatient(data: any) {
    const res = await fetch(`${API_URL}/api/v1/patients`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async getPatient(patientId: string) {
    const res = await fetch(`${API_URL}/api/v1/patients/${patientId}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async deletePatient(patientId: string) {
    const res = await fetch(`${API_URL}/api/v1/patients/${patientId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }
}

export const api = new APIClient();
