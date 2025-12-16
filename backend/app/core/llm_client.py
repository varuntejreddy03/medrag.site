import json
import asyncio
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod
from loguru import logger
from app.config import settings

class LLMClient(ABC):
    @abstractmethod
    async def generate_diagnosis(self, prompt: str) -> Dict[str, Any]:
        pass

class PerplexityClient(LLMClient):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.perplexity.ai/chat/completions"
    
    async def generate_diagnosis(self, prompt: str) -> Dict[str, Any]:
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "sonar-pro",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.1,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "differential_diagnosis": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "condition": {"type": "string"},
                                            "confidence": {"type": "number"},
                                            "description": {"type": "string"},
                                            "icd10": {"type": "string"}
                                        },
                                        "required": ["condition", "confidence", "description"]
                                    }
                                },
                                "recommended_actions": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "text": {"type": "string"},
                                            "priority": {"type": "string"},
                                            "category": {"type": "string"}
                                        },
                                        "required": ["text", "priority", "category"]
                                    }
                                },
                                "follow_up_questions": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "text": {"type": "string"}
                                        },
                                        "required": ["text"]
                                    }
                                }
                            },
                            "required": ["differential_diagnosis", "recommended_actions", "follow_up_questions"]
                        }
                    }
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.base_url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]
                        return json.loads(content)
                    else:
                        error_text = await response.text()
                        logger.error(f"Perplexity API error {response.status}: {error_text}")
                        return self._get_fallback_response()
        
        except Exception as e:
            logger.error(f"Perplexity client error: {e}")
            return self._get_fallback_response()
    
    def _get_fallback_response(self) -> Dict[str, Any]:
        return {
            "differential_diagnosis": [
                {
                    "condition": "Further evaluation needed",
                    "confidence": 50.0,
                    "description": "Unable to generate diagnosis due to API error",
                    "icd10": "Z00.00"
                }
            ],
            "recommended_actions": [
                {
                    "text": "Consult with healthcare provider",
                    "priority": "high",
                    "category": "referral"
                }
            ],
            "follow_up_questions": [
                {
                    "text": "Please provide more detailed symptoms"
                }
            ]
        }

class MockLLMClient(LLMClient):
    async def generate_diagnosis(self, prompt: str) -> Dict[str, Any]:
        # Simulate processing delay
        await asyncio.sleep(1)
        
        # Parse symptoms from prompt for more realistic mock responses
        symptoms_in_prompt = []
        if "chest pain" in prompt.lower():
            symptoms_in_prompt.append("chest_pain")
        if "fever" in prompt.lower():
            symptoms_in_prompt.append("fever")
        if "cough" in prompt.lower():
            symptoms_in_prompt.append("cough")
        
        # Generate mock diagnosis based on symptoms
        if "chest_pain" in symptoms_in_prompt:
            return {
                "differential_diagnosis": [
                    {
                        "condition": "Gastroesophageal Reflux Disease (GERD)",
                        "confidence": 78.2,
                        "description": "Acid reflux causing chest discomfort, often related to meals",
                        "icd10": "K21.9"
                    },
                    {
                        "condition": "Costochondritis",
                        "confidence": 65.4,
                        "description": "Inflammation of cartilage connecting ribs to breastbone",
                        "icd10": "M94.0"
                    },
                    {
                        "condition": "Anxiety-related chest pain",
                        "confidence": 45.8,
                        "description": "Non-cardiac chest pain associated with anxiety or stress",
                        "icd10": "F41.9"
                    }
                ],
                "recommended_actions": [
                    {
                        "text": "Order ECG to rule out cardiac causes",
                        "priority": "high",
                        "category": "imaging"
                    },
                    {
                        "text": "Consider proton pump inhibitor trial",
                        "priority": "medium",
                        "category": "medication"
                    },
                    {
                        "text": "Chest X-ray if respiratory symptoms present",
                        "priority": "medium",
                        "category": "imaging"
                    }
                ],
                "follow_up_questions": [
                    {
                        "text": "Does the pain worsen with deep breathing or movement?"
                    },
                    {
                        "text": "Is the pain related to meals or lying down?"
                    },
                    {
                        "text": "Any associated shortness of breath or palpitations?"
                    }
                ]
            }
        
        # Default mock response
        return {
            "differential_diagnosis": [
                {
                    "condition": "Viral upper respiratory infection",
                    "confidence": 72.5,
                    "description": "Common viral infection affecting upper respiratory tract",
                    "icd10": "J06.9"
                },
                {
                    "condition": "Allergic rhinitis",
                    "confidence": 58.3,
                    "description": "Allergic reaction causing nasal and respiratory symptoms",
                    "icd10": "J30.9"
                }
            ],
            "recommended_actions": [
                {
                    "text": "Supportive care with rest and fluids",
                    "priority": "medium",
                    "category": "lifestyle"
                },
                {
                    "text": "Consider antihistamine if allergic component suspected",
                    "priority": "low",
                    "category": "medication"
                }
            ],
            "follow_up_questions": [
                {
                    "text": "How long have symptoms been present?"
                },
                {
                    "text": "Any known allergies or triggers?"
                }
            ]
        }

