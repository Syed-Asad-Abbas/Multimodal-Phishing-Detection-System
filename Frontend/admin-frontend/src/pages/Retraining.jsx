import React, { useState } from "react";
import { Card, Button } from "../components/ui/Primitives";
import { RefreshCw, GitBranch, Terminal, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import api from "../services/api";

export default function Retraining() {
  const [isRetraining, setIsRetraining] = useState(false);
  const [progress, setProgress] = useState(0);

  const startRetraining = async () => {
    setIsRetraining(true);
    setProgress(0);

    try {
      // Call the backend endpoint to trigger retraining
      await api.post('/admin/mlops/retrain');
    } catch (error) {
      console.error("Failed to trigger retraining:", error);
    }

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsRetraining(false);
          return 100;
        }
        return p + 2;
      });
    }, 100);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Model Retraining</h1>
          <p className="text-slate-400">Manage the continuous learning pipeline.</p>
        </div>
        <Button
          onClick={startRetraining}
          disabled={isRetraining}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isRetraining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {isRetraining ? "Retraining in progress..." : "Trigger Retraining"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Pipeline Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-400" />
              Pipeline Status
            </h3>

            <div className="space-y-8 relative pl-4 border-l border-slate-800 ml-4">
              {[
                { title: "Data Ingestion", status: "Complete", time: "2 mins ago" },
                { title: "Feature Extraction", status: "Complete", time: "1 min ago" },
                { title: "Model Training", status: isRetraining ? "In Progress" : "Waiting", time: "Now", active: isRetraining },
                { title: "Validation", status: "Pending", time: "-" },
                { title: "Deployment", status: "Pending", time: "-" },
              ].map((step, i) => (
                <div key={i} className="relative pl-6">
                  <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${step.active ? 'bg-indigo-500 border-indigo-500 animate-pulse' : 'bg-slate-950 border-slate-700'}`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-medium ${step.active ? 'text-indigo-400' : 'text-slate-300'}`}>{step.title}</h4>
                      <p className="text-xs text-slate-500">{step.status}</p>
                    </div>
                    <span className="text-xs text-slate-600 font-mono">{step.time}</span>
                  </div>
                  {step.active && (
                    <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Terminal */}
        <div className="lg:col-span-1">
          <Card className="bg-black border-slate-800 font-mono text-xs h-[500px] flex flex-col">
            <div className="p-3 border-b border-slate-800 text-slate-500 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              <span>build_logs.txt</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto text-slate-400 space-y-1">
              <div className="text-emerald-500">$ start_pipeline --env=prod</div>
              <div>Initializing TensorFlow backend...</div>
              <div>Loaded 142,000 new samples.</div>
              <div>Preprocessing... OK.</div>
              <div className="text-yellow-500">Warning: GPU utilization 92%</div>
              {isRetraining && (
                <>
                  <div>Epoch 1/50 - loss: 0.4921 - acc: 0.8821</div>
                  <div>Epoch 2/50 - loss: 0.3201 - acc: 0.9102</div>
                  <div>Epoch 3/50 - loss: 0.2110 - acc: 0.9433</div>
                  <div className="animate-pulse">_</div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
