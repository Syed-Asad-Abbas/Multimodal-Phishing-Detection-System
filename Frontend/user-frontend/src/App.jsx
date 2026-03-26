import React, { useState } from "react";
import "./styles/globals.css";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { Navbar } from "./components/layout/Navigation";

// Dashboard Components
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import ScanPage from "./pages/Scan";
import ScanHistory from "./pages/ScanHistory";
import Profile from "./pages/Profile";
import Reviews from "./pages/Reviews";
import Working from "./pages/Working";

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="bg-slate-950 min-h-screen font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        <Routes>
          <Route path="/" element={
            <>
              <Navbar />
              <Landing />
            </>
          } />
          <Route path="/login" element={<Auth initialMode="login" onLogin={handleLogin} />} />
          <Route path="/signup" element={<Auth initialMode="signup" onLogin={handleLogin} />} />
          
          {/* Nested Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardLayout onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            {/* We map /scan to /dashboard/scan effectively, or we can keep /scan top level if we want no sidebar? 
                The previous design had sidebar on scan page. So it should be nested. */}
            <Route path="scan" element={<ScanPage />} /> 
            <Route path="history" element={<ScanHistory />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="working" element={<Working />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* Redirect legacy /scan to /dashboard/scan if accessed directly, or just let it 404/redirect to home. 
              Let's redirect /scan to /dashboard/scan for better UX if someone types it. */}
          <Route path="/scan" element={<Navigate to="/dashboard/scan" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}