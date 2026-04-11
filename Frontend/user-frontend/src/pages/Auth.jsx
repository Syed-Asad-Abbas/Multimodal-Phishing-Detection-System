import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button, Input, Card } from "../components/ui/Primitives";
import { ShieldCheck, Mail, Lock, ArrowRight, Github, ChevronLeft, KeyRound, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../services/api";

export default function Auth({ initialMode = "login", onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [userId, setUserId] = useState(null);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (location.pathname === '/login') setMode('login');
    if (location.pathname === '/signup') setMode('register');
  }, [location.pathname]);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google && (mode === "login" || mode === "register") && googleButtonRef.current) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: googleButtonRef.current.offsetWidth,
        text: mode === "login" ? "signin_with" : "signup_with",
      });
    }
  }, [mode]);

  const handleGoogleLogin = async (response) => {
    const idToken = response.credential;
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { idToken });
      const token = res.data.accessToken || res.data.token;
      if (token) localStorage.setItem('token', token);
      if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    if (newMode === 'login' || newMode === 'signup') {
      navigate(`/${newMode}`);
    }
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const response = await api.post('/auth/login', { email, password });

        if (response.data.requires2FA) {
          setMode("2fa");
          setUserId(response.data.userId);
          setLoading(false);
          return;
        }

        const token = response.data.accessToken || response.data.token;
        if (token) localStorage.setItem('token', token);
        if (response.data.user) localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
        navigate('/dashboard', { replace: true });
      } else if (mode === "register") {
        const response = await api.post('/auth/register', { email, password, name });
        const token = response.data.accessToken || response.data.token;
        if (token) {
          localStorage.setItem('token', token);
          if (response.data.user) localStorage.setItem('user', JSON.stringify(response.data.user));
          onLogin();
          navigate('/dashboard', { replace: true });
        } else {
          handleModeSwitch("login");
        }
      } else if (mode === "2fa") {
        const response = await api.post('/auth/2fa/verify', { userId, token: twoFactorCode });
        const token = response.data.accessToken || response.data.token;
        if (token) localStorage.setItem('token', token);
        if (response.data.user) localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
        navigate('/dashboard', { replace: true });
      } else if (mode === "forgot-password") {
        await api.post('/auth/forgot-password', { email });
        setSuccessMsg("If your account exists, a 6-digit OTP has been sent to your email.");
        setMode("reset-password");
      } else if (mode === "reset-password") {
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        await api.post('/auth/reset-password', { token: resetToken, newPassword });
        setSuccessMsg("Password reset successfully! You can now log in.");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setMode("login");
          setSuccessMsg(null);
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Something went wrong. Please try again.`);
      console.error(`${mode} failed:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white gap-2 pl-2 pr-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-white/5 text-cyan-400 shadow-xl shadow-cyan-900/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {mode === "login" && "Welcome back"}
                {mode === "register" && "Create account"}
                {mode === "2fa" && "Check your email"}
                {mode === "forgot-password" && "Forgot password?"}
                {mode === "reset-password" && "Reset password"}
              </h1>
              <p className="text-slate-400 text-sm">
                {mode === "login" && "Enter your credentials to access the platform."}
                {mode === "register" && "Start protecting your infrastructure today."}
                {mode === "2fa" && `We've sent a temporary code to ${email || "your email"}.`}
                {mode === "forgot-password" && "Enter your email and we'll send you a reset code."}
                {mode === "reset-password" && `Enter the 6-digit OTP sent to ${email || "your email"} and your new password.`}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <Card className="p-8 backdrop-blur-2xl bg-slate-900/70 border-white/10 shadow-2xl ring-1 ring-white/5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {mode === "2fa" ? (
                <motion.div
                  key="2fa-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Verification Code</label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <Button className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)]" type="submit" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => handleModeSwitch("login")}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Back to login
                  </Button>
                </motion.div>
              ) : mode === "forgot-password" ? (
                <motion.div
                  key="forgot-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      icon={<Mail className="w-4 h-4" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                      autoFocus
                    />
                  </div>
                  <Button className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)]" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Code"}
                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => handleModeSwitch("login")}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Back to login
                  </Button>
                </motion.div>
              ) : mode === "reset-password" ? (
                <motion.div
                  key="reset-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">OTP Code</label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">New Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confirm Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                    />
                  </div>
                  <Button className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)]" type="submit" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="w-full text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => { setMode("forgot-password"); setError(null); setSuccessMsg(null); }}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Didn't get the code? Resend
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-inputs"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Name</label>
                      <Input
                        type="text"
                        placeholder="Your Name"
                        icon={<KeyRound className="w-4 h-4" />}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      icon={<Mail className="w-4 h-4" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => { setMode("forgot-password"); setError(null); setSuccessMsg(null); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50"
                    />
                  </div>

                  <Button className="w-full h-12 text-base shadow-[0_0_20px_rgba(34,211,238,0.2)]" type="submit" disabled={loading}>
                    {loading ? "Please wait..." : (mode === "login" ? "Sign In" : "Create Account")}
                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {successMsg && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 mt-4 text-center justify-center">
                <CheckCircle className="w-4 h-4" />
                {successMsg}
              </div>
            )}
            {error && <div className="text-xs text-red-500 mt-4 text-center">{error}</div>}

            {(mode === "login" || mode === "register") && (
              <>
                <div className="relative my-6"> {/* Changed my-8 to my-6 */}
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-[#0b1221] px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <div ref={googleButtonRef} className="w-full flex justify-center" />

                <div className="mt-6 text-center text-sm">
                  <span className="text-slate-400">
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  </span>
                  <button
                    onClick={() => handleModeSwitch(mode === "login" ? "signup" : "login")}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    type="button"
                  >
                    {mode === "login" ? "Sign up" : "Log in"}
                  </button>
                </div>
              </>
            )}
          </form>
        </Card>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>© 2026 PhishGuard Inc. Secure by default.</p>
        </div>
      </motion.div>
    </div>
  );
}
