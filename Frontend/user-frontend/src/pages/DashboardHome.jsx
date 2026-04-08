import React, { useState, useEffect } from "react";
import { Card, Badge, Button } from "../components/ui/Primitives";
import { Clock, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function DashboardHome() {
  const [userName, setUserName] = useState("User");
  const [stats, setStats] = useState({
    scansThisMonth: 0,
    threatsBlocked: 0,
    avgRiskScore: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.name) setUserName(parsed.name.split(' ')[0]);
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/scan/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome back, {userName}</h1>
          <p className="text-slate-400">Your security posture is looking good today.</p>
        </div>
        <Button onClick={() => navigate('/dashboard/scan')} className="shadow-[0_0_20px_rgba(34,211,238,0.2)]">New Scan</Button>
      </div>

      {loading ? (
        <div className="flex justify-center my-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { label: "Scans This Month", value: stats.scansThisMonth.toString(), trend: "Current", color: "text-cyan-400" },
              { label: "Threats Blocked", value: stats.threatsBlocked.toString(), trend: "Total", color: "text-red-400" },
              { label: "Avg. Risk Score", value: stats.avgRiskScore.toString(), trend: stats.avgRiskScore > 50 ? "High" : "Low", color: "text-emerald-400" },
            ].map((stat, i) => (
              <Card key={i} className="p-6">
                <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                  <Badge variant="neutral" className="bg-slate-800 text-slate-300">{stat.trend}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
          <Card className="p-0 overflow-hidden border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-6 py-4">URL</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats.recentActivity.length > 0 ? stats.recentActivity.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-300">{row.url}</td>
                    <td className="px-6 py-4">
                      <Badge variant={row.status === "Phishing" ? "danger" : "success"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(row.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/scan?id=${row.id}`)}><ExternalLink className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-500">No recent activity found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
