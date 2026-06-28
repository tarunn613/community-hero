import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const ISSUE_ICONS: Record<string, string> = {
  "Pothole": "road", "Water Leak": "water_drop", "Broken Streetlight": "lightbulb",
  "Garbage Dumping": "delete", "Damaged Road": "construction", "Fallen Tree": "park",
  "Blocked Drain": "water", "Other": "report_problem"
};

type StatKey = "open" | "in_progress" | "resolved";

// Dashboard status tiles — also act as quick filters for the list below.
const STAT_TILES: { key: StatKey; label: string; hint: string; icon: string; color: string }[] = [
  { key: "open",        label: "Open",        hint: "Needs action", icon: "error",        color: "#ba1a1a" },
  { key: "in_progress", label: "In progress", hint: "Being fixed",  icon: "engineering",  color: "#3c5ca6" },
  { key: "resolved",    label: "Solved",      hint: "Fixed",        icon: "task_alt",     color: "#0e7c5a" }
];

// Group a report status into one of the three dashboard buckets (matches the counts).
function statBucket(status: string): StatKey | "none" {
  if (status === "resolved" || status === "verified") return "resolved";
  if (status === "in_progress" || status === "in_review") return "in_progress";
  if (status === "rejected") return "none";
  return "open";
}

// Row status badge — collapses the granular lifecycle into the 3 dashboard buckets.
function rowChip(status: string): { label: string; icon: string; color: string } {
  const tile = STAT_TILES.find((t) => t.key === statBucket(status));
  return tile
    ? { label: tile.label, icon: tile.icon, color: tile.color }
    : { label: "Rejected", icon: "cancel", color: "#6e7a73" };
}

