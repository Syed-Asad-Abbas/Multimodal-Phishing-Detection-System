import React, { useState, useEffect } from "react";
import "./styles/globals.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { Navbar } from "./components/layout/Navigation";

// Dashboard Components
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import ScanPage from "./pages/Scan";
import ScanHistory from "./pages/ScanHistory";
import ThreatMap from "./pages/ThreatMap";
import Profile from "./pages/Profile";
import Reviews from "./pages/Reviews";
import Working from "./pages/Working";
import Pricing from "./pages/Pricing";
import ApiKeyManager from "./pages/ApiKeyManager";

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogin = () => {
    setIsAuthenticated(true);
    toast.success("Logged in successfully!");
  };

  const handleLogout = (isAutoLogout = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    if (isAutoLogout) {
      toast.info("Logged out due to inactivity");
    } else {
      toast.info("Logged out successfully");
    }
  };

  // Cross-tab and inactivity auto-logout
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      localStorage.setItem('lastActivity', Date.now().toString());
      timeoutId = setTimeout(() => {
        handleLogout(true);
      }, 30 * 60 * 1000); // 30 mins
    };

    const handleActivity = () => {
      const lastAct = localStorage.getItem('lastActivity');
      if (!lastAct || Date.now() - parseInt(lastAct) > 1000) {
        resetTimer();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    const intervalId = setInterval(() => {
      const lastAct = localStorage.getItem('lastActivity');
      if (lastAct && Date.now() - parseInt(lastAct) > 30 * 60 * 1000) {
        handleLogout(true);
      }
    }, 10000);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [isAuthenticated]);

  return (
    <Router>
      <div className="bg-slate-950 min-h-screen font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        <ToastContainer position="top-right" theme="dark" autoClose={4000} closeOnClick pauseOnHover />
        <Routes>
          <Route path="/" element={
            <>
              <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
              <Landing isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            </>
          } />
          
          {/* Public standalone Working page */}
          <Route path="/working" element={
            <div className="h-screen w-full flex flex-col relative overflow-hidden bg-slate-950">
              <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
              <Working />
            </div>
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
            <Route path="threat-map" element={<ThreatMap />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="working" element={<Working />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="api-keys" element={<ApiKeyManager />} />
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