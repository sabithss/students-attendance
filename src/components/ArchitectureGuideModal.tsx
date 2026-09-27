import React, { useState } from 'react';
import {
  Database,
  Code2,
  Server,
  Layers,
  Cpu,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  GitFork
} from 'lucide-react';

export const ArchitectureGuideModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'er-diagram' | 'sql-ddl' | 'java-spring' | 'algorithm'>('er-diagram');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const mysqlSQL = `-- ========================================================
-- STUDENT ATTENDANCE SYSTEM - MYSQL DATABASE SCHEMA DDL
-- ========================================================

CREATE DATABASE IF NOT EXISTS student_attendance_db;
USE student_attendance_db;

-- 1. Students Master Table
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(36) PRIMARY KEY,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_roll_number (roll_number),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Facial Vector Embeddings Table
CREATE TABLE IF NOT EXISTS face_descriptors (
    descriptor_id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    vector_data TEXT NOT NULL, -- 128-float JSON or comma-delimited array
    sample_type ENUM('frontal', 'left', 'right') DEFAULT 'frontal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_student_descriptor (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Subject Schedules Table
CREATE TABLE IF NOT EXISTS subject_schedules (
    subject_id VARCHAR(36) PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    instructor_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_threshold_minutes INT DEFAULT 15,
    days_of_week VARCHAR(50) DEFAULT 'Mon,Tue,Wed,Thu,Fri'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Attendance Logs Table
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    attendance_date DATE NOT NULL,
    scan_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PRESENT', 'LATE', 'ABSENT', 'DUPLICATE') NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    match_distance DECIMAL(6,4) NOT NULL,
    is_liveness_verified TINYINT(1) DEFAULT 1,
    verification_method ENUM('FACE_RECOGNITION', 'MANUAL_OVERRIDE') DEFAULT 'FACE_RECOGNITION',
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject_schedules(subject_id) ON DELETE CASCADE,
    UNIQUE KEY uk_daily_subject_attendance (student_id, subject_id, attendance_date),
    INDEX idx_date_subject (attendance_date, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const postgresSQL = `-- ========================================================
-- POSTGRESQL SCHEMA WITH PGVECTOR (VECTOR EMBEDDINGS)
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector; -- Enables vector similarity index

CREATE TABLE students (
    student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE face_descriptors (
    descriptor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    vector_embedding vector(128) NOT NULL, -- Native 128D Float Vector
    sample_type VARCHAR(20) DEFAULT 'frontal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cosine & L2 Distance Vector Index for Sub-Millisecond Search
CREATE INDEX idx_face_vector_l2 ON face_descriptors USING ivfflat (vector_embedding vector_l2_ops);

CREATE TABLE attendance_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'DUPLICATE')),
    confidence_score NUMERIC(5,2) NOT NULL,
    match_distance NUMERIC(6,4) NOT NULL,
    is_liveness_verified BOOLEAN DEFAULT TRUE,
    CONSTRAINT uk_student_daily_subject UNIQUE (student_id, subject_id, attendance_date)
);`;

  const javaEntityCode = `// ========================================================
// JAVA SPRING BOOT ENTITY & VECTOR MATCHING SERVICE
// ========================================================

package com.university.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String studentId;

    @Column(unique = true, nullable = false)
    private String rollNumber;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String department;

    @Column(unique = true, nullable = false)
    private String email;
}

// --------------------------------------------------------

