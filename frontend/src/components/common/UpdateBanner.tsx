"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, Zap } from "lucide-react";

/**
 * UpdateBanner — listens for SW_UPDATED message from service worker.
 * When a new version deploys, shows a non-intrusive top banner
 * prompting the user to reload and get the new version.
 */
export default function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Register the service worker with update checking
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none", // Always fetch fresh SW — never serve from HTTP cache
        });

        // Check for updates every 30 minutes while app is open
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);

        return () => clearInterval(intervalId);
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    };

    registerSW();

    // Listen for the SW_UPDATED message broadcast by the new service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setVersion(event.data.version || "");
        setShow(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const handleReload = () => {
    setShow(false);
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: "10px 20px",
        background: "linear-gradient(90deg, #1a1612 0%, rgba(242,169,59,0.18) 50%, #1a1612 100%)",
        borderBottom: "1px solid rgba(242,169,59,0.4)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        animation: "slideDown 0.35s ease",
      }}
    >
      <Zap size={16} style={{ color: "#f2a93b", flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: "#f2a93b", fontWeight: 600, margin: 0 }}>
        ✨ ASTRAMIND {version ? `v${version.replace("astramind-", "")}` : "update"} is available!
      </p>
      <button
        onClick={handleReload}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: "rgba(242,169,59,0.9)", color: "#1a1612", border: "none", cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f2a93b"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(242,169,59,0.9)"; }}
      >
        <RefreshCw size={12} />
        Reload to update
      </button>
      <button
        onClick={() => setShow(false)}
        aria-label="Dismiss update notification"
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(242,169,59,0.6)", padding: 4, borderRadius: 4, marginLeft: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
