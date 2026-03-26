import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Navigation";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      <Sidebar />
      <main className="flex-1 overflow-auto relative h-screen scroll-smooth">
         <Outlet />
      </main>
    </div>
  );
}