package com.university.attendance.service;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FaceRecognitionService {

    private static final double MATCH_THRESHOLD = 0.45;

    /**
     * Calculates Euclidean Distance between two 128-float vectors
     */
    public double calculateEuclideanDistance(float[] v1, float[] v2) {
        if (v1 == null || v2 == null || v1.length != v2.length) return 1.0;
        double sum = 0.0;
        for (int i = 0; i < v1.length; i++) {
            double diff = v1[i] - v2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Searches database face descriptors for closest matching student
     */
    public StudentMatchResult findBestMatch(float[] scanVector, List<FaceDescriptor> registeredDescriptors) {
        double minDistance = 1.0;
        FaceDescriptor bestMatch = null;

        for (FaceDescriptor desc : registeredDescriptors) {
            double dist = calculateEuclideanDistance(scanVector, desc.getVectorData());
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = desc;
            }
        }

        if (minDistance <= MATCH_THRESHOLD && bestMatch != null) {
            double confidence = (1.0 - (minDistance / MATCH_THRESHOLD) * 0.22) * 100;
            return new StudentMatchResult(true, bestMatch.getStudent(), minDistance, confidence);
        }

        return new StudentMatchResult(false, null, minDistance, 0.0);
    }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/40">
            System Architecture
          </span>
          <span className="text-xs text-slate-400">Java Spring Boot + MySQL/PostgreSQL Vector Specs</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Clearance Architecture & Database Implementation Guide
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
          Comprehensive production-grade schema DDL, JPA Entities, Spring Boot REST controllers, and 128-dimensional biometric vector embedding search documentation.
        </p>
      </div>

      {/* Architecture Tabs */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('er-diagram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
              activeTab === 'er-diagram'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-400 hover:text-white bg-[#02040a] border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ER Diagram & Data Model</span>
          </button>

          <button
            onClick={() => setActiveTab('sql-ddl')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
              activeTab === 'sql-ddl'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-400 hover:text-white bg-[#02040a] border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>SQL DDL Scripts (MySQL & Postgres)</span>
          </button>

          <button
            onClick={() => setActiveTab('java-spring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
              activeTab === 'java-spring'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-400 hover:text-white bg-[#02040a] border border-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Java Spring Boot Implementation</span>
          </button>

          <button
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
              activeTab === 'algorithm'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-400 hover:text-white bg-[#02040a] border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Biometric Vector Math</span>
          </button>
        </div>

        {/* TAB 1: ER DIAGRAM & DATA MODEL */}
        {activeTab === 'er-diagram' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Entity Relationship Structure & Relational Schema</span>
            </h2>

            {/* Visual ER Diagram Representation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-indigo-400 font-mono">TABLE: Students</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">PK: student_id</span>
                </div>
                <ul className="text-xs font-mono space-y-1 text-slate-300">
                  <li className="text-amber-400">🔑 student_id (VARCHAR / UUID)</li>
                  <li>• roll_number (VARCHAR - UNIQUE)</li>
                  <li>• full_name (VARCHAR)</li>
                  <li>• department (VARCHAR)</li>
                  <li>• email (VARCHAR - UNIQUE)</li>
                  <li>• phone (VARCHAR)</li>
                  <li>• created_at (TIMESTAMP)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-emerald-400 font-mono">TABLE: Face_Descriptors</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">FK: student_id</span>
                </div>
                <ul className="text-xs font-mono space-y-1 text-slate-300">
                  <li className="text-amber-400">🔑 descriptor_id (VARCHAR)</li>
                  <li className="text-indigo-400">🔗 student_id (FK -&gt; Students)</li>
                  <li className="text-emerald-400">⚡ vector_data (128-float Array)</li>
                  <li>• sample_type (frontal/left/right)</li>
                  <li>• created_at (TIMESTAMP)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-teal-400 font-mono">TABLE: Attendance_Logs</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded">UK: student+date</span>
                </div>
                <ul className="text-xs font-mono space-y-1 text-slate-300">
                  <li className="text-amber-400">🔑 log_id (VARCHAR)</li>
                  <li className="text-indigo-400">🔗 student_id (FK -&gt; Students)</li>
                  <li className="text-indigo-400">🔗 subject_id (FK -&gt; Schedules)</li>
                  <li>• attendance_date (DATE)</li>
                  <li>• scan_timestamp (TIMESTAMP)</li>
                  <li className="text-emerald-400">• status (PRESENT/LATE/ABSENT)</li>
                  <li>• match_distance (DECIMAL)</li>
                </ul>
              </div>

            </div>

            {/* Architecture Flow Chart */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">End-to-End Data Pipeline Flow:</span>
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-300">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center w-full">
                  <span className="text-emerald-400 font-bold block">1. WebRTC Camera</span>
                  <span className="text-[10px] text-slate-400">1280x720 HTML5 Video Feed</span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0 hidden md:block" />
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center w-full">
                  <span className="text-teal-400 font-bold block">2. Canvas Descriptor</span>
                  <span className="text-[10px] text-slate-400">128D Normalized Float Vector</span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0 hidden md:block" />
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center w-full">
                  <span className="text-indigo-400 font-bold block">3. Vector Search Engine</span>
                  <span className="text-[10px] text-slate-400">Euclidean Distance &lt; 0.45</span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0 hidden md:block" />
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center w-full">
                  <span className="text-amber-400 font-bold block">4. Attendance Log</span>
                  <span className="text-[10px] text-slate-400">Duplicate Check & Time Enforcement</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SQL DDL SCRIPTS */}
        {activeTab === 'sql-ddl' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-mono">1. MySQL 8.0 DDL Schema Script</h3>
                <button
                  onClick={() => copyToClipboard(mysqlSQL, 'mysql')}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  {copiedIndex === 'mysql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 'mysql' ? 'Copied MySQL SQL!' : 'Copy MySQL DDL'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto max-h-80">
                {mysqlSQL}
              </pre>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-mono">2. PostgreSQL Schema with Native pgvector Extension</h3>
                <button
                  onClick={() => copyToClipboard(postgresSQL, 'pg')}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  {copiedIndex === 'pg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 'pg' ? 'Copied Postgres SQL!' : 'Copy Postgres DDL'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-indigo-300 font-mono overflow-x-auto max-h-80">
                {postgresSQL}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: JAVA SPRING BOOT */}
        {activeTab === 'java-spring' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono">Java Spring Boot 3 + JPA Biometric Matching Service</h3>
              <button
                onClick={() => copyToClipboard(javaEntityCode, 'java')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
              >
                {copiedIndex === 'java' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 'java' ? 'Copied Java Code!' : 'Copy Java Code'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-teal-300 font-mono overflow-x-auto max-h-96">
              {javaEntityCode}
            </pre>
          </div>
        )}

        {/* TAB 4: BIOMETRIC VECTOR MATH */}
        {activeTab === 'algorithm' && (
          <div className="space-y-4 text-xs text-slate-300">
            <h3 className="text-sm font-bold text-white">Biometric Vector Comparison & Threshold Mathematics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 block font-mono">Euclidean Distance (L2 Norm)</span>
                <p className="text-[11px] text-slate-400">
                  Measures absolute straight-line distance between two 128-float facial vectors <span className="font-mono text-white">u</span> and <span className="font-mono text-white">v</span>:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-center text-emerald-300">
                  d(u, v) = √ [ ∑ (u_i - v_i)² ]
                </div>
                <p className="text-[11px] text-slate-400">
                  Match Threshold: <span className="font-bold text-amber-400">d &le; 0.45</span>. Distance 0.12 indicates &gt; 98% visual similarity.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-indigo-400 block font-mono">Cosine Similarity</span>
                <p className="text-[11px] text-slate-400">
                  Measures the cosine angle between two facial feature vectors, invariant to overall lighting intensity changes:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-center text-indigo-300">
                  Cosine(u, v) = (u · v) / ( ||u|| * ||v|| )
                </div>
                <p className="text-[11px] text-slate-400">
                  Match Threshold: <span className="font-bold text-amber-400">Cosine &ge; 0.85</span>.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
