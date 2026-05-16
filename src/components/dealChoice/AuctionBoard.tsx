"use client";

import { D } from "@/lib/theme";
import { CardFace } from "../CardFace";
import { PoolStrip, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function AuctionBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const pool = gameState.auctionPool;
  if (!pool) {
    return (
      <div style={{ color: D.sub }}>Auction pool not initialized.</div>
    );
  }
  const myHands = gameState.hands.filter((h) => h.playerId === myId);
  const head = pool.claimQueue[0];
  const myTurn = head === myId;
  const headPlayer = gameState.players.find((p) => p.id === head);
  const headLabel = headPlayer ? (head === myId ? "Your turn" : `${headPlayer.name}'s turn`) : "Auction complete";

  return (
    <div className="grid gap-3">
      <VariantStatusBar
        label="Auction"
        value={headLabel}
        tone={myTurn ? "accent" : "default"}
      />
      <PoolStrip
        cards={pool.cards}
        remainingIndexes={pool.remainingIndexes}
        selectableIndexes={myTurn ? pool.remainingIndexes : []}
        onClaim={myTurn ? (i) => onSend({ type: "auctionClaim", poolCardIndex: i }) : undefined}
        label="Auction row"
      />
      <div className="grid gap-2">
        {myHands.map((hand, idx) => (
          <div
            key={hand.id}
            className="rounded-lg p-3"
            style={{ background: "rgba(10,40,22,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <VariantStatusBar
              label={`Hand #${idx + 1}`}
              value={`${hand.cards.length}/${gameState.handsPerPlayer > 0 ? Math.round((pool.claimsPerPlayer[myId] ?? 0) / Math.max(1, myHands.length)) : 0} claimed`}
              tone="default"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {hand.cards.map((card, i) => (
                <div key={i} className="rounded-lg p-1" style={{
                  background: "rgba(201,165,74,0.18)",
                  border: "2px solid #c9a54a",
                }}>
                  <CardFace card={card} small />
                </div>
              ))}
              {hand.cards.length === 0 && (
                <span className="text-[11px]" style={{ color: D.sub }}>No cards yet.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
