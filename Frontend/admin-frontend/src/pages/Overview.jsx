import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Primitives";
import { motion } from "motion/react";
import api from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

export default function Overview() {
  const [stats, setStats] = useState({
    totalScans: 0,
    benignCount: 0,
    phishingCount: 0,
    totalUsers: 0,
    phishingRate: 0
  });

  const [visitorData, setVisitorData] = useState([]);
  const [filter, setFilter] = useState('1w');

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
  }, []);

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const { data } = await api.get(`/admin/dashboard/visitors?filter=${filter}`);
        setVisitorData(data);
      } catch (err) {
        console.error("Error fetching visitors:", err);
      }
    };
    fetchVisitors();
  }, [filter]);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-[#020617]">
      {/* Top Navigation / Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm z-10 flex justify-between items-center w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {localStorage.getItem('adminName') || 'Admin'}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-medium">SYSTEM OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full p-8 overflow-y-auto">
        {/* Horizontal Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Scans</h3>
            <div className="text-4xl font-bold text-cyan-400 font-mono">{stats.totalScans.toLocaleString()}</div>
          </Card>

          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6 relative overflow-hidden">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Phishing Detected</h3>
            <div className="text-4xl font-bold text-red-500 font-mono">{stats.phishingCount.toLocaleString()}</div>
            <div className="h-1.5 w-full bg-slate-800 mt-4 rounded-full overflow-hidden absolute bottom-0 left-0">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.phishingRate}%` }}
                transition={{ duration: 1.5 }}
                className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              />
            </div>
          </Card>

          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Users</h3>
            <div className="text-4xl font-bold text-emerald-400 font-mono">{stats.totalUsers.toLocaleString()}</div>
          </Card>
        </div>

        {/* Visitors Chart Section */}
        <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Daily Visitors</h3>
              <p className="text-sm text-slate-400 mt-1">Unique login sessions over time</p>
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative">
              <select
                className="appearance-none bg-slate-800/80 text-slate-200 text-sm font-medium rounded-lg border border-slate-700/80 px-4 py-2 pr-8 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer shadow-sm hover:bg-slate-800"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="1d">Today (24h)</option>
                <option value="1w">This Week</option>
                <option value="1m">This Month</option>
              </select>
              {/* Custom Dropdown Arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  tickMargin={12} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar 
                  dataKey="visitors" 
                  fill="#22d3ee" 
                  radius={[4, 4, 0, 0]} 
                  barSize={filter === '1d' ? 12 : filter === '1w' ? 32 : 12}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
