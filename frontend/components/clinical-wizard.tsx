import React, { useState, useEffect, useRef } from 'react';
import { useCases } from '@/hooks/useMedRAG';
import { PatientData, ManifestationsData, HistoryData } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  Mic,
  Upload,
  FileText,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SparklesCore } from '@/components/ui/sparkles';

interface ReviewData {
  consent: boolean;
}

interface WizardData {
  patient: PatientData | null;
  manifestations: ManifestationsData | null;
  history: HistoryData | null;
  review: ReviewData | null;
}

interface ClinicalWizardProps {
  onBack?: () => void;
  onComplete?: () => void;
}

// Progress Bar Component
const TopProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-2 mb-8">
      <div className="flex items-center justify-between text-sm">
        <motion.span 
          className="font-semibold text-white"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          Step {currentStep} of {totalSteps}
        </motion.span>
        <motion.span 
          className="text-sm font-bold text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {Math.round(progress)}%
        </motion.span>
      </div>
      <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        />
      </div>
    </div>
  );
};

// Step Navigation
const StepNav: React.FC<{ steps: any[]; currentStep: number; onStepClick: (step: number) => void }> = ({ steps, currentStep, onStepClick }) => {
  return (
    <nav className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = step.completed;
          const isAccessible = isCompleted || step.number <= currentStep;

          return (
            <motion.button
              key={step.number}
              onClick={() => isAccessible && onStepClick(step.number)}
              disabled={!isAccessible}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={isAccessible ? { scale: 1.1 } : {}}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                isActive
                  ? 'bg-white text-black shadow-lg'
                  : isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 text-white/60'
              } ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : step.number}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

// Input Components
const TextInput: React.FC<any> = ({ label, error, icon, ...props }) => (
  <div className="space-y-2">
    <Label className="text-white">{label}</Label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">{icon}</div>}
      <Input
        className={`${icon ? 'pl-10' : ''} bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50 ${error ? 'border-red-400' : ''}`}
        {...props}
      />
    </div>
    {error && (
      <p className="text-sm text-red-400 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

const NumberInput: React.FC<any> = ({ label, error, ...props }) => (
  <div className="space-y-2">
    <Label className="text-white">{label}</Label>
    <Input
      type="number"
      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50 ${error ? 'border-red-400' : ''}`}
      {...props}
    />
    {error && (
      <p className="text-sm text-red-400 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

const SelectInput: React.FC<any> = ({ label, error, options, value, onChange, placeholder = 'Select...' }) => (
  <div className="space-y-2">
    <Label className="text-white">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`bg-white/10 border-white/20 text-white focus:border-white/50 ${error ? 'border-red-400' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/20">
        {options.map((option: any) => (
          <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && (
      <p className="text-sm text-red-400 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

const TextAreaWithCount: React.FC<any> = ({ label, error, maxLength = 1000, value, onChange, ...props }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-white">{label}</Label>
      <span className="text-xs text-white/60">
        {value.length} / {maxLength}
      </span>
    </div>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50 ${error ? 'border-red-400' : ''}`}
      {...props}
    />
    {error && (
      <p className="text-sm text-red-400 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

// Voice Input Component
const VoiceMicButton: React.FC<{ onTranscript: (text: string) => void }> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Mock voice input
    if (!isRecording) {
      setTimeout(() => {
        onTranscript("Patient reports chest pain and shortness of breath");
        setIsRecording(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-3">
      <RainbowButton
        type="button"
        onClick={toggleRecording}
        className={`font-bold ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
        }`}
      >
        <motion.div
          animate={isRecording ? { scale: [1, 1.3, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <Mic className="w-5 h-5 mr-2" />
        </motion.div>
        {isRecording ? 'Stop Recording' : 'Start Voice Input'}
      </RainbowButton>
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm font-semibold p-4 bg-red-500/20 rounded-lg border border-red-400/50"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 bg-red-400 rounded-full"
              />
              <span className="text-red-400">Listening...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Suggestion Chips
const SuggestionChips: React.FC<{ suggestions: string[]; selected: string[]; onToggle: (suggestion: string) => void }> = ({ suggestions, selected, onToggle }) => (
  <div className="space-y-2">
    <Label className="text-white">Suggested Symptoms</Label>
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => {
        const isSelected = selected.includes(suggestion);
        return (
          <motion.div key={suggestion} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Badge
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-white text-black hover:bg-white/90' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              onClick={() => onToggle(suggestion)}
            >
              {suggestion}
              {isSelected && <Check className="w-3 h-3 ml-1" />}
            </Badge>
          </motion.div>
        );
      })}
    </div>
  </div>
);

// Action Bar
const ActionBar: React.FC<any> = ({ onContinue, onSubmit, continueDisabled = false, isSubmitting = false, isLastStep = false }) => (
  <div className="flex justify-center pt-6 border-t border-white/20">
    {isLastStep ? (
      <RainbowButton 
        onClick={onSubmit} 
        disabled={isSubmitting || continueDisabled}
        className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 w-full md:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Submit Case
            <Check className="w-5 h-5 ml-2" />
          </>
        )}
      </RainbowButton>
    ) : (
      <RainbowButton 
        onClick={onContinue} 
        disabled={continueDisabled}
        className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full md:w-auto"
      >
        Continue
        <ChevronRight className="w-4 h-4 ml-1" />
      </RainbowButton>
    )}
  </div>
);

// Step Components
const Step1PatientInfo: React.FC<any> = ({ onNext, initialData }) => {
  const [formData, setFormData] = useState<PatientData>(initialData || {
    fullName: '',
    age: 0,
    gender: 'male',
    phone: '',
    email: ''
  });
  const [errors, setErrors] = useState<any>({});

  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.fullName || formData.fullName.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }
    if (!formData.age || formData.age < 0 || formData.age > 150) {
      newErrors.age = 'Please enter a valid age';
    }
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Phone must be at least 10 digits';
    }
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      onNext(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">Patient Information</h2>
        <p className="text-white/60 text-sm md:text-base">Enter the patient's basic details</p>
      </div>

      <div className="space-y-4">
        <TextInput
          label="Full Name"
          icon={<User className="w-4 h-4" />}
          value={formData.fullName}
          onChange={(e: any) => setFormData({...formData, fullName: e.target.value})}
          error={errors.fullName}
          placeholder="John Doe"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Age"
            value={formData.age || ''}
            onChange={(e: any) => setFormData({...formData, age: parseInt(e.target.value) || 0})}
            error={errors.age}
            placeholder="30"
          />
          <SelectInput
            label="Gender"
            value={formData.gender}
            onChange={(value: any) => setFormData({...formData, gender: value})}
            error={errors.gender}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Phone"
            icon={<Phone className="w-4 h-4" />}
            value={formData.phone}
            onChange={(e: any) => setFormData({...formData, phone: e.target.value})}
            error={errors.phone}
            placeholder="+1234567890"
          />
          <TextInput
            label="Email"
            icon={<Mail className="w-4 h-4" />}
            type="email"
            value={formData.email}
            onChange={(e: any) => setFormData({...formData, email: e.target.value})}
            error={errors.email}
            placeholder="john@example.com"
          />
        </div>
      </div>


      <div className="pt-6 border-t border-white/20">
        <div className="flex flex-col sm:flex-row gap-3">
          <RainbowButton 
            onClick={handleContinue} 
            disabled={Object.keys(errors).length > 0 || !formData.fullName || !formData.email || !formData.phone || formData.age <= 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6"
          >
            Continue to Symptoms
            <ChevronRight className="w-4 h-4 ml-2" />
          </RainbowButton>
        </div>
      </div>
    </div>
  );
};

const Step2ClinicalManifestations: React.FC<any> = ({ onNext, initialData }) => {
  const [complaint, setComplaint] = useState(initialData?.complaint || '');
  const [symptoms, setSymptoms] = useState<string[]>(initialData?.symptoms || []);
  const [manualHistory, setManualHistory] = useState(initialData?.manualHistory || '');

  const suggestedSymptoms = ['Fever', 'Headache', 'Cough', 'Fatigue', 'Nausea', 'Dizziness', 'Chest Pain', 'Shortness of Breath'];

  const handleSymptomToggle = (symptom: string) => {
    setSymptoms(prev => prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]);
  };

  const handleVoiceTranscript = (text: string) => {
    setManualHistory((prev: string) => prev + ' ' + text);
  };

  const handleNext = () => {
    if (complaint.length >= 10) {
      onNext({ complaint, symptoms, manualHistory });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">Clinical Manifestations</h2>
        <p className="text-white/60 text-sm md:text-base">Describe the patient's symptoms and complaints</p>
      </div>

      <div className="space-y-4">
        <TextAreaWithCount
          label="Chief Complaint"
          value={complaint}
          onChange={setComplaint}
          placeholder="Describe the patient's main complaint..."
          rows={6}
          maxLength={1000}
        />

        <SuggestionChips
          suggestions={suggestedSymptoms}
          selected={symptoms}
          onToggle={handleSymptomToggle}
        />

        <TextAreaWithCount
          label="Medical History (Optional)"
          value={manualHistory}
          onChange={setManualHistory}
          placeholder="Enter any relevant medical history, medications, allergies, or previous conditions..."
          rows={6}
          maxLength={1000}
        />

        <VoiceMicButton onTranscript={handleVoiceTranscript} />
      </div>

      <div className="pt-6 border-t border-white/20">
        <div className="flex flex-col sm:flex-row gap-3">
          <RainbowButton 
            onClick={handleNext} 
            disabled={complaint.length < 10}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6"
          >
            Continue to Review
            <ChevronRight className="w-4 h-4 ml-2" />
          </RainbowButton>
        </div>
      </div>
    </div>
  );
};



const Step4ReviewSubmit: React.FC<any> = ({ onNext, initialData, wizardData, onEdit, onComplete }) => {
  const [consent, setConsent] = useState(initialData?.consent || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing case...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const { submitCase, loading, error } = useCases();

  const handleSubmit = async () => {
    if (!consent) return;
    setIsSubmitting(true);
    setLoadingMessage('Analyzing case...');
    
    setTimeout(() => setLoadingMessage('Generating diagnosis...'), 1500);
    setTimeout(() => setLoadingMessage('Preparing report...'), 3000);
    
    try {
      const result = await submitCase(
        wizardData.patient as PatientData,
        wizardData.manifestations as ManifestationsData,
        wizardData.history as HistoryData
      );
      
      setCaseId(result.case_id);
      setIsSuccess(true);
      
      localStorage.setItem('currentCase', JSON.stringify({
        patient: wizardData.patient,
        manifestations: wizardData.manifestations,
        history: wizardData.history
      }));
      
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } catch (err) {
      console.error('Case submission failed:', err);
      setCaseId(`CASE-${Date.now().toString().slice(-6)}`);
      setIsSuccess(true);
      
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 text-center py-12"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
        />
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">{loadingMessage}</h2>
          <p className="text-white/60">Please wait while we process your case</p>
        </div>
      </motion.div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center py-12"
      >
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2 text-white">Successfully Submitted!</h2>
          <p className="text-white/60">Your case has been recorded</p>
        </div>
        <Card className="max-w-md mx-auto bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-white/60">Case ID</p>
              <p className="text-2xl font-mono font-bold text-white">{caseId || `CASE-${Date.now()}`}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">Review & Submit</h2>
        <p className="text-white/60">Review all information before submitting</p>
      </div>

      <div className="space-y-4">
        {wizardData.patient && (
          <Card className="bg-slate-800/30 border-slate-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-white">Patient Information</CardTitle>
              <RainbowButton onClick={() => onEdit(1)} className="bg-white/10 text-white hover:bg-white/20">
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </RainbowButton>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-white/60">Name:</dt>
                  <dd className="font-medium text-white">{wizardData.patient.fullName}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-white/60">Age:</dt>
                  <dd className="font-medium text-white">{wizardData.patient.age}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-white/60">Gender:</dt>
                  <dd className="font-medium text-white">{wizardData.patient.gender}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked as boolean)}
                className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="cursor-pointer text-white">
                  I consent to the processing of this medical information
                </Label>
                <p className="text-xs text-white/60">
                  By checking this box, you confirm that all information provided is accurate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActionBar onSubmit={handleSubmit} isSubmitting={isSubmitting} continueDisabled={!consent} isLastStep={true} />
    </div>
  );
};

// Main Wizard Component
const ClinicalWizard: React.FC<ClinicalWizardProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    patient: null,
    manifestations: null,
    history: null,
    review: null,
  });

  const steps = [
    { number: 1, title: 'Patient Info', completed: !!wizardData.patient },
    { number: 2, title: 'Symptoms', completed: !!wizardData.manifestations },
    { number: 3, title: 'Review', completed: !!wizardData.review },
  ];

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleStepData = (step: number, data: any) => {
    if (step === 2) {
      setWizardData({ 
        ...wizardData, 
        manifestations: { complaint: data.complaint, symptoms: data.symptoms },
        history: { files: [], manualHistory: data.manualHistory || '' }
      });
    } else {
      const key = ['patient', 'manifestations', 'history', 'review'][step - 1] as keyof WizardData;
      setWizardData({ ...wizardData, [key]: data });
    }

    if (step < 3) {
      setCurrentStep(step + 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1PatientInfo onNext={(data: any) => handleStepData(1, data)} initialData={wizardData.patient} />;
      case 2:
        return <Step2ClinicalManifestations onNext={(data: any) => handleStepData(2, data)} initialData={{ ...wizardData.manifestations, manualHistory: wizardData.history?.manualHistory }} />;
      case 3:
        return <Step4ReviewSubmit onNext={(data: any) => handleStepData(3, data)} initialData={wizardData.review} wizardData={wizardData} onEdit={handleStepClick} onComplete={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto pb-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4"
          >
            <RainbowButton
              onClick={onBack}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full md:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </RainbowButton>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-white">Clinical Assessment Wizard</h1>
              <p className="text-white/60 text-sm md:text-base">Complete patient evaluation</p>
            </div>
            <div className="hidden md:block"></div>
          </motion.div>

          {/* Progress */}
          <TopProgressBar currentStep={currentStep} totalSteps={3} />

          {/* Step Navigation */}
          <StepNav steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-lg border border-slate-700/30 rounded-xl p-4 md:p-8 shadow-2xl mb-8"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalWizard;