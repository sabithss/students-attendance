import React from 'react';
import { UserRole, SubjectSchedule } from '../types';
import {
  Scan,
  Users,
  UserCheck,
  Database,
  Clock,
  ShieldCheck,
  BookOpen,
  Zap
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'scanner' | 'dashboard' | 'student-portal' | 'architecture-guide';
  setCurrentTab: (tab: 'scanner' | 'dashboard' | 'student-portal' | 'architecture-guide') => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  schedules: SubjectSchedule[];
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  onOpenRegisterModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  userRole,
  setUserRole,
  schedules,
  selectedSubjectId,
  setSelectedSubjectId,
  onOpenRegisterModal
}) => {
  const [timeStr, setTimeStr] = React.useState('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-[#0a0f1d]/80 border-b border-slate-800 backdrop-blur-md text-white sticky top-0 z-40 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* App Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentTab('scanner')}>
            <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.5)] transition-transform group-hover:scale-105">
              <Scan className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white uppercase">
                  Attend<span className="text-sky-500">AI</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  AI CORE V2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block tracking-wide">Facial Vector Recognition Engine</p>
            </div>
          </div>

          {/* Subject & Active Session Selector (when on scanner tab) */}
          <div className="hidden lg:flex items-center gap-2 bg-[#02040a]/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px]">Session:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-transparent text-xs text-sky-300 font-semibold focus:outline-none cursor-pointer"
            >
              {schedules?.map(s => (
                <option key={s?.id} value={s?.id} className="bg-[#0a0f1d] text-slate-200">
                  {s?.code || ''} - {s?.name || ''} ({s?.startTime || ''} - {s?.endTime || ''})
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-[#02040a]/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCurrentTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                currentTab === 'scanner'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Live Scanner</span>
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Teacher Dashboard</span>
              <span className="md:hidden">Logs</span>
            </button>

            <button
              onClick={() => setCurrentTab('student-portal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                currentTab === 'student-portal'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden md:inline">Student Portal</span>
              <span className="md:hidden">Portal</span>
            </button>

            <button
              onClick={() => setCurrentTab('architecture-guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                currentTab === 'architecture-guide'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                  : 'text-sky-400/80 hover:text-sky-300 hover:bg-sky-950/30'
              }`}
            >
              <Database className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Architecture & DB</span>
              <span className="sm:hidden">DB</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {/* Server Status Indicator */}
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Server Status</span>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                CONNECTED
              </span>
            </div>

            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 text-slate-300 text-xs font-mono bg-[#02040a]/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{timeStr}</span>
            </div>

            {/* Register New Student CTA Button */}
            <button
              onClick={onOpenRegisterModal}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all border border-sky-400/30"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Register Face</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
