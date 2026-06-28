import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { Report, ReportStatus } from "../types";
import { allowedTransitions, actionLabel, statusMeta, statusChipClass } from "../lib/lifecycle";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const compress = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) { height = Math.round((height*max)/width); width = max; }
          else { width = Math.round((width*max)/height); height = max; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AdminReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useApp();
  const navigate = useNavigate();

  const [report, setReport]       = useState<Report | null>(null);
  const [loading, setLoading]     = useState(true);
  const [pendingTo, setPendingTo] = useState<ReportStatus | null>(null);
  const [note, setNote]           = useState("");
  const [proof, setProof]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function getHeaders(): Promise<Record<string,string>> {
    const h: Record<string,string> = { "Content-Type": "application/json" };
    if (user) { const t = await user.getIdToken(); if (t) h["Authorization"] = `Bearer ${t}`; }
    return h;
  }

  async function fetchReport() {
    try {
      const res = await fetch(`/api/reports/${id}`, { headers: await getHeaders() });
      if (res.ok) setReport(await res.json());
      else toast.error("Failed to load report.");
    } catch { toast.error("Connection error."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReport(); }, [id]);

  async function submit() {
    if (!pendingTo || !report) return;
    if (pendingTo === "pending_verification" && !proof) {
      toast.error("Attach a resolution proof photo before submitting."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${id}/transition`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ toStatus: pendingTo, note, proofImage: proof || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Status updated to "${statusMeta(pendingTo).label}"`);
        setReport((r) => r ? { ...r, status: pendingTo, resolutionProof: proof || r.resolutionProof, resolutionNote: note || r.resolutionNote } : r);
        setPendingTo(null); setNote(""); setProof("");
      } else {
        toast.error(data.error || "Transition failed.");
      }
    } catch { toast.error("Network error."); }
    finally { setSubmitting(false); }
  }

  function timeStr(ts: any) {
    if (!ts) return "";
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts), { addSuffix: true }).replace("about ",""); }
    catch { return ""; }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!report) return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <p className="text-on-surface-variant text-[13px]">Report not found.</p>
    </div>
  );

  const allowed = allowedTransitions(report.status);
  const meta    = statusMeta(report.status);
  const chipCls = statusChipClass(report.status);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-2 px-4 h-14 shrink-0">
        <button onClick={() => navigate("/admin")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h1 className="text-[14px] font-bold text-on-surface flex-1 truncate">
          {report.issueType}
        </h1>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${chipCls}`}>
          <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
          {meta.label}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Evidence photo */}
        <div className="w-full aspect-video bg-surface-container-high border-b border-outline-variant overflow-hidden">
          <img
            alt={report.issueType}
            className="w-full h-full object-cover"
            src={report.imageBase64?.startsWith("data:") ? report.imageBase64 : report.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=800"}
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Meta card */}
          <div className="cc-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">Location</p>
                <p className="text-[13px] text-on-surface">{report.streetAddress}</p>
                {(report.locality || report.landmark || report.pincode) && (
                  <p className="text-[12px] text-on-surface-variant mt-1">
                    {[report.locality, report.landmark, report.pincode].filter(Boolean).join(", ")}
                  </p>
                )}
                {report.exactLocation && (
                  <p className="text-[12px] text-on-surface-variant italic mt-1">"{report.exactLocation}"</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">Description</p>
                <p className="text-[12px] text-on-surface-variant">{report.description}</p>
              </div>
            </div>
            <div className="border-t border-outline-variant pt-3 flex gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">Severity</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${
                  report.severity >= 4 ? "bg-status-open/10 text-status-open border-status-open/20" : report.severity === 3 ? "bg-status-progress/10 text-status-progress border-status-progress/20" : "bg-status-resolved/10 text-status-resolved border-status-resolved/20"
                }`}>
                  {report.severity >= 4 ? "High" : report.severity === 3 ? "Medium" : "Low"} ({report.severity}/5)
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">Priority</p>
                <span className="text-[13px] font-bold text-on-surface">{report.priorityScore}/100</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">Reported</p>
                <span className="text-[12px] text-on-surface-variant">{timeStr(report.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Community Signal panel */}
          <div className="cc-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider font-bold text-outline">Community signal</p>
              <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[13px] text-on-surface-variant">group</span>
                <span className="text-[10px] text-on-surface-variant font-semibold">Active</span>
              </div>
            </div>
            {/* Corroboration count */}
            {(report.corroborationCount || 0) > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-primary">person_check</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">{report.corroborationCount} confirmed</p>
                  <p className="text-[11px] text-outline">Community corroboration</p>
                </div>
              </div>
            )}
            {/* Verification progress */}
            {report.status === "pending_verification" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-on-surface">Verification progress</p>
                  <span className="chip-pending-verification inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    <span className="material-symbols-outlined text-[11px]">person_search</span>
                    Pending
                  </span>
                </div>
                <div className="verify-bar">
                  {[0,1,2].map((i) => (
                    <div key={i} className={`flex-1 h-1.5 ${i < (report.verificationCount||0) ? "verify-seg-done" : "verify-seg-empty"}`} style={{ marginLeft: i > 0 ? "2px" : "0" }} />
                  ))}
                </div>
                <p className="text-[11px] text-on-surface-variant">{report.verificationCount||0} of 3 confirmed · {report.disputeCount||0} disputed</p>
              </div>
            )}
            {report.status === "verified" && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-verify-success-bg border-verify-success-border">
                <span className="material-symbols-outlined text-[18px] text-verify-success-text">verified</span>
                <p className="text-[12px] font-semibold text-verify-success-text">Verified by the community</p>
              </div>
            )}
            {(report.corroborationCount||0) === 0 && report.status !== "pending_verification" && report.status !== "verified" && (
              <p className="text-[12px] text-outline">No community signal yet.</p>
            )}
          </div>

          {/* Transition actions */}
          {allowed.length > 0 && (
            <div className="cc-card p-4 space-y-3">
              <p className="text-[13px] font-semibold text-on-surface">Update status</p>
              <div className="flex flex-wrap gap-2">
                {allowed.map((to) => (
                  <button
                    key={to}
                    onClick={() => setPendingTo(pendingTo === to ? null : to)}
                    className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${
                      pendingTo === to
                        ? "bg-primary-container text-on-primary border-primary-container"
                        : "bg-surface border-outline-variant text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    {actionLabel(report.status, to)}
                  </button>
                ))}
              </div>

              {pendingTo && (
                <div className="space-y-3 pt-1 border-t border-outline-variant">
                  <div>
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Admin note</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Add a note about this status change…"
                      className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-[13px] text-on-surface resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
                    />
                  </div>
                  {pendingTo === "pending_verification" && (
                    <div>
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">
                        Resolution proof photo <span className="text-error">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) { try { setProof(await compress(f)); } catch { toast.error("Could not process image."); } }
                        }}
                        className="w-full text-[12px] text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-outline-variant file:text-[12px] file:font-semibold file:bg-surface file:text-on-surface hover:file:bg-surface-container-low cursor-pointer"
                      />
                      {proof && <img src={proof} alt="proof" className="mt-2 h-24 rounded-lg object-cover border border-outline-variant" />}
                    </div>
                  )}
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="w-full h-10 bg-primary-container text-on-primary rounded-lg font-semibold text-[13px] hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Updating…" : `Confirm — ${actionLabel(report.status, pendingTo)}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolution proof */}
          {(report.resolutionProof || report.resolutionNote) && (
            <div className="cc-card p-4 flex gap-3">
              {report.resolutionProof && (
                <img src={report.resolutionProof} alt="proof" className="w-20 h-20 rounded-lg object-cover border border-outline-variant shrink-0" referrerPolicy="no-referrer" />
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">Resolution proof</p>
                <p className="text-[12px] text-on-surface-variant">{report.resolutionNote || "Fixed by sector team."}</p>
              </div>
            </div>
          )}

          {/* History timeline */}
          {(report.statusHistory?.length ?? 0) > 0 && (
            <div className="cc-card p-4">
              <h3 className="text-[13px] font-semibold text-on-surface border-b border-outline-variant pb-3 mb-3">History</h3>
              <div className="space-y-0">
                {[...(report.statusHistory || [])].reverse().map((ev, i) => {
                  const toMeta = statusMeta(ev.to);
                  return (
                    <div key={i} className="relative pl-5 pb-4 border-l border-outline-variant last:border-transparent last:pb-0">
                      <div className="absolute -left-[5px] top-0.5 w-2.5 h-2.5 rounded-full bg-primary-container border-2 border-background" />
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[12px] font-semibold text-on-surface capitalize">
                          {ev.from} → {ev.to}
                        </span>
                        <span className="text-[10px] text-outline">
                          {ev.at ? timeStr({ seconds: new Date(ev.at).getTime()/1000 }) : ""}
                        </span>
                      </div>
                      {ev.note && <p className="text-[11px] text-on-surface-variant">{ev.note}</p>}
                      {ev.byName && <p className="text-[10px] text-outline mt-0.5">By: {ev.byName}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
