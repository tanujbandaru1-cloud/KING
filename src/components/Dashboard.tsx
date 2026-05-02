import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';
import { Activity, Gauge, Compass, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { LKAState } from '@/src/types';

interface DashboardProps {
  state: LKAState | null;
  history: LKAState[];
}

export const Dashboard: React.FC<DashboardProps> = ({ state, history }) => {
  if (!state) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Primary Metrics */}
      <MetricCard
        title="Lateral Offset"
        value={`${(state.lateralOffset ?? 0).toFixed(3)}m`}
        icon={<Activity className="w-5 h-5 text-blue-400" />}
        status={state.isSafe ? 'safe' : 'danger'}
        description="Deviation from lane center"
      />
      <MetricCard
        title="Steering Angle"
        value={`${(state.steeringAngle ?? 0).toFixed(1)}°`}
        icon={<Compass className="w-5 h-5 text-indigo-400" />}
        description="PID Correction Output"
      />
      <MetricCard
        title="System Confidence"
        value={`${((state.confidence ?? 0) * 100).toFixed(1)}%`}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        status={state.confidence > 0.8 ? 'safe' : state.confidence > 0.5 ? 'warning' : 'danger'}
        description="Perception Reliability"
      />

      {/* Charts Section */}
      <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Tracking & Control Dynamics</h3>
              <p className="text-xs text-slate-400">Real-time fusion of computer vision and sensor data</p>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history.slice(-50)}>
              <defs>
                <linearGradient id="colorOffset" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAngle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[-1, 1]} stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
                labelStyle={{ display: 'none' }}
              />
              <Area 
                type="monotone" 
                dataKey="lateralOffset" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOffset)" 
                name="Offset (m)"
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="steeringAngle" 
                stroke="#818cf8" 
                strokeWidth={1}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorAngle)" 
                name="Steering (°)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Control Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-slate-400" />
          Safety Integrity
        </h3>
        
        <div className="space-y-4">
          <StatusRow label="Lane Centering" status={state.isSafe} />
          <StatusRow label="Sensor Fusion" status={state.confidence > 0.6} />
          <StatusRow label="PID Stability" status={Math.abs(state.steeringAngle) < 30} />
        </div>

        <div className={cn(
          "mt-6 p-4 rounded-xl flex items-center gap-3 border transition-colors",
          state.isSafe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          {state.isSafe ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
          <div>
            <p className="font-bold uppercase tracking-wider text-xs">LKA Protocol</p>
            <p className="text-lg font-bold">{state.isSafe ? 'Nominal' : 'Warning'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, description, status = 'default' }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <span className="text-slate-400 text-sm font-medium">{title}</span>
      <div className="p-2 rounded-lg bg-slate-800">
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={cn(
        "text-3xl font-bold font-mono tracking-tighter",
        status === 'danger' ? 'text-rose-400' : status === 'warning' ? 'text-amber-400' : 'text-slate-100'
      )}>{value}</span>
    </div>
    <p className="text-xs text-slate-500 mt-2">{description}</p>
  </div>
);

const StatusRow = ({ label, status }: { label: string, status: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={cn(
      "text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
      status ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
    )}>
      {status ? 'OK' : 'FAIL'}
    </span>
  </div>
);
