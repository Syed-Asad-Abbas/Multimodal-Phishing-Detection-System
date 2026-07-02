import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Key, Copy, Eye, EyeOff, Terminal, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Card, Badge } from "../components/ui/Primitives";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ApiKeyManager() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userTier, setUserTier] = useState("FREE");
  const [apiKeyMeta, setApiKeyMeta] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.user) {
        setUserTier(res.data.user.subscription_tier);
        setApiKeyMeta({
          preview: res.data.user.api_key_preview,
          created: res.data.user.api_key_created
        });
      }
    } catch (err) {
      console.error("Failed to fetch user data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (userTier === "FREE") {
      toast.error("API keys are only available for Pro and Pro Max plans.");
      return;
    }
    
    if (apiKeyMeta?.preview && !window.confirm("Generating a new API key will invalidate your old one. Are you sure?")) {
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post('/auth/api-key/generate');
      setNewKey(res.data.apiKey);
      setApiKeyMeta({
        preview: res.data.preview,
        created: new Date().toISOString()
      });
      setShowKey(true);
      toast.success("API Key generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to generate API Key");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-[calc(100vh-80px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-slate-400">Manage your programmatic access to the PhishGuard API.</p>
      </div>

      {userTier === "FREE" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4"
        >
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-amber-500 mb-1">Upgrade Required</h3>
            <p className="text-slate-300 text-sm mb-4">
              API access is exclusively available for Pro and Pro Max subscribers. Upgrade your account to generate an API key and integrate our detection models directly into your applications.
            </p>
            <Button onClick={() => window.location.href='/dashboard/pricing'} variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
              View Pricing Plans
            </Button>
          </div>
        </motion.div>
      )}

      {newKey && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl"
        >
          <div className="flex items-start gap-4 mb-4">
            <CheckCircle2 className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-cyan-400 mb-1">Your new API Key is ready</h3>
              <p className="text-sm text-slate-300">
                Please copy this key and store it somewhere safe. For security reasons, <strong className="text-white">you will not be able to see it again</strong>.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-lg">
            <div className="flex-1 px-3 font-mono text-cyan-300 overflow-x-auto whitespace-nowrap">
              {showKey ? newKey : "•".repeat(newKey.length)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)} className="text-slate-400 hover:text-white">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={() => copyToClipboard(newKey)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Copy className="w-4 h-4 mr-2" /> Copy
            </Button>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)} className="text-slate-400 hover:text-white">
              I have saved my key
            </Button>
          </div>
        </motion.div>
      )}

      <Card className="p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Active API Key</h2>
            <p className="text-sm text-slate-400">Your current authentication key for API requests.</p>
          </div>
          <Button 
            onClick={handleGenerateKey} 
            disabled={userTier === "FREE" || generating}
            className="bg-slate-800 hover:bg-slate-700 text-white"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
            {apiKeyMeta?.preview ? "Regenerate Key" : "Generate Key"}
          </Button>
        </div>

        {apiKeyMeta?.preview ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-slate-300">{apiKeyMeta.preview}</span>
                <Badge variant="success" className="bg-emerald-500/10 text-emerald-400">Active</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Created on {new Date(apiKeyMeta.created).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center">
            <Key className="w-8 h-8 text-slate-600 mb-3" />
            <p className="text-slate-400">You don't have an active API key yet.</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-slate-400" />
          <h2 className="text-xl font-bold">API Usage Example</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Use the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">x-api-key</code> header to authenticate your programmatic requests.
        </p>
        
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
{`curl -X POST https://api.phishguard.example.com/api/scan/submit \\
  -H "x-api-key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "http://example-suspicious-login.com"
  }'`}
          </pre>
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 text-slate-400 hover:text-white bg-slate-900/50 backdrop-blur-sm"
            onClick={() => copyToClipboard(`curl -X POST https://api.phishguard.example.com/api/scan/submit \\\n  -H "x-api-key: your-api-key-here" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "url": "http://example-suspicious-login.com"\n  }'`)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
