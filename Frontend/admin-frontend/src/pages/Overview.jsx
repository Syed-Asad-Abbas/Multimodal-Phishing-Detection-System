import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Primitives";
import { Terminal } from "lucide-react";
import { motion } from "motion/react";
import api from "../services/api";

export default function Overview() {
  const [stats, setStats] = useState({
    totalScans: 0,
    benignCount: 0,
    phishingCount: 0,
    totalUsers: 0,
    phishingRate: 0
  });

  const [logs, setLogs] = useState([
    "[SYSTEM] Connection established to backend.",
    "[SYSTEM] Awaiting real-time intelligence feeds...",
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();

    const interval = setInterval(() => {
      const newLog = `[${new Date().toLocaleTimeString()}] Analysis Node #${Math.floor(Math.random() * 50)}: processing batch...`;
      setLogs(prev => [...prev.slice(-8), newLog]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-[#020617]">
      <div className="p-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm z-10 absolute top-0 left-0 right-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Global Threat Intelligence</h1>
          <p className="text-slate-400 text-sm">Real-time attack vectors and node status.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-medium">SYSTEM OPTIMAL</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-[#020617] overflow-hidden">
        {/* Floating Stats Cards */}
        <div className="absolute top-28 left-8 w-72 space-y-4 z-10">
          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-2xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans</h3>
            <div className="text-4xl font-bold text-cyan-400 mt-2 font-mono">{stats.totalScans.toLocaleString()}</div>
          </Card>
          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-2xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phishing Detected</h3>
            <div className="text-4xl font-bold text-red-500 mt-2 font-mono">{stats.phishingCount.toLocaleString()}</div>
            <div className="h-1.5 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.phishingRate}%` }}
                transition={{ duration: 2 }}
                className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Phishing Rate: {stats.phishingRate}%</p>
          </Card>
          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-2xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</h3>
            <div className="text-4xl font-bold text-emerald-400 mt-2 font-mono">{stats.totalUsers.toLocaleString()}</div>
          </Card>
        </div>

        {/* Log Console */}
        <div className="absolute bottom-8 right-8 w-[450px] font-mono text-xs z-10">
          <Card className="bg-black/90 backdrop-blur-xl border-slate-800 h-64 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 border-b border-slate-800 text-slate-500 flex justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <span>SYSTEM_LOGS_V2</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 animate-pulse" />
              </div>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto text-slate-300 font-mono">
              {logs.map((log, i) => (
                <div key={i} className="border-l-2 border-slate-800 pl-2 opacity-80 hover:opacity-100 hover:bg-slate-900/30 hover:border-cyan-500/50 transition-all cursor-default">
                  {log}
                </div>
              ))}
              <div className="animate-pulse text-cyan-500">_</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
