import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("token");
  });

  const login = (token) => {
    setIsAuthenticated(true);
    localStorage.setItem("token", token);
    toast.success("Logged in successfully!");
  };

  const logout = (isAutoLogout = false) => {
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("adminName");
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
    
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 mins
    let timeoutId;
    let remainingTime = TIMEOUT_MS;
    let lastTimerStart = Date.now();

    const startTimer = (duration) => {
      clearTimeout(timeoutId);
      remainingTime = duration;
      lastTimerStart = Date.now();
      localStorage.setItem('adminLastActivity', Date.now().toString());
      timeoutId = setTimeout(() => {
        logout(true);
      }, duration);
    };

    const handleActivity = () => {
      // Only reset if the tab is visible (active)
      if (document.visibilityState === 'visible') {
        startTimer(TIMEOUT_MS);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is being hidden — pause the timer, save remaining time
        clearTimeout(timeoutId);
        const elapsed = Date.now() - lastTimerStart;
        remainingTime = Math.max(0, remainingTime - elapsed);
      } else {
        // Tab is visible again — resume with the remaining time
        if (remainingTime <= 0) {
          logout(true);
        } else {
          startTimer(remainingTime);
        }
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the initial timer
    startTimer(TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
