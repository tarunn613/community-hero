import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import toast from "react-hot-toast";

export const Capture: React.FC = () => {
  const { setCapturedImage, setCapturedLocation, capturedLocation } = useApp();
  const navigate = useNavigate();

  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const fileInputRef  = useRef<HTMLInputElement | null>(null);

  const [hasCamera,  setHasCamera]  = useState(true);
  const [gpsStatus,  setGpsStatus]  = useState<"getting"|"locked"|"error">("getting");
  const [facingMode, setFacingMode] = useState<"environment"|"user">("environment");

  const locationRef = useRef<{lat: number, lng: number, accuracy: number} | null>(null);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setGpsStatus(prev => {
            const next = pos.coords.accuracy < 50 ? "locked" : "getting";
            return prev === next ? prev : next;
          });
        },
        () => setGpsStatus("error"),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("error");
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  useEffect(() => {
    let isMounted = true;
    stopCamera();
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no mediaDevices");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasCamera(true);
      } catch {
        if (isMounted) setHasCamera(false);
      }
    })();
    return () => { 
      isMounted = false;
      stopCamera(); 
    };
  }, [facingMode]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function processAndGo(src: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
    if (!locationRef.current) {
      toast.error("Please turn on location to submit a report.");
      return;
    }
    setCapturedLocation(locationRef.current);

    if (src instanceof HTMLImageElement && src.src.startsWith("http")) {
      setCapturedImage(src.src);
      stopCamera(); navigate("/analysis"); return;
    }
    try {
      const maxEdge = 1024;
      let tw = w, th = h;
      if (tw > maxEdge || th > maxEdge) {
        if (tw > th) { th = Math.round((th * maxEdge) / tw); tw = maxEdge; }
        else         { tw = Math.round((tw * maxEdge) / th); th = maxEdge; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = tw; canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(src, 0, 0, tw, th); setCapturedImage(canvas.toDataURL("image/jpeg", 0.85)); }
      stopCamera(); navigate("/analysis");
    } catch {
      if (src instanceof HTMLImageElement) { setCapturedImage(src.src); stopCamera(); navigate("/analysis"); }
      else { toast.error("Failed to capture image."); }
    }
  }

  function handleShutter() {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasCamera && videoRef.current) {
      const v = videoRef.current;
      processAndGo(v, v.videoWidth || 640, v.videoHeight || 480);
    } else {
      const toastId = toast.loading("Loading sample image…");
      const mockUrl = import.meta.env.VITE_MOCK_CAPTURE_URL || "/mock-capture-sample.jpg";
      setTimeout(() => {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { toast.dismiss(toastId); processAndGo(img, img.width, img.height); };
        img.onerror = () => { 
          toast.dismiss(toastId); 
          if (!locationRef.current) {
            toast.error("Please turn on location to submit a report.");
            return;
          }
          setCapturedLocation(locationRef.current);
          setCapturedImage(mockUrl); 
          navigate("/analysis"); 
        };
        img.src = mockUrl;
      }, 1200);
    }
  }

  function handleGallerySelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => processAndGo(img, img.width, img.height);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(files[0]);
  }

  const gpsColor = gpsStatus === "locked" ? "#006145" : gpsStatus === "getting" ? "#b45309" : "#ba1a1a";
  const gpsLabel = gpsStatus === "locked" ? "GPS locked" : gpsStatus === "getting" ? "Getting GPS…" : "GPS error";

  return (
    <div className="bg-background h-screen w-screen overflow-hidden relative flex flex-col">
      {/* Camera / mock viewfinder */}
      <div className="absolute inset-0 z-0 bg-[#0a0e0b] flex items-center justify-center">
        {hasCamera ? (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-75"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800')" }}
          />
        )}
        {/* Scan line animation on mock */}
        {!hasCamera && (
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-primary/40 animate-pulse z-10" />
        )}
      </div>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-5 pt-10 pb-4">
        <button
          onClick={() => { stopCamera(); navigate("/report-select"); }}
          className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm hover:bg-black/70 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: gpsColor }} />
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">{gpsLabel}</span>
        </div>

        <button
          onClick={() => setFacingMode((p) => (p === "environment" ? "user" : "environment"))}
          className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm hover:bg-black/70 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
        </button>
      </div>

      {/* Viewfinder guide */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="w-3/4 max-w-xs aspect-square relative">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-primary rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-primary rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-primary rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-primary rounded-br-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px bg-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-white/30" />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-10">
        <div className="bg-black/60 backdrop-blur-md rounded-3xl p-5 max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            {/* Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">photo_library</span>
            </button>

            {/* Shutter */}
            <button
              onClick={handleShutter}
              className="w-20 h-20 rounded-full border-[3px] border-primary flex items-center justify-center bg-white/10 backdrop-blur-sm active:scale-90 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
              </div>
            </button>

            {/* AI badge */}
            <div className="w-14 h-14 flex flex-col items-center justify-center gap-1">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="text-[9px] text-white/70 font-semibold text-center leading-tight">AI<br/>analysis</span>
            </div>
          </div>
        </div>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleGallerySelected} className="hidden" />
    </div>
  );
};
