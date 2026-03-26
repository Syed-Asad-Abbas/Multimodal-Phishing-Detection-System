import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Input } from "../components/ui/Primitives";
import { CheckCircle, ExternalLink, ShieldAlert, Loader2 } from "lucide-react";
import api from "../services/api";

import { useNavigate } from 'react-router-dom';

export default function ScanHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("All");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/scan/history');
        setHistory(response.data.scans || []);
      } catch (error) {
        console.error("Failed to fetch scan history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scan History</h1>
          <p className="text-slate-400">Archive of all your past security scans.</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search URLs..."
            className="w-64 border-slate-700 bg-slate-900/50"
            icon={<ExternalLink className="w-4 h-4 text-slate-500" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="All">All Results</option>
            <option value="Phishing">Phishing</option>
            <option value="Safe">Safe</option>
          </select>
          <Button variant="outline">Export CSV</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-medium">
            <tr>
              <th className="px-6 py-4">URL</th>
              <th className="px-6 py-4">Result</th>
              <th className="px-6 py-4">Risk Score</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
                  Loading history...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-slate-500">
                  No scan history found.
                </td>
              </tr>
            ) : history
              .filter(item => item.url.toLowerCase().includes(searchQuery.toLowerCase()))
              .filter(item => {
                if (filterMode === "All") return true;
                const r = item.results && item.results.length > 0 ? item.results[0] : null;
                const pred = r?.prediction || item.status;
                if (filterMode === "Safe" && pred !== 'Phishing') return true;
                if (filterMode === "Phishing" && pred === 'Phishing') return true;
                return false;
              })
              .map((item) => {
                const result = item.results && item.results.length > 0 ? item.results[0] : null;
                const isPhishing = result?.prediction === 'Phishing';
                let score = 0;
                if (result) {
                  if (result.phishing_probability !== null && result.phishing_probability !== undefined) {
                    score = Math.round(result.phishing_probability * 100);
                  } else if (result.confidence_score !== null && result.confidence_score !== undefined) {
                    score = Math.round(result.confidence_score * 100);
                  } else {
                    score = isPhishing ? 95 : 2;
                  }
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-slate-300 max-w-xs truncate group-hover:text-cyan-400 transition-colors">{item.url}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isPhishing ? (
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                        <Badge variant={isPhishing ? "danger" : "success"}>
                          {result?.prediction || item.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${score > 50 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{score}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/scan?id=${item.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
