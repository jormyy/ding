"use client";

import type { AcquireRequest, GameState } from "@/lib/types";
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

export default function RequestItemMobileLandscape({ req, gameState, rankMap, totalHands: _totalHands, onAccept, onReject, onCancel }: Props) {
  const isOutgoing = onCancel !== undefined && onReject === undefined;
  const { initiatorName, recipientName, recipientRank, initiatorRank } = buildRequestData(req, gameState, rankMap);

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
