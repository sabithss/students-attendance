export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'DUPLICATE';

export type VerificationMethod = 'FACE_RECOGNITION' | 'MANUAL_OVERRIDE';

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  department: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  registeredAnglesCount: number;
  hasFaceEncoding: boolean;
}

export interface FaceDescriptor {
  id: string;
  studentId: string;
  vectorData: number[]; // 128-dimensional facial descriptor vector
  sampleType: 'frontal' | 'left' | 'right';
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  department: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  subjectName: string;
  status: AttendanceStatus;
  confidenceScore: number; // e.g. 96.5%
  matchDistance: number;   // Euclidean distance value (lower = closer match)
  isLivenessVerified: boolean;
  method: VerificationMethod;
  notes?: string;
}

export interface SubjectSchedule {
  id: string;
  code: string;
  name: string;
  department: string;
  instructor: string;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:30"
  lateThresholdMinutes: number; // e.g. 15
  daysOfWeek: string[]; // e.g. ['Mon', 'Wed', 'Fri']
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  studentId?: string;
}

export interface ScanResult {
  matchFound: boolean;
  student?: Student;
  confidence?: number;
  distance?: number;
  status?: AttendanceStatus;
  message: string;
  log?: AttendanceLog;
  spoofDetected?: boolean;
  antiSpoofReason?: string;
}

export interface AnalyticsSummary {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  overallAttendanceRate: number;
  departmentStats: Array<{
    department: string;
    total: number;
    present: number;
    rate: number;
  }>;
  dailyTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
  }>;
}
