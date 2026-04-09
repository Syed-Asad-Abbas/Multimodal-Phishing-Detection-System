import React, { useState } from "react";
import { Button, cn } from "../ui/Primitives";
import { 
  ShieldCheck, 
  Menu, 
  X, 
  LayoutDashboard, 
  ScanLine, 
  History, 
  FileText, 
  Settings,
  LogOut,
  Network,
  User,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from 'react-router-dom';

// --- Navbar (Landing) ---
export function Navbar({ isAuthenticated, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToFeatures = () => {
    if (location.pathname !== '/') {
      navigate('/#features');
    } else {
      const el = document.getElementById('features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[color-mix(in_oklab,#050510_95%,transparent)] backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div 
            className="flex items-center gap-3 group cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center glow-cyan transition-transform group-hover:scale-105">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight font-general">
              Phish<span className="text-cyan-400">Guard</span>
            </span>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center gap-10">
              <button onClick={scrollToFeatures} className="text-sm font-medium text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                Features <ChevronDown className="w-4 h-4 opacity-40" />
              </button>
              <button onClick={() => navigate("/working")} className="text-sm font-medium text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                How it Works
              </button>
              <button onClick={() => navigate("/")} className="text-sm font-medium text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                Plans
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <button onClick={() => navigate("/dashboard")} className="liquid-glass rounded-full px-5 py-2 text-sm font-bold text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all outline-none flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/10">
                     <LayoutDashboard className="h-4 w-4" />
                     Dashboard
                  </button>
                  <button onClick={() => { if(onLogout) onLogout(); navigate("/"); }} className="rounded-full px-5 py-2 text-sm font-bold text-red-400 border border-slate-700 hover:border-red-500 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer">
                     <LogOut className="h-4 w-4" />
                     Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate("/login")} className="text-sm font-medium text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer">Sign In</button>
                  <button onClick={() => navigate("/signup")} className="liquid-glass rounded-full px-5 py-2 text-sm font-bold text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10">
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#110C22] border-b border-white/10 pb-6 transition-all duration-300">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Button variant="ghost" className="w-full justify-start text-white/80 font-medium hover:text-white" onClick={scrollToFeatures}>Features</Button>
            <Button variant="ghost" className="w-full justify-start text-white/80 font-medium hover:text-white" onClick={() => { setIsOpen(false); navigate("/working"); }}>How it Works</Button>
            
            <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
              {isAuthenticated ? (
                <>
                  <button onClick={() => { setIsOpen(false); if(onLogout) onLogout(); navigate("/"); }} className="w-full rounded-xl px-5 py-3 text-sm font-bold text-red-400 border border-red-500/20 bg-red-500/5 flex justify-center gap-2 cursor-pointer">
                     <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-sm font-medium text-white/70 hover:text-white py-3 cursor-pointer" onClick={() => { setIsOpen(false); navigate("/login"); }}>Sign In</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// --- Sidebar (Dashboard) ---
export function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to determine active page
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "scan", label: "Scan URL", icon: ScanLine, path: "/dashboard/scan" },
    { id: "history", label: "Scan History", icon: History, path: "/dashboard/history" },
    { id: "reviews", label: "My Reviews", icon: FileText, path: "/dashboard/reviews" },
    { id: "working", label: "Working", icon: Network, path: "/dashboard/working" },
    { id: "profile", label: "Profile", icon: Settings, path: "/dashboard/profile" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className={cn(
      "flex flex-col border-r border-white/5 bg-slate-950 transition-all duration-300 h-screen sticky top-0 z-40",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Phish<span className="text-cyan-400">Guard</span>
            </span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/5 mx-auto transition-colors"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              isActive(item.path)
                ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_-10px_rgba(6,182,212,0.5)]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {isActive(item.path) && (
              <motion.div
                layoutId="active-pill"
                className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r-full"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive(item.path) ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={() => {
            if (onLogout) onLogout();
            else navigate("/"); 
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