export const Home: React.FC = () => {
  const { user, userProfile, isGuest, setCapturedLocation } = useApp();
  const navigate = useNavigate();

  const [nearbyIssues, setNearbyIssues]   = useState<any[]>([]);
  const [loading, setLoading]              = useState(true);
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [pendingCount, setPendingCount]   = useState(0);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 });
  const [statFilter, setStatFilter] = useState<StatKey | "all">("all");

  useEffect(() => {
    if (!navigator.geolocation) { useDefaultLoc(); return; }
    
    let locationSet = false;
    const timeoutId = setTimeout(() => {
      if (!locationSet) {
        toast("Using default location. Please allow location access for better results.", { icon: "📍" });
        useDefaultLoc();
      }
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationSet = true;
        clearTimeout(timeoutId);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setCapturedLocation({ ...loc, accuracy: pos.coords.accuracy || 10 });
      },
      () => {
        locationSet = true;
        clearTimeout(timeoutId);
        useDefaultLoc();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    
    return () => clearTimeout(timeoutId);
  }, []);

  function useDefaultLoc() {
    const loc = { lat: 28.6139, lng: 77.2090 }; // Delhi
    setUserLocation(loc);
  }

  useEffect(() => { if (userLocation) fetchIssues(userLocation); }, [userLocation]);

  async function fetchIssues(loc: { lat: number; lng: number }) {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`/api/reports/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=5000`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      let rows: any[] = [];
      if (res.ok) {
        rows = await res.json();
      }

      setNearbyIssues(rows);
      const s = { open: 0, inProgress: 0, resolved: 0 };
      const pending = rows.filter((r) => r.status === "pending_verification").length;
      rows.forEach((r) => {
        if (r.status === "resolved" || r.status === "verified") s.resolved++;
        else if (r.status === "in_progress" || r.status === "in_review") s.inProgress++;
        else if (r.status !== "rejected") s.open++;
      });
      setStats(s);
      setPendingCount(pending);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.error("Fetch timeout");
        toast.error("Network timeout loading reports");
      } else {
        console.error(e);
        toast.error("Failed to load nearby reports");
      }
    } finally {
      setLoading(false);
    }
  }

  function distStr(lat: number, lng: number) {
    if (!userLocation) return "";
    const d = getDistance(userLocation.lat, userLocation.lng, lat, lng);
    return d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
  }

  function timeStr(createdAt: any) {
    if (!createdAt) return "";
    try {
      const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds*1000 : createdAt);
      return formatDistanceToNow(d, { addSuffix: true }).replace("about ", "");
    } catch { return "recently"; }
  }

  const isAdmin = userProfile?.role === "sector_admin" || userProfile?.role === "super_admin";

  const visibleIssues = statFilter === "all" ? nearbyIssues : nearbyIssues.filter((r) => statBucket(r.status) === statFilter);
  const activeTile = STAT_TILES.find((t) => t.key === statFilter);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="avatar" className="w-7 h-7 rounded-full object-cover border border-outline-variant" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
            </div>
          )}
          <span className="font-bold text-[15px] text-primary">Community Hero</span>
        </div>
        <div className="flex items-center gap-1 text-[13px] text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
          <span>{isGuest ? "Delhi" : (userProfile?.sectorId ? userProfile.sectorId.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase()) : "Delhi")}</span>
        </div>
      </header>

      <main className="px-4 py-4 flex flex-col gap-4">
        {/* Primary action */}
        <button
          onClick={() => navigate("/report-select")}
          className="w-full h-12 flex items-center justify-center gap-2 bg-primary-container text-on-primary rounded-xl font-semibold text-[14px] hover:bg-primary active:scale-[0.98] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>camera_alt</span>
          Report an issue
        </button>

        {/* Status summary — each tile is a quick filter for the list below */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">touch_app</span>
              Tap a status to filter
            </p>
            {statFilter !== "all" && (
              <button onClick={() => setStatFilter("all")} className="text-[11px] font-semibold text-primary flex items-center gap-0.5 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[13px]">close</span>
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {STAT_TILES.map((t) => {
              const val = t.key === "open" ? stats.open : t.key === "in_progress" ? stats.inProgress : stats.resolved;
              const active = statFilter === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setStatFilter(active ? "all" : t.key)}
                  aria-pressed={active}
                  aria-label={`${val} ${t.label} reports — ${t.hint}`}
                  className="cc-card p-3 flex flex-col items-center gap-1 text-center transition-all active:scale-95 hover:bg-surface-container-low"
                  style={active ? { borderColor: t.color, backgroundColor: `${t.color}12`, boxShadow: `inset 0 0 0 1.5px ${t.color}` } : undefined}
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.color}1f` }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: t.color, fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  </span>
                  <span className="text-[20px] font-bold leading-none" style={{ color: t.color }}>{val}</span>
                  <span className="text-[11px] font-semibold text-on-surface leading-none">{t.label}</span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Verify fixes entry — shown when pending reports exist */}
        {pendingCount > 0 && (
          <button
            onClick={() => navigate("/verify")}
            className="cc-card p-3 flex items-center gap-3 w-full text-left hover:bg-surface-container-low active:scale-[0.99] transition-all"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EEF0FF" }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#3F3AA8" }}>verified</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-on-surface">Help verify fixes</p>
              <p className="text-[12px] text-on-surface-variant">{pendingCount} nearby issue{pendingCount !== 1 ? "s" : ""} need your confirmation</p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
          </button>
        )}

        {/* Admin console shortcut */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="cc-card p-3 flex items-center gap-3 w-full text-left hover:bg-surface-container-low active:scale-[0.99] transition-all border-l-[3px] border-l-primary"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-on-surface">Admin console</p>
              <p className="text-[12px] text-on-surface-variant">Manage reports for your sector</p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
          </button>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-2 mt-1">
          <h2 className="text-[15px] font-bold text-on-surface flex items-center gap-1.5">
            {activeTile && (
              <span className="material-symbols-outlined text-[16px]" style={{ color: activeTile.color, fontVariationSettings: "'FILL' 1" }}>{activeTile.icon}</span>
            )}
            {statFilter === "all" ? "Reports near you" : `${activeTile?.label} reports`}
            {statFilter !== "all" && <span className="text-[12px] font-semibold text-on-surface-variant">({visibleIssues.length})</span>}
          </h2>
          <button onClick={() => navigate("/map")} className="text-[12px] text-primary font-medium flex items-center gap-0.5">
            View map <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        {/* Issue list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((n) => (
              <div key={n} className="h-16 shimmer-skeleton rounded-xl" />
            ))}
          </div>
        ) : nearbyIssues.length === 0 ? (
          <div className="cc-card p-8 text-center">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">inbox</span>
            <p className="text-[13px] text-on-surface-variant mt-2">No reports found nearby.</p>
          </div>
        ) : visibleIssues.length === 0 ? (
          <div className="cc-card p-6 text-center">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant">filter_alt_off</span>
            <p className="text-[13px] text-on-surface-variant mt-1">No {activeTile?.label.toLowerCase()} reports nearby.</p>
            <button onClick={() => setStatFilter("all")} className="text-[12px] text-primary font-semibold mt-1.5">Show all reports</button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant/50">
            {visibleIssues.slice(0, 20).map((issue) => {
              const chip = rowChip(issue.status);
              const icon = ISSUE_ICONS[issue.issueType] || "report_problem";
              return (
                <button
                  key={issue.reportId}
                  onClick={() => navigate(`/report/${issue.reportId}`)}
                  className="py-3 flex items-center gap-3 w-full text-left hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-on-surface truncate">{issue.issueType}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">{issue.streetAddress}</p>
                    <p className="text-[11px] text-outline mt-0.5">
                      {issue.severity >= 4 ? "High" : issue.severity === 3 ? "Medium" : "Low"} · {timeStr(issue.createdAt)}
                      {issue.corroborationCount ? ` · ${issue.corroborationCount} confirmed` : ""}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shrink-0 border"
                    style={{ backgroundColor: `${chip.color}14`, color: chip.color, borderColor: `${chip.color}33` }}
                  >
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{chip.icon}</span>
                    {chip.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sectors explorer */}
        <button
          onClick={() => navigate("/sectors")}
          className="cc-card p-3 flex items-center gap-3 w-full text-left hover:bg-surface-container-low active:scale-[0.99] transition-all mt-1"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-on-surface">Explore by sector</p>
            <p className="text-[12px] text-on-surface-variant">View issues across Delhi districts</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
        </button>
      </main>
    </div>
  );
};
