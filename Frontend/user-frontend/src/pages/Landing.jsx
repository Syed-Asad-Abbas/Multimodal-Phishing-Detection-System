import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

import { Button, Input, Card, Badge } from "../components/ui/Primitives";
import { ShieldCheck, Eye, Database, Code, Activity, Zap, Lock, Check, Server, Terminal, User, Star, ChevronLeft, ChevronRight } from "lucide-react";
import ParticleBackground from "../components/ui/ParticleBackground";
import { useNavigate } from 'react-router-dom';
import api from "../services/api";

export default function Landing() {
  const navigate = useNavigate();
  const [scanUrl, setScanUrl] = React.useState("");
  const [testimonials, setTestimonials] = useState([]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const expoOut = [0.19, 1, 0.22, 1];

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await api.get('/reviews/testimonials');
        if (res.data && res.data.length > 0) {
          setTestimonials(res.data);
        } else {
          setTestimonials(mockTestimonials); // fallback
        }
      } catch (err) {
        setTestimonials(mockTestimonials); // fallback
      }
    };
    fetchTestimonials();
  }, []);

  const mockTestimonials = [
    {
      comment: "The visual SHAP analysis is a game changer. It finally explains WHY a site was flagged, not just that it was.",
      user_email: "CISO*****",
      rating: 5,
    },
    {
      comment: "We reduced our mean time to respond (MTTR) by 60% using PhishGuard's automated triage API.",
      user_email: "SecOps*****",
      rating: 5,
    },
    {
      comment: "The false positive rate is incredibly low compared to our previous threat intelligence provider.",
      user_email: "Analyst*****",
      rating: 4,
    }
  ];

  // Ensure we have at least 3 items to show a full carousel layout
  const displayTestimonials = testimonials.length > 0 ? testimonials : mockTestimonials;
  const extendedTestimonials = displayTestimonials.length >= 3
    ? displayTestimonials
    : [...displayTestimonials, ...displayTestimonials, ...displayTestimonials].slice(0, 3);

  const nextTestimonial = () => setActiveTestimonial((prev) => (prev + 1) % extendedTestimonials.length);
  const prevTestimonial = () => setActiveTestimonial((prev) => (prev - 1 + extendedTestimonials.length) % extendedTestimonials.length);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 selection:bg-cyan-500/30 overflow-x-hidden relative">

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4">
        <ParticleBackground />
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full opacity-40 pointer-events-none" />

        <div className="container mx-auto text-center relative z-10 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: expoOut }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: expoOut, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 mb-8 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-300">PhishGuard 2.0 is live</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: expoOut, delay: 0.4 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500 leading-tight"
            >
              Detect phishing with <br className="hidden md:block" />
              <span className="text-cyan-400">Explainable AI</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: expoOut, delay: 0.6 }}
              className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
            >
              The first multimodal detection system that sees the web like a human does.
              Analyze URLs, DOM structures, and visual patterns in milliseconds.
            </motion.p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              <div className="relative w-full">
                <Input
                  value={scanUrl}
                  onChange={(e) => setScanUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (scanUrl) sessionStorage.setItem('pendingScanUrl', scanUrl);
                      navigate('/dashboard/scan');
                    }
                  }}
                  placeholder="scan website (e.g., apple-id-login.com)"
                  className="w-full h-14 pl-12 bg-slate-900/60 backdrop-blur-xl border-slate-700/50 focus:border-cyan-500/50 rounded-full text-base"
                />
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              </div>
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 rounded-full px-8 text-base shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]"
                onClick={() => {
                  if (scanUrl) sessionStorage.setItem('pendingScanUrl', scanUrl);
                  navigate('/dashboard/scan');
                }}
              >
                Scan Now
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-500" /> 99.9% Accuracy
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-500" /> Visual SHAP Analysis
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-500" /> Enterprise API
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Global Threat Map Section */}
      <section className="py-24 bg-slate-950/50 relative border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: expoOut }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Global Threat Intelligence</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Visualize malicious infrastructure in real-time. Our 3D globe tracks phishing campaigns across borders, giving you a god's eye view of the threat landscape.
              </p>

              <div className="space-y-6">
                {[
                  { label: "Real-time Plotting", desc: "Live feed of malicious IPs and domains." },
                  { label: "Geospatial Analytics", desc: "Identify high-risk regions and hosting providers." },
                  { label: "Campaign Tracking", desc: "Link disparate attacks to single threat actors." }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: expoOut, delay: 0.2 + (i * 0.1) }}
                    className="flex gap-4 group"
                  >
                    <div className="mt-1 h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/50 transition-all duration-300 group-hover:scale-110">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{item.label}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full" />
              <div className="w-full max-w-[600px] aspect-square relative z-10 flex items-center justify-center">
                <div className="text-center">
                  <ShieldCheck className="w-32 h-32 mx-auto text-cyan-400 mb-4" />
                  <h3 className="text-2xl font-bold text-white">AI-Powered Protection</h3>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-slate-950 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Multimodal Detection Engine</h2>
            <p className="text-slate-400 text-lg">
              PhishGuard combines three distinct AI models to analyze every aspect of a suspicious site, just like a human analyst would.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Code className="h-6 w-6" />,
                title: "1. URL Analysis",
                desc: "Deconstructs the URL for typosquatting, heavy obfuscation, and known malicious patterns using a specialized transformer model.",
                color: "text-cyan-400"
              },
              {
                icon: <Database className="h-6 w-6" />,
                title: "2. DOM Inspection",
                desc: "Scans the HTML/JS structure for hidden forms, suspicious scripts, and evasion techniques that traditional scanners miss.",
                color: "text-purple-400"
              },
              {
                icon: <Eye className="h-6 w-6" />,
                title: "3. Visual Recognition",
                desc: "Uses computer vision to render the page and compare it against a database of legitimate brand login pages.",
                color: "text-emerald-400"
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.15, duration: 1, ease: expoOut }}
              >
                <Card className="h-full bg-slate-900/20 hover:bg-slate-900/40 border-slate-800 hover:border-cyan-500/30 transition-all duration-300 group hover:-translate-y-2">
                  <div className={`mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800 w-fit ${card.color} group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300`}>
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {card.desc}
                  </p>

                  {/* Decorative faint line */}
                  <div className="mt-8 h-px w-full bg-gradient-to-r from-slate-800 to-transparent group-hover:from-cyan-500/30 transition-all duration-500" />
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof (3D Carousel Redesign) */}
      <section className="py-24 border-t border-white/5 bg-slate-950/50 relative overflow-hidden">
        {/* Ambient background glow for the glass effect to be visible */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4 relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Don't take our word for it.</h2>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-400">Over 100+ people trust us.</h2>
          </div>

          <div className="relative flex justify-center items-center h-[350px] max-w-6xl mx-auto mt-12 perspective-[1000px]">
            {extendedTestimonials.map((t, i) => {
              // Map index to carousel state
              let zIndex = 0;
              let scale = 0.8;
              let opacity = 0;
              let translateX = 0;

              const isActive = i === activeTestimonial;
              const isPrev = i === (activeTestimonial - 1 + extendedTestimonials.length) % extendedTestimonials.length;
              const isNext = i === (activeTestimonial + 1) % extendedTestimonials.length;

              if (isActive) {
                zIndex = 30; scale = 1; opacity = 1; translateX = 0;
              } else if (isPrev) {
                zIndex = 20; scale = 0.85; opacity = 0.4; translateX = -65;
              } else if (isNext) {
                zIndex = 20; scale = 0.85; opacity = 0.4; translateX = 65;
              } else {
                zIndex = 10; scale = 0.7; opacity = 0; translateX = 0;
              }

              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ scale, opacity, x: `${translateX}%`, zIndex }}
                  transition={{ duration: 0.8, ease: expoOut }}
                  className="absolute w-full max-w-lg cursor-pointer"
                  onClick={() => setActiveTestimonial(i)}
                  style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                >
                  <Card className={`p-8 flex flex-col justify-between h-[280px] rounded-2xl transition-all duration-500 backdrop-blur-2xl ${isActive ? 'bg-slate-900/60 border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]' : 'bg-slate-900/20 border-white/5 shadow-xl opacity-60'}`}>
                    <p className="text-slate-300 text-[17px] leading-relaxed line-clamp-4 font-light italic">
                      "{t.comment || t.display_text}"
                    </p>
                    <div className="flex justify-between items-center mt-6">
                      <div className="flex items-center gap-4">
                        <img
                          src={t.avatar || `https://ui-avatars.com/api/?name=${t.user_email}&background=1e293b&color=fff`}
                          alt="avatar"
                          className="w-12 h-12 rounded-full object-cover border border-slate-700/50 shadow-md group-hover:border-cyan-500/50 transition-colors"
                        />
                        <div>
                          <div className="font-semibold text-white text-base">{t.user_email}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Verified Client</div>
                        </div>
                      </div>
                      <div className="flex gap-1 bg-slate-950/60 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} className={`w-3.5 h-3.5 ${idx < (t.rating || 5) ? 'fill-cyan-500 text-cyan-500' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-center items-center gap-4 mt-8 relative z-20">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 rounded-full border border-slate-700 bg-[#12161c] hover:bg-[#1e2530] hover:border-slate-500 flex items-center justify-center text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 rounded-full border border-slate-700 bg-[#12161c] hover:bg-[#1e2530] hover:border-slate-500 flex items-center justify-center text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyan-900/5" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: expoOut }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Ready to secure your organization?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            Start scanning URLs immediately or integrate our API into your existing security stack.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 rounded-full text-base hover:scale-105 active:scale-95 transition-transform" onClick={() => navigate("/dashboard/scan")}>
              Start Free Scan
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-base hover:bg-slate-900 transition-colors" onClick={() => navigate("/signup")}>
              Create Account
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950 text-slate-500 text-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="h-6 w-6 text-cyan-500" />
                <span className="text-lg font-bold text-white">PhishGuard</span>
              </div>
              <p className="mb-6 max-w-xs">
                Next-generation phishing detection powered by multimodal AI and computer vision.
              </p>
              <div className="flex gap-4">
                {/* Mock Social Icons */}
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer"><Server className="w-4 h-4" /></div>
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer"><Terminal className="w-4 h-4" /></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Scanning Engine</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Threat Map</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Cookie Settings</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© 2026 PhishGuard Inc. All rights reserved.</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
