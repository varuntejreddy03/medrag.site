import React, { useState, useEffect } from 'react';
import { useDiagnosis, useFeedback, useExport } from '@/hooks/useMedRAG';
import { formatDiagnosisForUI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Brain, 
  RefreshCw, 
  Download, 
  ThumbsUp, 
  ThumbsDown,
  AlertCircle,
  Activity,
  FileText,
  TrendingUp,
  CheckCircle2,
  Circle,
  Info,
  MessageSquare
} from 'lucide-react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SparklesCore } from '@/components/ui/sparkles';
import ChatInterface from '@/components/chat-interface';

interface Complaint {
  id: string;
  text: string;
  severity: 'high' | 'medium' | 'low';
}

interface SimilarCase {
  id: string;
  similarity: number;
  diagnosis: string;
  outcome: string;
}

interface Diagnosis {
  condition: string;
  confidence: number;
  description: string;
}

interface Action {
  id: string;
  text: string;
  completed: boolean;
}

interface Question {
  id: string;
  text: string;
}

const mockData = {
  patient: {
    name: 'John Doe',
    age: 42,
    gender: 'M'
  },
  complaints: [
    { id: '1', text: 'Persistent chest pain for 3 days', severity: 'high' as const },
    { id: '2', text: 'Shortness of breath during activity', severity: 'high' as const },
    { id: '3', text: 'Fatigue and dizziness', severity: 'medium' as const },
    { id: '4', text: 'Irregular heartbeat', severity: 'medium' as const }
  ],
  similarCases: [
    { id: 'CASE-2847', similarity: 94.2, diagnosis: 'Acute Coronary Syndrome', outcome: 'Successful intervention' },
    { id: 'CASE-1923', similarity: 89.7, diagnosis: 'Unstable Angina', outcome: 'Medical management' },
    { id: 'CASE-3156', similarity: 87.3, diagnosis: 'Myocardial Infarction', outcome: 'Emergency PCI' }
  ],
  diagnoses: [
    { condition: 'Acute Coronary Syndrome', confidence: 87, description: 'High probability based on symptoms and history' },
    { condition: 'Unstable Angina', confidence: 72, description: 'Consistent with chest pain pattern' },
    { condition: 'Pulmonary Embolism', confidence: 45, description: 'Consider as differential diagnosis' }
  ],
  actions: [
    { id: '1', text: 'Order ECG immediately', completed: false },
    { id: '2', text: 'Check cardiac biomarkers (Troponin)', completed: false },
    { id: '3', text: 'Administer aspirin 325mg', completed: false },
    { id: '4', text: 'Consult cardiology', completed: false },
    { id: '5', text: 'Monitor vital signs continuously', completed: false }
  ],
  questions: [
    { id: '1', text: 'Does the pain radiate to the left arm or jaw?' },
    { id: '2', text: 'Any history of heart disease in family?' },
    { id: '3', text: 'Are you currently taking any medications?' },
    { id: '4', text: 'Have you experienced this before?' }
  ]
};

interface DiagnosticDashboardProps {
  onBack?: () => void;
}

