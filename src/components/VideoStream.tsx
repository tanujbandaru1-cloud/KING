import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, AlertTriangle, CheckCircle, Wind, EyeOff, Upload, Play, Pause } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { SimulationParams, LKAState } from '@/src/types';

interface VideoStreamProps {
  onStateUpdate: (state: LKAState) => void;
  params: SimulationParams;
}

type SourceType = 'camera' | 'file' | null;

export const VideoStream: React.FC<VideoStreamProps> = ({ onStateUpdate, params }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const driftRef = useRef(0);

  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => console.log('LKA Stream connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'LKA_UPDATE') {
        onStateUpdate(data.metrics);
        // Correct the simulated drift based on steering angle
        driftRef.current += data.metrics.steeringAngle * 0.001;
      }
    };
    ws.onclose = () => {
      console.log('LKA Stream disconnected');
      setTimeout(connectWS, 2000);
    };
    
    wsRef.current = ws;
  }, [onStateUpdate]);

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, [connectWS]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setSourceType('camera');
        setIsStreaming(true);
        setIsPlaying(true);
        setError(null);
      }
    } catch (err) {
      setError('Camera access denied or not available.');
      console.error(err);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      setSourceType('file');
      setIsStreaming(true);
      setIsPlaying(true);
      setError(null);
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    let animationFrame: number;
    
    const draw = () => {
      if (!canvasRef.current || !videoRef.current || !isStreaming) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvasRef.current;
      
      // 1. Draw Camera Feed
      ctx.drawImage(videoRef.current, 0, 0, width, height);

      // 2. Apply Perception Simulation (Fog/Noise)
      if (params.visibility < 0.7) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - params.visibility})`;
        ctx.fillRect(0, 0, width, height);
        ctx.filter = `blur(${(1 - params.visibility) * 10}px)`;
      } else {
        ctx.filter = 'none';
      }

      // 3. Lane Detection Simulation
      // We simulate a curving road and vehicle drift
      driftRef.current += (Math.random() - 0.5) * params.noiseLevel * 0.05;
      driftRef.current += params.windSpeed * 0.0001; // Wind drift
      
      // Bound the drift for simulation safety
      driftRef.current = Math.max(-1, Math.min(1, driftRef.current));
      
      const centerX = width / 2 + driftRef.current * (width / 4);
      const laneWidth = width * 0.4 * params.visibility;

      // Draw Lanes
      ctx.lineWidth = 8;
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = params.visibility > 0.4 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      
      // Left Lane
      ctx.beginPath();
      ctx.moveTo(centerX - laneWidth / 2, height);
      ctx.lineTo(centerX - laneWidth / 6, height / 2);
      ctx.stroke();

      // Right Lane
      ctx.beginPath();
      ctx.moveTo(centerX + laneWidth / 2, height);
      ctx.lineTo(centerX + laneWidth / 6, height / 2);
      ctx.stroke();

      // Center Line (Control Target)
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(width / 2, height);
      ctx.lineTo(width / 2, height / 2);
      ctx.stroke();

      // 4. Send metrics to backend for PID/EKF processing
      if (wsRef.current?.readyState === WebSocket.OPEN && !videoRef.current.paused) {
        wsRef.current.send(JSON.stringify({
          lateralOffset: driftRef.current,
          params
        }));
      }

      animationFrame = requestAnimationFrame(draw);
    };

    if (isStreaming) {
      animationFrame = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isStreaming, params]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
      {!isStreaming ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-slate-950/80 backdrop-blur-sm z-10 p-8">
          <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Camera className="w-12 h-12 text-blue-400" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-slate-100">Sensor Input Source</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">Select a perception source to initialize the Real-Time Lane Keeping Assistance system.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all transform hover:scale-102 active:scale-98 shadow-lg shadow-blue-600/20"
            >
              <Camera className="w-5 h-5" />
              Live Webcam
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all transform hover:scale-102 active:scale-98 border border-slate-700"
            >
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="video/*" 
            onChange={handleFileUpload} 
          />
          
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </div>
      ) : null}

      <video 
        ref={videoRef} 
        className="hidden" 
        autoPlay 
        loop 
        muted 
        playsInline 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-cover"
      />

      {/* Overlay Status */}
      {isStreaming && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-slate-200 uppercase tracking-wider">
                {sourceType === 'camera' ? 'Camera: Active' : 'File: Processing'}
              </span>
            </div>
            {sourceType === 'file' && (
              <button 
                onClick={togglePlayback}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {params.visibility < 0.5 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-md rounded-lg border border-amber-500/30 text-amber-400 text-xs font-medium">
                <EyeOff className="w-4 h-4" />
                Low Visibility
              </div>
            )}
            {params.windSpeed > 50 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-lg border border-blue-500/30 text-blue-400 text-xs font-medium shadow-lg shadow-blue-500/10">
                <Wind className="w-4 h-4" />
                Strong Crosswind
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
