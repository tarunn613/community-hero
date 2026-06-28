import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { STATES, getState, getSector } from "../data/states";
import { useApp, db } from "../AppContext";
import { doc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export const SectorSelect: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, isGuest, fetchUserProfile } = useApp();

  const [stateId,  setStateId]  = useState("");
  const [sectorId, setSectorId] = useState("");

  const selectedState  = useMemo(() => (stateId ? getState(stateId) : undefined), [stateId]);
  const selectedSector = useMemo(() => (sectorId ? getSector(sectorId) : undefined), [sectorId]);

  async function handleContinue() {
    if (!sectorId) return;

    if (user && userProfile && !userProfile.sectorId) {
      try {
        await updateDoc(doc(db, "users", user.uid), { sectorId });
        await fetchUserProfile(user.uid);
        toast.success("Sector saved.");
        navigate("/home");
      } catch { toast.error("Could not save location."); }
      return;
    }

    if (isGuest && !localStorage.getItem("guest_sector")) {
      localStorage.setItem("guest_sector", sectorId);
      toast.success("Guest location saved.");
      navigate("/home");
      return;
    }

    navigate(`/sector/${sectorId}`);
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0">
        <button onClick={() => navigate("/home")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h1 className="text-[15px] font-bold text-on-surface">Location setup</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4">
        {/* Intro */}
        <div className="mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          </div>
          <h2 className="text-[20px] font-bold text-on-surface mb-1">Where do you live?</h2>
          <p className="text-[13px] text-on-surface-variant max-w-xs mx-auto">
            Select your sector to see local issues and connect to the right admin.
          </p>
        </div>

        {/* Selector card */}
        <div className="cc-card p-4 space-y-4 mb-4">
          {/* State */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-1.5 block" htmlFor="state">State</label>
            <div className="relative">
              <select
                id="state"
                value={stateId}
                onChange={(e) => { setStateId(e.target.value); setSectorId(""); }}
                className="select-field pr-9 text-[14px]"
              >
                <option value="" disabled>Select state…</option>
                {STATES.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.available}>
                    {s.name}{s.available ? "" : " — coming soon"}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-1.5 block" htmlFor="sector">Sector / District</label>
            <div className="relative">
              <select
                id="sector"
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                disabled={!selectedState}
                className="select-field pr-9 text-[14px] disabled:opacity-50"
              >
                <option value="" disabled>{selectedState ? "Select sector…" : "Select state first…"}</option>
                {selectedState?.sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Admin info */}
          {selectedSector && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/6 border border-primary/20">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Sector admin</p>
                <p className="text-[13px] font-bold text-on-surface truncate">{selectedSector.admin.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{selectedSector.admin.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Your location is only used to route issues to the right sector admin. You can change it later in settings.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="shrink-0 px-4 pb-6 pt-3 bg-surface border-t border-outline-variant">
        <button
          onClick={handleContinue}
          disabled={!sectorId}
          className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>View sector issues</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
