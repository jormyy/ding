"use client";

import { useState } from "react";
import type { Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer, findPlayerById, incrementMapCount, toggleInSet } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { DEAL_CHOICE_PANEL_STYLE, NeighborView, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function TablePicksBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const otherHands = gameState.hands.filter((h) => h.playerId !== myId);
  const choices = gameState.dealChoices ?? {};
  const keep = myHands[0] ? choices[myHands[0].id]?.keepCards ?? 2 : 2;
  const eligibleVoterCount = gameState.players.filter((p) => p.id !== myId).length;

  return (
    <div className="grid gap-4">
      {/* Your hands — receive votes */}
      <div className="grid gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.accent }}>
          Your hands — awaiting votes
        </div>
        {myHands.map((hand, idx) => {
          const choice = choices[hand.id];
          const votes = choice?.tablePicksVotes ?? {};
          const voteCount = Object.keys(votes).length;
          const totalVoters = gameState.players.filter((p) => p.id !== myId).length;
          // Build tally bars per card index.
          const tally = new Map<number, number>();
          for (const ballot of Object.values(votes)) {
            for (const i of ballot) incrementMapCount(tally, i);
          }
          return (
            <div
              key={hand.id}
              className="grid gap-2 rounded-lg p-3"
              style={DEAL_CHOICE_PANEL_STYLE}
            >
              <VariantStatusBar
                label={`Hand #${idx + 1}`}
                value={
                  choice?.submitted
                    ? "Tally finished"
                    : `${voteCount}/${totalVoters} votes in`
                }
                tone={choice?.submitted ? "accent" : "default"}
              />
              <div className="flex flex-wrap gap-2">
                {hand.cards.map((card, i) => {
                  const count = tally.get(i) ?? 0;
                  const isWinner = choice?.selectedIndexes?.includes(i) ?? false;
                  return (
                    <div
                      key={i}
                      className="rounded-lg p-1"
                      style={{
                        background: isWinner ? surfaces.accentLight : surfaces.disabledBg,
                        border: isWinner ? `2px solid ${surfaces.accentStrong}` : `2px solid ${surfaces.subtleBorder}`,
                      }}
                    >
                      <CardFace card={card} small />
                      <div className="mt-1 text-[10px] text-center font-black" style={{ color: count > 0 ? D.accent : D.sub }}>
                        {count} vote{count === 1 ? "" : "s"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Other players' hands — vote on each */}
      <div className="grid gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.warning }}>
          Vote on others' hands
        </div>
        {otherHands.map((hand) => (
          <TablePicksVoteRow
            key={hand.id}
            hand={hand}
            keep={keep}
            playerName={findPlayerById(gameState.players, hand.playerId)?.name ?? "Player"}
            voted={Boolean(choices[hand.id]?.tablePicksVotes?.[myId])}
            submitted={choices[hand.id]?.submitted ?? false}
            onVote={(indexes) => onSend({ type: "tablePicksVote", targetHandId: hand.id, indexes })}
            eligibleVoterCount={eligibleVoterCount}
          />
        ))}
      </div>
    </div>
  );
}

function TablePicksVoteRow({
  hand,
  keep,
  playerName,
  voted,
  submitted,
  onVote,
  eligibleVoterCount: _eligibleVoterCount,
}: {
  hand: Hand;
  keep: number;
  playerName: string;
  voted: boolean;
  submitted: boolean;
  onVote: (indexes: number[]) => void;
  eligibleVoterCount: number;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggle(i: number) {
    if (voted || submitted) return;
    setSelected((prev) => toggleInSet(prev, i, keep));
  }
  const canSubmit = !voted && !submitted && selected.size === keep;
  return (
    <div
      className="grid gap-2 rounded-lg p-3"
      style={DEAL_CHOICE_PANEL_STYLE}
    >
      <VariantStatusBar
        label={playerName}
        value={voted ? "Voted" : `Pick ${selected.size}/${keep}`}
        tone={voted ? "accent" : "warning"}
      />
      <NeighborView
        cards={hand.cards}
        selectedIndexes={[...selected]}
        maxSelected={keep}
        onToggle={toggle}
        disabled={voted || submitted}
      />
      {!voted && !submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onVote([...selected].sort((a, b) => a - b))}
          className="h-10 rounded-md text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed self-end"
          style={{ background: D.goldButton, color: D.ink }}
        >
          Submit vote
        </button>
      )}
    </div>
  );
}
