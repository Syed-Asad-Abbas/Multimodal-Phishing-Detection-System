import React, { useState, useEffect } from "react";
import { Card, Badge } from "../components/ui/Primitives";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import api from "../services/api";

export default function Analytics() {
  const [data, setData] = useState([]);
  const [matrixContent, setMatrixContent] = useState([
    { label: "True Positive", value: 0, sub: "Correctly Flagged", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "False Positive", value: 0, sub: "Safe flagged as Phishing", color: "text-red-400", bg: "bg-red-500/10" },
    { label: "False Negative", value: 0, sub: "Missed Phishing", color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "True Negative", value: 0, sub: "Correctly Allowed", color: "text-blue-400", bg: "bg-blue-500/10" },
  ]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/admin/dashboard/analytics');
        if (response.data) {
          setData(response.data.volumeData || []);
          const cm = response.data.confusionMatrix || {};
          setMatrixContent([
            { label: "True Positive", value: cm.truePositive || 0, sub: "Correctly Flagged", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "False Positive", value: cm.falsePositive || 0, sub: "Safe flagged as Phishing", color: "text-red-400", bg: "bg-red-500/10" },
            { label: "False Negative", value: cm.falseNegative || 0, sub: "Missed Phishing", color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "True Negative", value: cm.trueNegative || 0, sub: "Correctly Allowed", color: "text-blue-400", bg: "bg-blue-500/10" },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold mb-2">Model Analytics</h1>
        <p className="text-slate-400">Deep dive into model performance, accuracy, and drift.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {matrixContent.map((item, i) => (
          <Card key={i} className="p-6 border-slate-800">
            <h3 className="text-sm font-medium text-slate-500 mb-2">{item.label}</h3>
            <div className={`text-3xl font-bold mb-1 ${item.color}`}>{item.value.toLocaleString()}</div>
            <Badge variant="neutral" className="mt-2 text-[10px]">{item.sub}</Badge>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Detection Volume</h3>
            <Badge variant="neutral">Last 7 Days</Badge>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPhishing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="phishing" stroke="#ef4444" fillOpacity={1} fill="url(#colorPhishing)" strokeWidth={2} />
                <Area type="monotone" dataKey="safe" stroke="#10b981" fillOpacity={1} fill="url(#colorSafe)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Threat Distribution by Type</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="phishing" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
