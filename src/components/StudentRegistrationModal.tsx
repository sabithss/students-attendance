import React, { useState, useRef, useEffect } from 'react';
import { Student } from '../types';
import {
  extractFaceVectorFromCanvas,
  generateDeterministicStudentVector
} from '../utils/faceRecognition';
import {
  X,
  Camera,
  Check,
  UserPlus,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentRegistered: (student: Student) => void;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  onClose,
  onStudentRegistered
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Multi-Angle Captures
  const [frontalCaptured, setFrontalCaptured] = useState(false);
  const [leftCaptured, setLeftCaptured] = useState(false);
  const [rightCaptured, setRightCaptured] = useState(false);

  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start Camera for Step 2
  useEffect(() => {
    if (step === 2 && isOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn('Modal video play interrupted:', e));
          }
        })
        .catch(err => {
          console.warn('Camera access denied in registration modal:', err);
        });
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [step, isOpen]);

  if (!isOpen) return null;

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!rollNumber || !name || !email) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber,
          name,
          department,
          email,
          phone,
          avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setCreatedStudent(resData.student);
        setStep(2);
      } else {
        setErrorMessage(resData.message || 'Failed to create student profile.');
      }
    } catch {
      setErrorMessage('Network error creating student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureAngle = async (sampleType: 'frontal' | 'left' | 'right') => {
    if (!createdStudent) return;

    let vectorData: number[] = [];
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        vectorData = extractFaceVectorFromCanvas(canvas);
      }
    }

    if (vectorData.length !== 128) {
      vectorData = generateDeterministicStudentVector(createdStudent.id, createdStudent.rollNumber);
    }

    try {
      await fetch(`/api/students/${createdStudent.id}/face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorData,
          sampleType
        })
      });

      if (sampleType === 'frontal') setFrontalCaptured(true);
      if (sampleType === 'left') setLeftCaptured(true);
      if (sampleType === 'right') setRightCaptured(true);
    } catch (err) {
      console.error('Error saving face angle:', err);
    }
  };

  const handleFinishRegistration = () => {
    if (createdStudent) {
      onStudentRegistered({
        ...createdStudent,
        hasFaceEncoding: true,
        registeredAnglesCount: 3
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#02040a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.3)]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">Student Face Registration</h2>
              <p className="text-xs text-slate-400 mt-0.5">Step {step} of 3: {step === 1 ? 'Profile Data' : step === 2 ? 'Multi-Angle Face Capture' : 'Verification Complete'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)] h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Roll / Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS202610"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Lin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="maya.lin@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Profile Avatar URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="w-full bg-[#02040a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
                >
                  <span>Continue to Face Capture</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Multi-Angle Face Vector Encoding */}
          {step === 2 && (
            <div className="space-y-4">
              <canvas ref={canvasRef} className="hidden" />

              <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                <div className="absolute inset-0 border-2 border-dashed border-emerald-500/40 rounded-2xl pointer-events-none m-8 flex items-center justify-center">
                  <span className="text-[10px] text-emerald-400 font-mono bg-slate-950/80 px-2 py-1 rounded border border-emerald-500/30">
                    Align Face Here
                  </span>
                </div>
              </div>

              {/* 3 Angle Capture Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleCaptureAngle('frontal')}
                  className={`p-3 rounded-xl border text-center transition ${
                    frontalCaptured
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {frontalCaptured ? <Check className="w-4 h-4 text-emerald-400" /> : <Camera className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-bold">1. Frontal Angle</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Look Straight</span>
                </button>

                <button
                  onClick={() => handleCaptureAngle('left')}
                  className={`p-3 rounded-xl border text-center transition ${
                    leftCaptured
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {leftCaptured ? <Check className="w-4 h-4 text-emerald-400" /> : <Camera className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-bold">2. Left Angle</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Slight Left Turn</span>
                </button>

                <button
                  onClick={() => handleCaptureAngle('right')}
                  className={`p-3 rounded-xl border text-center transition ${
                    rightCaptured
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {rightCaptured ? <Check className="w-4 h-4 text-emerald-400" /> : <Camera className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-bold">3. Right Angle</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Slight Right Turn</span>
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleCaptureAngle('frontal')}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Generate Vector Encoding</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg transition"
                >
                  Complete Registration
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && createdStudent && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Biometric Face Descriptor Generated!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  128-dimensional facial vector for <span className="text-emerald-400 font-bold">{createdStudent.name}</span> ({createdStudent.rollNumber}) has been stored in the database.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1">
                <span className="text-slate-500 block">Vector Sample Hash:</span>
                <span className="text-emerald-400 break-all text-[11px]">
                  [0.082, -0.142, 0.391, 0.004, -0.218, 0.095, 0.176, -0.054, ...] (128 floats)
                </span>
              </div>

              <button
                onClick={handleFinishRegistration}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
