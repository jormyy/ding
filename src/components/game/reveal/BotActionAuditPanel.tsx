"use client";

import type { BotActionLogEntry, Card, ChaosEventAction, ClientMessage, GameState } from "@/lib/types";
import { D } from "@/lib/theme";

function cardText(card: Card): string {
  return `${card.rank}${card.suit}`;
}

function actionText(action: ClientMessage | ChaosEventAction): string {
  switch (action.type) {
    case "chaos-event":
      return `chaos ${action.event} affected ${action.affected.join(", ")}`;
    case "move":
      return `placed ${action.handId} at #${action.toIndex + 1}`;
    case "swap":
      return `swapped ${action.handIdA} and ${action.handIdB}`;
    case "proposeChipMove":
      return `requested ${action.recipientHandId} using ${action.initiatorHandId}`;
    case "acceptChipMove":
      return `accepted ${action.initiatorHandId} for ${action.recipientHandId}`;
    case "rejectChipMove":
      return `rejected ${action.initiatorHandId} for ${action.recipientHandId}`;
    case "cancelChipMove":
      return `cancelled ${action.initiatorHandId} for ${action.recipientHandId}`;
    case "ready":
      return action.ready ? "marked ready" : "unreadied";
    case "flip":
      return `flipped ${action.handId}`;
    default:
      return action.type;
  }
}

function holeCardsText(entry: BotActionLogEntry): string {
  const parts = Object.entries(entry.actorHoleCards).map(([handId, cards]) => {
    if (cards.length === 0) return `${handId}: hidden`;
    return `${handId}: ${cards.map(cardText).join(" ")}`;
  });
  return parts.join(" · ");
}

export default function BotActionAuditPanel({ gameState }: { gameState: GameState }) {
  const entries = gameState.botActionLog;
  const deviations = entries.filter((entry) => entry.audit?.verdict === "deviation").length;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.22)",
        border: `1px solid ${D.panelBorder}`,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <div className="flex-none flex items-center justify-between gap-2 px-1 pb-2">
        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#c9a54a" }}>
          Bot Action Audit
        </div>
        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: deviations > 0 ? "#f08a6c" : "#2fb873" }}>
          {deviations} flagged
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {entries.length === 0 ? (
          <div className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
            No bot actions recorded
          </div>
        ) : entries.map((entry) => {
          const verdict = entry.audit?.verdict ?? "plausible";
          return (
            <div
              key={entry.id}
              className="rounded-md px-2.5 py-2"
              style={{
                background: verdict === "deviation" ? "rgba(139,32,32,0.28)" : "rgba(255,255,255,0.045)",
                border: `1px solid ${verdict === "deviation" ? "rgba(240,138,108,0.35)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] font-bold truncate" style={{ color: "#f5e6b8" }}>
                  {entry.playerName} · {entry.phase}
                </div>
                <div className="text-[9px] font-black uppercase" style={{ color: entry.applied ? "#2fb873" : "#f08a6c" }}>
                  {entry.applied ? "applied" : "ignored"}
                </div>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.78)" }}>
                {actionText(entry.action)}
              </div>
              <div className="mt-1 text-[10px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                {holeCardsText(entry)}
              </div>
              {entry.audit && (
                <div className="mt-1.5 text-[10px] leading-snug" style={{ color: verdict === "deviation" ? "#ffc3b4" : "rgba(255,255,255,0.55)" }}>
                  {entry.audit.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
