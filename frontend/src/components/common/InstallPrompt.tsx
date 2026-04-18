"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePWA } from "@/lib/PWAContext";

export default function InstallPrompt() {
  const { isInstallable, triggerInstall } = usePWA();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem("astramind_pwa_dismissed");
    if (isInstallable && !dismissed) {
      // Small delay so it doesn't pop up instantly right on load
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, [isInstallable]);

  if (!show || !isInstallable) return null;

  const handleDismiss = () => {
    localStorage.setItem("astramind_pwa_dismissed", "true");
    setShow(false);
  };

  const handleInstall = () => {
    triggerInstall();
    // Assuming installation works, we hide the prompt
    setShow(false);
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "var(--surface-1)",
      border: "1px solid var(--border-default)",
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px var(--border-subtle)",
      animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      width: "min(400px, 90vw)",
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(232,160,48,0.3)"
      }}>
        <Download style={{ width: 20, height: 20, color: "var(--bg-primary)" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
          Install ASTRAMIND
        </h4>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Add to home screen for offline mode.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={handleInstall}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: "var(--brand-glow)",
            color: "var(--brand-light)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
