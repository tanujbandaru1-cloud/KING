import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Wind, 
  Eye, 
  Terminal, 
  Activity, 
  Download,
  Info,
  Github
} from 'lucide-react';
import { VideoStream } from './components/VideoStream';
import { Dashboard } from './components/Dashboard';
import { LKAState, SimulationParams } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [lkaState, setLkaState] = useState<LKAState | null>(null);
  const [history, setHistory] = useState<LKAState[]>([]);
  const [params, setParams] = useState<SimulationParams>({
    visibility: 1.0,
    windSpeed: 0,
    noiseLevel: 0.1
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleStateUpdate = useCallback((state: LKAState) => {
    setLkaState(state);
    setHistory(prev => [...prev.slice(-100), state]);
  }, []);

  const downloadLogs = () => {
    const csvRows = [
      ['Timestamp', 'LateralOffset', 'SteeringAngle', 'Confidence'].join(','),
      ...history.map(h => [h.timestamp, h.lateralOffset, h.steeringAngle, h.confidence].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lka_logs_${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">AEGIS LKA</h1>
            <p className="text-[10px] font-mono text-blue-400 mt-1 uppercase tracking-widest font-semibold">Active Perception Engine v2.4.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-400 border-x border-white/5 px-6 h-10">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Real-time PID</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>EKF Fusion</span>
            </div>
          </div>
          <button 
            onClick={downloadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Logs</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Interface */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Visualisation Area */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Visual Inference Stream
                </h2>
                <div className="text-xs text-blue-400 font-mono">1280x720 @ 60FPS (SIM)</div>
              </div>
              <VideoStream onStateUpdate={handleStateUpdate} params={params} />
            </section>

            {/* Dashboard Area */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Telemetrics Dashboard
              </h2>
              <Dashboard state={lkaState} history={history} />
            </section>
          </div>
        </main>

        {/* Control Sidebar */}
        <aside className={cn(
          "w-80 border-l border-white/5 bg-slate-900/30 backdrop-blur-xl p-6 transition-all duration-300 transform h-full",
          isSidebarOpen ? "translate-x-0" : "translate-x-full absolute right-0"
        )}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-400" />
              Env. Simulation
            </h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-white/5 rounded-md lg:hidden"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-8">
            <SimulationControl
              label="Atmospheric Visibility"
              icon={<Eye className="w-4 h-4" />}
              value={params.visibility}
              onChange={(v) => setParams(p => ({ ...p, visibility: v }))}
              min={0} max={1} step={0.05}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              description="Simulates fog/rain interference on perception."
            />

            <SimulationControl
              label="Crosswind Velocity"
              icon={<Wind className="w-4 h-4" />}
              value={params.windSpeed}
              onChange={(v) => setParams(p => ({ ...p, windSpeed: v }))}
              min={0} max={120} step={1}
              formatValue={(v) => `${v} km/h`}
              description="Applies lateral aerodynamic force vectors."
            />

            <SimulationControl
              label="Sensor Noise Floor"
              icon={<Settings2 className="w-4 h-4" />}
              value={params.noiseLevel}
              onChange={(v) => setParams(p => ({ ...p, noiseLevel: v }))}
              min={0} max={0.5} step={0.01}
              formatValue={(v) => `${(v * 10).toFixed(1)} dB`}
              description="Introduces Gaussian noise to GNSS/IMU signals."
            />

            <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Info className="w-4 h-4" />
                Control Strategy
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Using <span className="text-blue-300 font-medium font-mono">EKF Sensor Fusion</span> to predict state, then applying a <span className="text-blue-300 font-medium font-mono">PID controller</span> to optimize the steering angle for zero lateral deviation.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-10 border-t border-white/5 bg-slate-950 flex items-center justify-between px-6 relative z-50">
        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest flex items-center gap-4">
          <span>&copy; 2026 Aegis Perception Labs</span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> System Ready</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-slate-500 hover:text-white transition-colors"><Github className="w-4 h-4" /></a>
        </div>
      </footer>
    </div>
  );
}

interface ControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue: (v: number) => string;
  description: string;
}

const SimulationControl = ({ label, icon, value, min, max, step, onChange, formatValue, description }: ControlProps) => (
  <div className="space-y-3 group">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-slate-400 flex items-center gap-2 group-hover:text-slate-300 transition-colors">
        {icon}
        {label}
      </label>
      <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{formatValue(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all hover:bg-slate-700"
    />
    <p className="text-[10px] text-slate-500 leading-tight italic">{description}</p>
  </div>
);
