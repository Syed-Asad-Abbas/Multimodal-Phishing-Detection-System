import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  ShieldCheck, ShieldAlert, Search, Link as LinkIcon,
  Globe, Server, Lock, AlertTriangle, CheckCircle,
  RefreshCw, ChevronRight, Download, Share2, Eye, Activity, ArrowRight
} from "lucide-react";
import { Button, Input, Card, Badge } from "../components/ui/Primitives";
import api from "../services/api";
import { useSearchParams } from "react-router-dom";

// Mock Data for Charts
const SHAP_DATA = [
  { name: 'URL Length', value: 400 },
  { name: 'HTTPS', value: 300 },
  { name: 'Subdomain', value: 300 },
  { name: 'Brand Logo', value: 200 },
];
const COLORS = ['#22d3ee', '#818cf8', '#34d399', '#f87171'];

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(() => {
    // Check session storage first, then URL params, then empty
    const storedUrl = sessionStorage.getItem('pendingScanUrl');
    return storedUrl || searchParams.get("url") || "";
  });
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("url");
  const [result, setResult] = useState(null);

  // Simulation of scanning process
  const startScan = async () => {
    if (!url) return;
    setStatus("scanning");
    setProgress(0);
    setResult(null);

    try {
      // Create a local variable for the URL to avoid stale state issues in closures
      const scanTarget = url || sessionStorage.getItem('pendingScanUrl');
      if (!scanTarget) return;

      const response = await api.post('/scan/submit', { url: scanTarget });
      
      setResult(response.data.result);
      setStatus("finishing");
    } catch (error) {
      console.error("Scan failed:", error);
      setStatus("idle");
      alert(error.response?.data?.message || "Scan failed. Please try again.");
    }
  };

  const fetchExistingScan = async (id) => {
    setStatus("fetching");
    setProgress(50);
    try {
      const response = await api.get(`/scan/${id}`);
      setProgress(100);

      // Map the returned scan structure to the UI format
      const scanData = response.data;
      const resData = scanData.results;

      const mappedResult = resData ? {
        prediction: resData.prediction,
        confidence: resData.confidence_score,
        fusion_probability_phishing: resData.phishing_probability,
        ip_metadata: scanData.malicious_ip ? {
          ip: scanData.malicious_ip.ip_address,
          geo: { country: scanData.malicious_ip.country }
        } : null,
        explanation: resData.explanation ? resData.explanation.llm_text : null,
        screenshot: resData.screenshot ? (resData.screenshot.image_url || resData.screenshot.base64_data) : null,
        shap_values: resData.shap_values
      } : {};

      setUrl(scanData.url);

      setTimeout(() => {
        setStatus("complete");
        setResult(mappedResult);
      }, 300);
    } catch (err) {
      alert("Failed to load this report.");
      setStatus("idle");
    }
  };

  useEffect(() => {
    if (status === "scanning") {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setProgress((prev) => {
          if (elapsed <= 15) {
             return Math.min(15, elapsed * (15/15));
          } else if (elapsed <= 40) {
             return Math.min(35, 15 + ((elapsed - 15) / 25) * 20);
          } else if (elapsed <= 60) {
             return Math.min(75, 35 + ((elapsed - 40) / 20) * 40);
          } else {
             return 75;
          }
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (status === "finishing") {
      const startTime = Date.now();
      const initialProgress = progress;
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= 3) {
           setProgress(100);
           clearInterval(interval);
           setStatus("complete");
        } else {
           setProgress(initialProgress + (100 - initialProgress) * (elapsed / 3));
        }
      }, 50);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Autostart scan if url is provided in query params or session storage
  useEffect(() => {
    const existingId = searchParams.get("id");
    const storedUrl = sessionStorage.getItem('pendingScanUrl');

    if (existingId && status === "idle") {
      fetchExistingScan(existingId);
    } else if ((searchParams.get("url") || storedUrl) && status === "idle") {
      // If we got the URL from storage, clear it so it doesn't auto-run on every refresh
      if (storedUrl) {
        sessionStorage.removeItem('pendingScanUrl');
      }
      startScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confidence Ring Data - Use Real Score if available
  const isPhishing = result?.prediction?.toUpperCase() === 'PHISHING';
  const riskScore = result ? Math.round((result.fusion_probability_phishing ?? (isPhishing ? result.confidence : 0)) * 100) : 0;

  const confidenceData = [
    { name: 'Confidence', value: riskScore },
    { name: 'Remaining', value: 100 - riskScore }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen text-slate-100">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Scan URL</h1>
        <p className="text-slate-400">Analyze a website for potential phishing threats using multimodal AI.</p>
      </div>

      {/* Input Section */}
      <Card className="mb-10 border-slate-800 bg-slate-900/50 p-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') startScan(); }}
            placeholder="https://example.com"
            className="flex-1 text-lg h-14 pl-12 bg-slate-950/50 border-slate-700 text-white"
            icon={<Search className="w-5 h-5 text-slate-500" />}
          />
          <Button
            size="lg"
            className="h-14 px-8 text-base w-full md:w-auto min-w-[160px] bg-cyan-600 hover:bg-cyan-500 text-white border-0"
            onClick={startScan}
            disabled={status === "scanning" || status === "finishing" || status === "fetching"}
          >
            {status === "scanning" || status === "finishing" || status === "fetching" ? (
              <>Scanning...</>
            ) : (
              <>Scan Website <ArrowRight className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        <AnimatePresence>
          {(status === "scanning" || status === "finishing" || status === "fetching") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <div className="flex justify-between text-sm text-slate-400 mb-2 font-medium">
                <span>Analyzing target parameters...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                </motion.div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {["URL Structure Analysis", "DOM Content Inspection", "Visual Brand Matching"].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${progress > (i + 1) * 30 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
                    {progress > (i + 1) * 30 ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <RefreshCw className={`w-5 h-5 flex-shrink-0 ${progress > i * 30 ? "animate-spin text-cyan-500" : "opacity-20"}`} />
                    )}
                    <span className="text-sm font-medium">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results Section */}
      <AnimatePresence>
        {status === "complete" && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Verdict Card */}
            <Card className={`lg:col-span-1 border-l-4 h-fit bg-slate-900/60 ${isPhishing ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
              <div className="flex flex-col items-center justify-center py-6 border-b border-white/5">
                {/* Confidence Ring */}
                <div className="relative w-48 h-48 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={confidenceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={isPhishing ? '#ef4444' : '#10b981'} />
                        <Cell fill="#334155" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-bold text-white">{riskScore}%</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">Risk</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {isPhishing ? (
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  )}
                  <h2 className={`text-2xl font-bold ${isPhishing ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isPhishing ? 'Phishing Detected' : 'Safe Site'}
                  </h2>
                </div>
                <Badge variant={isPhishing ? 'danger' : 'success'} className="px-3 py-1">
                  {isPhishing ? 'High Severity Threat' : 'No Threat Detected'}
                </Badge>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400 text-sm">IP Address</span>
                  <span className="font-mono text-sm text-slate-300">{result.ip_metadata?.ip || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400 text-sm">Location</span>
                  <span className="text-sm text-slate-300">{(result.ip_metadata?.geo?.country) || 'Unknown'}</span>
                </div>

                {result.explanation && (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 mt-4">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      <span className="font-semibold text-cyan-400">AI Analysis Insight:</span><br /> {result.explanation}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Analysis Tabs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 w-full md:w-fit overflow-x-auto">
                {[
                  { id: "url", label: "Overview", icon: Search },
                  { id: "dom", label: "Technical Details", icon: Server },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                      ? "bg-slate-800 text-white shadow-sm ring-1 ring-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <Card className="min-h-[400px]">
                {activeTab === 'url' ? (
                  <>
                    <div className="flex flex-col gap-8 mt-2">
                      {/* Screenshot Panel */}
                      <div className="flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 text-slate-200">Captured Screenshot</h3>
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex-1 relative min-h-[300px]">
                          {result?.screenshot ? (
                            <img src={result.screenshot} alt="Target Website Screenshot" className="absolute inset-0 w-full h-full object-cover object-top shadow-inner" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
                              <Eye className="w-8 h-8 opacity-50" />
                              <span>Screenshot processing unavailable</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Feature Importance Panel */}
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-slate-200">Feature Importance</h3>
                          <Badge variant="neutral">Top Risk Factors</Badge>
                        </div>
                        <div className="h-[300px] w-full rounded-xl border border-white/10 bg-slate-950 p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={SHAP_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={32}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                              <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                itemStyle={{ color: '#e2e8f0' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {SHAP_DATA.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Raw Data</h3>
                    <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs text-slate-400 font-mono border border-slate-800">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
