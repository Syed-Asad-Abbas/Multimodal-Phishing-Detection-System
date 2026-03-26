import React, { useState, useEffect } from "react";
import { Card, Badge } from "../components/ui/Primitives";
import { Globe, MapPin, ShieldAlert } from "lucide-react";
import api from "../services/api";
import GlobeGL from "react-globe.gl";

export default function ThreatMap() {
  const [threats, setThreats] = useState([]);
  const [globeData, setGlobeData] = useState([]);
  const [loading, setLoading] = useState(true);

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
            <div style="background: white; border: 1px solid #10b981; border-radius: 6px; padding: 10px 14px; color: #1e293b; font-family: monospace; font-size: 13px; min-width: 180px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              <div style="margin-bottom: 4px;"><span style="color: #64748b;">Loc:</span> ${t.country || 'Unknown'}</div>
              <div style="margin-bottom: 4px;"><span style="color: #64748b;">URL:</span> ${t.scan?.url || 'N/A'}</div>
              <div style="color: #ef4444; font-weight: bold; margin-top: 6px;">IP: ${t.ip_address}</div>
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

  const globeEl = React.useRef();

  useEffect(() => {
    // When the globe component is mounted, zoom out slightly to fit the whole globe
    if (globeEl.current) {
      globeEl.current.pointOfView({ altitude: 2.5 });
    }
  }, [globeData]);

  return (
    <div className="h-screen flex flex-col p-6 bg-[#020617]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Global Threat Map</h1>
          <p className="text-slate-400 text-sm">Real-time visualization of cyber attacks.</p>
        </div>
        <Badge variant="danger" className="animate-pulse">Live Tracking Active</Badge>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Map Visualization Area */}
        {/* Map Visualization Area */}
        <Card className="flex-1 bg-[#050505] border-[#1a0505] relative overflow-hidden p-0 min-h-[500px]">
          <div className="absolute inset-0 w-full h-full cursor-move z-10 flex items-center justify-center">
            <GlobeGL
              ref={globeEl}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              bumpImageUrl=""
              backgroundImageUrl=""
              showAtmosphere={true}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.15}

              // Points (Nodes)
              pointsData={globeData}
              pointLat="lat"
              pointLng="lng"
              pointColor={() => 'white'} // white points as per SS
              pointAltitude="size"
              pointRadius={0.4}
              pointLabel="label"

              // Background & Base
              backgroundColor="rgba(0,0,0,0)"

              // Hexagonal grid removed
              hexPolygonsData={[]}

              // Connection Arcs (Data streams targeting Lahore)
              arcsData={globeData.map(d => ({
                startLat: d.lat,
                startLng: d.lng,
                endLat: 31.5204, // Lahore, Pakistan Latitude
                endLng: 74.3587, // Lahore, Pakistan Longitude
                color: ['rgba(56, 189, 248, 0.1)', 'rgba(56, 189, 248, 0.8)'] // Blue arcs
              }))}
              arcColor="color"
              arcDashLength={0.4}
              arcDashGap={0.8}
              arcDashInitialGap={() => Math.random()}
              arcDashAnimateTime={1200} // Faster frequency

              // Actor Logo (Map Pin) for User in Lahore
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
                <div key={index} className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors">
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
