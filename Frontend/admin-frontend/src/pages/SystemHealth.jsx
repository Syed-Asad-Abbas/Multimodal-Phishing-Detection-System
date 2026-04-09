import React, { useState, useEffect } from "react";
import { Card, Badge } from "../components/ui/Primitives";
import { Activity, Database, Cpu, Server } from "lucide-react";
import api from "../services/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const ICONS = {
  "API Latency": Activity,
  "Database": Database,
  "ML Inference": Cpu,
  "Scanning Nodes": Server,
};

const getTheme = (status) => {
  if (['Optimal', 'Connected', 'Healthy'].includes(status)) {
    return { border: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400' };
  }
  if (['Disconnected', 'Offline', 'N/A', 'Error'].includes(status)) {
    return { border: 'border-l-red-500', badge: 'bg-red-500/10 text-red-400' };
  }
  if (['High Load', 'Degraded', 'Pending'].includes(status)) {
    return { border: 'border-l-amber-500', badge: 'bg-amber-500/10 text-amber-400' };
  }
  return { border: 'border-l-slate-500', badge: 'bg-slate-500/10 text-slate-400' };
};

export default function SystemHealth() {
  const [metrics, setMetrics] = useState([
    { name: "API Latency", value: "Loading...", status: "Pending", icon: Activity },
    { name: "Database", value: "Loading...", status: "Pending", icon: Database },
    { name: "ML Inference", value: "Loading...", status: "Pending", icon: Cpu },
    { name: "Scanning Nodes", value: "Loading...", status: "Pending", icon: Server },
  ]);

  const [graphs, setGraphs] = useState({ latencyData: [], loadData: [] });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/system-health');
        if (data.metrics) {
            const updated = data.metrics.map(m => ({
                ...m,
                icon: ICONS[m.name] || Activity
            }));
            setMetrics(updated);
        }
      } catch (err) {
        console.error("Failed to fetch system health metrics", err);
      }
    };
    
    const fetchGraphs = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/health-graphs');
        setGraphs(data);
      } catch (err) {
        console.error("Failed to fetch system health graphs", err);
      }
    };

    fetchHealth();
    fetchGraphs();
    const interval = setInterval(fetchHealth, 15000); // polling every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">System Health</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => {
          const theme = getTheme(m.status);
          return (
            <Card key={i} className={`p-6 border-l-4 ${theme.border} bg-slate-900/40 transition-colors duration-500`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <m.icon className="h-5 w-5 text-slate-400" />
                </div>
                <Badge variant="neutral" className={`${theme.badge} border-0 transition-colors duration-500`}>
                  {m.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white transition-opacity duration-300">
                {m.value}
              </div>
              <div className="text-sm text-slate-500 mt-1">{m.name}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Latency Area Chart */}
        <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Pipeline Latency</h3>
            <p className="text-sm text-slate-400">Historical ML interface response times (ms) over 24h</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphs.latencyData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={() => ''} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="latency_ms" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* System Load Bar Chart */}
        <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">System Load Volume</h3>
            <p className="text-sm text-slate-400">Scan throughput over the last 24h</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphs.loadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={() => ''} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
