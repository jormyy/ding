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

export default function RequestItemMobilePortrait({ req, gameState, rankMap, totalHands, onAccept, onReject, onCancel }: Props) {
  const isOutgoing = onCancel !== undefined && onReject === undefined;
  const { initiatorName, recipientName, recipientRank, initiatorRank, badgeRank } = buildRequestData(req, gameState, rankMap);

  const chipClasses = [
    "rounded-full border-2 font-black flex items-center justify-center flex-shrink-0 w-7 h-7 text-xs",
    badgeRank !== undefined ? chipClassNames(badgeRank, totalHands) : "bg-gray-700 border-gray-500 text-white",
    isOutgoing ? "opacity-70" : "",
  ].join(" ");

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
