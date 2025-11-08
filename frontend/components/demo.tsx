"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LandingHero } from "@/components/landing-hero";
import HealthcareDashboard from "@/components/dashboard";
import DiagnosticDashboard from "@/components/diagnostic-dashboard";
import ClinicalWizard from "@/components/clinical-wizard";

type ViewState = 'login' | 'dashboard' | 'diagnostic' | 'clinical-wizard';

const DemoOne = () => {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    
    if (token && sessionExpiry) {
      const now = new Date().getTime();
      if (now < parseInt(sessionExpiry)) {
        setCurrentView('dashboard');
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
      }
    }
  }, []);

  const handleViewChange = (newView: ViewState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(newView);
      setIsTransitioning(false);
    }, 300);
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    in: { opacity: 1, scale: 1, y: 0 },
    out: { opacity: 0, scale: 1.05, y: -20 }
  };

  const pageTransition = {
    type: 'tween' as const,
    ease: 'anticipate' as const,
    duration: 0.5
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-900">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
              }}
              className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentView === 'login' && (
          <motion.div
            key={`login-${currentView}`}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full min-h-screen"
          >
            <LandingHero onSuccess={() => handleViewChange('dashboard')} />
          </motion.div>
        )}

        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full min-h-screen"
          >
            <HealthcareDashboard 
              onStartDiagnosis={() => handleViewChange('clinical-wizard')} 
              onLogout={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('sessionExpiry');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                handleViewChange('login');
              }}
            />
          </motion.div>
        )}

        {currentView === 'clinical-wizard' && (
          <motion.div
            key="clinical-wizard"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full min-h-screen"
          >
            <ClinicalWizard 
              onBack={() => handleViewChange('dashboard')} 
              onComplete={() => handleViewChange('diagnostic')} 
            />
          </motion.div>
        )}

        {currentView === 'diagnostic' && (
          <motion.div
            key="diagnostic"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full min-h-screen"
          >
            <DiagnosticDashboard onBack={() => handleViewChange('dashboard')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { DemoOne };