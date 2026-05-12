"use client";

/**
 * Single component for the ding/fuckoff toast strip. Replaces the duplicated
 * toast renderers that lived inside Lobby/GameBoard/Reveal.
 */

import { memo } from "react";
import type { ChaosNotification, Notification } from "@/contexts/GameSession";

export interface NotificationToastsProps {
  dingNotifications: Notification[];
  fuckoffNotifications: Notification[];
  chaosNotifications?: ChaosNotification[];
}

function NotificationToastsImpl({
  dingNotifications,
  fuckoffNotifications,
  chaosNotifications = [],
}: NotificationToastsProps) {
  if (
    dingNotifications.length === 0 &&
    fuckoffNotifications.length === 0 &&
    chaosNotifications.length === 0
  ) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
      {chaosNotifications.map((n) => (
        <div
          key={n.id}
          role="status"
          aria-live="polite"
          className="bg-cyan-950/95 border border-cyan-400/60 text-cyan-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg animate-fade-out"
        >
          {formatChaosEvent(n.event)} fired
        </div>
      ))}
      {dingNotifications.map((n) => (
        <div
          key={n.id}
          role="status"
          aria-live="polite"
          className="bg-amber-500/90 text-amber-950 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
        >
          {n.playerName} dinged
        </div>
      ))}
      {fuckoffNotifications.map((n) => (
        <div
          key={n.id}
          role="status"
          aria-live="polite"
          className="bg-red-700/90 text-red-50 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
        >
          {n.playerName} said fuckoff
        </div>
      ))}
    </div>
  );
}

function formatChaosEvent(event: string): string {
  return event
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export const NotificationToasts = memo(NotificationToastsImpl);
