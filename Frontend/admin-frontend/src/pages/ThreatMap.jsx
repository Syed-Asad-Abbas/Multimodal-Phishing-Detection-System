import React, { useState, useEffect, useRef } from "react";
import { Card, Badge } from "../components/ui/Primitives";
import { Globe, Map, MapPin, ShieldAlert } from "lucide-react";
import api from "../services/api";
import GlobeGL from "react-globe.gl";
import * as THREE from "three";
import * as topojson from "topojson-client";
import ThreatMap2D from "../components/ThreatMap2D";

export default function ThreatMap() {
  const [threats, setThreats] = useState([]);
  const [globeData, setGlobeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landTopology, setLandTopology] = useState(null);
  const [viewMode, setViewMode] = useState("globe"); // "globe" | "map"
  const [selectedThreatIndex, setSelectedThreatIndex] = useState(null);

  const globeEl = useRef();

  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(r => r.json())
      .then(setLandTopology)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/map');
        setThreats(data || []);

        const mappedData = (data || []).map(t => ({
          lat: t.geo_lat || 0,
          lng: t.geo_long || 0,
          size: 0.1,
          color: '#38bdf8',
          label: `
            <div style="background: rgba(2, 6, 23, 0.85); border: 1px solid rgba(30, 41, 59, 0.8); border-radius: 8px; padding: 12px; font-family: ui-sans-serif, system-ui, sans-serif; min-width: 220px; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #f87171; font-size: 13px; font-weight: 500;">${t.ip_address}</span>
              </div>
              <div style="font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <span style="color: #64748b;">📍</span> ${t.country || 'Unknown'} 
                ${t.geo_lat && t.geo_long ? `<span style="color: #475569; margin-left: 4px;">(${t.geo_lat.toFixed(2)}, ${t.geo_long.toFixed(2)})</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                <span style="color: #64748b;">🔗</span> <span style="word-break: break-all; color: #cbd5e1;">${t.scan?.url || 'N/A'}</span>
              </div>
            </div>
          `
        }));
        setGlobeData(mappedData);
      } catch (err) {
        console.error("Failed to fetch threat map data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchThreats();
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ altitude: 2.5 });
    }
  }, [globeData, viewMode]);

  // Handle card click — navigate globe/map to threat origin
  const handleThreatCardClick = (index) => {
    const threat = threats[index];
    if (!threat || threat.geo_lat == null || threat.geo_long == null) return;

    setSelectedThreatIndex(index);

    if (viewMode === "globe" && globeEl.current) {
      globeEl.current.pointOfView({
        lat: threat.geo_lat,
        lng: threat.geo_long,
        altitude: 0.8
      }, 1500);
    }
    // For 2D map, the selectedThreatIndex prop handles highlighting
  };

  return (
    <div className="h-screen flex flex-col p-6 bg-[#020617]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Global Threat Map</h1>
          <p className="text-slate-400 text-sm">Real-time visualization of cyber attacks.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => { setViewMode("globe"); setSelectedThreatIndex(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "globe"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              3D Globe
            </button>
            <button
              onClick={() => { setViewMode("map"); setSelectedThreatIndex(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "map"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              2D Map
            </button>
          </div>
          <Badge variant="danger" className="animate-pulse">Live Tracking Active</Badge>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Map Visualization Area */}
        <Card className="flex-1 bg-[#08070e] border-[#1a0505] relative overflow-hidden p-0 min-h-[500px]">
          {viewMode === "globe" ? (
            <div className="absolute inset-0 w-full h-full cursor-move z-10 flex items-center justify-center">
              <GlobeGL
                ref={globeEl}
                backgroundColor='#08070e'
                rendererConfig={{ antialias: true, alpha: true }}
                globeMaterial={
                  new THREE.MeshPhongMaterial({
                    color: '#1a2033',
                    opacity: 0.95,
                    transparent: true,
                  })
                }
                atmosphereColor='#5784a7'
                atmosphereAltitude={0.5}
                
                pointsMerge={false}
                pointsData={globeData}
                pointLat="lat"
                pointLng="lng"
                pointAltitude={0.01}
                pointRadius={0.2}
                pointResolution={5}
                pointColor={() => '#eed31f'}
                pointLabel="label"

                arcsData={globeData.map(d => ({
                  startLat: d.lat,
                  startLng: d.lng,
                  endLat: 31.5204,
                  endLng: 74.3587,
                  time: Math.floor(Math.random() * (4000 - 1000 + 1) + 1000),
                  color: ['#ffffff00', '#faf7e6', '#ffffff00'],
                }))}
                arcAltitudeAutoScale={0.3}
                arcColor='color'
                arcStroke={0.5}
                arcDashGap={2}
                arcDashAnimateTime='time'

                polygonsData={landTopology ? topojson.feature(landTopology, landTopology.objects.land).features : []}
                polygonSideColor={() => '#00000000'}
                polygonCapMaterial={
                  new THREE.MeshPhongMaterial({
                    color: '#49ac8f',
                    side: THREE.DoubleSide,
                  })
                }
                polygonAltitude={0.01}

                customLayerData={[...Array(500).keys()].map(() => ({
                  lat: (Math.random() - 1) * 360,
                  lng: (Math.random() - 1) * 360,
                  altitude: Math.random() * 2,
                  size: Math.random() * 0.4,
                  color: '#faadfd',
                }))}
                customThreeObject={(sliceData) => {
                  const { size, color } = sliceData;
                  return new THREE.Mesh(new THREE.SphereGeometry(size), new THREE.MeshBasicMaterial({ color }));
                }}
                customThreeObjectUpdate={(obj, sliceData) => {
                  const { lat, lng, altitude } = sliceData;
                  return Object.assign(obj.position, globeEl.current?.getCoords(lat, lng, altitude));
                }}

                htmlElementsData={[{ lat: 31.5204, lng: 74.3587 }]}
                htmlElement={d => {
                  const el = document.createElement('div');
                  el.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#38bdf8" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 8px rgba(56, 189, 248, 0.8));">
                      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                      <circle cx="12" cy="10" r="3" fill="white"></circle>
                    </svg>
                  `;
                  el.style.transform = 'translate(-50%, -100%)';
                  el.style.pointerEvents = 'none';
                  return el;
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <ThreatMap2D
                threats={threats}
                topology={landTopology}
                onThreatClick={handleThreatCardClick}
                selectedThreatIndex={selectedThreatIndex}
              />
            </div>
          )}
        </Card>

        {/* Live Threat Feed */}
        <Card className="w-full lg:w-96 bg-slate-900/60 border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-white">Recent Threats Detected</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center text-slate-500 py-4">Loading active threats...</div>
            ) : threats.length === 0 ? (
              <div className="text-center text-slate-500 py-4">No active threats detected.</div>
            ) : (
              threats.map((threat, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer ${
                    selectedThreatIndex === index
                      ? "bg-red-950/30 border-red-800/60 ring-1 ring-red-500/30"
                      : "bg-slate-950/50 border-slate-800/50 hover:border-slate-700"
                  }`}
                  onClick={() => handleThreatCardClick(index)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-red-400 text-sm font-medium">{threat.ip_address}</span>
                    <span className="text-xs text-slate-500">{new Date(threat.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {threat.country || 'Unknown Location'}
                    {threat.geo_lat && threat.geo_long && (
                      <span className="text-slate-600 ml-1">({threat.geo_lat.toFixed(2)}, {threat.geo_long.toFixed(2)})</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
