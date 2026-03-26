import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../ui/Primitives";
import { 
  ShieldCheck, 
  Menu, 
  LayoutDashboard, 
  FileText, 
  LogOut,
  Globe,
  Activity,
  User,
  PieChart,
  RefreshCw
} from "lucide-react";
import { motion } from "motion/react";

// --- Sidebar (Dashboard) ---
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { path: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
    { path: "/dashboard/analytics", label: "Analytics", icon: PieChart },
    { path: "/dashboard/map", label: "Threat Map", icon: Globe },
    { path: "/dashboard/retraining", label: "Retraining", icon: RefreshCw },
    { path: "/dashboard/reviews", label: "Reviews", icon: FileText },
    { path: "/dashboard/health", label: "System Health", icon: Activity },
    { path: "/dashboard/users", label: "Users", icon: User },
  ];

  return (
    <div className={cn(
      "flex flex-col border-r border-white/5 bg-slate-950 transition-all duration-300 h-screen sticky top-0 z-40",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Phish<span className="text-red-400">Guard</span>
            </span>
          </NavLink>
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
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              isActive 
                ? "bg-red-500/10 text-red-400 shadow-[0_0_20px_-10px_rgba(239,68,68,0.5)]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-red-400" : "text-slate-500 group-hover:text-slate-300")} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
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
