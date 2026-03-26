import React, { useState } from "react";
import { Sidebar } from "./Navigation";
import { Outlet } from 'react-router-dom';

export default function DashboardLayout({ onLogout }) {
  // Sidebar component handles its own internal state or we can lift it if needed.
  // We pass onLogout down.
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      <Sidebar 
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-auto relative h-screen scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
