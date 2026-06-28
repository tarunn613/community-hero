import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import toast from "react-hot-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../AppContext";
import { getSector } from "../data/states";

export const Settings: React.FC = () => {
  const { user, userProfile, signOut, isGuest, fetchUserProfile, loginWithGoogle, updateProfilePicture } = useApp();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [updating, setUpdating]       = useState(false);

  useEffect(() => {
    if (userProfile?.displayName && userProfile.displayName !== "Civic Guardian") {
      setDisplayName(userProfile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [userProfile?.displayName, user?.displayName]);

  async function saveName() {
    if (!user || isGuest || !displayName.trim()) { toast.error("Name cannot be empty."); return; }
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: displayName.trim() });
      await fetchUserProfile(user.uid);
      toast.success("Display name updated.");
    } catch { toast.error("Failed to update."); }
    finally { setUpdating(false); }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdating(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        updateProfilePicture(dataUrl).finally(() => setUpdating(false));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  function clearCache() {
    if (window.confirm("Clear local app data? Your reports stay safe on the server.")) {
      try { sessionStorage.clear(); localStorage.clear(); toast.success("Cache cleared. Reloading…"); setTimeout(() => window.location.reload(), 700); }
      catch { toast.error("Failed to clear data."); }
    }
  }

  const displayedName = (userProfile?.displayName && userProfile.displayName !== "Civic Guardian")
    ? userProfile.displayName : (user?.displayName || (isGuest ? "Guest" : "Civic Guardian"));

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14">
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        <h1 className="font-bold text-[15px] text-on-surface">Profile & settings</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="cc-card p-4 flex items-center gap-4">
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <div 
            className={`relative group ${!isGuest ? 'cursor-pointer' : ''}`}
            onClick={() => !isGuest && fileInputRef.current?.click()}
          >
            {!isGuest && userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="avatar" className="w-14 h-14 rounded-full object-cover border border-outline-variant group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center group-hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[28px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
            )}
            {!isGuest && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-[20px]">edit</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-on-surface">{displayedName}</p>
            <p className="text-[12px] text-on-surface-variant truncate">
              {userProfile?.userId ? `@${userProfile.userId}` : (userProfile?.email || user?.email || (isGuest ? "Guest — not signed in" : ""))}
            </p>
            {!isGuest && (
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-on-surface-variant">{userProfile?.reportsCount || 0} reports</span>
                <span className="text-[11px] text-on-surface-variant">{userProfile?.resolvedCount || 0} resolved</span>
              </div>
            )}
          </div>
        </div>

        {/* Display name */}
        {!isGuest && (
          <div className="cc-card p-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-2">Display name</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1 h-10 bg-surface border border-outline-variant rounded-lg px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none transition-colors"
                placeholder="Enter full name"
              />
              <button
                onClick={saveName}
                disabled={updating}
                className="h-10 px-4 bg-primary-container text-on-primary text-[13px] font-semibold rounded-lg hover:bg-primary disabled:opacity-50 transition-colors"
              >
                {updating ? "…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Sector */}
        {userProfile?.sectorId && (
          <div className="cc-card p-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-outline mb-2">Home sector</p>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
              <p className="text-[13px] font-medium text-on-surface">
                {userProfile.sectorId.replace(/-/g," ").replace(/\b\w/g,(l)=>l.toUpperCase())}
              </p>
              <button onClick={() => navigate("/sectors")} className="ml-auto text-[12px] text-primary font-medium">Change</button>
            </div>
          </div>
        )}

        {/* Data & privacy */}
        <div className="cc-card overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wider font-semibold text-outline">Data & privacy</p>
          <div className="divide-y divide-outline-variant">
            <button
              onClick={clearCache}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">delete_sweep</span>
                <span className="text-[13px] text-on-surface">Clear local cache</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
            </button>
            {!isGuest && (
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-error">logout</span>
                  <span className="text-[13px] text-error font-medium">Sign out</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-error">chevron_right</span>
              </button>
            )}
            {isGuest && (
              <>
                <button
                  onClick={async () => { await loginWithGoogle(); }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">login</span>
                    <span className="text-[13px] text-primary font-medium">Sign in with Google</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-primary">chevron_right</span>
                </button>
                <button
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-error">logout</span>
                    <span className="text-[13px] text-error font-medium">Exit guest mode</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-error">chevron_right</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* App info */}
        <div className="text-center py-4">
          <p className="text-[11px] text-outline">Community Hero · v1.0 · Civic Clarity</p>
          <p className="text-[10px] text-outline mt-0.5">Built for the hackathon 🚀</p>
        </div>
      </main>
    </div>
  );
};
