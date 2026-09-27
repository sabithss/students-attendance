import React, { useState } from 'react';
import { Student, AttendanceLog, SubjectSchedule } from '../types';
import {
  User,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface StudentPortalProps {
  students: Student[];
  attendanceLogs: AttendanceLog[];
  schedules: SubjectSchedule[];
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  attendanceLogs,
  schedules
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'STU-1001');

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // Logs for active student
  const studentLogs = attendanceLogs.filter(l => l.studentId === activeStudent?.id);

  // Subject breakdowns
  const subjectBreakdown = schedules.map(sub => {
    const subLogs = studentLogs.filter(l => l.subjectId === sub.id);
    const presentCount = subLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length;
    const totalClasses = Math.max(10, subLogs.length + 3);
    const percentage = Math.round((presentCount / totalClasses) * 100);

    return {
      subject: sub,
      presentCount,
      totalClasses,
      percentage
    };
  });

  const overallPercentage = Math.round(
    subjectBreakdown.reduce((acc, curr) => acc + curr.percentage, 0) / (subjectBreakdown.length || 1)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Student Selector Banner */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-tight">Student Self-Service Portal</h1>
          <p className="text-xs text-slate-400 mt-1">View personal attendance history, biometric registration status, and subject percentages.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px]">Switch Student Profile:</span>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="bg-[#02040a] text-xs text-sky-400 font-semibold border border-slate-800 rounded-xl px-3.5 py-2 focus:outline-none"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
            ))}
          </select>
        </div>
      </div>

      {activeStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Profile Card & Subject Breakdowns */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Profile Overview Card */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex items-start gap-4">
                <img
                  src={activeStudent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={activeStudent.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/40 shadow-lg"
                />
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">{activeStudent.name}</h2>
                  <p className="text-xs font-mono text-sky-400 font-bold">{activeStudent.rollNumber}</p>
                  <p className="text-xs text-slate-400">{activeStudent.department}</p>
                  <p className="text-xs text-slate-400">{activeStudent.email}</p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="bg-[#02040a] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Face Vector Profile</span>
                    <span className="text-[10px] text-slate-500 font-mono">128D Embedding Stored in DB</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 uppercase">
                  Active
                </span>
              </div>

              {/* Overall Percentage Card */}
              <div className="bg-[#02040a] p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Overall Attendance Rate</span>
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-white font-mono">{overallPercentage}%</span>
                  <span className="text-xs text-emerald-400 font-bold">✓ Good Standing (&gt; 85%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)] h-1.5 rounded-full transition-all"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Subject-Wise Attendance Progress */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Subject Attendance Breakdown</span>
              </h3>

              <div className="space-y-4">
                {subjectBreakdown.map((item, idx) => (
                  <div key={item.subject?.id || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{item.subject?.code || 'SUB'} - {item.subject?.name || 'Subject'}</span>
                      <span className="font-mono font-bold text-sky-400">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-[#02040a] h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          item.percentage >= 85 ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : item.percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Attended: {item.presentCount} / {item.totalClasses} lectures</span>
                      <span>Target: 85%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Personal Attendance History Timeline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Personal Attendance Stream</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">{studentLogs.length} Records</span>
              </div>

              <div className="space-y-3">
                {studentLogs.length > 0 ? (
                  studentLogs.map(log => (
                    <div
                      key={log.id}
                      className="bg-[#02040a] p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${
                          log.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.status === 'PRESENT' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white">{log.subjectName}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {log.date} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Match: {log.confidenceScore}% • Distance: {log.matchDistance}
                          </p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'PRESENT'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No attendance logs found for this student profile yet.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
