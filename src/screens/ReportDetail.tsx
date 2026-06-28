import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { Report } from "../types";
import { statusMeta, statusChipClass } from "../lib/lifecycle";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isGuest } = useApp();
  const navigate = useNavigate();

  const [report, setReport]           = useState<Report | null>(null);
  const [loading, setLoading]         = useState(true);
  const [corroborating, setCorr]      = useState(false);
  const [hasCorroborated, setHasCorr] = useState(false);
  const [verifying, setVerifying]     = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [localCorrCount, setLocalCorrCount] = useState(0);
  const [localVerifyCount, setLocalVerifyCount] = useState(0);
  const [localDispute, setLocalDispute] = useState(0);

  async function getHeaders(): Promise<Record<string,string>> {
    const h: Record<string,string> = { "Content-Type": "application/json" };
    if (user) { const t = await user.getIdToken(); if (t) h["Authorization"] = `Bearer ${t}`; }
    return h;
  }

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`/api/reports/${id}`, { headers: await getHeaders() });
        if (res.ok) {
          const r: Report = await res.json();
          setReport(r);
          setLocalCorrCount(r.corroborationCount || 0);
          setLocalVerifyCount(r.verificationCount || 0);
          setLocalDispute(r.disputeCount || 0);
          if (user && r.corroborations?.some((c) => c.uid === user.uid)) setHasCorr(true);
          if (user && r.verifications?.some((v) => v.uid === user.uid)) setHasVerified(true);
        } else {
          toast.error("Report not found.");
        }
      } catch { toast.error("Failed to load report."); }
      finally { setLoading(false); }
    }
    fetch_();
  }, [id]);

  async function corroborate() {
    if (isGuest) { toast.error("Sign in to corroborate."); return; }
    if (hasCorroborated) { toast("You already confirmed this."); return; }
    setCorr(true);
    try {
      const res = await fetch(`/api/reports/${id}/corroborate`, { method: "POST", headers: await getHeaders() });
      const data = await res.json();
      if (res.ok && !data.alreadyCorroborated) {
        setHasCorr(true);
        setLocalCorrCount((n) => n + 1);
        toast.success("Confirmed! This boosts the report's priority.");
      } else if (data.alreadyCorroborated) {
        setHasCorr(true);
        toast("You already confirmed this report.");
      } else {
        toast.error(data.error || "Failed.");
      }
    } catch { toast.error("Network error."); }
    finally { setCorr(false); }
  }

  async function verify(confirmedFix: boolean) {
    if (isGuest) { toast.error("Sign in to verify."); return; }
    if (hasVerified) { toast("You already submitted a verification."); return; }
    setVerifying(true);
    try {
      const res = await fetch(`/api/reports/${id}/verify`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ confirmedFix })
      });
      const data = await res.json();
      if (res.ok) {
        setHasVerified(true);
        if (confirmedFix) { setLocalVerifyCount((n) => n + 1); toast.success("Thanks! Fix confirmed."); }
        else { setLocalDispute((n) => n + 1); toast.success("Reported — issue will be reviewed."); }
        if (data.newStatus && report) setReport({ ...report, status: data.newStatus });
      } else {
        toast.error(data.error || "Failed.");
      }
    } catch { toast.error("Network error."); }
    finally { setVerifying(false); }
  }

  function timeStr(ts: any) {
    if (!ts) return "";
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts), { addSuffix: true }).replace("about ",""); }
    catch { return "recently"; }
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

  const meta    = statusMeta(report.status);
  const chipCls = statusChipClass(report.status);
  const isPending = report.status === "pending_verification";
  const isVerified = report.status === "verified";
  const isOpen = !["resolved","pending_verification","verified","rejected"].includes(report.status);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-outline-variant flex items-center gap-2 px-4 h-14">
        <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h1 className="text-[14px] font-bold text-on-surface flex-1 truncate">Report detail</h1>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${chipCls}`}>
          <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
          {meta.label}
        </span>
      </header>

      {/* Evidence photo */}
      <div className="w-full" style={{ paddingBottom: "56.25%", position: "relative" }}>
        <img
          alt={report.issueType}
          className="absolute inset-0 w-full h-full object-cover"
          src={report.imageBase64?.startsWith("data:") ? report.imageBase64 : report.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=800"}
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Title & meta */}
        <div>
          <h2 className="text-[20px] font-bold text-on-surface leading-snug">{report.issueType}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${chipCls}`}>
              <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {report.streetAddress}
            </span>
          </div>
          {(report.locality || report.landmark || report.pincode) && (
            <p className="text-[12px] text-on-surface-variant mt-1.5">
              {[report.locality, report.landmark, report.pincode].filter(Boolean).join(", ")}
            </p>
          )}
          {report.exactLocation && (
            <p className="text-[12px] text-on-surface-variant italic mt-1">"{report.exactLocation}"</p>
          )}
          <p className="text-[13px] text-on-surface-variant mt-2 leading-relaxed">{report.description}</p>
          <p className="text-[11px] text-outline mt-1">{timeStr(report.createdAt)}</p>
        </div>

        {/* ── CORROBORATION — shown on open reports ── */}
        {isOpen && (
          <div className="cc-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">groups</span>
              <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface">Community corroboration</p>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-on-surface">{localCorrCount}</p>
                <p className="text-[12px] text-on-surface-variant">neighbours confirmed this</p>
              </div>
            </div>
            <button
              onClick={corroborate}
              disabled={corroborating || hasCorroborated || (user?.uid === report.reporterId)}
              className={`w-full h-10 flex items-center justify-center gap-2 rounded-full border text-[13px] font-semibold transition-all ${
                hasCorroborated || (user?.uid === report.reporterId)
                  ? "bg-primary/8 border-primary/30 text-primary cursor-default"
                  : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-primary/8 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" style={(hasCorroborated || (user?.uid === report.reporterId)) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {hasCorroborated ? "verified" : (user?.uid === report.reporterId) ? "person" : "thumb_up"}
              </span>
              {(user?.uid === report.reporterId) ? "You reported this" : hasCorroborated ? "You confirmed this" : corroborating ? "Confirming…" : "I see this too"}
            </button>
            <p className="text-[11px] text-on-surface-variant text-center mt-2">More confirmations raise this report's priority.</p>
          </div>
        )}

        {/* ── PENDING VERIFICATION — shown when admin marked resolved ── */}
        {isPending && (
          <div className="cc-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
              <span className="material-symbols-outlined text-[18px] text-primary">fact_check</span>
              <p className="text-[13px] font-semibold text-on-surface">Verify the fix</p>
            </div>
            {report.resolutionProof && (
              <img src={report.resolutionProof} alt="resolution proof" className="w-full h-40 object-cover border-b border-outline-variant" />
            )}
            <div className="p-4 bg-surface-container-lowest border-b border-outline-variant">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">admin_panel_settings</span>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Admin note</span>
              </div>
              <p className="text-[13px] text-on-surface">{report.resolutionNote || "Marked as resolved by the sector admin."}</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[14px] font-semibold text-on-surface text-center">Is this actually fixed?</p>
              {hasVerified ? (
                <div className="text-center py-3">
                  <p className="text-[13px] text-on-surface-variant">You've submitted your verification. Thank you!</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => verify(false)}
                    disabled={verifying}
                    className="flex-1 h-10 flex items-center justify-center gap-1.5 border border-amber-400 text-amber-700 bg-amber-50 rounded-lg text-[12px] font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Still a problem
                  </button>
                  <button
                    onClick={() => verify(true)}
                    disabled={verifying}
                    className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-[#15803D] text-white rounded-lg text-[12px] font-semibold hover:bg-[#166534] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Confirm fixed
                  </button>
                </div>
              )}
              {/* Verification meter */}
              <div className="space-y-1.5">
                <div className="verify-bar">
                  {[0,1,2].map((i) => (
                    <div key={i} className={`flex-1 h-1.5 ${i < localVerifyCount ? "verify-seg-done" : "verify-seg-empty"}`} style={{ marginLeft: i > 0 ? "2px" : "0" }} />
                  ))}
                </div>
                <p className="text-[11px] text-on-surface-variant text-center">{localVerifyCount} of 3 confirmations · {localDispute} disputed</p>
              </div>
              <p className="text-[11px] text-outline text-center">Verified fixes close automatically after 3 confirmations.</p>
            </div>
          </div>
        )}

        {/* ── VERIFIED — final state ── */}
        {isVerified && (
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: "#E7F4EC", borderColor: "#BBE2C9" }}>
            <span className="material-symbols-outlined text-[24px] mt-0.5" style={{ color: "#15803D", fontVariationSettings: "'FILL' 1" }}>verified</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: "#15803D" }}>Verified by the community</p>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                {localVerifyCount} neighbours confirmed this fix. Issue closed.
              </p>
            </div>
          </div>
        )}

        {/* Resolution proof for resolved (non-pending) */}
        {report.status === "resolved" && (report.resolutionProof || report.resolutionNote) && (
          <div className="cc-card p-4 flex gap-3">
            {report.resolutionProof && (
              <img src={report.resolutionProof} alt="proof" className="w-16 h-16 rounded-lg object-cover border border-outline-variant shrink-0" referrerPolicy="no-referrer" />
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">Resolution proof</p>
              <p className="text-[12px] text-on-surface-variant">{report.resolutionNote || "Fixed by sector team."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
