import React, { useState } from "react";
//eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Card } from "../components/ui/Primitives";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Github,
  ChevronLeft,
} from "lucide-react";
import api from "../services/api";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [show2FA, setShow2FA] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });

      // Ensure that only admins can log into the admin frontend
      if (response.data?.user && response.data.user.role !== 'ADMIN') {
        throw new Error('Access denied. Administrator privileges are required.');
      }

      // If the backend has 2FA enabled, it might return a specific status or flag
      // For now, assuming direct login without 2FA step if not implemented yet
      login(response.data.accessToken || response.data.token);
      navigate("/dashboard");

    } catch (err) {
      setError(err.message === 'Access denied. Administrator privileges are required.'
        ? err.message
        : err.response?.data?.message || "Invalid credentials. Are you an Admin?");
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-white/5 text-cyan-400 shadow-xl shadow-cyan-900/20">
              <ShieldCheck className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={show2FA ? "2fa" : "login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {show2FA ? "Check your email" : "Welcome Admin"}
              </h1>
              <p className="text-slate-400 text-sm">
                {show2FA
                  ? `We've sent a temporary code to ${email || "your email"}.`
                  : "Enter your credentials to access the secure dashboard."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <Card className="p-8 backdrop-blur-2xl bg-slate-900/70 border-white/10 shadow-2xl ring-1 ring-white/5">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {show2FA ? (
                <motion.div
                  key="2fa-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Verification Code
                    </label>
                    <Input
                      type="text"
                      placeholder="000-000"
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 text-white"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <Button
                    className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cyan-600 hover:bg-cyan-500 text-white border-0"
                    type="submit"
                  >
                    Verify & Sign In
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => setShow2FA(false)}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Back to login
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="login-inputs"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="admin@phishguard.com"
                      icon={<Mail className="w-4 h-4 text-slate-500" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                      <a
                        href="#"
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      icon={<Lock className="w-4 h-4 text-slate-500" />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 text-white placeholder:text-slate-600"
                    />
                  </div>

                  {error && <div className="text-xs text-red-500 mt-2">{error}</div>}

                  <Button
                    className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cyan-600 hover:bg-cyan-500 text-white border-0 font-semibold tracking-wide"
                    type="submit"
                  >
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {!show2FA && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-[#0b1221] px-2 text-slate-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-12 border-slate-800 hover:bg-slate-800 hover:text-white transition-all text-slate-400 bg-transparent"
                >
                  <Github className="mr-2 w-4 h-4" />
                  GitHub Organization SSO
                </Button>
              </>
            )}
          </form>
        </Card>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>© 2026 PhishGuard Inc. Employee Portal.</p>
          <p className="mt-1">Authorized personnel only.</p>
        </div>
      </motion.div>
    </div>
  );
}
