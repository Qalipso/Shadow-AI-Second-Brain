"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  message: {
    title: string;
    sphereImpact?: string[];
    streak?: number;
    strength?: number;
    points?: number;
    souls?: number;
    soulPhrase?: string;
  } | null;
  onDismiss: () => void;
}

export function HUDToast({ message, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    setExiting(false);

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 200);
    }, 3200);

    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!visible || !message) return null;

  return (
    <div
      className={exiting ? "hud-toast-out" : "hud-toast-in"}
      style={{
        position: "fixed",
        top: "1.25rem",
        right: "1.25rem",
        zIndex: 9999,
        maxWidth: "280px",
        borderRadius: "0.75rem",
        border: "1px solid var(--shadow-border-active)",
        background: "var(--shadow-panel)",
        backdropFilter: "blur(16px)",
        padding: "0.875rem 1rem",
        boxShadow: "var(--shadow-glow-gold), 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={13} style={{ color: "var(--shadow-gold)" }} />
        <span
          className="text-[12px] font-mono uppercase tracking-widest"
          style={{ color: "var(--shadow-gold)" }}
        >
          {message.title}
        </span>
      </div>

      {/* Soul phrase */}
      {message.soulPhrase && (
        <p className="text-[12px] mb-1.5" style={{ color: "var(--shadow-text-muted)" }}>
          {message.soulPhrase}
        </p>
      )}

      {/* Sphere impact */}
      {message.sphereImpact && message.sphereImpact.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {message.sphereImpact.map((s) => (
            <span
              key={s}
              className="text-[11px] font-mono"
              style={{ color: "var(--shadow-text)" }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: "var(--shadow-text-muted)" }}>
        {message.streak !== undefined && message.streak > 0 && (
          <span>Streak: <span style={{ color: "var(--shadow-text)" }}>{message.streak}d</span></span>
        )}
        {message.strength !== undefined && (
          <span>Strength: <span style={{ color: "var(--shadow-text)" }}>{message.strength}%</span></span>
        )}
        {message.souls !== undefined && message.souls > 0 && (
          <span style={{ color: "rgba(214,184,116,0.85)" }}>
            +{message.souls} soul{message.souls > 1 ? "s" : ""} gathered
          </span>
        )}
        {(message.souls === undefined || message.souls === 0) &&
          message.points !== undefined && message.points > 0 && (
            <span style={{ color: "var(--shadow-green)" }}>+{message.points} pts</span>
          )}
      </div>
    </div>
  );
}
