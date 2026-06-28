import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from "react-leaflet";
import L from "leaflet";
import { getSector } from "../data/states";
import { Report } from "../types";
import { statusMeta, statusChipClass } from "../lib/lifecycle";
import toast from "react-hot-toast";

const ISSUE_TYPES = ["Pothole","Water Leak","Broken Streetlight","Garbage Dumping","Damaged Road","Fallen Tree","Blocked Drain","Other"];

const pinColor = (severity: number, status: string) => {
  if (status === "verified" || status === "resolved") return "#006145";
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

export const SectorIssues: React.FC = () => {
  const { sectorId } = useParams<{ sectorId: string }>();
  const navigate     = useNavigate();
  const sector       = useMemo(() => (sectorId ? getSector(sectorId) : undefined), [sectorId]);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState(sector?.admin.name || "Loading...");
  const [category, setCategory] = useState("all");
  const [status,   setStatus]   = useState("all");
  const [severity, setSeverity] = useState("all");

  useEffect(() => {
    if (!sector) { setLoading(false); return; }
    setLoading(true);
    setAdminName(sector.admin.name); // fallback while loading
    
    // Fetch registered admin name
    fetch(`/api/sectors/${sector.id}/admin`)
      .then((r) => r.ok ? r.json() : { name: sector.admin.name })
      .then((d) => setAdminName(d.name))
      .catch(() => setAdminName(sector.admin.name));

    // Fetch reports
    fetch("/api/reports/sector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectorId: sector.id }) })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => setReports(d))
      .catch(() => toast.error("Failed to load sector issues."))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  const filtered = useMemo(() => reports.filter((r) => {
    if (category !== "all" && r.issueType !== category) return false;
    if (status   !== "all" && r.status    !== status)   return false;
    if (severity === "high"   && r.severity < 4)   return false;
    if (severity === "medium" && r.severity !== 3)  return false;
    if (severity === "low"    && r.severity > 2)    return false;
    return true;
  }), [reports, category, status, severity]);

  const activeFilters = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (severity !== "all" ? 1 : 0);

  if (!sector) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <span className="material-symbols-outlined text-[40px] text-on-surface-variant">wrong_location</span>
      <p className="text-[13px] text-on-surface-variant">Unknown sector.</p>
      <button onClick={() => navigate("/sectors")} className="text-[12px] text-primary font-semibold bg-primary/10 px-4 py-2 rounded-full border border-primary/20">Back to selection</button>
    </div>
  );

  const b = sector.bounds;
  const leafletBounds: [[number,number],[number,number]] = [[b.south, b.west],[b.north, b.east]];

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0 z-50">
        <button onClick={() => navigate("/sectors")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold text-on-surface truncate">{sector.name}</h1>
          <p className="text-[11px] text-on-surface-variant truncate">Admin: {adminName}</p>
        </div>
        <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant">
          {filtered.length} issues
        </span>
      </header>

      {/* Filters */}
      <div className="shrink-0 bg-surface border-b border-outline-variant px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar z-40">
        <FilterPill label="Category" value={category} onChange={setCategory}>
          <option value="all">All categories</option>
          {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </FilterPill>
        <FilterPill label="Status" value={status} onChange={setStatus}>
          <option value="all">All statuses</option>
          <option value="reported">Reported</option>
          <option value="in_progress">In progress</option>
          <option value="pending_verification">Pending verify</option>
          <option value="verified">Verified</option>
          <option value="resolved">Resolved</option>
        </FilterPill>
        <FilterPill label="Severity" value={severity} onChange={setSeverity}>
          <option value="all">All severity</option>
          <option value="high">High (4–5)</option>
          <option value="medium">Medium (3)</option>
          <option value="low">Low (1–2)</option>
        </FilterPill>
        {activeFilters > 0 && (
          <button
            onClick={() => { setCategory("all"); setStatus("all"); setSeverity("all"); }}
            className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 whitespace-nowrap"
          >
            Reset ({activeFilters})
          </button>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative z-10">
        {loading && (
          <div className="absolute inset-0 bg-surface/90 z-30 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin" />
            <p className="text-[12px] text-on-surface-variant">Loading {sector.name}…</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-surface border border-outline-variant rounded-full px-4 py-2 text-[11px] text-on-surface-variant shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
            No issues match these filters
          </div>
        )}
        <MapContainer bounds={leafletBounds} scrollWheelZoom style={{ width: "100%", height: "100%", zIndex: 10 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <Rectangle bounds={leafletBounds} pathOptions={{ color: "#006145", weight: 1.5, fillColor: "#006145", fillOpacity: 0.04, dashArray: "6 8" }} />
          {filtered.map((r) => {
            const lat = (r.location as any)?.latitude  ?? r.lat;
            const lng = (r.location as any)?.longitude ?? r.lng;
            if (lat == null || lng == null) return null;
            const meta    = statusMeta(r.status);
            const chipCls = statusChipClass(r.status);
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
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-gray-700">{r.issueType}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${chipCls}`}>{r.status.replace(/_/g," ")}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-gray-800">{r.streetAddress}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                      <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-1 mt-1">Severity {r.severity}/5 · Priority {r.priorityScore}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

const FilterPill: React.FC<{ label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> =
  ({ label, value, onChange, children }) => {
    const active = value !== "all";
    return (
      <div className="relative shrink-0">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none rounded-full pl-3 pr-7 py-1.5 text-[11px] font-semibold border cursor-pointer transition-colors ${
            active ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface border-outline-variant text-on-surface-variant"
          }`}
        >
          {children}
        </select>
        <span className={`material-symbols-outlined text-[14px] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${active ? "text-primary" : "text-on-surface-variant"}`}>expand_more</span>
      </div>
    );
  };