class LLMClientFactory:
    @staticmethod
    def create_client() -> LLMClient:
        provider = settings.llm_provider.lower()
        
        if provider == "perplexity" and settings.perplexity_api_key:
            logger.info("Using Perplexity LLM client")
            return PerplexityClient(settings.perplexity_api_key)
        elif provider == "openai" and settings.openai_api_key:
            # TODO: Implement OpenAI client
            logger.warning("OpenAI client not implemented, falling back to mock")
            return MockLLMClient()
        elif provider == "hf" and settings.hf_api_token:
            # TODO: Implement Hugging Face client
            logger.warning("Hugging Face client not implemented, falling back to mock")
            return MockLLMClient()
        else:
            logger.info("Using mock LLM client")
            return MockLLMClient()

def build_diagnosis_prompt(
    patient_data: Dict[str, Any],
    similar_cases: List[Dict],
    kg_triplets: List[Dict]
) -> str:
    """Build structured prompt for LLM diagnosis"""
    
    # Extract patient information
    complaints = patient_data.get("complaints", [])
    symptoms = patient_data.get("symptoms", [])
    vitals = patient_data.get("vitals", {})
    history = patient_data.get("history", {})
    
    prompt = f"""You are an expert medical AI assistant. Analyze the following patient case and provide a differential diagnosis.

PATIENT INFORMATION:
Complaints: {', '.join(complaints)}
Symptoms: {', '.join(symptoms)}
"""
    
    if vitals:
        prompt += f"Vitals: {json.dumps(vitals, indent=2)}\n"
    
    if history:
        prompt += f"Medical History: {json.dumps(history, indent=2)}\n"
    
    if similar_cases:
        prompt += "\nSIMILAR CASES FROM DATABASE:\n"
        for i, case in enumerate(similar_cases[:3], 1):
            prompt += f"{i}. Case {case.get('case_id', 'Unknown')}: {case.get('diagnosis', 'Unknown')} (Similarity: {case.get('similarity', 0):.1f}%)\n"
            prompt += f"   Symptoms: {', '.join(case.get('symptoms', []))}\n"
            prompt += f"   Outcome: {case.get('outcome', 'Unknown')}\n"
    
    if kg_triplets:
        prompt += "\nRELEVANT MEDICAL KNOWLEDGE:\n"
        for triplet in kg_triplets[:5]:
            subject = triplet.get("subject", "")
            predicate = triplet.get("predicate", "")
            obj = triplet.get("object", "")
            prompt += f"- {subject} {predicate} {obj}\n"
    
    prompt += """
INSTRUCTIONS:
1. Provide a differential diagnosis with the top 5 most likely conditions
2. For each condition, include: name, confidence score (0-100), description, and ICD-10 code if known
3. Recommend specific diagnostic actions (labs, imaging, etc.) with priority levels
4. Suggest 3 follow-up questions to gather more information
5. Return response in the specified JSON format only.
"""
    
    return prompt

# Global LLM client instance
llm_client = LLMClientFactory.create_client()