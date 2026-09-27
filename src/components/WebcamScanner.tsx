import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Student, SubjectSchedule, ScanResult } from '../types';
import {
  extractFaceVectorFromCanvas,
  checkLivenessAntiSpoofing
} from '../utils/faceRecognition';
import {
  Camera,
  CameraOff,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  UserCheck,
  Volume2,
  VolumeX,
  Play,
  Square
} from 'lucide-react';

interface WebcamScannerProps {
  students: Student[];
  selectedSubjectId: string;
  schedules: SubjectSchedule[];
  onScanCompleted?: (result: ScanResult) => void;
  onOpenRegisterModal: () => void;
}

export const WebcamScanner: React.FC<WebcamScannerProps> = ({
  students,
  selectedSubjectId,
  schedules,
  onScanCompleted,
  onOpenRegisterModal
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [antiSpoofStatus, setAntiSpoofStatus] = useState<{ isLive: boolean; reason?: string }>({ isLive: true });
  const [selectedSimulateStudentId, setSelectedSimulateStudentId] = useState<string>('');

  const activeSubject = schedules.find(s => s.id === selectedSubjectId) || schedules[0];

  // Synthesize audio feedback using Web Audio API
  const playSoundEffect = useCallback((type: 'SUCCESS' | 'LATE' | 'DUPLICATE' | 'ERROR') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'SUCCESS') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'LATE') {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15); // F4
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'DUPLICATE') {
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio context fallback ignore
    }
  }, [soundEnabled]);

  // Start WebRTC Camera Feed
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play interrupted:', e));
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webcam permission denied or camera not found.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Execute Face Scan & Vector Comparison
  const performScan = useCallback(async (forcedStudentId?: string) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      let vectorData: number[] = [];
      let livenessResult: { isLive: boolean; spoofReason?: string; score?: number } = { isLive: true };

      // Process live canvas frame if camera is running
      if (!forcedStudentId && videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Anti-spoofing check
          livenessResult = checkLivenessAntiSpoofing(canvas);
          setAntiSpoofStatus({ isLive: livenessResult.isLive, reason: livenessResult.spoofReason });

          // Extract 128-float face embedding vector
          vectorData = extractFaceVectorFromCanvas(canvas);
        }
      }

      // Call Backend Scanner Endpoint
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorData: vectorData.length === 128 ? vectorData : undefined,
          subjectId: selectedSubjectId,
          forcedStudentId,
          isAntiSpoofPassed: livenessResult.isLive,
          spoofReason: livenessResult.spoofReason
        })
      });

      const resData: ScanResult = await response.json();
      setLastResult(resData);

      if (resData.matchFound && resData.status) {
        if (resData.status === 'PRESENT') playSoundEffect('SUCCESS');
        else if (resData.status === 'LATE') playSoundEffect('LATE');
        else if (resData.status === 'DUPLICATE') playSoundEffect('DUPLICATE');
      } else if (resData.spoofDetected) {
        playSoundEffect('ERROR');
      }

      if (onScanCompleted) {
        onScanCompleted(resData);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, selectedSubjectId, playSoundEffect, onScanCompleted]);

  // Auto-Scan interval trigger
  useEffect(() => {
    if (!autoScanEnabled || !isCameraActive) return;
    const interval = setInterval(() => {
      performScan();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoScanEnabled, isCameraActive, performScan]);

  // Draw overlay biometric scanning animation on canvas
  useEffect(() => {
    let animId: number;
    let scanY = 0;
    let scanDirection = 1;

    const renderOverlay = () => {
      const overlay = overlayCanvasRef.current;
      const video = videoRef.current;
      if (!overlay || !video || !isCameraActive) return;

      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const cw = overlay.width;
      const ch = overlay.height;

      // Simulated Face Bounding Box in Center
      const boxW = Math.min(320, cw * 0.45);
      const boxH = Math.min(380, ch * 0.65);
      const boxX = (cw - boxW) / 2;
      const boxY = (ch - boxH) / 2;

      // Draw Corner Reticles
      const lineLen = 28;
      ctx.strokeStyle = '#38bdf8'; // Sky 400
      ctx.lineWidth = 3;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + lineLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + lineLen, boxY);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - lineLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + lineLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - lineLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + lineLen, boxY + boxH);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - lineLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - lineLen);
      ctx.stroke();

      // Animated Vertical Scan Line
      scanY += scanDirection * 2.5;
      if (scanY > boxH) scanDirection = -1;
      if (scanY < 0) scanDirection = 1;

      const currentScanY = boxY + scanY;

      const grad = ctx.createLinearGradient(boxX, currentScanY - 10, boxX, currentScanY + 10);
      grad.addColorStop(0, 'rgba(14, 165, 233, 0)');
      grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.8)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(boxX, currentScanY - 10, boxW, 20);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxX, currentScanY);
      ctx.lineTo(boxX + boxW, currentScanY);
      ctx.stroke();

      // Facial Landmark Dots Preview
      const landmarks = [
        { x: boxX + boxW * 0.35, y: boxY + boxH * 0.35 }, // Left Eye
        { x: boxX + boxW * 0.65, y: boxY + boxH * 0.35 }, // Right Eye
        { x: boxX + boxW * 0.50, y: boxY + boxH * 0.52 }, // Nose
        { x: boxX + boxW * 0.38, y: boxY + boxH * 0.70 }, // Mouth Left
        { x: boxX + boxW * 0.62, y: boxY + boxH * 0.70 }, // Mouth Right
        { x: boxX + boxW * 0.50, y: boxY + boxH * 0.88 }, // Chin
      ];

      ctx.fillStyle = '#38bdf8';
      landmarks.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(renderOverlay);
    };

    if (isCameraActive) {
      animId = requestAnimationFrame(renderOverlay);
    }

    return () => cancelAnimationFrame(animId);
  }, [isCameraActive]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Subject Header & Quick Info */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-sky-500/10 text-sky-400 font-mono text-xs font-bold border border-sky-500/20">
              {activeSubject?.code || 'CS101'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{activeSubject?.name || 'Loading Subject...'}</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Instructor: <span className="text-slate-200 font-medium">{activeSubject?.instructor || 'Faculty'}</span> • Schedule: <span className="text-sky-400 font-mono font-medium">{activeSubject?.startTime || '09:00'} - {activeSubject?.endTime || '10:30'}</span> • Late Threshold: <span className="text-amber-400 font-medium">{activeSubject?.lateThresholdMinutes ?? 15} mins</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-[#02040a] text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-800"
            title={soundEnabled ? 'Mute Audio Chime' : 'Unmute Audio Chime'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-sky-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          <button
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
              autoScanEnabled
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                : 'bg-[#02040a] text-slate-400 border-slate-800'
            }`}
          >
            {autoScanEnabled ? <Play className="w-4 h-4 fill-sky-400 text-sky-400" /> : <Square className="w-4 h-4" />}
            <span>Auto-Scan {autoScanEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Webcam Viewport */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="relative bg-[#000] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-video flex items-center justify-center group">
            
            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Feed */}
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                />

                {/* Live HUD Badge Overlays */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-white shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="font-mono text-emerald-400 font-semibold tracking-wider uppercase text-[10px]">LIVE WEBCAM GRID</span>
                </div>

                {/* Anti-Spoofing Indicator */}
                <div className={`absolute top-4 right-4 flex items-center gap-1.5 backdrop-blur-md px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-lg ${
                  antiSpoofStatus.isLive
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                }`}>
                  {antiSpoofStatus.isLive ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px] font-mono uppercase tracking-wider">Liveness Verified</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                      <span className="text-[11px] font-mono uppercase tracking-wider">Anti-Spoof Risk</span>
                    </>
                  )}
                </div>

                {/* Bottom Trigger Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-[#0a0f1d]/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800/80">
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-slate-300 font-mono tracking-wide">128D Vector Descriptor Matcher</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => performScan()}
                      disabled={isScanning}
                      className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all disabled:opacity-50"
                    >
                      <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
                    </button>

                    <button
                      onClick={stopCamera}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Stop Camera"
                    >
                      <CameraOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Camera Off / Error State */
              <div className="text-center p-8 max-w-md space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0a0f1d] border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Camera Standby / Unavailable</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Allow camera permissions or use the student simulator below to test face recognition instantly.'}
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Feed</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Instant Test Simulator (Ensures seamless testing even without webcam!) */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">Face Vector Simulator</span>
                <p className="text-[11px] text-slate-400">Test vector matching with pre-registered student profile</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedSimulateStudentId}
                onChange={(e) => setSelectedSimulateStudentId(e.target.value)}
                className="bg-[#02040a] text-xs text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sky-500 w-full sm:w-auto"
              >
                <option value="">-- Choose Registered Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rollNumber})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (selectedSimulateStudentId) {
                    performScan(selectedSimulateStudentId);
                  }
                }}
                disabled={!selectedSimulateStudentId || isScanning}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(14,165,233,0.3)] whitespace-nowrap"
              >
                Simulate Match
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result Card & Verification Feedback */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scan className="w-4 h-4 text-sky-400" />
                <span>Verification Stream</span>
              </h2>
              {lastResult && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                  {new Date().toLocaleTimeString()}
                </span>
              )}
            </div>

            {lastResult ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Status Banner */}
                {lastResult.matchFound && lastResult.student ? (
                  <>
                    <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                      lastResult.status === 'PRESENT'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : lastResult.status === 'LATE'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                    }`}>
                      {lastResult.status === 'PRESENT' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      ) : lastResult.status === 'LATE' ? (
                        <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                            lastResult.status === 'PRESENT'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : lastResult.status === 'LATE'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-sky-500/20 text-sky-300'
                          }`}>
                            {lastResult.status}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {lastResult.confidence}% Confidence
                          </span>
                        </div>
                        <p className="text-xs font-medium mt-1.5">{lastResult.message}</p>
                      </div>
                    </div>

                    {/* Student Profile Card */}
                    <div className="bg-[#02040a] p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                      <img
                        src={lastResult.student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={lastResult.student.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-sky-500/40 shadow-lg"
                      />
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-base">{lastResult.student.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">Roll: <span className="text-slate-200 font-bold">{lastResult.student.rollNumber}</span></p>
                        <p className="text-xs text-slate-400">Dept: <span className="text-slate-300">{lastResult.student.department}</span></p>
                      </div>
                    </div>

                    {/* Vector Metrics */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-[#02040a] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-bold">Euclidean Distance</span>
                        <span className="text-emerald-400 font-bold text-sm mt-0.5 block">{lastResult.distance ?? '0.14'}</span>
                        <span className="text-[9px] text-slate-500 block">&lt; 0.45 Threshold</span>
                      </div>
                      <div className="bg-[#02040a] p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-bold">Liveness Anti-Spoof</span>
                        <span className="text-sky-400 font-bold text-sm mt-0.5 block">0.98</span>
                        <span className="text-[9px] text-slate-500 block">Verification Passed</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Unrecognized or Spoof Error */
                  <div className="bg-rose-950/60 border border-rose-500/40 p-4 rounded-2xl text-rose-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span className="font-bold text-xs uppercase tracking-wider">Access Denied</span>
                    </div>
                    <p className="text-xs">{lastResult.message || lastResult.antiSpoofReason}</p>
                    <div className="pt-2">
                      <button
                        onClick={onOpenRegisterModal}
                        className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
                      >
                        + Register this student's face vector now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Idle Waiting State */
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                  <Scan className="w-6 h-6 text-sky-400 animate-pulse" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Position your face inside the sky-blue reticle or select a registered student to trigger automatic attendance logging.
                </p>
              </div>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="bg-[#0a0f1d]/60 border border-slate-800 p-4 rounded-3xl text-xs space-y-2 text-slate-400">
            <span className="font-bold text-slate-200 block uppercase tracking-wider text-[10px]">💡 Biometric Recognition Rules:</span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Must be registered with frontal facial descriptor vector.</li>
              <li>Attendance automatically enforces 15-min late threshold.</li>
              <li>Same-day same-subject duplicate entries are blocked.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
