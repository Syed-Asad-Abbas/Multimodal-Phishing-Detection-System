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
    
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      localStorage.setItem('adminLastActivity', Date.now().toString());
      timeoutId = setTimeout(() => {
        logout(true);
      }, 30 * 60 * 1000); // 30 mins
    };

    const handleActivity = () => {
      const lastAct = localStorage.getItem('adminLastActivity');
      if (!lastAct || Date.now() - parseInt(lastAct) > 1000) {
        resetTimer();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    const intervalId = setInterval(() => {
      const lastAct = localStorage.getItem('adminLastActivity');
      if (lastAct && Date.now() - parseInt(lastAct) > 30 * 60 * 1000) {
        logout(true);
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
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
