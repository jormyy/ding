"use client";

import type { AcquireRequest, GameState } from "@/lib/types";

interface RequestItemProps {
  req: AcquireRequest;
  gameState: GameState;
  rankMap: Map<string, number>;
  totalHands: number;
  variant: "desktop" | "mobile-landscape" | "mobile-portrait";
  onAccept: (initiatorHandId: string, recipientHandId: string) => void;
  onReject?: (initiatorHandId: string, recipientHandId: string) => void;
  onCancel?: (initiatorHandId: string, recipientHandId: string) => void;
}

export default function RequestItem({
  req,
  gameState,
  rankMap,
  totalHands,
  variant,
  onAccept,
  onReject,
  onCancel,
}: RequestItemProps) {
  const isOutgoing = onCancel !== undefined && onReject === undefined;
  const initiatorName = gameState.players.find((p) => p.id === req.initiatorId)?.name ?? "?";
  const recipientHand = gameState.hands.find((h) => h.id === req.recipientHandId);
  const recipientName = gameState.players.find((p) => p.id === recipientHand?.playerId)?.name ?? "?";
  const recipientRank = rankMap.get(req.recipientHandId);
  const initiatorRank = rankMap.get(req.initiatorHandId);

  const badgeRank =
    req.kind === "offer" ? initiatorRank
    : req.kind === "acquire" ? recipientRank
    : initiatorRank;

  const chipClasses = [
    "rounded-full border-2 font-black flex items-center justify-center flex-shrink-0",
    variant === "desktop" ? "w-8 h-8 text-sm" : "w-7 h-7 text-xs",
    badgeRank === 1 ? "bg-amber-500 border-amber-300 text-amber-950"
    : badgeRank === totalHands ? "bg-red-950 border-red-800 text-red-300"
    : "bg-gray-700 border-gray-500 text-white",
    isOutgoing ? "opacity-70" : "",
  ].join(" ");

  if (variant === "mobile-landscape") {
    let label: React.ReactNode;
    if (isOutgoing) {
      if (req.kind === "acquire") label = (<>→ <span className="font-bold text-white">{recipientName}</span> for <span className="text-orange-300 font-bold">#{recipientRank}</span></>);
      else if (req.kind === "offer") label = (<>→ <span className="font-bold text-white">{recipientName}</span> offer <span className="text-orange-300 font-bold">#{initiatorRank}</span></>);
      else label = (<>→ <span className="font-bold text-white">{recipientName}</span> swap <span className="text-orange-300 font-bold">#{initiatorRank}</span>↔<span className="text-orange-300 font-bold">#{recipientRank}</span></>);
    } else {
      if (req.kind === "acquire") label = (<><span className="font-bold text-white">{initiatorName}</span> wants <span className="text-orange-300 font-bold">#{recipientRank}</span></>);
      else if (req.kind === "offer") label = (<><span className="font-bold text-white">{initiatorName}</span> offers <span className="text-orange-300 font-bold">#{initiatorRank}</span></>);
      else label = (<><span className="font-bold text-white">{initiatorName}</span> swap <span className="text-orange-300 font-bold">#{initiatorRank}</span>↔<span className="text-orange-300 font-bold">#{recipientRank}</span></>);
    }
    return (
      <div className={`flex items-center gap-1.5 flex-none ${isOutgoing ? "opacity-80" : ""}`}>
        <span className="text-[10px] text-gray-300">{label}</span>
        {isOutgoing ? (
          <button onClick={() => onCancel!(req.initiatorHandId, req.recipientHandId)} className="bg-gray-700 text-gray-200 text-[9px] font-bold px-2 py-0.5 rounded">cancel</button>
        ) : (
          <>
            <button onClick={() => onAccept(req.initiatorHandId, req.recipientHandId)} className="bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">✓</button>
            <button onClick={() => onReject!(req.initiatorHandId, req.recipientHandId)} className="bg-gray-700 text-gray-200 text-[9px] font-bold px-2 py-0.5 rounded">✕</button>
          </>
        )}
      </div>
    );
  }

  if (variant === "mobile-portrait") {
    let body: React.ReactNode;
    if (isOutgoing) {
      if (req.kind === "acquire") body = (<>Asking <span className="font-bold text-white">{recipientName}</span> for <span className="font-bold text-orange-300">#{recipientRank}</span></>);
      else if (req.kind === "offer") body = (<>Offering <span className="font-bold text-orange-300">#{initiatorRank}</span> to <span className="font-bold text-white">{recipientName}</span></>);
      else body = (<>Swap with <span className="font-bold text-white">{recipientName}</span>: <span className="font-bold text-orange-300">#{initiatorRank}</span>↔<span className="font-bold text-orange-300">#{recipientRank}</span></>);
    } else {
      if (req.kind === "acquire") body = (<><span className="font-bold text-white">{initiatorName}</span> wants your <span className="font-bold text-orange-300">#{recipientRank}</span></>);
      else if (req.kind === "offer") body = (<><span className="font-bold text-white">{initiatorName}</span> offers <span className="font-bold text-orange-300">#{initiatorRank}</span></>);
      else body = (<><span className="font-bold text-white">{initiatorName}</span> swap #<span className="font-bold text-orange-300">{initiatorRank}</span>↔#<span className="font-bold text-orange-300">{recipientRank}</span></>);
    }
    return (
      <div className={`flex items-center gap-2 ${isOutgoing ? "opacity-80" : ""}`}>
        {badgeRank !== undefined && <div className={chipClasses}>{badgeRank}</div>}
        <p className={`text-xs flex-1 leading-snug ${isOutgoing ? "text-gray-400" : "text-gray-300"}`}>{body}</p>
        {isOutgoing ? (
          <button onClick={() => onCancel!(req.initiatorHandId, req.recipientHandId)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">Cancel</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => onAccept(req.initiatorHandId, req.recipientHandId)} className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">Accept</button>
            <button onClick={() => onReject!(req.initiatorHandId, req.recipientHandId)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">Reject</button>
          </div>
        )}
      </div>
    );
  }

  // desktop
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
          <button onClick={() => onAccept(req.initiatorHandId, req.recipientHandId)} className="flex-1 text-white text-xs font-bold py-1.5 rounded-lg transition-colors active:scale-95" style={{ background: "#2fb873" }}>
            Accept
          </button>
          <button onClick={() => onReject!(req.initiatorHandId, req.recipientHandId)} className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.06)", color: "#9fc5a8" }}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