const DiagnosticDashboard: React.FC<DiagnosticDashboardProps> = ({ onBack }) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [diagnosisPrompt, setDiagnosisPrompt] = useState('');
  const [patientComplaints, setPatientComplaints] = useState<Complaint[]>([]);
  
  const { diagnosis, getDiagnosis, loading: diagnosisLoading } = useDiagnosis();
  const { submitFeedback } = useFeedback();
  const { exportCase } = useExport();

  useEffect(() => {
    // Get case data from localStorage or props
    const caseData = localStorage.getItem('currentCase');
    let prompt = "42M chest pain 3d, SOB, fatigue, irregular HR. Dx?";
    let complaints = mockData.complaints;
    
    if (caseData) {
      const parsed = JSON.parse(caseData);
      prompt = `${parsed.patient?.age}${parsed.patient?.gender?.[0]?.toUpperCase()} ${parsed.manifestations?.complaint}. Symptoms: ${parsed.manifestations?.symptoms?.join(', ')}. Dx?`;
      
      // Generate complaints from case data
      complaints = [
        { id: '1', text: parsed.manifestations?.complaint || 'Chief complaint', severity: 'high' as const },
        ...parsed.manifestations?.symptoms?.map((s: string, i: number) => ({
          id: `${i + 2}`,
          text: s,
          severity: (i === 0 ? 'high' : i === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        })) || []
      ];
    }
    
    setDiagnosisPrompt(prompt);
    setPatientComplaints(complaints);
    
    const getDemoData = async () => {
      try {
        const patientData = {
          fullName: "John Doe",
          age: 42,
          gender: "male" as const
        };
        
        await getDiagnosis(prompt, patientData);
        setCurrentCaseId(`CASE-${Date.now()}`);
      } catch (error) {
        console.error('Failed to get diagnosis:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    
    getDemoData();
  }, [getDiagnosis]);

  const toggleAction = (id: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedActions(newSelected);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-slate-900 text-white overflow-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-[1800px] mx-auto">
            {/* Top Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center mb-6"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <RainbowButton
                  onClick={onBack}
                  className="bg-gray-900/80 border-white/20 text-white hover:bg-gray-800/80 hover:border-blue-500/50 transition-all"
                >
                  <motion.div
                    whileHover={{ x: -3 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  </motion.div>
                  Back to Dashboard
                </RainbowButton>
              </motion.div>

            </motion.div>

            {/* Main Layout - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 pb-8">
              {/* Left Panel - Input Summary */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 lg:space-y-6"
              >
                {/* Chief Complaints */}
                <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-shadow-lg">
                      <AlertCircle className="h-5 w-5" />
                      Chief Complaints
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {patientComplaints.map((complaint, index) => (
                      <motion.div
                        key={complaint.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-all border border-white/10"
                      >
                        <Activity className={`h-5 w-5 mt-0.5 ${getSeverityColor(complaint.severity)} drop-shadow-lg`} />
                        <span className="text-sm flex-1 text-white font-medium drop-shadow-md">{complaint.text}</span>
                        <Badge variant="outline" className={`${getSeverityColor(complaint.severity)} border-current bg-black/50 font-semibold`}>
                          {complaint.severity}
                        </Badge>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* Knowledge Graph */}
                <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-shadow-lg">
                      <TrendingUp className="h-5 w-5" />
                      Knowledge Graph
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-32 bg-black/40 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-emerald-400 text-lg font-semibold mb-2">🚀 Coming Soon</div>
                        <p className="text-slate-400 text-sm">Advanced knowledge mapping</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Similar Cases */}
                <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-shadow-lg">
                      <FileText className="h-5 w-5" />
                      Similar Cases (Top-K)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-32 bg-black/40 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-emerald-400 text-lg font-semibold mb-2">🚀 Coming Soon</div>
                        <p className="text-slate-400 text-sm">Case similarity matching</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Middle Panel - AI Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4 lg:space-y-6"
              >
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center h-64 bg-gray-900/90 backdrop-blur-lg border border-white/30 rounded-lg shadow-2xl"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 180, 360]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        <Brain className="h-16 w-16 text-blue-400" />
                      </motion.div>
                      <motion.p
                        className="mt-4 text-lg text-white font-bold drop-shadow-lg"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        🧠 MedRag AI Processing...
                      </motion.p>
                      <motion.div
                        className="mt-4 flex space-x-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-blue-400 rounded-full"
                            animate={{
                              y: [0, -10, 0],
                              opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.2
                            }}
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* Differential Diagnosis */}
                      <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white text-shadow-lg text-xl">
                            <Brain className="h-6 w-6" />
                            AI Diagnosis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {(diagnosis ? [
                        {
                          condition: diagnosis.diagnosis.replace(/\*\*|###|\d+\./g, '').split('.')[0].trim(),
                          confidence: Math.min(100, Math.max(0, diagnosis.confidence || 85)),
                          description: diagnosis.reasoning.split('**Explanation:**')[1]?.split('###')[0]?.replace(/\*\*/g, '').trim() || 'AI-powered diagnosis based on symptoms'
                        }
                      ] : mockData.diagnoses).map((diagnosisItem, index) => (
                            <motion.div
                              key={`diagnosis-${index}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.2 }}
                              className="space-y-4 p-4 bg-black/30 rounded-lg border border-white/10"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-white drop-shadow-md">{diagnosisItem.condition}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-emerald-400 drop-shadow-md">{diagnosisItem.confidence}%</span>
                                </div>
                              </div>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ delay: index * 0.2 + 0.3, duration: 0.8 }}
                              >
                                <Progress
                                  value={diagnosisItem.confidence}
                                  className="h-3 bg-black/50 border border-white/20"
                                />
                              </motion.div>
                              <div className="pt-2 border-t border-white/10">
                                <p className="text-sm text-white/90 leading-relaxed">{diagnosisItem.description}</p>
                              </div>
                            </motion.div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Recommended Actions */}
                      <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white text-shadow-lg">
                            <CheckCircle2 className="h-5 w-5" />
                            Recommended Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {['Order ECG', 'Blood Tests', 'Cardiology Consult'].map((action, index) => (
                            <motion.div
                              key={`action-${index}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-all cursor-pointer border border-white/10"
                              onClick={() => toggleAction(action)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {selectedActions.has(action) ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-400" />
                              )}
                              <span className={`text-sm flex-1 font-medium ${selectedActions.has(action) ? 'line-through text-gray-400' : 'text-white'}`}>
                                {action}
                              </span>
                            </motion.div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Follow-up Questions */}
                      <Card className="bg-gray-900/90 backdrop-blur-lg border-white/30 shadow-2xl">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white text-shadow-lg">
                            <Activity className="h-5 w-5" />
                            Follow-up Questions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {(diagnosis?.questions || mockData.questions.map((q: Question) => q.text)).map((question: string | Question, index: number) => (
                              <motion.button
                                key={typeof question === 'string' ? `q-${index}` : (question as Question).id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, rotateZ: 2 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-4 py-2 text-sm bg-gray-500/30 hover:bg-gray-500/50 border border-gray-400/50 rounded-full transition-all text-white font-medium drop-shadow-md"
                              >
                                {typeof question === 'string' ? question : (question as Question).text}
                              </motion.button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Action Buttons */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap gap-3"
                      >
                        <RainbowButton
                          className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-white disabled:opacity-50"
                          disabled={isRegenerating || diagnosisLoading}
                          onClick={async () => {
                            setIsRegenerating(true);
                            try {
                              const patientData = {
                                fullName: "John Doe",
                                age: 42,
                                gender: "male" as const
                              };
                              await getDiagnosis(diagnosisPrompt, patientData);
                            } catch (error) {
                              console.error('Regeneration failed:', error);
                            } finally {
                              setIsRegenerating(false);
                            }
                          }}
                        >
                          <motion.div
                            animate={isRegenerating ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ duration: 1, repeat: isRegenerating ? Infinity : 0, ease: "linear" }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                          </motion.div>
                          {isRegenerating ? 'Regenerating...' : 'Regenerate Diagnosis'}
                        </RainbowButton>
                        <RainbowButton
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 disabled:opacity-50"
                          disabled={isExporting}
                          onClick={async () => {
                            setIsExporting(true);
                            try {
                              const caseData = localStorage.getItem('currentCase');
                              if (caseData) {
                                const parsed = JSON.parse(caseData);
                                const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `medrag-case-${Date.now()}.json`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              }
                            } catch (error) {
                              console.error('Export failed:', error);
                            } finally {
                              setIsExporting(false);
                            }
                          }}
                        >
                          <motion.div
                            animate={isExporting ? { y: [0, -5, 0] } : { y: 0 }}
                            transition={{ duration: 0.5, repeat: isExporting ? Infinity : 0 }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                          </motion.div>
                          {isExporting ? 'Exporting...' : 'Export Report'}
                        </RainbowButton>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Right Panel - Chat Interface */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="h-[600px]">
                  <ChatInterface 
                    initialPrompt="Brief medical chat. Keep responses under 100 words."
                    onDiagnosis={(diagnosisData) => {
                      console.log('New diagnosis from chat:', diagnosisData);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DiagnosticDashboard;