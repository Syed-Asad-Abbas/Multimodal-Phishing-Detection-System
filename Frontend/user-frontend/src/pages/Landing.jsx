import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  Search,
  Globe,
  Code,
  Eye,
  CheckCircle2,
  Server,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../services/api";

/**
 * PhishGuard 2.0 - 100% Mobile Friendly Landing Page
 * Features:
 * - Mobile-First Layouts: Stacking search and proper typography.
 * - Peeking Carousel: Absolute overlap model with side-card peeking affordance.
 * - Search Integration: Functional scan input with mobile stacking support.
 * - Auth Integration: Signup/Login/Signout/Dashboard routing.
 */

const Landing = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [scanUrl, setScanUrl] = useState("");
  
  // Default fallback testimonials
  const defaultTestimonials = [
    { name: "ANALYST*****", role: "Verified Client", text: "The false positive rate is incredibly low compared to our previous threat intelligence provider." },
    { name: "SECOPS*****", role: "Verified Client", text: "The visual SHAP analysis is a game changer. Finally, our team can understand WHY the AI flagged a specific element." },
    { name: "CISO*****", role: "Verified Client", text: "We reduced our mean time to respond (MTTR) by 60% using PhishGuard's automated triage API." },
    { name: "RESEARCH*****", role: "Verified Client", text: "The multimodal detection engine provides a god's eye view of infrastructure we previously couldn't see." }
  ];

  const [originalTestimonials, setOriginalTestimonials] = useState(defaultTestimonials);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch real testimonials from backend
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await api.get('/reviews/testimonials');
        if (res.data && res.data.length > 0) {
          const formatted = res.data.map(t => ({
            name: t.user_email.split('@')[0].toUpperCase().padEnd(10, '*'),
            role: "Verified Client",
            text: t.comment || t.display_text
          }));
          setOriginalTestimonials(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch testimonials, using defaults.");
      }
    };
    fetchTestimonials();
  }, []);

  // Handle cross-page navigation with hash
  useEffect(() => {
    if (location.hash === '#features') {
      setTimeout(() => {
        const el = document.getElementById('features');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % originalTestimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + originalTestimonials.length) % originalTestimonials.length);
  };

  // Background Video Opacity Tracking
  useEffect(() => {
    let animationFrame;
    const updateOpacity = () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const time = video.currentTime;
      const duration = video.duration;
      const fadeTime = 0.5;
      let opacity = 1;
      if (time < fadeTime) opacity = time / fadeTime;
      else if (duration > 0 && (duration - time) < fadeTime) opacity = (duration - time) / fadeTime;
      setVideoOpacity(opacity);
      animationFrame = requestAnimationFrame(updateOpacity);
    };
    animationFrame = requestAnimationFrame(updateOpacity);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const handleVideoEnded = () => {
    if (videoRef.current) {
      setVideoOpacity(0);
      setTimeout(() => videoRef.current.play(), 100);
    }
  };

  const handleScanSubmit = () => {
    if (scanUrl) {
      sessionStorage.setItem('pendingScanUrl', scanUrl);
      if (isAuthenticated) {
        navigate('/dashboard/scan');
      } else {
        navigate('/signup');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-cyan-500/30 overflow-x-hidden pt-16">
      <style>{`
        :root {
          --background: 260 87% 3%;
          --foreground: 40 6% 95%;
          --hero-sub: 40 6% 82%;
          --accent-cyan: 180 100% 50%;
        }

        body {
          background-color: #020410;
          color: hsl(var(--foreground));
          font-family: 'Geist Sans', sans-serif;
          margin: 0;
        }

        .font-general { font-family: 'General Sans', sans-serif; }

        .liquid-glass {
          background: rgba(255, 255, 255, 0.015);
          background-blend-mode: luminosity;
          backdrop-filter: blur(12px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .liquid-glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.4) 0%,
            rgba(255,255,255,0.1) 20%,
            rgba(255,255,255,0) 40%,
            rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.1) 80%,
            rgba(255,255,255,0.4) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .glow-cyan { box-shadow: 0 0 60px -15px hsl(var(--accent-cyan) / 0.3); }
        .parallax-section { transform: translateZ(0); will-change: transform; }
      `}</style>

      {/* BACKGROUND VIDEO */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
          autoPlay muted playsInline onEnded={handleVideoEnded}
          className="w-full h-full object-cover"
          style={{ opacity: videoOpacity * 0.35 }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[800px] bg-indigo-900/10 blur-[200px] rounded-full" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 md:pt-32 md:pb-44 min-h-[80vh]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass mb-8 md:mb-12 border border-white/5">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-[10px] md:text-[11px] font-bold text-white/60 tracking-[0.25em] uppercase">PhishGuard 2.0 Live</span>
        </div>

        <h1 className="font-general text-[42px] leading-[1.1] md:text-[120px] lg:text-[160px] font-normal md:leading-[0.95] tracking-[-0.04em] text-white">
          Detect phishing with<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">Explainable AI</span>
        </h1>
       
        <p className="text-base md:text-xl leading-relaxed max-w-2xl mt-8 md:mt-12 text-[hsl(var(--hero-sub))] opacity-80">
          The first multimodal detection system that sees the web like a human does.
          Analyze URLs, DOM structures, and visual patterns in milliseconds.
        </p>

        <div className="mt-12 md:mt-16 w-full max-w-2xl relative">
          <div className="liquid-glass rounded-[24px] p-2 flex flex-col md:flex-row items-center gap-2 border border-white/5 focus-within:border-cyan-500/40 transition-all shadow-2xl">
            <div className="flex items-center w-full px-4 gap-2">
               <Search className="w-5 h-5 text-white/30" />
               <input
                type="text"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScanSubmit(); }}
                placeholder="scan website (e.g., apple-id-login.com)"
                className="flex-1 bg-transparent border-none outline-none py-4 text-white placeholder:text-white/20 font-medium text-sm md:text-base"
              />
            </div>
            <button 
              onClick={handleScanSubmit}
              className="w-full md:w-auto bg-cyan-500 text-slate-950 px-8 py-4 rounded-[18px] font-bold hover:bg-cyan-400 hover:scale-[1.02] transition-all duration-300 glow-cyan active:scale-95 whitespace-nowrap cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              Scan Now
            </button>
          </div>
        </div>
      </section>

      {/* MULTIMODAL ENGINE */}
      <section id="features" className="py-24 md:py-40 px-6 md:px-10 bg-[#0B0A1A] relative z-10 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center md:text-left mb-16 md:mb-24 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-8">
            <h2 className="font-general text-[42px] md:text-[56px] font-normal text-white leading-none">Multimodal Engine</h2>
            <button className="flex items-center gap-3 text-cyan-400 font-bold hover:gap-5 transition-all text-xs md:text-sm tracking-widest uppercase cursor-pointer">
              View Specs <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { t: 'URL Analysis', i: Globe, c: 'text-cyan-400', d: 'Transformers trained on typosquatting vectors and obfuscation.' },
              { t: 'DOM Inspection', i: Code, c: 'text-purple-400', d: 'Deep HTML/JS parsing for hidden form-jacking and evasion scripts.' },
              { t: 'Visual Recognition', i: Eye, c: 'text-emerald-400', d: 'Computer vision brand identity and favicon verification.' }
            ].map((card) => (
              <div key={card.t} className="liquid-glass p-8 md:p-14 rounded-[32px] md:rounded-[56px] border border-white/5 group hover:bg-white/5 hover:-translate-y-2 transition-all duration-500 shadow-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-6 md:mb-10 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
                  <card.i className={`w-6 h-6 md:w-8 md:h-8 ${card.c}`} />
                </div>
                <h3 className="font-general text-2xl md:text-3xl font-normal text-white mb-4 md:mb-5">{card.t}</h3>
                <p className="text-sm md:text-base text-[hsl(var(--hero-sub))] opacity-60 leading-relaxed group-hover:opacity-100 transition-opacity">{card.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THREAT INTEL */}
      <section className="py-24 md:py-40 px-6 md:px-10 relative z-10">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">
            <div className="flex-1 space-y-8 md:space-y-12 text-center md:text-left order-2 md:order-1">
              <h2 className="font-general text-[42px] md:text-[72px] font-normal leading-tight md:leading-[0.95] text-white">Global Threat <br className="hidden md:block"/> Intelligence</h2>
              <div className="space-y-6 md:space-y-10">
                {['Real-time IP Plotting', 'Geospatial Analytics', 'Campaign Linkage'].map(item => (
                  <div key={item} className="flex items-center justify-center md:justify-start gap-4 md:gap-6 group cursor-default">
                    <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-cyan-400 rounded-full group-hover:scale-150 transition-transform shadow-[0_0_10px_#22d3ee]" />
                    <span className="text-lg md:text-2xl font-medium text-white/70 group-hover:text-cyan-400 transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative aspect-square w-full max-w-[320px] md:max-w-[550px] order-1 md:order-2">
              <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] md:blur-[120px] rounded-full animate-pulse" />
              <div className="w-full h-full liquid-glass rounded-full border border-white/10 flex flex-col items-center justify-center">
                <ShieldCheck className="w-16 h-16 md:w-24 md:h-24 text-cyan-400 glow-cyan" />
                <p className="mt-4 md:mt-8 text-[9px] md:text-[11px] font-bold text-white/30 tracking-[0.3em] md:tracking-[0.5em] uppercase">Visualizing Infrastructure</p>
              </div>
            </div>
         </div>
      </section>

      {/* INFINITE TESTIMONIALS CAROUSEL (Peeking Overlap Logic) */}
      <section className="py-32 md:py-48 bg-transparent relative z-10 border-t border-white/5 overflow-hidden text-center">
        <h2 className="text-3xl md:text-5xl font-normal text-white leading-none mb-16 md:mb-24 px-6 md:px-0">Relied on by global security experts</h2>

        <div className="relative flex justify-center items-center h-[400px] md:h-[550px] w-full max-w-6xl mx-auto px-4">
          {[-1, 0, 1].map((offset) => {
            const index = (activeIndex + offset + originalTestimonials.length) % originalTestimonials.length;
            const item = originalTestimonials[index];
            
            let translateClass = "translate-x-0";
            let scaleClass = "scale-100";
            let opacityClass = "opacity-100";
            let zIndexClass = "z-20 shadow-2xl glow-cyan";
            let blurClass = "blur-none";

            if (offset === -1) {
              translateClass = "-translate-x-[85%] md:-translate-x-[110%]";
              scaleClass = "scale-90 md:scale-[0.85]";
              opacityClass = "opacity-40";
              zIndexClass = "z-10";
              blurClass = "blur-[2px]";
            } else if (offset === 1) {
              translateClass = "translate-x-[85%] md:translate-x-[110%]";
              scaleClass = "scale-90 md:scale-[0.85]";
              opacityClass = "opacity-40";
              zIndexClass = "z-10";
              blurClass = "blur-[2px]";
            }

            return (
              <div
                key={index}
                className={`absolute transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] liquid-glass flex flex-col p-8 md:p-12 rounded-[32px] md:rounded-[48px] border border-white/10 w-[92%] md:w-[400px] min-h-[380px] md:min-h-[440px] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 text-left ${translateClass} ${scaleClass} ${opacityClass} ${zIndexClass} ${blurClass}`}
                style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
              >
                <div className="flex gap-1.5 mb-6 md:mb-8">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 md:w-5 md:h-5 fill-[#06b6d4] text-[#06b6d4]" />)}
                </div>
                <p className="text-lg md:text-[20px] text-white/90 mb-8 md:mb-10 italic leading-[1.7] font-light line-clamp-5 flex-1">
                  "{item.text || item.comment}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 md:w-12 md:h-12 rounded-[14px] bg-[#0b1021] border border-white/5 flex items-center justify-center text-sm font-bold text-cyan-400">
                    {(item.name || "U").substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm md:text-[15px] font-bold text-white tracking-widest uppercase mb-0.5">{item.name}</p>
                    <p className="text-[10px] md:text-[10px] text-white/40 uppercase tracking-widest">{item.role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-6 md:gap-8 mt-8 md:mt-16 z-50 relative">
          <button onClick={prevTestimonial} className="w-14 h-14 md:w-16 md:h-16 rounded-full liquid-glass flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 group cursor-pointer">
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button onClick={nextTestimonial} className="w-14 h-14 md:w-16 md:h-16 rounded-full liquid-glass flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 group cursor-pointer">
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-24 pb-12 md:pt-32 md:pb-16 px-6 md:px-10 bg-[#050510]/95 backdrop-blur-xl relative z-10 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12 md:gap-24 mb-16 md:mb-24 text-center md:text-left">
          <div className="col-span-1 sm:col-span-2 space-y-8 md:space-y-10 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xl md:text-2xl font-bold font-general text-white tracking-tighter">PhishGuard</span>
            </div>
            <p className="text-sm md:text-base text-[hsl(var(--hero-sub))] leading-relaxed max-w-sm opacity-60">
              Next-generation phishing detection powered by multimodal AI and computer vision. Secure your organization from the edge.
            </p>
            <div className="flex gap-4 md:gap-6">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all"><Server className="w-4 h-4 md:w-5 md:h-5 text-white" /></div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all"><Terminal className="w-4 h-4 md:w-5 md:h-5 text-white" /></div>
            </div>
          </div>

          {['Platform', 'Company', 'Legal'].map(cat => (
            <div key={cat} className="space-y-6 md:space-y-8">
              <h5 className="text-white font-bold text-xs md:text-sm uppercase tracking-widest">{cat}</h5>
              <ul className="space-y-4 md:space-y-5 text-sm md:text-base">
                {['Overview', 'Solutions', 'Pricing', 'Documentation'].map(link => (
                  <li key={link} className="text-white/40 hover:text-white transition-colors cursor-pointer">{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-8 md:pt-12 opacity-30 gap-6">
          <p className="text-[10px] md:text-sm text-center md:text-left">© 2026 PhishGuard Inc. All rights reserved.</p>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
             <span className="text-[9px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Global Ops: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
