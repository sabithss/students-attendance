import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WebcamScanner } from './components/WebcamScanner';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentPortal } from './components/StudentPortal';
import { StudentRegistrationModal } from './components/StudentRegistrationModal';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { Student, AttendanceLog, SubjectSchedule, AnalyticsSummary, UserRole } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'scanner' | 'dashboard' | 'student-portal' | 'architecture-guide'>('scanner');
  const [userRole, setUserRole] = useState<UserRole>('TEACHER');

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [schedules, setSchedules] = useState<SubjectSchedule[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | undefined>(undefined);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Fetch initial data from REST API
  const fetchData = useCallback(async () => {
    try {
      const [stuRes, logsRes, schRes, anaRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/attendance/logs'),
        fetch('/api/schedules'),
        fetch('/api/analytics')
      ]);

      const stuData = await stuRes.json();
      const logsData = await logsRes.json();
      const schData = await schRes.json();
      const anaData = await anaRes.json();

      if (stuData.success) setStudents(stuData.data);
      if (logsData.success) setAttendanceLogs(logsData.data);
      if (schData.success) {
        setSchedules(schData.data);
        if (schData.data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(schData.data[0].id);
        }
      }
      if (anaData.success) setAnalytics(anaData.summary);
    } catch (err) {
      console.error('Error loading initial API data:', err);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStudentRegistered = (newStudent: Student) => {
    setStudents(prev => [newStudent, ...prev]);
    fetchData();
  };

  const handleManualOverride = async (
    studentId: string,
    subjectId: string,
    status: 'PRESENT' | 'LATE' | 'ABSENT',
    notes?: string
  ) => {
    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subjectId, status, notes })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Manual override error:', err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student profile and vector embeddings?')) {
      try {
        await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        setStudents(prev => prev.filter(s => s.id !== studentId));
        fetchData();
      } catch (err) {
        console.error('Delete student error:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950 flex flex-col relative overflow-x-hidden">
      {/* Immersive Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(14,165,233,0.12)_0%,transparent_50%)] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          userRole={userRole}
          setUserRole={setUserRole}
          schedules={schedules}
          selectedSubjectId={selectedSubjectId}
          setSelectedSubjectId={setSelectedSubjectId}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        />

        {/* Main Body Section */}
        <main className="flex-1 pb-12">
          {currentTab === 'scanner' && (
            <WebcamScanner
              students={students}
              selectedSubjectId={selectedSubjectId}
              schedules={schedules}
              onScanCompleted={fetchData}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            />
          )}

          {currentTab === 'dashboard' && (
            <TeacherDashboard
              students={students}
              attendanceLogs={attendanceLogs}
              schedules={schedules}
              analytics={analytics}
              onRefreshData={fetchData}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
              onManualOverride={handleManualOverride}
              onDeleteStudent={handleDeleteStudent}
            />
          )}

          {currentTab === 'student-portal' && (
            <StudentPortal
              students={students}
              attendanceLogs={attendanceLogs}
              schedules={schedules}
            />
          )}

          {currentTab === 'architecture-guide' && (
            <ArchitectureGuideModal />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#0a0f1d]/80 backdrop-blur-md text-slate-500 text-xs py-4 px-6 text-center">
          <p className="tracking-wide">Student Attendance System • Facial Vector Recognition & Biometric Anti-Spoofing Engine • Spring Boot / Express REST API</p>
        </footer>

        {/* Student Registration Modal */}
        <StudentRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onStudentRegistered={handleStudentRegistered}
        />
      </div>

    </div>
  );
}
