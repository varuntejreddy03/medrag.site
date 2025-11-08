import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail, ArrowRight, Brain, Shield, Zap, Loader2 } from 'lucide-react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChallengeCard } from '@/components/ui/card-9';

import { toast } from '@/components/ui/toast';

interface LandingLoginProps {
  onSuccess?: () => void;
}

const LandingLogin: React.FC<LandingLoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setShowLogin(false);
    setShowOtp(false);
    setEmail('');
    setName('');
    setOtp('');
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://18.212.60.60:8000';
      console.log('Sending request to:', `${API_URL}/send-verification`);
      const response = await fetch(`${API_URL}/send-verification`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Verification code sent to your email!');
        return true;
      } else {
        toast.error(data.detail || 'Failed to send verification code');
        return false;
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      return false;
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://18.212.60.60:8000';
      console.log('Sending request to:', `${API_URL}/verify-code`);
      const response = await fetch(`${API_URL}/verify-code`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Email verified successfully!');
        return true;
      } else {
        toast.error(data.detail || 'Invalid verification code');
        return false;
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      return false;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    const success = await sendOtp(email);
    setIsLoading(false);
    
    if (success) {
      setShowOtp(true);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    const success = await verifyOtp(email, otp);
    setIsLoading(false);
    
    if (success) {
      const expiryTime = new Date().getTime() + (30 * 60 * 1000); // 30 minutes
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', name);
      localStorage.setItem('authToken', 'authenticated');
      localStorage.setItem('sessionExpiry', expiryTime.toString());
      onSuccess?.();
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  return (
    <div ref={scrollRef} className="h-screen w-screen bg-transparent text-white overflow-y-auto overflow-x-hidden scroll-smooth">
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {!showLogin ? (
          // Landing Section
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ opacity, scale }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6"
              >
                <Brain className="w-24 h-24 text-cyan-400 mx-auto drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-6xl md:text-8xl font-black mb-6 tracking-tight"
              >
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent drop-shadow-2xl">
                  AI-Powered
                </span>
                <br />
                <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
                  Medical Diagnosis
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-lg md:text-xl text-cyan-200/60 mb-8 max-w-2xl mx-auto font-light"
              >
                Advanced RAG technology for accurate clinical insights
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ delay: 0.3 }}
              >
                <ChallengeCard
                  title="AI Diagnosis"
                  description="Advanced AI-powered medical analysis with real-time insights"
                  buttonText="Learn More"
                  backgroundColor="bg-gradient-to-br from-blue-500/80 to-cyan-600/80 backdrop-blur-md"
                  icon={<Brain className="w-12 h-12 text-white" />}
                  className="max-w-full"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ delay: 0.4 }}
              >
                <ChallengeCard
                  title="Secure"
                  description="HIPAA compliant and secure patient data protection"
                  buttonText="Learn More"
                  backgroundColor="bg-gradient-to-br from-teal-500/80 to-emerald-600/80 backdrop-blur-md"
                  icon={<Shield className="w-12 h-12 text-white" />}
                  className="max-w-full"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ delay: 0.5 }}
              >
                <ChallengeCard
                  title="Fast"
                  description="Instant medical insights and diagnosis results"
                  buttonText="Learn More"
                  backgroundColor="bg-gradient-to-br from-cyan-500/80 to-blue-600/80 backdrop-blur-md"
                  icon={<Zap className="w-12 h-12 text-white" />}
                  className="max-w-full"
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <RainbowButton
                onClick={() => setShowLogin(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-10 py-5 text-lg shadow-lg shadow-cyan-500/50"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </RainbowButton>
            </motion.div>
          </motion.div>
        ) : (
          // Login Section
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="bg-slate-900/70 backdrop-blur-xl border-slate-700/50">
              <CardHeader className="text-center">
                <Brain className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <CardTitle className="text-2xl text-white">Welcome to MedRAG</CardTitle>
                <p className="text-gray-400">Enter your email to continue</p>
              </CardHeader>
              <CardContent>
                {!showOtp ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Dr. John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-800/50 border-slate-600/30 text-white"
                      required
                      disabled={isLoading}
                    />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="doctor@hospital.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-600/30 text-white"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <RainbowButton
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      disabled={isLoading || !name.trim()}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Verification Code
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </RainbowButton>
                  </form>
                ) : (
                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-400">Enter the 6-digit code sent to:</p>
                      <p className="text-cyan-400 font-medium">{email}</p>
                    </div>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-widest bg-slate-800/50 border-slate-600/30 text-white"
                      maxLength={6}
                      required
                      disabled={isLoading}
                    />
                    <RainbowButton
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Login
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </RainbowButton>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowOtp(false)}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        ← Change email
                      </button>
                    </div>
                  </form>
                )}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowLogin(false)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    ← Back to landing
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LandingLogin;
export const SignInPage = LandingLogin;