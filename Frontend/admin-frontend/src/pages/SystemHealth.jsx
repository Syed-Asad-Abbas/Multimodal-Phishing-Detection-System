import React from "react";
import { Card, Badge } from "../components/ui/Primitives";
import { Activity, Database, Cpu, Server } from "lucide-react";

export default function SystemHealth() {
  const metrics = [
    { name: "API Latency", value: "45ms", status: "Optimal", icon: Activity },
    { name: "Database", value: "Connected", status: "Healthy", icon: Database },
    { name: "ML Inference", value: "120ms", status: "Optimal", icon: Cpu },
    { name: "Scanning Nodes", value: "142/150", status: "High Load", icon: Server },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">System Health</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <Card key={i} className="p-6 border-l-4 border-l-emerald-500 bg-slate-900/40">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <m.icon className="h-5 w-5 text-slate-400" />
              </div>
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-0">{m.status}</Badge>
            </div>
            <div className="text-2xl font-bold text-white">{m.value}</div>
            <div className="text-sm text-slate-500 mt-1">{m.name}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
