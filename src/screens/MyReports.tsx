import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { Report, ReportStatus } from "../types";
import { statusMeta, statusChipClass, statusStep } from "../lib/lifecycle";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

type Tab = "active" | "in_progress" | "resolved";

function bucketOf(status: ReportStatus): Tab {
  if (status === "resolved" || status === "verified" || status === "rejected") return "resolved";
  if (status === "in_review" || status === "in_progress") return "in_progress";
  if (status === "pending_verification") return "in_progress";
  return "active";
}

export const MyReports: React.FC = () => {
  const { user, isGuest, signOut } = useApp();
  const navigate = useNavigate();
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setTab]     = useState<Tab>("active");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchReports() {
    if (isGuest) { setLoading(false); return; }
    setLoading(true);
    try {
      const headers: Record<string,string> = {};
      if (user) { const t = await user.getIdToken(); if (t) headers["Authorization"] = `Bearer ${t}`; }
      const res = await fetch("/api/reports/user", { headers });
      if (res.ok) setReports(await res.json());
    } catch (e) {
      toast.error("Failed to fetch your reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, [user, isGuest]);

  function timeStr(ts: any) {
    if (!ts) return "";
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true }).replace("about ",""); }
    catch { return "recently"; }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "active",      label: "Active" },
    { key: "in_progress", label: "In progress" },
    { key: "resolved",    label: "Resolved" }
  ];
  const counts = { active: 0, in_progress: 0, resolved: 0 };
  reports.forEach((r) => counts[bucketOf(r.status)]++);
  const filtered = reports.filter((r) => bucketOf(r.status) === activeTab);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14">
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>format_list_bulleted</span>
        <h1 className="font-bold text-[15px] text-on-surface">My reports</h1>
      </header>

      <main className="px-4 py-4 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex border border-outline-variant rounded-xl overflow-hidden">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                i > 0 ? "border-l border-outline-variant" : ""
              } ${activeTab === t.key ? "bg-primary-container text-on-primary" : "bg-surface text-on-surface-variant hover:bg-surface-container-low"}`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 rounded-full ${activeTab === t.key ? "bg-on-primary/20 text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isGuest ? (
          <div className="cc-card p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">inbox</span>
            <p className="text-[13px] font-semibold text-on-surface">Guest account</p>
            <p className="text-[12px] text-on-surface-variant">Sign in with Google to track your reports.</p>
            <button onClick={async () => { await signOut(); navigate("/"); }} className="text-[12px] font-semibold text-primary bg-primary/8 py-1.5 px-4 rounded-lg border border-primary/20">
              Sign in
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1,2].map((n) => <div key={n} className="h-24 shimmer-skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="cc-card p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">inbox</span>
            <p className="text-[13px] font-semibold text-on-surface">No {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} reports</p>
            <button onClick={() => navigate("/report-select")} className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary text-[12px] font-semibold py-2 px-4 rounded-lg">
              <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
              Report an issue
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const meta = statusMeta(report.status);
              const chipCls = statusChipClass(report.status);
              const step = statusStep(report.status);
              const isOpen = expanded === report.reportId;
              return (
                <article key={report.reportId} className="cc-card overflow-hidden">
                  <div className="p-4 flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container border border-outline-variant">
                      <img
                        alt={report.issueType}
                        className="w-full h-full object-cover"
                        src={report.imageBase64?.startsWith("data:") ? report.imageBase64 : report.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=150"}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-semibold text-on-surface leading-tight">{report.issueType}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 ${chipCls}`}>
                          <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant truncate mt-0.5">{report.streetAddress}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-outline flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {timeStr(report.createdAt)}
                        </span>
                        <span className="text-[10px] font-mono text-outline bg-surface-container px-1.5 py-0.5 rounded">
                          {report.reportId.slice(0,8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="px-4 pb-3 border-t border-outline-variant pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Progress</span>
                      <button
                        onClick={() => setExpanded(isOpen ? null : report.reportId)}
                        className="text-[11px] text-primary font-medium flex items-center gap-0.5"
                      >
                        {isOpen ? "Collapse" : "Full view"}
                        <span className="material-symbols-outlined text-[12px]">{isOpen ? "expand_less" : "expand_more"}</span>
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        {[
                          { label: "Submitted", on: true },
                          { label: "Acknowledged", on: step >= 2 },
                          { label: "In progress", on: step >= 3 },
                          { label: "Resolved / Verified", on: step >= 4 }
                        ].map((s, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className={`mt-0.5 w-3 h-3 rounded-full shrink-0 border-2 ${s.on ? "bg-primary border-primary" : "bg-surface-container border-outline-variant"}`} />
                            <span className={`text-[12px] ${s.on ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>{s.label}</span>
                          </div>
                        ))}
                        {report.status === "pending_verification" && (
                          <div className="mt-1 p-2.5 rounded-lg border" style={{ backgroundColor: "#EEF0FF", borderColor: "#C5C8F5" }}>
                            <p className="text-[11px] font-semibold" style={{ color: "#3F3AA8" }}>Pending community verification</p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                              {(report.verificationCount || 0)}/3 confirmed · {report.disputeCount || 0} disputed
                            </p>
                          </div>
                        )}
                        {(report.status === "resolved" || report.status === "verified") && (report.resolutionProof || report.resolutionNote) && (
                          <div className="mt-1 p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex gap-2.5">
                            {report.resolutionProof && (
                              <img alt="proof" src={report.resolutionProof} className="w-12 h-12 rounded-md object-cover border border-outline-variant shrink-0" referrerPolicy="no-referrer" />
                            )}
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-primary">Resolution proof</p>
                              <p className="text-[11px] text-on-surface-variant">{report.resolutionNote || "Fixed by the sector team."}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {["Submitted","Ack'd","In progress","Resolved"].map((label, i) => (
                          <React.Fragment key={label}>
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${step > i ? "bg-primary" : "bg-surface-container-high"}`} />
                              <span className={`text-[10px] ${step > i ? "text-on-surface font-semibold" : "text-on-surface-variant/50"}`}>{label}</span>
                            </div>
                            {i < 3 && <span className="material-symbols-outlined text-[12px] text-outline-variant">chevron_right</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
