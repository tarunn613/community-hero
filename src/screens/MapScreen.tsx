import React, { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { HotspotCluster, Report } from "../types";
import toast from "react-hot-toast";
import { STATES, getState, getSector } from "../data/states";

const MapUpdater: React.FC<{ center: [number,number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 13, { animate: true, duration: 1.2 }); }, [center, map]);
  return null;
};

const pinColor = (severity: number, status: string) => {
  if (status === "resolved" || status === "verified") return "#006145";
  if (severity >= 4) return "#ba1a1a";
  if (severity === 3) return "#b45309";
  return "#3c5ca6";
};

const makeIcon = (severity: number, status: string) =>
  L.divIcon({
    html: `<div style="background:${pinColor(severity,status)};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

const clusterColor = (s: "resolved"|"mixed"|"open") =>
  s === "resolved" ? "#006145" : s === "mixed" ? "#b45309" : "#ba1a1a";

export const MapScreen: React.FC = () => {
  const { capturedLocation, userProfile } = useApp();

  const [reports,  setReports]  = useState<Report[]>([]);
  const [clusters, setClusters] = useState<HotspotCluster[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [stateId,  setStateId]  = useState("");
  const [sectorId, setSectorId] = useState("");
  const [center,   setCenter]   = useState<[number,number]>([28.6139, 77.2090]);
  const [currentGeoLoc, setCurrentGeoLoc] = useState<{lat: number; lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation && !capturedLocation && !currentGeoLoc && !sectorId) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentGeoLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, [capturedLocation, currentGeoLoc, sectorId]);

  async function fetchMapData() {
    setLoading(true);
    try {
      if (sectorId) {
        const sector = getSector(sectorId);
        if (sector) {
          setCenter([sector.center.lat, sector.center.lng]);
          const r = await fetch("/api/reports/sector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectorId }) });
          if (r.ok) setReports(await r.json());
        }
      } else {
        let lat = capturedLocation?.lat || currentGeoLoc?.lat;
        let lng = capturedLocation?.lng || currentGeoLoc?.lng;
        if (!lat || !lng) {
          const fallId = userProfile?.sectorId || localStorage.getItem("guest_sector");
          if (fallId) { const s = getSector(fallId); if (s) { lat = s.center.lat; lng = s.center.lng; } }
        }
        lat = lat || 28.6139; lng = lng || 77.2090;
        setCenter([lat, lng]);
        const r = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}&radius=10000`);
        if (r.ok) setReports(await r.json());
      }

      const cr = await fetch("/api/reports/clusters");
      if (cr.ok) {
        let cd: HotspotCluster[] = await cr.json();
        if (sectorId) {
          const sector = getSector(sectorId);
          if (sector) {
            const b = sector.bounds;
            cd = cd.filter((c) => c.centroid.lat <= b.north && c.centroid.lat >= b.south && c.centroid.lng <= b.east && c.centroid.lng >= b.west);
          }
        }
        setClusters(cd);
      }
    } catch {
      toast.error("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMapData(); }, [capturedLocation, sectorId, currentGeoLoc]);

  const selectedState = stateId ? getState(stateId) : undefined;

  return (
    <div className="flex-1 flex flex-col bg-background h-[100dvh] max-h-[100dvh] overflow-hidden pb-16">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0 z-[1000]">
        <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
        <h1 className="text-[15px] font-bold text-on-surface flex-1">Issue map</h1>
        <button
          onClick={fetchMapData}
          className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors"
          aria-label="Refresh"
        >
          <span className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin text-primary" : ""}`}>refresh</span>
        </button>
      </header>

      {/* Map area */}
      <div className="flex-1 relative z-10">
        {/* Overlay filter panel */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-xs z-[400] flex flex-col gap-2">
          <div className="relative">
            <select
              value={stateId}
              onChange={(e) => { setStateId(e.target.value); setSectorId(""); }}
              className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-semibold text-on-surface shadow-sm focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Nearby (location)</option>
              {STATES.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.available}>{s.name}{!s.available ? " — soon" : ""}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
          {stateId && (
            <div className="relative">
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-semibold text-on-surface shadow-sm focus:border-primary focus:outline-none transition-colors appearance-none"
              >
                <option value="">All sectors</option>
                {selectedState?.sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-surface/85 z-[500] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin" />
            <p className="text-[12px] text-on-surface-variant">Loading map data…</p>
          </div>
        )}

        <MapContainer center={center} zoom={14} scrollWheelZoom style={{ width: "100%", height: "100%", zIndex: 10 }} zoomControl={false}>
          <ZoomControl position="bottomright" />
          <MapUpdater center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {reports.map((r) => {
            const lat = (r.location as any)?.latitude ?? r.lat;
            const lng = (r.location as any)?.longitude ?? r.lng;
            if (!lat || !lng) return null;
            return (
              <Marker key={r.reportId} position={[lat, lng]} icon={makeIcon(r.severity, r.status)}>
                <Popup>
                  <div className="max-w-[200px] space-y-2">
                    <div className="aspect-video overflow-hidden rounded bg-gray-100">
                      <img alt={r.issueType} className="w-full h-full object-cover"
                        src={r.imageBase64?.startsWith("data:") ? r.imageBase64 : r.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=150"}
                        referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-700">{r.streetAddress}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                        <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{r.issueType}</span>
                        <span className="text-[9px] font-bold text-gray-500">P:{r.priorityScore}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {clusters.map((c, i) => (
            <React.Fragment key={i}>
              <Circle
                center={[c.centroid.lat, c.centroid.lng]}
                radius={300}
                pathOptions={{ fillColor: clusterColor(c.colorStatus), fillOpacity: 0.12, color: clusterColor(c.colorStatus), weight: 1.5, dashArray: "4 6" }}
              />
              <Marker
                position={[c.centroid.lat, c.centroid.lng]}
                icon={L.divIcon({
                  html: `<div style="background:${clusterColor(c.colorStatus)};width:24px;height:24px;border-radius:50%;color:#fff;font-weight:700;font-size:10px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${c.count}</div>`,
                  className: "",
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              >
                <Popup>
                  <div className="space-y-1 text-[12px]">
                    <p className="font-bold text-gray-800">Hotspot cluster</p>
                    <p className="text-gray-600">{c.count} reports in this area</p>
                    <p className="text-gray-500">Type: {c.dominantIssueType}</p>
                    <p className="text-gray-500">Avg severity: {c.averageSeverity}/5</p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-surface border border-outline-variant rounded-full px-4 py-2 shadow-sm flex items-center gap-4 text-[10px] font-semibold text-on-surface-variant">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />Critical</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />Medium</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#006145]" />Resolved</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#ba1a1a] bg-transparent" />Zone</div>
        </div>
      </div>
    </div>
  );
};
