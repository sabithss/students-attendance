import React, { useState, useMemo } from 'react';
import { Student, AttendanceLog, SubjectSchedule, AnalyticsSummary } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  UserCheck,
  Zap,
  Edit2,
  Trash2,
  RefreshCw,
  Plus
} from 'lucide-react';

interface TeacherDashboardProps {
  students: Student[];
  attendanceLogs: AttendanceLog[];
  schedules: SubjectSchedule[];
  analytics?: AnalyticsSummary;
  onRefreshData: () => void;
  onOpenRegisterModal: () => void;
  onManualOverride: (studentId: string, subjectId: string, status: 'PRESENT' | 'LATE' | 'ABSENT', notes?: string) => void;
  onDeleteStudent: (id: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  attendanceLogs,
  schedules,
  analytics,
  onRefreshData,
  onOpenRegisterModal,
  onManualOverride,
  onDeleteStudent
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'students' | 'schedules'>('logs');

  // Log Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // Manual Override Modal State
  const [overrideStudentId, setOverrideStudentId] = useState('');
  const [overrideSubjectId, setOverrideSubjectId] = useState(schedules[0]?.id || '');
  const [overrideStatus, setOverrideStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT'>('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter(log => {
      const matchSearch =
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.studentRoll.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchSubject = !selectedSubjectFilter || log.subjectId === selectedSubjectFilter;
      const matchDept = !selectedDepartmentFilter || log.department.toLowerCase() === selectedDepartmentFilter.toLowerCase();
      const matchStatus = !selectedStatusFilter || log.status === selectedStatusFilter;
      const matchDate = !selectedDateFilter || log.date === selectedDateFilter;

      return matchSearch && matchSubject && matchDept && matchStatus && matchDate;
    });
  }, [attendanceLogs, searchQuery, selectedSubjectFilter, selectedDepartmentFilter, selectedStatusFilter, selectedDateFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Log ID', 'Roll Number', 'Student Name', 'Department', 'Subject', 'Date', 'Time', 'Status', 'Confidence', 'Method'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.studentRoll,
      l.studentName,
      l.department,
      l.subjectName,
      l.date,
      new Date(l.timestamp).toLocaleTimeString(),
      l.status,
      `${l.confidenceScore}%`,
      l.method
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // PDF Title Header
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text('Student Attendance System Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filtered Total: ${filteredLogs.length} Records`, 14, 28);

    const tableData = filteredLogs.map(l => [
      l.studentRoll,
      l.studentName,
      l.department,
      l.subjectName,
      `${l.date} ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      l.status,
      `${l.confidenceScore}%`
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Roll No', 'Student Name', 'Department', 'Subject', 'Timestamp', 'Status', 'Biometric Match']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleApplyOverride = () => {
    if (overrideStudentId && overrideSubjectId) {
      onManualOverride(overrideStudentId, overrideSubjectId, overrideStatus, overrideNotes);
      setIsOverrideModalOpen(false);
      setOverrideNotes('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Teacher & Admin Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Manage student face encodings, monitor real-time class logs, and export reports.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0a0f1d] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenRegisterModal}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Student Profile</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#0a0f1d] border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Total Enrolled</span>
            <span className="text-3xl font-light text-white mt-1 block font-mono">{students.length}</span>
            <span className="text-[11px] text-sky-400 mt-1 block">
              {students.filter(s => s.hasFaceEncoding).length} Enrolled Vector Profiles
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0a0f1d] border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Present Today</span>
            <span className="text-3xl font-light text-emerald-400 mt-1 block font-mono">
              {analytics?.presentToday ?? attendanceLogs.filter(l => l.status === 'PRESENT').length}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Scanned via WebCam</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0a0f1d] border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Late Arrivals</span>
            <span className="text-3xl font-light text-amber-400 mt-1 block font-mono">
              {analytics?.lateToday ?? attendanceLogs.filter(l => l.status === 'LATE').length}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">&gt; 15 mins after start</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0a0f1d] border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Attendance Rate</span>
            <span className="text-3xl font-light text-white mt-1 block font-mono">
              {analytics?.overallAttendanceRate ?? 92}%
            </span>
            <span className="text-[11px] text-sky-400 mt-1 block flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Above Target (85%)</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Content Tabs */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-[#02040a] p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'logs'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Attendance Logs ({filteredLogs.length})
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'students'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Student Roster ({students.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#02040a] hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Manual Override</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#02040a] hover:bg-slate-800 text-sky-400 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-800 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Export</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>

        {/* LOGS TAB VIEW */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            
            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedSubjectFilter}
                onChange={e => setSelectedSubjectFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- All Subjects --</option>
                {schedules?.map(s => (
                  <option key={s?.id} value={s?.id}>{s?.code || ''} - {s?.name || ''}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- All Statuses --</option>
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="ABSENT">ABSENT</option>
              </select>

              <input
                type="date"
                value={selectedDateFilter}
                onChange={e => setSelectedDateFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Attendance Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Biometric Match</th>
                    <th className="p-3">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-white">{log.studentName}</td>
                        <td className="p-3 font-mono text-emerald-400">{log.studentRoll}</td>
                        <td className="p-3 text-slate-300">{log.subjectName}</td>
                        <td className="p-3 font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === 'PRESENT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'LATE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-300">
                          {log.confidenceScore}% ({log.matchDistance} dist)
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {log.method === 'FACE_RECOGNITION' ? 'Biometric Webcam' : 'Manual Override'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No attendance logs found matching search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* STUDENTS ROSTER TAB VIEW */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Profile</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Face Vector Encoding</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <img
                        src={s.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={s.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{s.rollNumber}</td>
                    <td className="p-3 font-semibold text-white">{s.name}</td>
                    <td className="p-3 text-slate-300">{s.department}</td>
                    <td className="p-3">
                      {s.hasFaceEncoding ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          ✓ 128D Vector Registered
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                          Pending Encoding
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onDeleteStudent(s.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                        title="Delete Student Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Manual Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Manual Attendance Override</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Student</label>
                <select
                  value={overrideStudentId}
                  onChange={e => setOverrideStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                <select
                  value={overrideSubjectId}
                  onChange={e => setOverrideSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {schedules?.map(s => (
                    <option key={s?.id} value={s?.id}>{s?.code || ''} - {s?.name || ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'LATE', 'ABSENT'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOverrideStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        overrideStatus === st
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Override Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved medical leave / Webcam glare exception"
                  value={overrideNotes}
                  onChange={e => setOverrideNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                disabled={!overrideStudentId}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
