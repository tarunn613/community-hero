import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { Report } from "../types";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export const VerifyNearbyFixes: React.FC = () => {
  const { user, userProfile, isGuest } = useApp();
  const navigate = useNavigate();

  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [verifying, setVerifying]   = useState<Record<string, boolean>>({});
  const [verified, setVerified]     = useState<Record<string, boolean>>({});
  const [localCounts, setLocalCounts] = useState<Record<string, { confirm: number; dispute: number }>>({});

  async function getHeaders(): Promise<Record<string,string>> {
    const h: Record<string,string> = { "Content-Type": "application/json" };
    if (user) { const t = await user.getIdToken(); if (t) h["Authorization"] = `Bearer ${t}`; }
    return h;
  }

  useEffect(() => {
    async function fetch_() {
      try {
        const sectorId = userProfile?.sectorId || localStorage.getItem("guest_sector") || "";
        const params = new URLSearchParams();
        if (sectorId) params.set("sectorId", sectorId);
        const res = await fetch(`/api/reports/pending-verification?${params.toString()}`, { headers: await getHeaders() });
        if (res.ok) {
          const data: Report[] = await res.json();
          setReports(data);
          const counts: Record<string, { confirm: number; dispute: number }> = {};
          data.forEach((r) => { counts[r.reportId] = { confirm: r.verificationCount||0, dispute: r.disputeCount||0 }; });
          setLocalCounts(counts);
          if (user) {
            const already: Record<string, boolean> = {};
            data.forEach((r) => { if (r.verifications?.some((v) => v.uid === user.uid)) already[r.reportId] = true; });
            setVerified(already);
          }
        } else {
          toast.error("Failed to load pending reports.");
        }
      } catch { toast.error("Connection error."); }
      finally { setLoading(false); }
    }
    fetch_();
  }, [userProfile]);

  async function doVerify(reportId: string, confirmedFix: boolean) {
    if (isGuest) { toast.error("Sign in to verify."); return; }
    if (verified[reportId]) { toast("Already verified."); return; }
    setVerifying((v) => ({ ...v, [reportId]: true }));
    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ confirmedFix })
      });
      const data = await res.json();
      if (res.ok) {
        setVerified((v) => ({ ...v, [reportId]: true }));
        setLocalCounts((c) => ({
          ...c,
          [reportId]: {
            confirm: confirmedFix ? (c[reportId]?.confirm||0)+1 : (c[reportId]?.confirm||0),
            dispute: !confirmedFix ? (c[reportId]?.dispute||0)+1 : (c[reportId]?.dispute||0)
          }
        }));
        toast.success(confirmedFix ? "Fix confirmed! Thank you." : "Dispute recorded.");
        if (data.newStatus && data.newStatus !== "pending_verification") {
          setReports((r) => r.filter((x) => x.reportId !== reportId));
        }
      } else {
        toast.error(data.error || "Failed.");
      }
    } catch { toast.error("Network error."); }
    finally { setVerifying((v) => ({ ...v, [reportId]: false })); }
  }

  function timeStr(ts: any) {
    if (!ts) return "";
    try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts), { addSuffix: true }).replace("about ",""); }
    catch { return "recently"; }
  }

  const sectorLabel = userProfile?.sectorId
    ? userProfile.sectorId.replace(/-/g," ").replace(/\b\w/g,(l)=>l.toUpperCase())
    : "your area";

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-outline-variant flex items-center gap-2 px-4 h-14">
        <button onClick={() => navigate("/home")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="text-[14px] font-bold text-on-surface">Verify nearby fixes</h1>
        </div>
      </header>

      {/* Subtitle */}
      <section className="px-4 pt-4 pb-2">
        <p className="text-[13px] text-on-surface-variant">Help confirm issues marked fixed in {sectorLabel}.</p>
      </section>

      <main className="px-4 pb-4 flex flex-col gap-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((n) => <div key={n} className="h-32 shimmer-skeleton rounded-xl" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="cc-card p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">check_circle_outline</span>
            </div>
            <p className="text-[14px] font-semibold text-on-surface mb-1">Nothing to verify right now</p>
            <p className="text-[12px] text-on-surface-variant">Your community is up to date. Check back later.</p>
          </div>
        ) : (
          reports.map((report) => {
            const counts = localCounts[report.reportId] || { confirm: 0, dispute: 0 };
            const alreadyDone = verified[report.reportId];
            const busy = verifying[report.reportId];

            return (
              <article
                key={report.reportId}
                className="cc-card overflow-hidden"
                onClick={() => navigate(`/report/${report.reportId}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex p-4 gap-3">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container">
                    <img
                      alt={report.issueType}
                      className="w-full h-full object-cover"
                      src={report.imageBase64?.startsWith("data:") ? report.imageBase64 : report.imageBase64 || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=200"}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="inline-flex items-center self-start gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: "#EEF0FF", color: "#3F3AA8", border: "1px solid #C5C8F5" }}>
                      <span className="material-symbols-outlined text-[12px]">person_search</span>
                      Pending verification
                    </div>
                    <p className="text-[13px] font-semibold text-on-surface truncate">{report.issueType}</p>
                    <div className="flex items-center text-on-surface-variant gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span className="text-[12px] truncate">{report.streetAddress}</span>
                    </div>
                    <p className="text-[11px] text-outline">{timeStr(report.createdAt)}</p>
                  </div>
                </div>

                {/* Verification meter */}
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Verification progress</span>
                    <span className="text-[11px] text-primary font-semibold">{counts.confirm} of 3 confirmed</span>
                  </div>
                  <div className="verify-bar">
                    {[0,1,2].map((i) => (
                      <div key={i} className={`flex-1 h-1.5 ${i < counts.confirm ? "verify-seg-done" : "verify-seg-empty"}`} style={{ marginLeft: i > 0 ? "2px" : "0" }} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="px-4 pb-4 pt-2 flex gap-2 border-t border-outline-variant"
                  onClick={(e) => e.stopPropagation()}
                >
                  {alreadyDone ? (
                    <p className="text-[12px] text-on-surface-variant italic py-1">Verification submitted. Thank you!</p>
                  ) : (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => doVerify(report.reportId, true)}
                        className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-[#15803D] text-white rounded-lg text-[12px] font-semibold hover:bg-[#166534] disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Confirm fixed
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => doVerify(report.reportId, false)}
                        className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-amber-400 text-amber-700 bg-amber-50 rounded-lg text-[12px] font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Dispute
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
};
