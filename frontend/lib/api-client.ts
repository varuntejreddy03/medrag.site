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
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async verifyEmail(token: string) {
    const res = await fetch(`${API_URL}/auth/verify?token=${token}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // User endpoints
  async getCurrentUser() {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async updateUser(data: any) {
    const res = await fetch(`${API_URL}/users/me`, {
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

  // RAG endpoints
  async chat(data: ChatRequest) {
    const res = await fetch(`${API_URL}/rag/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async quickDiagnosis(data: DiagnosisRequest) {
    const res = await fetch(`${API_URL}/rag/quick-diagnosis`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async healthCheck() {
    const res = await fetch(`${API_URL}/api/v1/health`);
    return res.json();
  }

  // Chat endpoints
  async chatWithDiagnosis(diagnosisId: number, message: string) {
    const res = await fetch(`${API_URL}/chat/`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ diagnosis_id: diagnosisId, message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async clearChatHistory(diagnosisId: number) {
    const res = await fetch(`${API_URL}/chat/${diagnosisId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  // Knowledge Graph endpoints
  async getKnowledgeGraphStats() {
    const res = await fetch(`${API_URL}/knowledge/stats`);
    return res.json();
  }

  async getDiseaseInfo(diseaseName: string) {
    const res = await fetch(`${API_URL}/knowledge/disease/${encodeURIComponent(diseaseName)}`);
    return res.json();
  }

  async getDiseaseSymptoms(diseaseName: string) {
    const res = await fetch(`${API_URL}/knowledge/symptoms/${encodeURIComponent(diseaseName)}`);
    return res.json();
  }

  async getSymptomDiseases(symptom: string) {
    const res = await fetch(`${API_URL}/knowledge/diseases/${encodeURIComponent(symptom)}`);
    return res.json();
  }
}

export const api = new APIClient();
