import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
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
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from "../services/api";

export default function Landing() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scanUrl, setScanUrl] = useState("");
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let animationFrame;
    const updateOpacity = () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const time = video.currentTime;
      const duration = video.duration;
      const fadeTime = 0.5;
      let opacity = 1;

      if (time < fadeTime) {
        opacity = time / fadeTime;
      } else if (duration > 0 && (duration - time) < fadeTime) {
        opacity = (duration - time) / fadeTime;
      }

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

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await api.get('/reviews/testimonials');
        if (res.data && res.data.length > 0) {
          setTestimonials(res.data);
        } else {
          setTestimonials(mockTestimonials);
        }
      } catch (err) {
        setTestimonials(mockTestimonials); // fallback
      }
    };
    fetchTestimonials();
  }, []);

  const mockTestimonials = [
    {
      comment: "The visual SHAP analysis is a game changer. Finally, our team can understand WHY the AI flagged a specific element.",
      user_email: "SecOps*****",
      rating: 5,
    },
    {
      comment: "We reduced our mean time to respond (MTTR) by 60% using PhishGuard's automated triage API.",
      user_email: "CISO*****",
      rating: 5,
    },
    {
      comment: "The false positive rate is incredibly low compared to our previous threat intelligence provider.",
      user_email: "Analyst*****",
      rating: 4,
    }
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : mockTestimonials;
  const extendedTestimonials = displayTestimonials.length >= 3
    ? displayTestimonials
    : [...displayTestimonials, ...displayTestimonials, ...displayTestimonials].slice(0, 3);

  const handleScanSubmit = () => {
    if (scanUrl) {
      sessionStorage.setItem('pendingScanUrl', scanUrl);
      navigate('/dashboard/scan');
    }
  };

  return (
    <div className="landing-theme min-h-screen flex flex-col overflow-x-hidden relative pt-16 selection:bg-cyan-500/30">
      {/* BACKGROUND VIDEO LAYER */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#07020f]">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
          crossOrigin="anonymous"
          autoPlay muted playsInline onEnded={handleVideoEnded}
          className="w-full h-full object-cover mix-blend-screen"
          style={{ opacity: videoOpacity * 0.25 }}
        />
        {/* Soft Depth Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-950/20 blur-[120px] rounded-full" />
      </div>

      {/* CONTENT Z-LAYER */}
      <div className="relative z-10 flex flex-col flex-1">

        {/* HERO SECTION */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass mb-10 border border-white/5">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase opacity-80">PhishGuard 2.0 Live</span>
          </div>

          <h1 className="font-general text-[50px] md:text-[110px] lg:text-[140px] font-normal leading-[1.02] tracking-[-0.03em] text-white">
            Detect phishing with<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-300">Explainable AI</span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed max-w-2xl mt-8 text-[hsl(var(--hero-sub))] opacity-80">
            The first multimodal detection system that sees the web like a human does.
            Analyze URLs, DOM structures, and visual patterns in milliseconds.
          </p>

          {/* Scan Input Area */}
          <div className="mt-12 w-full max-w-2xl relative">
            <div className="liquid-glass rounded-2xl p-1.5 flex items-center gap-2 border border-white/5 group focus-within:border-cyan-500/30 transition-all">
              <Search className="ml-4 w-6 h-6 text-white/30" />
              <input
                type="text"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanSubmit();
                }}
                placeholder="scan website (e.g., apple-id-login.com)"
                className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-white placeholder:text-white/20 font-medium"
              />
              <button
                onClick={handleScanSubmit}
                className="bg-cyan-500 text-slate-950 px-8 py-4 rounded-xl font-bold hover:bg-cyan-400 transition-all glow-cyan mr-1 active:scale-95 cursor-pointer">
                Scan Now
              </button>
            </div>

            {/* Trust Badges under Input */}
            <div className="flex justify-center gap-8 mt-8 opacity-50 flex-wrap">
              {['99.9% Accuracy', 'Visual SHAP Analysis', 'Enterprise API'].map(tag => (
                <div key={tag} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> {tag}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE: MULTIMODAL ENGINE */}
        <section className="py-32 px-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="font-general text-5xl font-normal text-white mb-6">Multimodal Detection Engine</h2>
              <p className="text-lg text-[hsl(var(--hero-sub))]">
                PhishGuard combines three distinct AI models to analyze every aspect of a suspicious site, just like a human analyst would.
              </p>
            </div>
            <button className="flex items-center gap-2 text-cyan-400 font-bold hover:gap-3 transition-all cursor-pointer">
              View Technical Specs <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'URL Analysis',
                icon: Globe,
                color: 'text-cyan-400',
                desc: 'Deconstructs the URL for typosquatting, heavy obfuscation, and known malicious patterns using a specialized transformer model.'
              },
              {
                title: 'DOM Inspection',
                icon: Code,
                color: 'text-purple-400',
                desc: 'Scans the HTML/JS structure for hidden forms, suspicious scripts, and evasion techniques that traditional scanners miss.'
              },
              {
                title: 'Visual Recognition',
                icon: Eye,
                color: 'text-emerald-400',
                desc: 'Uses computer vision to render the page and compare it against a database of legitimate brand login pages.'
              }
            ].map((card) => (
              <div key={card.title} className="liquid-glass p-10 rounded-[40px] group transition-all duration-500 hover:-translate-y-2 border border-white/5">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-white/10 transition-colors`}>
                  <card.icon className={`w-7 h-7 ${card.color}`} />
                </div>
                <h3 className="font-general text-2xl font-normal text-white mb-4">{card.title}</h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--hero-sub))] opacity-70 group-hover:opacity-100 transition-opacity">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE: THREAT INTEL GLOBE */}
        <section className="py-32 px-8 max-w-7xl mx-auto w-full">
          <div className="liquid-glass rounded-[48px] p-12 md:p-20 flex flex-col md:flex-row items-center gap-20 overflow-hidden border border-white/5">
            <div className="flex-1">
              <h2 className="font-general text-5xl font-normal text-white mb-8">Global Threat Intelligence</h2>
              <div className="space-y-10">
                {[
                  { t: 'Real-time Plotting', d: 'Live feed of malicious IPs and domains visualized on a high-fidelity spatial grid.' },
                  { t: 'Geospatial Analytics', d: 'Identify high-risk regions and hosting providers across international borders.' },
                  { t: 'Campaign Tracking', d: 'Link disparate attacks to single threat actors using graph-based link analysis.' }
                ].map(item => (
                  <div key={item.t} className="group">
                    <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:scale-150 transition-transform" />
                      {item.t}
                    </h4>
                    <p className="text-sm text-[hsl(var(--hero-sub))] opacity-60 leading-relaxed ml-4">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 relative w-full aspect-square max-w-[500px]">
              {/* 3D Mock Globe Graphic */}
              <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full animate-pulse" />
              <div className="absolute inset-0 border border-white/10 rounded-full scale-110" />
              <div className="absolute inset-10 border border-cyan-500/20 rounded-full -rotate-12" />
              <div className="w-full h-full liquid-glass rounded-full flex flex-col items-center justify-center text-center p-10 border border-white/10">
                <ShieldCheck className="w-24 h-24 text-cyan-400 mb-6 glow-cyan" />
                <p className="text-xs font-bold text-white/40 tracking-[0.4em] uppercase mb-1">Malicious Infrastructure</p>
                <p className="text-sm font-bold text-cyan-400 tracking-wider">TRACKING IN REAL-TIME</p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS CAROUSEL */}
        <section className="py-32 px-4 md:px-8 overflow-hidden text-center">
          <h2 className="font-general text-4xl md:text-5xl font-normal text-white mb-20">Relied on by global security experts</h2>

          <div className="parrent-container flex justify-center items-center relative h-[350px] w-full max-w-6xl mx-auto">
            {[-2, -1, 0, 1, 2].map((offset) => {
              const absoluteIdx = activeIndex + offset;
              const len = displayTestimonials.length;
              // Get real item from circular array (protect negative modulo)
              const realIdx = ((absoluteIdx % len) + len) % len;
              const t = displayTestimonials[realIdx];

              let scaleClass = "scale-50";
              let opacityClass = "opacity-0";
              let zIndexClass = "z-0";
              let translateClass = "";
              let blurClass = "blur-[8px]";

              if (offset === 0) {
                scaleClass = "scale-100";
                opacityClass = "opacity-100";
                zIndexClass = "z-30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white/[0.03]";
                translateClass = "translate-x-0";
                blurClass = "blur-none";
              } else if (offset === -1) {
                scaleClass = "scale-[0.85]";
                opacityClass = "opacity-40";
                zIndexClass = "z-20";
                translateClass = "-translate-x-[85%] md:-translate-x-[110%]"; // Mobile peek of ~10%
                blurClass = "blur-[2px]";
              } else if (offset === 1) {
                scaleClass = "scale-[0.85]";
                opacityClass = "opacity-40";
                zIndexClass = "z-20";
                translateClass = "translate-x-[85%] md:translate-x-[110%]";
                blurClass = "blur-[2px]";
              } else if (offset === -2) {
                scaleClass = "scale-75";
                translateClass = "-translate-x-[150%]";
              } else if (offset === 2) {
                scaleClass = "scale-75";
                translateClass = "translate-x-[150%]";
              }

              return (
                <div
                  key={absoluteIdx} // Absolute key guarantees smooth unmounting/mounting array injection
                  className={`new-testimonial-card absolute transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] liquid-glass p-8 md:p-10 rounded-[32px] border border-white/5 w-[92%] max-w-[50vw] ${scaleClass} ${opacityClass} ${zIndexClass} ${translateClass} ${blurClass}`}
                  style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                >
                  <div className="flex gap-1 mb-8">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < (t.rating || 5) ? 'fill-cyan-400 text-cyan-400' : 'text-slate-700'}`} />)}
                  </div>
                  <p className="text-lg text-white mb-10 italic leading-relaxed line-clamp-4 text-left">
                    "{t.comment || t.display_text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={t.avatar || `https://ui-avatars.com/api/?name=${t.user_email}&background=1e293b&color=fff`}
                      alt="avatar"
                      className="w-10 h-10 rounded-full border border-slate-700 object-cover bg-slate-900"
                    />
                    <div className="text-left">
                      <p className="text-sm font-bold text-white uppercase tracking-tighter">{t.user_email}</p>
                      <p className="text-xs text-white/40">Verified Client</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-6 mt-16 relative z-30">
            <button onClick={() => setActiveIndex(activeIndex - 1)} className="w-14 h-14 rounded-full liquid-glass flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button onClick={() => setActiveIndex(activeIndex + 1)} className="w-14 h-14 rounded-full liquid-glass flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 relative overflow-hidden flex flex-col items-center flex-wrap">
          <div className="absolute inset-0 bg-cyan-900/5 pointer-events-none" />
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white z-10 px-4 text-center">Ready to secure your organization?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto z-10 px-4 text-center">
            Start scanning URLs immediately or integrate our API into your existing security stack.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 z-10 w-full px-4">
            <button onClick={() => navigate("/dashboard/scan")} className="w-full sm:w-auto bg-white text-slate-950 font-bold px-8 py-4 rounded-full hover:scale-105 active:scale-95 transition-transform cursor-pointer">
              Start Free Scan
            </button>
            <button onClick={() => navigate("/signup")} className="w-full sm:w-auto text-white border border-white/20 font-bold px-8 py-4 rounded-full hover:bg-white/5 disabled:opacity-50 transition-colors cursor-pointer">
              Create Account
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-32 pb-16 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-20 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center glow-cyan">
                  <ShieldCheck className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white font-general">PhishGuard</span>
              </div>
              <p className="text-sm text-[hsl(var(--hero-sub))] leading-relaxed max-w-sm mb-10">
                Next-generation phishing detection powered by multimodal AI and computer vision. Stay one step ahead of threat actors.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center cursor-pointer hover:bg-white/10"><Server className="w-4 h-4 text-white" /></div>
                <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center cursor-pointer hover:bg-white/10"><Terminal className="w-4 h-4 text-white" /></div>
              </div>
            </div>

            {['Platform', 'Company', 'Legal'].map(cat => (
              <div key={cat}>
                <h5 className="text-white font-bold mb-8 text-sm uppercase tracking-widest">{cat}</h5>
                <ul className="space-y-5 text-sm">
                  {['Overview', 'Solutions', 'Pricing', 'Documentation'].map(link => (
                    <li key={link} className="text-[hsl(var(--hero-sub))] hover:text-white transition-colors cursor-pointer">{link}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/5 pt-12 opacity-50">
            <p className="text-xs text-white">© 2026 PhishGuard Inc. All rights reserved.</p>
            <div className="flex items-center gap-2 mt-6 md:mt-0">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">All Systems Operational</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
