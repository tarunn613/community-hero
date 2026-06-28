import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useApp } from "../AppContext";

export const ReportSelect: React.FC = () => {
  const navigate      = useNavigate();
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const { setCapturedImage, setCapturedLocation } = useApp();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Processing image…");
    const reader  = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img     = new Image();

      img.onload = () => {
        try {
          const maxEdge = 1024;
          let w = img.width, h = img.height;
          if (w > maxEdge || h > maxEdge) {
            if (w > h) { h = Math.round((h * maxEdge) / w); w = maxEdge; }
            else       { w = Math.round((w * maxEdge) / h); h = maxEdge; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            setCapturedImage(dataUrl);
          }
        } catch {
          setCapturedImage(dataUrl);
        }
        if (!navigator.geolocation) {
          toast.dismiss(toastId);
          toast.error("Geolocation is not supported.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCapturedLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
            toast.dismiss(toastId);
            navigate("/analysis");
          },
          () => {
            toast.dismiss(toastId);
            toast.error("Please turn on location to submit a report.");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };

      img.onerror = () => {
        toast.dismiss(toastId);
        toast.error("Failed to load image.");
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      toast.dismiss(toastId);
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14 shrink-0">
        <button onClick={() => navigate("/home")} className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h1 className="text-[15px] font-bold text-on-surface">Report an issue</h1>
      </header>

      <main className="flex-1 flex flex-col justify-center px-4 pb-8 gap-4">
        <div className="text-center mb-2">
          <p className="text-[13px] text-on-surface-variant">Select how to document the civic issue.</p>
        </div>

        {/* Take photo */}
        <button
          onClick={() => navigate("/capture")}
          className="cc-card p-5 flex items-center gap-4 text-left hover:bg-surface-container-low active:scale-[0.98] transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-on-surface">Take a photo</h2>
            <p className="text-[12px] text-on-surface-variant mt-0.5">Capture the issue in real-time with AI analysis.</p>
          </div>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant ml-auto">chevron_right</span>
        </button>

        {/* Gallery */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="cc-card p-5 flex items-center gap-4 text-left hover:bg-surface-container-low active:scale-[0.98] transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>photo_library</span>
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-on-surface">Choose from gallery</h2>
            <p className="text-[12px] text-on-surface-variant mt-0.5">Upload an existing photo from your device.</p>
          </div>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant ml-auto">chevron_right</span>
        </button>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        {/* AI note */}
        <div className="flex items-center justify-center gap-2 mt-2 text-[12px] text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
          <span>Photo will be auto-analyzed by Gemini AI</span>
        </div>
      </main>
    </div>
  );
};
