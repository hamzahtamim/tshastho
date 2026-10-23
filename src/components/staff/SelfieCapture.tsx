"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, Check, Loader2, AlertCircle } from "lucide-react";

interface SelfieCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function SelfieCapture({ onCapture, onCancel }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const [captured, setCaptured] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: "user" | "environment" = "user") => {
    setLoading(true);
    setError("");

    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      // If component unmounted while getting stream, stop it
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Safely attempt play, ignore AbortError
        try {
          await video.play();
        } catch (playErr) {
          if (playErr.name !== "AbortError") {
            console.warn("Video play warning:", playErr);
          }
        }
      }
      if (mountedRef.current) setLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      if (mountedRef.current) {
        setError("Camera access denied. Please allow camera permission.");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    startCamera("user");

    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCaptured(dataUrl);
  };

  const handleRetake = () => {
    setCaptured(null);
  };

  const handleConfirm = () => {
    if (captured) {
      stopStream();
      onCapture(captured);
    }
  };

  const toggleFacing = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (!captured) startCamera(newMode);
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      <div className="h-16 bg-black/80 border-b border-white/10 flex items-center justify-between px-4">
        <button onClick={handleCancel} className="p-2 text-white">
          <X size={22} />
        </button>
        <h2 className="font-bold text-white text-sm">Take Selfie</h2>
        <button onClick={toggleFacing} className="p-2 text-white">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {captured ? (
          <img src={captured} alt="Selfie" className="w-full h-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={"w-full h-full object-cover " + (facingMode === "user" ? "scale-x-[-1]" : "")}
          />
        )}

        {loading && !captured && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-white mb-3" />
            <p className="text-white text-sm">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6">
            <AlertCircle size={48} className="text-red-500 mb-3" />
            <p className="text-white text-center text-sm mb-4">{error}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        )}

        {!captured && !loading && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-72 border-4 border-white/60 rounded-full border-dashed"></div>
            <p className="absolute bottom-8 text-white/90 text-xs bg-black/50 px-3 py-1 rounded-full">
              Position your face inside the circle
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="h-32 bg-black/90 border-t border-white/10 flex items-center justify-center gap-6">
        {!captured ? (
          <button
            onClick={handleCapture}
            disabled={loading || !!error}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-slate-400 shadow-lg disabled:opacity-50 active:scale-95 transition"
          >
            <Camera size={32} className="text-slate-800" />
          </button>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-white/30"
            >
              <RotateCcw size={24} className="text-white" />
            </button>
            <button
              onClick={handleConfirm}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center border-4 border-green-300 shadow-lg active:scale-95 transition"
            >
              <Check size={32} className="text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
