"use client";

import type { AcquireRequest, GameState } from "@/lib/types";
import { chipClassNames } from "@/lib/chipColors";
import { buildRequestData } from "./requestLabel";

interface Props {
  req: AcquireRequest;
  gameState: GameState;
  rankMap: Map<string, number>;
  totalHands: number;
  onAccept: (initiatorHandId: string, recipientHandId: string) => void;
  onReject?: (initiatorHandId: string, recipientHandId: string) => void;
  onCancel?: (initiatorHandId: string, recipientHandId: string) => void;
}

export default function RequestItemDesktop({ req, gameState, rankMap, totalHands, onAccept, onReject, onCancel }: Props) {
  const isOutgoing = onCancel !== undefined && onReject === undefined;
  const { initiatorName, recipientName, recipientRank, initiatorRank, badgeRank } = buildRequestData(req, gameState, rankMap);

  const chipClasses = [
    "rounded-full border-2 font-black flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm",
    badgeRank !== undefined ? chipClassNames(badgeRank, totalHands) : "bg-gray-700 border-gray-500 text-white",
    isOutgoing ? "opacity-70" : "",
  ].join(" ");

  let body: React.ReactNode;
  if (isOutgoing) {
    if (req.kind === "acquire") body = (<>Asking <span className="font-bold text-white">{recipientName}</span> for <span className="font-bold text-orange-300">#{recipientRank}</span></>);
    else if (req.kind === "offer") body = (<>Offering <span className="font-bold text-orange-300">#{initiatorRank}</span> to <span className="font-bold text-white">{recipientName}</span></>);
    else body = (<>Swap with <span className="font-bold text-white">{recipientName}</span>: <span className="font-bold text-orange-300">#{initiatorRank}</span> ↔ <span className="font-bold text-orange-300">#{recipientRank}</span></>);
  } else {
    if (req.kind === "acquire") body = (<><span className="font-bold text-white">{initiatorName}</span> wants your <span className="font-bold text-orange-300">#{recipientRank}</span> chip</>);
    else if (req.kind === "offer") body = (<><span className="font-bold text-white">{initiatorName}</span> is offering you their <span className="font-bold text-orange-300">#{initiatorRank}</span> chip</>);
    else body = (<><span className="font-bold text-white">{initiatorName}</span> wants to swap: their <span className="font-bold text-orange-300">#{initiatorRank}</span> ↔ your <span className="font-bold text-orange-300">#{recipientRank}</span></>);
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        background: isOutgoing ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
        border: isOutgoing ? "1px dashed rgba(201,165,74,0.18)" : "1px solid rgba(201,165,74,0.2)",
      }}
    >
      <div className="flex items-center gap-2">
        {badgeRank !== undefined && <div className={chipClasses}>{badgeRank}</div>}
        <p className="text-sm leading-snug" style={{ color: isOutgoing ? "#9fc5a8" : "#f5e6b8" }}>{body}</p>
      </div>
      {isOutgoing ? (
        <button onClick={() => onCancel!(req.initiatorHandId, req.recipientHandId)} className="text-xs font-bold py-1.5 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.06)", color: "#c9a54a" }}>
          Cancel
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onAccept(req.initiatorHandId, req.recipientHandId)} className="flex-1 text-white text-xs font-bold py-1.5 rounded-lg transition-colors active:scale-95" style={{ background: "#2fb873" }}>Accept</button>
          <button onClick={() => onReject!(req.initiatorHandId, req.recipientHandId)} className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.06)", color: "#9fc5a8" }}>Reject</button>
        </div>
      )}
    </div>
  );
}
