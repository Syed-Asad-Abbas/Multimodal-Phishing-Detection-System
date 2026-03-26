import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";
import DashboardLayout from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";

// Dashboard Pages
import Overview from "./pages/Overview";
import Analytics from "./pages/Analytics";
import ThreatMap from "./pages/ThreatMap";
import Retraining from "./pages/Retraining";
import Reviews from "./pages/Reviews";
import SystemHealth from "./pages/SystemHealth";
import Users from "./pages/Users";

export default function App() {
  return (
    <div className="bg-slate-950 min-h-screen font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-white">
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public routes */}
        <Route path="/login" element={<Auth />} />
        
        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="map" element={<ThreatMap />} />
          <Route path="retraining" element={<Retraining />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="users" element={<Users />} />
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}