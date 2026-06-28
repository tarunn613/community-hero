import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { STATES, getSector } from "../data/states";
import { Report } from "../types";
import { statusMeta, statusChipClass, ACTIVE_STATUSES } from "../lib/lifecycle";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const DELHI = STATES.find((s) => s.id === "delhi")!;

export const AdminQueue: React.FC = () => {
  const { user, userProfile } = useApp();
  const navigate = useNavigate();

  const isAdmin = userProfile?.role === "sector_admin" || userProfile?.role === "super_admin";
  const isSuper = userProfile?.role === "super_admin";

  const [sectorId, setSectorId] = useState(userProfile?.sectorId || DELHI.sectors[0].id);
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  const sector = useMemo(() => getSector(sectorId), [sectorId]);

  useEffect(() => { if (userProfile && !isAdmin) navigate("/home", { replace: true }); }, [userProfile, isAdmin]);

  async function fetchQueue() {
    if (!sectorId) return;
    setLoading(true);
    try {
      const headers: Record<string,string> = {};
      if (user) { const t = await user.getIdToken(); if (t) headers["Authorization"] = `Bearer ${t}`; }
      const res = await fetch(`/api/admin/reports?sectorId=${encodeURIComponent(sectorId)}`, { headers });
      if (res.ok) setReports(await res.json());
      else if (res.status === 403) { toast.error("Not authorized for this sector."); setReports([]); }
      else toast.error("Failed to load queue.");
    } catch { toast.error("Connection error."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) fetchQueue(); }, [sectorId, isAdmin]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, pending: 0 };
    reports.forEach((r) => {
      if (r.status === "verified" || r.status === "resolved") c.resolved++;
      else if (r.status === "pending_verification") c.pending++;
      else if (r.status === "in_progress" || r.status === "in_review") c.in_progress++;
      else if (r.status === "reported" || r.status === "acknowledged") c.open++;
    });
    return c;
  }, [reports]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    if (filter === "open") return reports.filter((r) => r.status === "reported" || r.status === "acknowledged");
    if (filter === "working") return reports.filter((r) => r.status === "in_progress" || r.status === "in_review");
    if (filter === "verify") return reports.filter((r) => r.status === "pending_verification");
    if (filter === "done") return reports.filter((r) => r.status === "resolved" || r.status === "verified");
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  function timeStr(ts: any) {
    if (!ts) return "";
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts), { addSuffix: true }).replace("about ",""); }
    catch { return ""; }
  }

  if (!isAdmin) return null;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0">
        <button onClick={() => navigate("/home")} className="text-on-surface-variant hover:bg-surface-container-low transition-colors p-1.5 rounded-lg">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
            Admin console
          </h1>
          <p className="text-[11px] text-on-surface-variant truncate">{sector?.name} · {sector?.admin.name}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
          {isSuper ? "Super" : "Sector"}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Sector switcher (super admin) */}
        {isSuper && (
          <div className="relative">
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="select-field pr-8 text-[13px]"
            >
              {DELHI.sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
          </div>
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Open",     val: counts.open,        colorClass: "text-status-open" },
            { label: "Working",  val: counts.in_progress, colorClass: "text-secondary" },
            { label: "Verify",   val: counts.pending,     colorClass: "text-verify-pending-text" },
            { label: "Done",     val: counts.resolved,    colorClass: "text-status-resolved" }
          ].map(({ label, val, colorClass }) => (
            <div key={label} className="cc-card p-2.5 text-center">
              <p className={`text-[20px] font-bold ${colorClass}`}>{val}</p>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { k: "all",        label: "All" },
            { k: "open",       label: "Open" },
            { k: "working",    label: "Working" },
            { k: "verify",     label: "Verify" },
            { k: "done",       label: "Done" }
          ].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                filter === k
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-surface border-outline-variant text-on-surface-variant"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Queue */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((n) => <div key={n} className="h-20 shimmer-skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="cc-card p-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">inbox</span>
            <p className="text-[13px] text-on-surface-variant mt-2">No reports in this view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const meta   = statusMeta(r.status);
              const chipCls = statusChipClass(r.status);
              return (
                <button
                  key={r.reportId}
                  onClick={() => navigate(`/admin/report/${r.reportId}`)}
                  className="cc-card p-3 flex items-center gap-3 w-full text-left hover:bg-surface-container-low active:scale-[0.99] transition-all"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container border border-outline-variant">
                    <img
                      alt={r.issueType}
                      className="w-full h-full object-cover"
                      src={r.imageBase64?.startsWith("data:") ? r.imageBase64 : r.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=120"}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-on-surface truncate">{r.issueType}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${chipCls}`}>
                        <span className="material-symbols-outlined text-[11px]">{meta.icon}</span>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate">{r.streetAddress}</p>
                    <p className="text-[10px] text-outline mt-0.5">
                      Severity {r.severity}/5 · {timeStr(r.createdAt)}
                      {r.corroborationCount ? ` · ${r.corroborationCount} corroborated` : ""}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
