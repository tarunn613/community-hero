import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

const markerIcon = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const markerShadow = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
L.Marker.prototype.options.icon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

export const Analysis: React.FC = () => {
  const { user, capturedImage, capturedLocation, analysisResult, setAnalysisResult, clearCapture, userProfile } = useApp();
  const navigate = useNavigate();

  const [loading,     setLoading]     = useState(true);
  const [loadingStep, setLoadingStep] = useState("Analyzing image…");
  const [description, setDescription] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const [locality, setLocality] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [exactLocation, setExactLocation] = useState("");

  const userSectorId = userProfile?.sectorId || localStorage.getItem("guest_sector") || "";
  const userStateId = userSectorId ? "delhi" : ""; // Everything is in Delhi for now
  const sectorName = userSectorId ? userSectorId.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase()) : "Unknown Sector";

  useEffect(() => {
    if (!capturedImage) {
      toast.error("No image found. Please capture one.");
      navigate("/capture");
      return;
    }

    const steps = [
      "Reading image features…",
      "Identifying infrastructure defects…",
      "Evaluating severity index…",
      "Reverse-geocoding location…",
      "Checking for duplicates…",
      "Synthesizing civic priority metrics…"
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) { setLoadingStep(steps[idx]); idx++; }
    }, 1400);

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: capturedImage,
            location: capturedLocation
          })
        });

        if (res.ok) {
          const data = await res.json();
          setAnalysisResult(data);
          setDescription(data.description || "");
        } else {
          toast.error("AI analysis failed. Using fallback.");
          const fallback = {
            issueType: "Pothole",
            severity: 4,
            description: "Large pothole causing road damage and posing a safety hazard.",
            confidence: 0.92,
            suggestedCategory: "Road Damage",
            streetAddress: "Connaught Place, New Delhi",
            lat: capturedLocation?.lat,
            lng: capturedLocation?.lng,
            duplicateCount: 0,
            duplicateOf: null,
            priorityScore: 78,
            embeddingVector: []
          };
          setAnalysisResult(fallback);
          setDescription(fallback.description);
        }
      } catch {
        toast.error("Connection error. Using offline fallback.");
        const fallback = {
          issueType: "Pothole",
          severity: 4,
          description: "Large pothole causing road damage and posing a safety hazard.",
          confidence: 0.92,
          suggestedCategory: "Road Damage",
          streetAddress: "Connaught Place, New Delhi",
          lat: capturedLocation?.lat,
          lng: capturedLocation?.lng,
          duplicateCount: 0,
          duplicateOf: null,
          priorityScore: 78,
          embeddingVector: []
        };
        setAnalysisResult(fallback);
        setDescription(fallback.description);
      } finally {
        clearInterval(interval);
        setLoading(false);
      }
    })();

    return () => clearInterval(interval);
  }, [capturedImage]);

  async function handleSubmit() {
    if (!analysisResult) return;
    setSubmitting(true);

    const headers: Record<string,string> = { "Content-Type": "application/json" };
    try {
      if (user) { const t = await user.getIdToken(); if (t) headers["Authorization"] = `Bearer ${t}`; }
    } catch { /* guest fallback */ }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          ...analysisResult, 
          description, 
          imageBase64: capturedImage, 
          accuracy: capturedLocation?.accuracy || 10,
          locality,
          landmark,
          pincode,
          exactLocation,
          stateId: userStateId,
          sectorId: userSectorId
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Report submitted! TRK-#${data.reportId.slice(0,6).toUpperCase()}`, { duration: 3000 });
        setTimeout(() => { navigate("/home"); setTimeout(() => clearCapture(), 100); }, 1500);
      } else {
        toast.error("Failed to submit. Please retry.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin" />
        <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div>
        <h3 className="text-[16px] font-bold text-on-surface mb-1">Gemini is analyzing…</h3>
        <p className="text-[12px] text-on-surface-variant animate-pulse">{loadingStep}</p>
      </div>
    </div>
  );

  const result = analysisResult;
  if (!result) return null;

  const severityLabel = result.severity >= 5 ? "Critical" : result.severity === 4 ? "High" : result.severity === 3 ? "Medium" : "Low";
  const severityCls = result.severity >= 4
    ? "bg-status-open/10 text-status-open border border-status-open/20"
    : result.severity === 3
      ? "bg-status-progress/10 text-status-progress border border-status-progress/20"
      : "bg-status-resolved/10 text-status-resolved border border-status-resolved/20";

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0 z-50">
        <button onClick={() => navigate("/capture")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <h1 className="text-[14px] font-bold text-on-surface">AI Analysis</h1>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${severityCls}`}>
          {severityLabel} severity
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Evidence photo */}
        <div className="w-full" style={{ paddingBottom: "56.25%", position: "relative" }}>
          <img
            alt="Captured issue"
            className="absolute inset-0 w-full h-full object-cover"
            src={capturedImage || "https://images.unsplash.com/photo-1594913785162-e67853fef3c2?auto=format&fit=crop&q=80&w=600"}
          />
        </div>

        <div className="px-4 pt-4 pb-4 space-y-3">
          {/* Main result card */}
          <div className="cc-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[20px] font-bold text-on-surface">{result.issueType}</h2>
                <p className="text-[12px] text-on-surface-variant mt-0.5">{result.suggestedCategory || "Civic Hazard"}</p>
              </div>
              <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${severityCls}`}>
                {severityLabel} · {result.severity}/5
              </div>
            </div>

            <div className="border-t border-outline-variant pt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-outline mb-0.5">Confidence</p>
                <p className="text-[14px] font-bold text-on-surface">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-outline mb-0.5">Priority score</p>
                <p className="text-[14px] font-bold text-on-surface">{result.priorityScore}/100</p>
              </div>
              {(result.duplicateCount || 0) > 0 && (
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-outline mb-0.5">Similar nearby</p>
                  <p className="text-[13px] font-semibold text-amber-700">{result.duplicateCount} related report{result.duplicateCount > 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="cc-card p-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-2">Description (editable)</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-[13px] text-on-surface resize-none focus:border-primary focus:outline-none transition-colors placeholder:text-outline"
              placeholder="Add specific details (optional)…"
            />
          </div>

          {/* Location + micro-map */}
          <div className="cc-card overflow-hidden">
            <div className="p-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-1.5">Detected location</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                <p className="text-[13px] font-medium text-on-surface">{result.streetAddress}</p>
              </div>
            </div>
            <div className="h-36 border-t border-outline-variant">
              <MapContainer
                center={[result.lat || 28.6139, result.lng || 77.2090]}
                zoom={15}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <Marker position={[result.lat || 28.6139, result.lng || 77.2090]} />
              </MapContainer>
            </div>
          </div>

          {/* Address Details UI (From Stitch Design) */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">Address Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-on-surface-variant">State</label>
                <select 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                  value={userStateId}
                  disabled
                >
                  <option value="delhi">Delhi (NCT)</option>
                  <option value="">Unknown State</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-on-surface-variant">Sector</label>
                <select 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                  value={userSectorId}
                  disabled
                >
                  {userSectorId ? <option value={userSectorId}>{sectorName}</option> : <option value="">Unknown Sector</option>}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-on-surface-variant">Locality</label>
              <input 
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                placeholder="Enter locality" 
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-on-surface-variant">Landmark</label>
                <input 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  placeholder="Nearby landmark" 
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-on-surface-variant">Pincode</label>
                <input 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  placeholder="6-digit pincode" 
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-on-surface-variant">Exact Location of Issue</label>
              <textarea 
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
                placeholder="Describe the exact spot (e.g., 'near the green gate')" 
                rows={2}
                value={exactLocation}
                onChange={(e) => setExactLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-surface border-t border-outline-variant z-50 flex gap-3">
        <button
          onClick={() => navigate("/capture")}
          disabled={submitting}
          className="flex-1 h-11 border border-outline-variant rounded-xl text-[13px] font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">replay</span>
          Retake
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-11 bg-primary-container text-on-primary rounded-xl text-[13px] font-bold hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <span className={`material-symbols-outlined text-[18px] ${submitting ? "animate-spin" : ""}`}>
            {submitting ? "progress_activity" : "send"}
          </span>
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
};
