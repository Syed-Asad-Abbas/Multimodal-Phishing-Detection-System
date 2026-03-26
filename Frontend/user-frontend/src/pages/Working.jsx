import React, { useState, useEffect, useRef } from "react";
import "./Working.css";

// --- Exact Color Coding ---
const COLORS = {
    cyan: { border: 'border-cyan-500', bg: 'bg-cyan-950/50', text: 'text-cyan-50', hex: '#06b6d4' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-950/50', text: 'text-emerald-50', hex: '#10b981' },
    fuchsia: { border: 'border-fuchsia-500', bg: 'bg-fuchsia-950/50', text: 'text-fuchsia-50', hex: '#d946ef' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-950/60', text: 'text-orange-50', hex: '#f97316' },
    blue: { border: 'border-blue-400', bg: 'bg-blue-950/50', text: 'text-blue-50', hex: '#3b82f6' },
    yellow: { border: 'border-yellow-400', bg: 'bg-yellow-950/50', text: 'text-yellow-50', hex: '#eab308' },
    slate: { border: 'border-slate-400', bg: 'bg-slate-800/80', text: 'text-slate-50', hex: '#94a3b8' },
    white: { border: 'border-gray-200', bg: 'bg-gray-800/80', text: 'text-white', hex: '#ffffff' },
};

// --- UI Components ---
const Box = ({ x, y, w, h, text, color = 'cyan', glow = true, icon = null }) => {
    const theme = COLORS[color];
    return (
        <div 
            className={`absolute rounded-2xl border-[3px] border-opacity-60 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden transition-transform duration-300 hover:scale-105 z-40 hover:z-50
                ${theme.border} ${theme.bg} ${theme.text} ${glow ? 'working-node-breathe' : ''}`}
            style={{ left: x, top: y, width: w, height: h, '--glow-color': theme.hex + '90' }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent working-animate-scan pointer-events-none" />
            <div className="z-10 px-6 w-full flex flex-col items-center">
                {icon && <span className="mb-3 text-[40px]">{icon}</span>}
                <span className="font-bold text-[24px] leading-relaxed drop-shadow-md working-box-text">{text}</span>
            </div>
        </div>
    );
};

const AnimatedConnection = ({ id, d, color = 'cyan', dashed = false, duration = "3.5s" }) => {
    const hex = COLORS[color].hex;
    return (
        <g>
            <path d={d} fill="none" stroke={hex} strokeWidth="6" opacity="0.15" strokeDasharray={dashed ? "15 15" : "none"} />
            {!dashed && <path d={d} fill="none" stroke={hex} strokeWidth="6" strokeDasharray="20 20" className="working-path-flow" opacity="0.6" />}
            {!dashed && (
                <circle r="10" fill="#fff" style={{ filter: `drop-shadow(0 0 15px ${hex}) drop-shadow(0 0 25px ${hex})` }}>
                    <animateMotion dur={duration} repeatCount="indefinite">
                        <mpath href={`#${id}`} />
                    </animateMotion>
                </circle>
            )}
        </g>
    );
};

const Badge = ({ text, colorClass }) => (
    <div className={`absolute -top-6 right-10 flex items-center gap-3 border-[3px] px-6 py-3 rounded-lg text-[20px] uppercase font-black tracking-widest z-30 ${colorClass}`}>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        {text}
    </div>
);

export default function Working() {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        let resizeObserver;
        if (containerRef.current) {
            resizeObserver = new ResizeObserver(entries => {
                if (!entries || entries.length === 0) return;
                const { width, height } = entries[0].contentRect;
                const scaleX = width / 4400;
                const scaleY = height / 2475;
                const s = Math.min(scaleX, scaleY) * 0.95; // 95% to leave slight margin
                const x = (width - (4400 * s)) / 2;
                const y = (height - (2475 * s)) / 2;
                setTransform({ scale: s, x, y });
            });
            resizeObserver.observe(containerRef.current);
        }

        return () => {
             if (resizeObserver && containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);

    return (
        <div className="working-canvas-wrapper working-cyber-bg" ref={containerRef}>
            <div className="working-canvas-content" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                
                {/* Title Section */}
                <div className="absolute top-[80px] left-0 w-full text-center z-30 pointer-events-none">
                    <h1 className="text-[80px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400 tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        Leakage-Free Multimodal Phishing Detection System
                    </h1>
                    <p className="text-slate-300 text-[40px] mt-6 font-semibold tracking-wide">(URL + DOM + Visual) with OOF Fusion</p>
                </div>

                {/* --- BACKGROUND CONTAINERS --- */}
                
                {/* Strict Split Container (wraps K-Fold) */}
                <div className="absolute border-[6px] border-slate-700 bg-slate-900/40 rounded-[30px] z-10" style={{ left: 400, top: 1300, width: 1850, height: 650, boxShadow: '0 0 40px rgba(15, 23, 42, 0.6)' }}>
                    <div className="px-12 py-6 bg-slate-800/90 rounded-t-[24px] border-b-[4px] border-slate-700">
                        <span className="font-extrabold text-slate-100 tracking-widest text-[32px]">Strict Split: TRAIN_SET (80%) / FINAL_TEST_SET (20%)</span>
                    </div>
                    <Badge text="NO DATA LEAKAGE" colorClass="text-red-100 border-red-500 bg-red-950 shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
                </div>

                {/* Final Evaluation Container */}
                <div className="absolute border-[6px] border-blue-800 bg-blue-950/40 rounded-[30px] z-10" style={{ left: 3000, top: 400, width: 460, height: 1350, boxShadow: '0 0 50px rgba(30, 64, 175, 0.5)' }}>
                    <div className="px-12 py-6 bg-blue-900/80 rounded-t-[24px] border-b-[4px] border-blue-700">
                        <span className="font-extrabold text-blue-100 tracking-widest text-[32px]">Final Evaluation</span>
                    </div>
                    <Badge text="NO DATA LEAKAGE" colorClass="text-cyan-100 border-cyan-500 bg-cyan-950 shadow-[0_0_30px_rgba(6,182,212,0.5)]" />
                </div>

                {/* Deployment Layer Container */}
                <div className="absolute border-[5px] border-slate-600 bg-slate-900/40 rounded-[24px] z-10" style={{ left: 3600, top: 400, width: 400, height: 650, boxShadow: '0 0 30px rgba(15, 23, 42, 0.6)' }}>
                    <div className="text-center pt-8 pb-6 border-b-[4px] border-slate-700 bg-slate-800/50 rounded-t-[18px]">
                        <span className="font-bold text-slate-200 tracking-wide text-[28px]">Deployment Layer</span>
                    </div>
                </div>

                {/* Explainability Container */}
                <div className="absolute border-[5px] border-yellow-700/60 bg-yellow-950/20 rounded-[24px] z-10" style={{ left: 3600, top: 1200, width: 400, height: 650, boxShadow: '0 0 30px rgba(161, 98, 7, 0.3)' }}>
                    <div className="text-center pt-8 pb-6 border-b-[4px] border-yellow-800/50 bg-yellow-900/40 rounded-t-[18px]">
                        <span className="font-bold text-yellow-400 tracking-wide text-[28px]">Explainability + NLG</span>
                    </div>
                </div>

                {/* K-Fold OOF Inner Boundary */}
                <div className="absolute border-[6px] border-dashed border-slate-600 bg-slate-800/30 rounded-[24px] z-10" style={{ left: 450, top: 1400, width: 1750, height: 500 }}>
                    <div className="absolute top-6 w-full text-center text-slate-300 text-[26px] font-bold tracking-wide">K-Fold OOF Predictions (K=5) on TRAIN_SET</div>
                    <div className="absolute bottom-6 w-full text-center text-slate-400 text-[22px] font-bold tracking-widest uppercase">Training & OOF Stacking</div>
                </div>

                {/* --- SVG ANIMATED CONNECTIONS LAYER --- */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                    <defs>
                        <path id="p-in-url" d="M 300 850 C 380 850, 420 560, 500 560" />
                        <path id="p-in-dom" d="M 300 850 C 380 850, 420 860, 500 860" />
                        <path id="p-in-vis" d="M 300 850 C 380 850, 420 1160, 500 1160" />
                        
                        <path id="p-url-1" d="M 800 560 L 1000 560" />
                        <path id="p-url-2" d="M 1360 560 L 1500 560" />
                        <path id="p-url-3" d="M 1760 560 L 1900 560" />

                        <path id="p-dom-1" d="M 800 860 L 1000 860" />
                        <path id="p-dom-2" d="M 1360 860 L 1500 860" />
                        <path id="p-dom-3" d="M 1760 860 L 1900 860" />

                        <path id="p-vis-1" d="M 800 1160 L 1000 1160" />
                        <path id="p-vis-2" d="M 1760 1160 L 1900 1160" />

                        {/* K-Fold Flows */}
                        <path id="p-kfold-1" d="M 660 1530 C 730 1530, 730 1530, 800 1530" />
                        <path id="p-kfold-2" d="M 660 1710 C 730 1710, 730 1710, 800 1710" />
                        <path id="p-kfold-out1" d="M 1160 1530 C 1280 1530, 1280 1620, 1400 1620" />
                        <path id="p-kfold-out2" d="M 1160 1710 C 1280 1710, 1280 1620, 1400 1620" />

                        {/* Into Fusion */}
                        <path id="p-fuse-url" d="M 2160 560 C 2280 560, 2280 850, 2400 850" />
                        <path id="p-fuse-dom" d="M 2160 860 C 2280 860, 2280 900, 2400 900" />
                        <path id="p-fuse-vis" d="M 2160 1160 C 2280 1160, 2280 950, 2400 950" />
                        <path id="p-fuse-oof" d="M 1700 1620 C 2050 1620, 2050 1000, 2400 1000" />

                        {/* Fusion to Eval Locked directly */}
                        <path id="p-eval-out" d="M 2760 900 C 2900 900, 2900 1370, 3050 1370" />

                        {/* Internal Eval Flows (Vertical Trunk) */}
                        <path id="p-eval-1" d="M 3230 620 L 3230 700" />
                        <path id="p-eval-2" d="M 3230 820 L 3230 900" />
                        <path id="p-eval-3" d="M 3230 1020 L 3230 1100" />
                        <path id="p-eval-4" d="M 3230 1240 L 3230 1300" />
                        <path id="p-eval-5" d="M 3230 1440 L 3230 1550" />

                        {/* Eval to Deploy & Exp */}
                        <path id="p-deploy-dash" d="M 3410 1610 C 3550 1610, 3550 530, 3650 530" />
                        <path id="p-exp-1" d="M 3410 1610 C 3550 1610, 3550 1340, 3650 1340" />
                        
                        {/* Explain/Deploy Vertical Drops */}
                        <path id="p-exp-2" d="M 3800 1400 L 3800 1480" />
                        <path id="p-exp-3" d="M 3800 1600 L 3800 1680" />

                        <path id="p-dep-1" d="M 3800 580 L 3800 620" />
                        <path id="p-dep-2" d="M 3800 720 L 3800 760" />
                        <path id="p-dep-3" d="M 3800 860 L 3800 900" />
                    </defs>

                    {/* Using the defs and AnimatedConnection to draw */}
                    <AnimatedConnection id="p-in-url" d="M 300 850 C 380 850, 420 560, 500 560" color="cyan" duration="2s" />
                    <AnimatedConnection id="p-in-dom" d="M 300 850 C 380 850, 420 860, 500 860" color="emerald" duration="2s" />
                    <AnimatedConnection id="p-in-vis" d="M 300 850 C 380 850, 420 1160, 500 1160" color="fuchsia" duration="2s" />

                    <AnimatedConnection id="p-url-1" d="M 800 560 L 1000 560" color="cyan" duration="1.5s" />
                    <AnimatedConnection id="p-url-2" d="M 1360 560 L 1500 560" color="cyan" duration="1.5s" />
                    <AnimatedConnection id="p-url-3" d="M 1760 560 L 1900 560" color="cyan" duration="1.5s" />

                    <AnimatedConnection id="p-dom-1" d="M 800 860 L 1000 860" color="emerald" duration="1.5s" />
                    <AnimatedConnection id="p-dom-2" d="M 1360 860 L 1500 860" color="emerald" duration="1.5s" />
                    <AnimatedConnection id="p-dom-3" d="M 1760 860 L 1900 860" color="emerald" duration="1.5s" />

                    <AnimatedConnection id="p-vis-1" d="M 800 1160 L 1000 1160" color="fuchsia" duration="1.5s" />
                    <AnimatedConnection id="p-vis-2" d="M 1760 1160 L 1900 1160" color="fuchsia" duration="2.5s" />

                    <AnimatedConnection id="p-kfold-1" d="M 660 1530 C 730 1530, 730 1530, 800 1530" color="slate" duration="1.5s" />
                    <AnimatedConnection id="p-kfold-2" d="M 660 1710 C 730 1710, 730 1710, 800 1710" color="slate" duration="1.5s" />
                    <AnimatedConnection id="p-kfold-out1" d="M 1160 1530 C 1280 1530, 1280 1620, 1400 1620" color="slate" duration="1.5s" />
                    <AnimatedConnection id="p-kfold-out2" d="M 1160 1710 C 1280 1710, 1280 1620, 1400 1620" color="slate" duration="1.5s" />

                    <AnimatedConnection id="p-fuse-url" d="M 2160 560 C 2280 560, 2280 850, 2400 850" color="cyan" duration="2.5s" />
                    <AnimatedConnection id="p-fuse-dom" d="M 2160 860 C 2280 860, 2280 900, 2400 900" color="emerald" duration="2.5s" />
                    <AnimatedConnection id="p-fuse-vis" d="M 2160 1160 C 2280 1160, 2280 950, 2400 950" color="fuchsia" duration="2.5s" />
                    <AnimatedConnection id="p-fuse-oof" d="M 1700 1620 C 2050 1620, 2050 1000, 2400 1000" color="orange" duration="3s" />

                    <AnimatedConnection id="p-eval-out" d="M 2760 900 C 2900 900, 2900 1370, 3050 1370" color="orange" duration="2.5s" />
                    
                    <AnimatedConnection id="p-eval-1" d="M 3230 620 L 3230 700" color="blue" />
                    <AnimatedConnection id="p-eval-2" d="M 3230 820 L 3230 900" color="blue" />
                    <AnimatedConnection id="p-eval-3" d="M 3230 1020 L 3230 1100" color="blue" />
                    <AnimatedConnection id="p-eval-4" d="M 3230 1240 L 3230 1300" color="blue" />
                    <AnimatedConnection id="p-eval-5" d="M 3230 1440 L 3230 1550" color="blue" />

                    <AnimatedConnection id="p-deploy-dash" d="M 3410 1610 C 3550 1610, 3550 530, 3650 530" color="slate" dashed={true} />
                    
                    <AnimatedConnection id="p-exp-1" d="M 3410 1610 C 3550 1610, 3550 1340, 3650 1340" color="yellow" duration="2s" />
                    <AnimatedConnection id="p-exp-2" d="M 3800 1400 L 3800 1480" color="yellow" />
                    <AnimatedConnection id="p-exp-3" d="M 3800 1600 L 3800 1680" color="yellow" />

                    <AnimatedConnection id="p-dep-1" d="M 3800 580 L 3800 620" color="slate" />
                    <AnimatedConnection id="p-dep-2" d="M 3800 720 L 3800 760" color="slate" />
                    <AnimatedConnection id="p-dep-3" d="M 3800 860 L 3800 900" color="slate" />
                </svg>

                {/* --- HTML NODES LAYER --- */}

                {/* Input */}
                <Box x={100} y={800} w={200} h={100} text="User URL Input" color="white" glow={false} />

                {/* URL Branch */}
                <Box x={500} y={500} w={300} h={120} text={"URL Branch\nRaw URL String"} color="cyan" />
                <Box x={1000} y={500} w={360} h={120} text={"Feature Extraction\n(lexical + statistical + embeddings)"} color="cyan" />
                <Box x={1500} y={500} w={260} h={120} text={"Base model:\nLightGBM_URL"} color="cyan" />
                <Box x={1900} y={500} w={260} h={120} text={"Output: P_url\n(phishing probability)"} color="cyan" />

                {/* DOM Branch */}
                <Box x={500} y={800} w={300} h={120} text={"DOM Branch\nHTML/DOM from Selenium\n(live page)"} color="emerald" />
                <Box x={1000} y={800} w={360} h={120} text={"DOM Parsing &\nDoc2Vec Embedding\n(forms, links, scripts, text)"} color="emerald" />
                <Box x={1500} y={800} w={260} h={120} text={"Base model:\nLightGBM_DOM"} color="emerald" />
                <Box x={1900} y={800} w={260} h={120} text={"Output: P_dom\n(phishing probability)"} color="emerald" />

                {/* Visual Branch */}
                <Box x={500} y={1100} w={300} h={120} text={"Visual Branch\nScreenshot\n(rendered page)"} color="fuchsia" />
                <Box x={1000} y={1100} w={760} h={120} text={"CNN backbone: ResNetSD\n(transfer learning)"} color="fuchsia" />
                <Box x={1900} y={1100} w={260} h={120} text={"Output: P_vis\n(phishing probability)"} color="fuchsia" />

                {/* K-Fold Section */}
                <Box x={500} y={1480} w={160} h={280} text="Folds" color="slate" glow={false} />
                <Box x={800} y={1480} w={360} h={100} text={"Fold 1, 2, 3, 4\n(Train Base Models)"} color="slate" glow={false} />
                <Box x={800} y={1660} w={360} h={100} text={"Fold S\n(Predict on Held-out)"} color="slate" glow={false} />
                <Box x={1400} y={1570} w={300} h={100} text="OOF Predictions" color="slate" />

                {/* Fusion Layer */}
                <Box x={2400} y={750} w={360} h={300} 
                    text={"Fusion Layer\n(Meta Learner)\n[P_url  P_dom  P_vis]\n+ aux features\n\nFusion LightGBM\n(meta-classifier)"} 
                    color="orange" glow={true} 
                />

                {/* Final Evaluation Section */}
                <Box x={3050} y={500} w={360} h={120} text={"FINAL_TEST_SET\n(20%) untouched\nuntil final evaluation"} color="blue" glow={false} />
                <Box x={3050} y={700} w={360} h={120} text={"Retrain Base Models\non FULL TRAIN_SET"} color="blue" glow={false} />
                <Box x={3050} y={900} w={360} h={120} text={"Generate\nFINAL_TEST_SET\nPredictions"} color="blue" glow={false} />
                <Box x={3050} y={1100} w={360} h={140} text={"Fusion Test Features"} color="blue" glow={false} />
                
                {/* Locked Eval */}
                <Box x={3050} y={1300} w={360} h={140} 
                     text={"Final Evaluation\non LOCKED\nFINAL_TEST_SET"} 
                     color="blue" glow={true} 
                     icon={<svg className="w-10 h-10 text-blue-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>} 
                />
                
                <Box x={3050} y={1550} w={360} h={120} text={"Final Probability\n+ Label"} color="blue" glow={true} />

                {/* Deployment Layer Stack */}
                <Box x={3650} y={480} w={300} h={100} text={"React Frontend\n(URL submit, result, plot)"} color="slate" glow={false} />
                <Box x={3650} y={620} w={300} h={100} text={"Node/Express Backend\n(auth, history, admin)"} color="slate" glow={false} />
                <Box x={3650} y={760} w={300} h={100} text={"Flask ML API\n(feature extraction,\nmodel inference)"} color="slate" glow={false} />
                <Box x={3650} y={900} w={300} h={100} text={"Data storage\n(scans, preds, metadata)"} color="slate" glow={false} />

                {/* Explainability Section */}
                <Box x={3650} y={1280} w={300} h={120} text={"SHAP on Fusion\nLightGBM\n(global + per sample)"} color="yellow" />
                <Box x={3650} y={1480} w={300} h={120} text={"NLG explanation\ngenerator\n(Gemini/Ollama)"} color="yellow" />
                <Box x={3650} y={1680} w={300} h={100} text={"Human-friendly\nreason text"} color="yellow" glow={true} />
                
            </div>
        </div>
    );
}
