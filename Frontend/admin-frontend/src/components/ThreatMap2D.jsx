import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as topojson from "topojson-client";
import { geoNaturalEarth1, geoPath, geoCentroid } from "d3-geo";

// Client location (Lahore)
const CLIENT_LAT = 31.5204;
const CLIENT_LNG = 74.3587;

// Country name overrides for better label display
const COUNTRY_LABELS = {
  "840": "USA", "124": "Canada", "076": "Brazil", "032": "Argentina",
  "156": "China", "356": "India", "643": "Russia", "036": "Australia",
  "276": "Germany", "250": "France", "826": "UK", "380": "Italy",
  "724": "Spain", "392": "Japan", "410": "S. Korea", "484": "Mexico",
  "710": "S. Africa", "818": "Egypt", "566": "Nigeria", "404": "Kenya",
  "586": "Pakistan", "360": "Indonesia", "764": "Thailand", "704": "Vietnam",
  "792": "Turkey", "682": "Saudi Arabia", "364": "Iran", "804": "Ukraine",
  "616": "Poland", "752": "Sweden", "578": "Norway", "170": "Colombia",
  "604": "Peru", "152": "Chile", "012": "Algeria", "504": "Morocco",
};

export default function ThreatMap2D({ threats, topology, onThreatClick, selectedThreatIndex }) {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const animFrameRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 900, h: 500 });
  const [hoveredThreat, setHoveredThreat] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const packetsRef = useRef([]);

  // Projection and path generator
  const projection = useMemo(() => {
    return geoNaturalEarth1()
      .scale(dimensions.w / 5.5)
      .translate([dimensions.w / 2, dimensions.h / 2]);
  }, [dimensions]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Build countries features
  const countries = useMemo(() => {
    if (!topology) return [];
    return topojson.feature(topology, topology.objects.countries).features;
  }, [topology]);

  // Project threat data
  const projectedThreats = useMemo(() => {
    return threats.map((t, i) => {
      const srcPt = projection([t.geo_long || 0, t.geo_lat || 0]);
      const dstPt = projection([CLIENT_LNG, CLIENT_LAT]);
      return { ...t, srcPt, dstPt, index: i };
    }).filter(t => t.srcPt && t.dstPt);
  }, [threats, projection]);

  // Client projected point
  const clientPt = useMemo(() => projection([CLIENT_LNG, CLIENT_LAT]), [projection]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Spawn new packets periodically
  useEffect(() => {
    if (projectedThreats.length === 0) return;
    const interval = setInterval(() => {
      const t = projectedThreats[Math.floor(Math.random() * projectedThreats.length)];
      packetsRef.current.push({
        sx: t.srcPt[0], sy: t.srcPt[1],
        dx: t.dstPt[0], dy: t.dstPt[1],
        progress: 0,
        speed: 0.004 + Math.random() * 0.006,
        color: `hsl(${Math.random() * 40 + 10}, 100%, 65%)`, // warm orange-yellow
        threatIndex: t.index,
      });
      // Limit active packets
      if (packetsRef.current.length > 80) {
        packetsRef.current = packetsRef.current.slice(-60);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [projectedThreats]);

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { w, h } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = "#08070e";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = "rgba(51, 65, 85, 0.15)";
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += 30) {
      const pt = projection([lon, 0]);
      if (pt) {
        ctx.beginPath();
        ctx.moveTo(pt[0], 0);
        ctx.lineTo(pt[0], h);
        ctx.stroke();
      }
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const pt = projection([0, lat]);
      if (pt) {
        ctx.beginPath();
        ctx.moveTo(0, pt[1]);
        ctx.lineTo(w, pt[1]);
        ctx.stroke();
      }
    }

    // Draw countries
    countries.forEach(country => {
      ctx.beginPath();
      pathGen.context(ctx)(country);
      ctx.fillStyle = "rgba(30, 58, 78, 0.6)";
      ctx.fill();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw country labels
    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.font = `${Math.max(8, w / 130)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    countries.forEach(country => {
      const id = country.id;
      const name = COUNTRY_LABELS[id];
      if (name) {
        const centroid = geoCentroid(country);
        const pt = projection(centroid);
        if (pt) {
          ctx.fillText(name, pt[0], pt[1]);
        }
      }
    });

    // Draw connection lines (static trails)
    projectedThreats.forEach((t, i) => {
      const isSelected = selectedThreatIndex === i;
      ctx.beginPath();
      ctx.moveTo(t.srcPt[0], t.srcPt[1]);

      // Curved line via control point
      const cpX = (t.srcPt[0] + t.dstPt[0]) / 2;
      const cpY = Math.min(t.srcPt[1], t.dstPt[1]) - 30 - Math.abs(t.srcPt[0] - t.dstPt[0]) * 0.08;
      ctx.quadraticCurveTo(cpX, cpY, t.dstPt[0], t.dstPt[1]);

      ctx.strokeStyle = isSelected
        ? "rgba(239, 68, 68, 0.5)"
        : "rgba(250, 247, 230, 0.08)";
      ctx.lineWidth = isSelected ? 1.5 : 0.6;
      ctx.stroke();
    });

    // Draw & update packets
    const packets = packetsRef.current;
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.progress += p.speed;
      if (p.progress >= 1) {
        packets.splice(i, 1);
        continue;
      }

      const t = p.progress;
      const cpX = (p.sx + p.dx) / 2;
      const cpY = Math.min(p.sy, p.dy) - 30 - Math.abs(p.sx - p.dx) * 0.08;

      // Quadratic bezier interpolation
      const x = (1 - t) * (1 - t) * p.sx + 2 * (1 - t) * t * cpX + t * t * p.dx;
      const y = (1 - t) * (1 - t) * p.sy + 2 * (1 - t) * t * cpY + t * t * p.dy;

      // Glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw threat origin points
    projectedThreats.forEach((t, i) => {
      const isSelected = selectedThreatIndex === i;
      const isHovered = hoveredThreat === i;
      const radius = isSelected ? 6 : isHovered ? 5 : 3.5;

      // Outer glow
      const glow = ctx.createRadialGradient(
        t.srcPt[0], t.srcPt[1], 0,
        t.srcPt[0], t.srcPt[1], radius * 3
      );
      glow.addColorStop(0, isSelected ? "rgba(239, 68, 68, 0.6)" : "rgba(238, 211, 31, 0.4)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(t.srcPt[0], t.srcPt[1], radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = isSelected ? "#ef4444" : "#eed31f";
      ctx.beginPath();
      ctx.arc(t.srcPt[0], t.srcPt[1], radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = isSelected ? 1.5 : 0.7;
      ctx.stroke();
    });

    // Draw client point (Lahore)
    if (clientPt) {
      // Pulsing ring
      const pulse = (Date.now() % 2000) / 2000;
      const pulseRadius = 6 + pulse * 12;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 - pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(clientPt[0], clientPt[1], pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Core
      const cGrad = ctx.createRadialGradient(clientPt[0], clientPt[1], 0, clientPt[0], clientPt[1], 8);
      cGrad.addColorStop(0, "#38bdf8");
      cGrad.addColorStop(1, "rgba(56, 189, 248, 0.2)");
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(clientPt[0], clientPt[1], 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(clientPt[0], clientPt[1], 3, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold ${Math.max(10, w / 100)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText("📍 Lahore", clientPt[0] + 12, clientPt[1] + 4);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [dimensions, countries, projection, pathGen, projectedThreats, clientPt, hoveredThreat, selectedThreatIndex]);

  // Start/stop animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // Mouse interaction for hover tooltips
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    let found = null;
    for (let i = 0; i < projectedThreats.length; i++) {
      const t = projectedThreats[i];
      const dx = t.srcPt[0] - mx;
      const dy = t.srcPt[1] - my;
      if (dx * dx + dy * dy < 100) { // 10px radius hit
        found = i;
        break;
      }
    }
    setHoveredThreat(found);
  }, [projectedThreats]);

  const handleClick = useCallback((e) => {
    if (hoveredThreat !== null && onThreatClick) {
      onThreatClick(hoveredThreat);
    }
  }, [hoveredThreat, onThreatClick]);

  const hThreat = hoveredThreat !== null ? threats[hoveredThreat] : null;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: hoveredThreat !== null ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredThreat(null)}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {hThreat && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y - 8,
          }}
        >
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 backdrop-blur-lg shadow-xl min-w-[220px]">
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-red-400 text-sm font-medium">{hThreat.ip_address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
              <span className="text-slate-500">📍</span>
              {hThreat.country || 'Unknown'}
              {hThreat.geo_lat && hThreat.geo_long && (
                <span className="text-slate-600 ml-1">
                  ({hThreat.geo_lat.toFixed(2)}, {hThreat.geo_long.toFixed(2)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-slate-500">🔗</span>
              <span className="break-all text-slate-300">{hThreat.scan?.url || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-slate-500 bg-slate-950/70 rounded-md px-3 py-1.5 backdrop-blur-sm border border-slate-800/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#eed31f]" />
          <span>Threat Origin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <span>Client (Lahore)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-1 rounded-sm bg-orange-400" />
          <span>Packet Flow</span>
        </div>
      </div>
    </div>
  );
}
