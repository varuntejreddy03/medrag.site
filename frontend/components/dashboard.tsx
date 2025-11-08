import React, { useState, useEffect } from 'react';
import { useCases, useHealthCheck, useDashboardStats } from '@/hooks/useMedRAG';
import { createCaseSummary } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  Upload,
  History,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Eye,
  Search,
  User,
  LogOut,
  TrendingUp,
  Clock,
  Target,
  Star,
  Menu,
  X,
  Mail,
  Send,
  CheckCircle,
  Activity,
  Users,
  Calendar,
} from 'lucide-react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SparklesCore } from '@/components/ui/sparkles';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active = false,
  collapsed,
  onClick,
}) => {
  const content = (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group ${
        active
          ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
      }`}
      whileHover={{ scale: 1.02, rotateY: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 border-2 border-blue-500 rounded-lg"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.3 }}
      >
        {icon}
      </motion.div>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="font-medium"
        >
          {label}
        </motion.span>
      )}
    </motion.button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  suffix = '',
  delay,
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="relative p-4 md:p-6 rounded-xl bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg border border-white/20 hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">{label}</p>
          <p className="text-xl md:text-3xl font-bold text-white">
            {count}
            {suffix}
          </p>
        </div>
        <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-white">
          <div className="w-4 h-4 md:w-6 md:h-6">{icon}</div>
        </div>
      </div>
    </motion.div>
  );
};

interface MedicalConsultation {
  id: string;
  patientName: string;
  diagnosis: string;
  department: string;
  date: string;
  confidence: number;
  status: 'completed' | 'in-progress' | 'pending';
  priority: 'high' | 'medium' | 'low';
}

const consultations: MedicalConsultation[] = [
  {
    id: '1',
    patientName: 'John Doe',
    diagnosis: 'Acute Myocardial Infarction',
    department: 'Cardiology',
    date: 'Nov 4, 2025',
    confidence: 95,
    status: 'completed',
    priority: 'high'
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    diagnosis: 'Migraine with Aura',
    department: 'Neurology',
    date: 'Nov 3, 2025',
    confidence: 87,
    status: 'in-progress',
    priority: 'medium'
  },
  {
    id: '3',
    patientName: 'Bob Johnson',
    diagnosis: 'Compound Fracture - Tibia',
    department: 'Orthopedics',
    date: 'Nov 2, 2025',
    confidence: 92,
    status: 'completed',
    priority: 'high'
  },
  {
    id: '4',
    patientName: 'Alice Williams',
    diagnosis: 'Viral Upper Respiratory Infection',
    department: 'Pediatrics',
    date: 'Nov 1, 2025',
    confidence: 78,
    status: 'pending',
    priority: 'low'
  }
];

interface HealthcareDashboardProps {
  onStartDiagnosis?: () => void;
  onLogout?: () => void;
}

const HealthcareDashboard: React.FC<HealthcareDashboardProps> = ({ onStartDiagnosis, onLogout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('Dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('Dr. Smith');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedCaseForEmail, setSelectedCaseForEmail] = useState<any>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  
  const { cases, loading: casesLoading, error: casesError, pagination } = useCases();
  const { isHealthy, loading: healthLoading } = useHealthCheck();
  const { stats, loading: statsLoading } = useDashboardStats();

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleRouteChange = (route: string) => {
    setIsLoading(true);
    setActiveRoute(route);
    setTimeout(() => setIsLoading(false), 800);
  };

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', action: () => handleRouteChange('Dashboard') },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Consults', action: () => handleRouteChange('Consults') },

    { icon: <History className="w-5 h-5" />, label: 'History', action: () => handleRouteChange('History') },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', action: () => handleRouteChange('Analytics') },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', action: () => handleRouteChange('Settings') },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white overflow-auto">

      {/* Desktop Sidebar */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex-col hidden md:flex"
      >
        <div className="p-4 flex items-center justify-between">
          {!sidebarCollapsed && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-white"
            >
              MedRag
            </motion.h1>
          )}
          <RainbowButton
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 ml-auto p-2"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </RainbowButton>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeRoute === item.label}
              collapsed={sidebarCollapsed}
              onClick={item.action}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <RainbowButton
                className={`w-full ${
                  sidebarCollapsed ? 'px-2' : 'justify-start'
                } hover:bg-gray-800/50`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=DrSmith" />
                  <AvatarFallback>DS</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-gray-400">Medical Professional</p>
                  </div>
                )}
              </RainbowButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-black/95 backdrop-blur-xl border-white/20"
            >
              <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onLogout} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Mobile Menu Button */}
      <RainbowButton
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden text-white hover:bg-gray-800/50 p-2"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </RainbowButton>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col md:hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <motion.h1 className="text-xl font-bold text-white">
                  MedRag
                </motion.h1>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-2">
                {sidebarItems.map((item) => (
                  <SidebarItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    active={activeRoute === item.label}
                    collapsed={false}
                    onClick={() => {
                      item.action();
                      setMobileMenuOpen(false);
                    }}
                  />
                ))}
              </nav>

              <div className="p-4 border-t border-white/10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <RainbowButton
                      className="w-full justify-start hover:bg-gray-800/50"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=DrSmith" />
                        <AvatarFallback>DS</AvatarFallback>
                      </Avatar>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium">{userName}</p>
                        <p className="text-xs text-gray-400">Medical Professional</p>
                      </div>
                    </RainbowButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-black/95 backdrop-blur-xl border-white/20"
                  >
                    <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={onLogout} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 relative z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                    scale: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                  }}
                  className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
                />
                <p className="text-white text-lg font-medium">Loading {activeRoute}...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-4 md:p-8 max-w-7xl mx-auto"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full md:w-auto relative p-4 md:p-6 rounded-xl bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg border border-white/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                >
                  <h2 className="text-xl md:text-2xl font-bold mb-1 text-white">
                    Welcome back, {userName}! 👋
                  </h2>
                  <p className="text-gray-400 text-sm md:text-base">Today: Nov 4, 2025</p>
                </motion.div>

                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
                  <RainbowButton
                    onClick={() => setSearchOpen(true)}
                    className="bg-gray-900/80 border-white/20 text-gray-300 hover:text-white hover:bg-gray-800/80 hover:border-blue-500/50 transition-all"
                  >
                    <Search className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Search</span>
                    <kbd className="hidden md:inline ml-2 px-2 py-1 text-xs bg-white/10 rounded">
                      ⌘K
                    </kbd>
                  </RainbowButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <RainbowButton className="relative hover:bg-gray-800/50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=DrSmith" />
                          <AvatarFallback>DS</AvatarFallback>
                        </Avatar>
                      </RainbowButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-black/95 backdrop-blur-xl border-white/20"
                    >
                      <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-white hover:bg-gray-800/50 cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={onLogout} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <StatCard
                  icon={<TrendingUp className="w-6 h-6" />}
                  label="Total Cases"
                  value={stats.total_cases}
                  delay={0}
                />
                <StatCard
                  icon={<Clock className="w-6 h-6" />}
                  label="Pending"
                  value={stats.pending_cases}
                  delay={0.1}
                />
                <StatCard
                  icon={<Target className="w-6 h-6" />}
                  label="Diagnosed"
                  value={stats.diagnosed_cases}
                  delay={0.2}
                />
                <StatCard
                  icon={<Star className="w-6 h-6" />}
                  label="Backend"
                  value={isHealthy ? 1 : 0}
                  suffix={isHealthy ? " ✓" : " ✗"}
                  delay={0.3}
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6 md:mb-8 flex justify-center"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full max-w-md">
                  <RainbowButton 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    onClick={onStartDiagnosis}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Case
                  </RainbowButton>
                </motion.div>
              </motion.div>

              {activeRoute === 'Dashboard' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg border border-slate-700/30 overflow-hidden mb-8"
                >
                  <div className="p-4 md:p-6 border-b border-white/10">
                    <h3 className="text-lg md:text-xl font-bold text-white">Recent MedRag Consultations</h3>
                    <p className="text-sm text-gray-400 mt-1">AI-powered medical diagnosis and analysis</p>
                  </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Diagnosis
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {(cases.length > 0 ? cases : consultations).map((consultation: any, index: number) => {
                        // Handle both real cases and mock data
                        const caseData = cases.length > 0 ? {
                          id: consultation.id,
                          patientName: consultation.full_name || consultation.patientName,
                          email: consultation.email,
                          diagnosis: consultation.diagnosis ? 
                            consultation.diagnosis.split('\n')[0].replace(/\*\*|###|\d+\./g, '').trim().slice(0, 30) + '...' : 
                            'Pending Analysis',
                          department: 'General Medicine',
                          date: new Date(consultation.created_at || Date.now()).toLocaleDateString(),
                          confidence: consultation.confidence || 0,
                          status: consultation.status,
                          priority: 'medium' as 'high' | 'medium' | 'low'
                        } : consultation;
                        const statusConfig: Record<string, any> = {
                          completed: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
                          diagnosed: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
                          'in-progress': { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
                          pending: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50' }
                        };
                        
                        const currentStatus = statusConfig[caseData.status] || statusConfig.pending;
                        
                        const priorityConfig: Record<string, string> = {
                          high: 'text-red-400',
                          medium: 'text-yellow-400', 
                          low: 'text-green-400'
                        };
                        
                        return (
                          <motion.tr
                            key={caseData.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30">
                                  <span className="text-blue-400 font-semibold text-sm">
                                    {caseData.patientName.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-white font-medium text-sm">{caseData.patientName}</div>
                                  <div className={`text-xs ${priorityConfig[caseData.priority]} font-medium`}>
                                    {caseData.priority.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <div className="text-white font-medium text-sm max-w-xs truncate" title={caseData.diagnosis}>
                                {caseData.diagnosis}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <span className="text-gray-300 text-sm">{caseData.department}</span>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <span className="text-gray-400 text-sm">{caseData.date}</span>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                                    style={{ width: `${caseData.confidence}%` }}
                                  />
                                </div>
                                <span className="text-white font-medium text-sm">{caseData.confidence}%</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <Badge className={`${currentStatus.bg} ${currentStatus.color} ${currentStatus.border} border`}>
                                {caseData.status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4">
                              <div className="flex items-center gap-2">
                                <RainbowButton
                                  onClick={() => setSelectedConsultation(caseData.id)}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                >
                                  <Eye className="w-4 h-4" />
                                </RainbowButton>
                                <RainbowButton
                                  onClick={() => {
                                    setSelectedCaseForEmail(consultation);
                                    setEmailDialogOpen(true);
                                  }}
                                  className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                >
                                  <Mail className="w-4 h-4" />
                                </RainbowButton>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
              )}

              {activeRoute === 'Consults' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="rounded-xl bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-lg border border-blue-500/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquare className="w-8 h-8 text-blue-400" />
                      <h3 className="text-2xl font-bold text-white">Active Consultations</h3>
                    </div>
                    <p className="text-gray-300 mb-6">Manage ongoing patient consultations and send diagnosis reports</p>
                    
                    <div className="grid gap-4">
                      {(cases.length > 0 ? cases : consultations).map((consultation: any) => {
                        const caseData = cases.length > 0 ? {
                          id: consultation.id,
                          patientName: consultation.full_name || consultation.patientName,
                          diagnosis: consultation.diagnosis || 'Pending',
                          email: consultation.email,
                          confidence: consultation.confidence || 0,
                        } : consultation;
                        
                        return (
                          <div key={caseData.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="text-white font-semibold">{caseData.patientName}</h4>
                                <p className="text-gray-400 text-sm mt-1">{caseData.diagnosis?.slice(0, 60)}...</p>
                                <p className="text-blue-400 text-xs mt-2">Confidence: {caseData.confidence}%</p>
                              </div>
                              <RainbowButton
                                onClick={() => {
                                  setSelectedCaseForEmail(consultation);
                                  setEmailDialogOpen(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Report
                              </RainbowButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeRoute === 'History' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="rounded-xl bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-lg border border-purple-500/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <History className="w-8 h-8 text-purple-400" />
                      <h3 className="text-2xl font-bold text-white">Case History</h3>
                    </div>
                    <p className="text-gray-300 mb-6">View all completed and archived cases</p>
                    
                    <div className="space-y-3">
                      {(cases.length > 0 ? cases : consultations).filter((c: any) => c.status === 'completed' || c.status === 'diagnosed').map((consultation: any) => (
                        <div key={consultation.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold">{consultation.full_name || consultation.patientName}</h4>
                              <p className="text-gray-400 text-sm">{consultation.diagnosis || 'Completed'}</p>
                              <p className="text-purple-400 text-xs mt-1">{new Date(consultation.created_at || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">
                              COMPLETED
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeRoute === 'Analytics' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="rounded-xl bg-gradient-to-br from-orange-900/30 to-red-900/30 backdrop-blur-lg border border-orange-500/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="w-8 h-8 text-orange-400" />
                      <h3 className="text-2xl font-bold text-white">Analytics Dashboard</h3>
                    </div>
                    <p className="text-gray-300 mb-6">Performance metrics and insights</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Activity className="w-6 h-6 text-orange-400" />
                          <div>
                            <p className="text-gray-400 text-sm">Avg Confidence</p>
                            <p className="text-2xl font-bold text-white">87%</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 text-blue-400" />
                          <div>
                            <p className="text-gray-400 text-sm">Total Patients</p>
                            <p className="text-2xl font-bold text-white">{stats.total_cases}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-6 h-6 text-green-400" />
                          <div>
                            <p className="text-gray-400 text-sm">This Month</p>
                            <p className="text-2xl font-bold text-white">{stats.diagnosed_cases}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <h4 className="text-white font-semibold mb-4">Case Distribution</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Cardiology</span>
                            <span className="text-white">35%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" style={{ width: '35%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Neurology</span>
                            <span className="text-white">28%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '28%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Orthopedics</span>
                            <span className="text-white">22%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: '22%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Other</span>
                            <span className="text-white">15%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" style={{ width: '15%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeRoute === 'Settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="rounded-xl bg-gradient-to-br from-gray-900/80 to-slate-900/80 backdrop-blur-lg border border-gray-700/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Settings className="w-8 h-8 text-gray-400" />
                      <h3 className="text-2xl font-bold text-white">Settings</h3>
                    </div>
                    <p className="text-gray-300 mb-6">Configure your preferences</p>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <h4 className="text-white font-semibold mb-2">Email Notifications</h4>
                        <p className="text-gray-400 text-sm mb-3">Receive email alerts for new cases</p>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4" defaultChecked />
                          <span className="text-white text-sm">Enable notifications</span>
                        </label>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <h4 className="text-white font-semibold mb-2">Auto-send Reports</h4>
                        <p className="text-gray-400 text-sm mb-3">Automatically send diagnosis reports to patients</p>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4" />
                          <span className="text-white text-sm">Enable auto-send</span>
                        </label>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <h4 className="text-white font-semibold mb-2">Profile Information</h4>
                        <div className="space-y-3 mt-3">
                          <div>
                            <label className="text-gray-400 text-sm">Name</label>
                            <Input className="mt-1 bg-slate-900/50 border-slate-700 text-white" defaultValue={userName} />
                          </div>
                          <div>
                            <label className="text-gray-400 text-sm">Email</label>
                            <Input className="mt-1 bg-slate-900/50 border-slate-700 text-white" defaultValue="doctor@medrag.com" />
                          </div>
                          <RainbowButton className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
                            Save Changes
                          </RainbowButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-black/95 border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Search Consultations</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search consultations..."
              className="pl-10 bg-gray-900/80 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedConsultation !== null}
        onOpenChange={() => setSelectedConsultation(null)}
      >
        <DialogContent className="bg-black/95 border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Consultation Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400">
              Viewing consultation: {selectedConsultation}
            </p>
            <div className="p-4 rounded-lg bg-gray-900/50 border border-white/20">
              <p className="text-white">
                Detailed information about the consultation would appear here.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="bg-black/95 border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Send Diagnosis Report
            </DialogTitle>
          </DialogHeader>
          {emailSuccess ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Email Sent Successfully!</h3>
              <p className="text-gray-400">The diagnosis report has been sent to the patient.</p>
              <RainbowButton
                onClick={() => {
                  setEmailDialogOpen(false);
                  setEmailSuccess(false);
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
              </RainbowButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-gray-400 text-sm mb-2">Patient</p>
                <p className="text-white font-semibold">{selectedCaseForEmail?.full_name || selectedCaseForEmail?.patientName}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-gray-400 text-sm mb-2">Email</p>
                <p className="text-white">{selectedCaseForEmail?.email || 'patient@example.com'}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-gray-400 text-sm mb-2">Diagnosis</p>
                <p className="text-white">{selectedCaseForEmail?.diagnosis?.slice(0, 100) || 'Diagnosis pending'}...</p>
              </div>
              <div className="flex gap-2">
                <RainbowButton
                  onClick={async () => {
                    setEmailSending(true);
                    try {
                      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                      const response = await fetch(`${API_URL}/send-patient-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: selectedCaseForEmail?.email || 'patient@example.com',
                          case_id: selectedCaseForEmail?.id,
                          patient_name: selectedCaseForEmail?.full_name || selectedCaseForEmail?.patientName,
                          diagnosis: selectedCaseForEmail?.diagnosis || 'Pending'
                        })
                      });
                      if (response.ok) {
                        setEmailSuccess(true);
                      }
                    } catch (error) {
                      console.error('Email send failed:', error);
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                  disabled={emailSending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {emailSending ? (
                    <><Clock className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Email</>
                  )}
                </RainbowButton>
                <RainbowButton
                  onClick={() => setEmailDialogOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Cancel
                </RainbowButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default HealthcareDashboard;