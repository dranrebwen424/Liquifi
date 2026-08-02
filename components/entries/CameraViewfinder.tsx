"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Camera,
  Flashlight,
  Focus,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sun,
  SwitchCamera,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { analyzeFrame, interpret, type QualityHint } from "./camera-analysis";

type CameraViewfinderProps = {
  /** Called with the captured photo (JPEG File) — parent validates, previews, and closes the camera. */
  onCapture: (file: File) => void;
  /** Called when the user closes the viewfinder without capturing. */
  onClose: () => void;
  /** Called when the user taps "Use Photo Library" — parent opens its file input. */
  onUseLibrary: () => void;
};

type CameraStatus = "starting" | "active" | "error";

/** Map a failed getUserMedia call to a human message. */
function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    case "NotFoundError":
      return "No camera was found on this device. You can still use a photo from your library.";
    case "NotReadableError":
      return "The camera is being used by another app. Close it and try again.";
    default:
      return "The camera could not be started. You can still use a photo from your library.";
  }
}

/**
 * Full-screen in-app camera for receipt capture. Portaled to document.body so it
 * renders above LogEntryModal's motion.div shell (whose scale transform would
 * otherwise become the containing block for `position: fixed` descendants).
 */
export function CameraViewfinder({ onCapture, onClose, onUseLibrary }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shutterLockRef = useRef(false);
  const torchSupportedRef = useRef(false);
  const flashOnRef = useRef(false);
  const hintWindowRef = useRef<(string | null)[]>([]);
  const lastHintRef = useRef<QualityHint | null>(null);

  const [status, setStatus] = useState<CameraStatus>("starting");
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [activeHint, setActiveHint] = useState<QualityHint | null>(null);
  const [goodSamples, setGoodSamples] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (nextFacing: "environment" | "user") => {
      stopStream();
      setStatus("starting");
      setError("");

      // ponytail: bare {video:true} fallback for older iOS where facingMode is ignored — one retry per open/flip
      const attempts: MediaStreamConstraints[] = [
        {
          video: { facingMode: nextFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        },
        { video: true },
      ];
      let lastError: unknown = null;
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setFacing(nextFacing);
          setStatus("active");

          // Torch support is device-specific (absent on iOS) — probe the track, then reset flash/hints for the new stream
          const track = stream.getVideoTracks()[0];
          const canTorch =
            (track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean })?.torch ===
            true;
          torchSupportedRef.current = canTorch;
          setTorchSupported(canTorch);
          flashOnRef.current = false;
          setFlashOn(false);
          hintWindowRef.current = [];
          lastHintRef.current = null;
          setActiveHint(null);
          setGoodSamples(0);
          return;
        } catch (err) {
          lastError = err;
        }
      }
      setStatus("error");
      setError(cameraErrorMessage(lastError));
    },
    [stopStream],
  );

  // Start the camera on mount; stop tracks + restore scroll lock on unmount
  useEffect(() => {
    containerRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startStream("environment");
    return () => {
      stopStream();
      document.body.style.overflow = prevOverflow;
    };
  }, [startStream, stopStream]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || shutterLockRef.current) return;
    shutterLockRef.current = true;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (blob) {
        onCapture(new File([blob], "receipt-capture.jpg", { type: "image/jpeg" }));
      }
    } finally {
      shutterLockRef.current = false;
      setCapturing(false);
    }
  }, [onCapture]);

  const flipCamera = useCallback(() => {
    startStream(facing === "environment" ? "user" : "environment");
  }, [facing, startStream]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupportedRef.current) return;
    const next = !flashOnRef.current;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      flashOnRef.current = next;
      setFlashOn(next);
    } catch {
      // Some devices report torch capability but reject the constraint — revert silently
      flashOnRef.current = false;
      setFlashOn(false);
    }
  }, []);

  /** Sample the live frame every 500ms; a hint only surfaces on 2-of-3 agreement (no flicker). */
  const sampleFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const hint = interpret(analyzeFrame(video), {
      torchSupported: torchSupportedRef.current,
      flashOn: flashOnRef.current,
    });
    lastHintRef.current = hint;
    const kind = hint ? hint.kind : null;
    const win = [...hintWindowRef.current, kind].slice(-3);
    hintWindowRef.current = win;
    const counts = new Map<string | null, number>();
    for (const k of win) counts.set(k, (counts.get(k) ?? 0) + 1);
    const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];
    if (top !== null && counts.get(top)! >= 2) {
      setActiveHint(
        top === "dim" && lastHintRef.current?.kind === "dim"
          ? lastHintRef.current
          : ({ kind: top } as QualityHint),
      );
      setGoodSamples(0);
    } else if ((counts.get(null) ?? 0) >= 2) {
      setActiveHint(null);
      setGoodSamples((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    if (status !== "active") return;
    const id = setInterval(sampleFrame, 500);
    return () => clearInterval(id);
  }, [status, sampleFrame]);

  const hintCopy: Record<QualityHint["kind"], { label: string; icon: typeof Sun }> = {
    dim: { label: "Too dark — move to better lighting", icon: Sun },
    close: { label: "Too close — pull back", icon: ZoomIn },
    far: { label: "Too far — move closer", icon: ZoomOut },
    blur: { label: "Photo is blurry — hold steady", icon: Focus },
  };

  const overlay = (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Camera viewfinder"
      onKeyDownCapture={(e) => {
        // Escape closes the camera only — stop it from reaching LogEntryModal's document listener
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-surface-inverse focus:outline-none"
    >
      {/* Live preview — covers the viewport behind every control */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Guide corners — receipt should sit inside these brackets; green when the frame is clean */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute left-6 top-24 h-12 w-12 rounded-tl-lg border-l-[3px] border-t-[3px] ${
            goodSamples >= 2 ? "border-success" : "border-text-inverse"
          }`}
        />
        <div
          className={`absolute right-6 top-24 h-12 w-12 rounded-tr-lg border-r-[3px] border-t-[3px] ${
            goodSamples >= 2 ? "border-success" : "border-text-inverse"
          }`}
        />
        <div
          className={`absolute bottom-40 left-6 h-12 w-12 rounded-bl-lg border-b-[3px] border-l-[3px] ${
            goodSamples >= 2 ? "border-success" : "border-text-inverse"
          }`}
        />
        <div
          className={`absolute bottom-40 right-6 h-12 w-12 rounded-br-lg border-b-[3px] border-r-[3px] ${
            goodSamples >= 2 ? "border-success" : "border-text-inverse"
          }`}
        />
      </div>

      {/* Quality hint chip — only shown while a problem persists */}
      {status === "active" && activeHint && (
        <div className="absolute inset-x-0 top-16 z-10 flex justify-center px-4" aria-live="polite">
          {activeHint.kind === "dim" && activeHint.torch ? (
            <button
              type="button"
              onClick={toggleFlash}
              className="inline-flex items-center gap-2 rounded-full bg-surface-inverse/70 px-4 py-2 text-xs font-medium text-text-inverse backdrop-blur-sm transition-colors hover:bg-surface-inverse"
            >
              <Zap className="h-3.5 w-3.5" />
              Too dark — enable flash
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-inverse/70 px-4 py-2 text-xs font-medium text-text-inverse backdrop-blur-sm">
              {(() => {
                const copy = hintCopy[activeHint.kind];
                const Icon = copy.icon;
                return (
                  <>
                    <Icon className="h-3.5 w-3.5" />
                    {copy.label}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-inverse/60 text-text-inverse transition-colors hover:bg-surface-inverse"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {torchSupported && status === "active" && (
            <button
              type="button"
              onClick={toggleFlash}
              aria-label="Toggle flash"
              aria-pressed={flashOn}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                flashOn
                  ? "bg-text-inverse text-surface-inverse"
                  : "bg-surface-inverse/60 text-text-inverse hover:bg-surface-inverse"
              }`}
            >
              <Flashlight className="h-5 w-5" />
            </button>
          )}
        </div>
        {status === "active" && (
          <button
            type="button"
            onClick={flipCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-inverse/60 text-text-inverse transition-colors hover:bg-surface-inverse"
            aria-label="Flip camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bottom controls */}
      {status === "active" && (
        <>
          <div className="absolute bottom-16 left-4 z-10 flex h-18 w-18 items-center justify-center">
            <button
              type="button"
              onClick={onUseLibrary}
              aria-label="Use Photo Library"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-inverse/60 text-text-inverse transition-colors hover:bg-surface-inverse"
            >
              <ImageIcon className="h-7 w-7" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-16 z-10 flex justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={capturing}
              className="flex h-18 w-18 items-center justify-center rounded-full border-[3px] border-text-inverse transition-transform active:scale-95 disabled:cursor-not-allowed"
              aria-label="Take photo"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-text-inverse">
                {capturing ? (
                  <Loader2 className="h-7 w-7 animate-spin text-surface-inverse" />
                ) : (
                  <Camera className="h-7 w-7 text-surface-inverse" />
                )}
              </span>
            </button>
          </div>
        </>
      )}

      {/* Starting / error states */}
      {(status === "starting" || status === "error") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          {status === "starting" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-text-inverse" />
              <p className="text-sm text-text-inverse">Opening camera…</p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-inverse">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startStream(facing)}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onUseLibrary}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <ImageIcon className="h-4 w-4" />
                  Use Photo Library
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : null;
}
