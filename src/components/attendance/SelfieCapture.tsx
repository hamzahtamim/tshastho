"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (blob: Blob, preview: string) => void;
  onClose: () => void;
}

export default function SelfieCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const previewUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPreview(previewUrl);
      onCapture(blob, previewUrl);
      stopCamera();
    }, "image/jpeg", 0.85);
  };

  const retake = () => {
    setPreview(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      <div className="bg-black/90 text-white p-4 flex items-center justify-between">
        <h2 className="font-bold">Take Selfie</h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative bg-black">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-6 py-2 rounded-xl">
              Close
            </button>
          </div>
        ) : preview ? (
          <img src={preview} alt="Selfie" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full max-w-full" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!error && (
        <div className="bg-black p-6 flex items-center justify-center gap-6">
          {preview ? (
            <>
              <button onClick={retake}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <RefreshCw size={22} className="text-white" />
              </button>
              <button onClick={() => { onClose(); }}
                className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle size={32} className="text-white" />
              </button>
            </>
          ) : (
            <button onClick={takeSnapshot}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white/40">
              <Camera size={32} className="text-black" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
