"use client";

/**
 * Right-side sidebar: pending request list (incoming + outgoing) + chat panel.
 * Hidden on mobile portrait (mobile layout shows requests inline).
 */

import { memo } from "react";
import type { AcquireRequest, GameState } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import RequestItem from "../RequestItem";
import ChatPanel from "../../ChatPanel";

export interface RequestsSidebarProps {
  gameState: GameState;
  myId: string;
  rankMap: Map<string, number>;
  totalHands: number;
  incomingRequests: AcquireRequest[];
  outgoingRequests: AcquireRequest[];
  onAcceptAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  onRejectAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  onCancelAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  onSendChat: (text: string) => void;
}

function RequestsSidebarImpl({
  gameState,
  myId,
  rankMap,
  totalHands,
  incomingRequests,
  outgoingRequests,
  onAcceptAcquire,
  onRejectAcquire,
  onCancelAcquire,
  onSendChat,
}: RequestsSidebarProps) {
  return (
    <div
      className="hidden sm:flex flex-none w-64 flex-col overflow-hidden"
      style={{ background: D.cardBg, borderLeft: `1px solid ${surfaces.goldLight}` }}
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className="flex-none px-3 py-2 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${surfaces.faintFill}` }}
        >
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: D.gold }}
          >
            Requests
          </span>
          {incomingRequests.length > 0 && (
            <span
              className="text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center"
              style={{ background: "#e08030" }}
            >
              {incomingRequests.length}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
          {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
            <p className="text-gray-600 text-xs text-center mt-4">No requests</p>
          ) : (
            <>
              {incomingRequests.map((req) => (
                <RequestItem
                  key={`${req.initiatorHandId}-${req.recipientHandId}`}
                  req={req}
                  gameState={gameState}
                  rankMap={rankMap}
                  totalHands={totalHands}
                  variant="desktop"
                  onAccept={onAcceptAcquire}
                  onReject={onRejectAcquire}
                />
              ))}
              {outgoingRequests.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span
                      className="text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "#6a8a72" }}
                    >
                      Sent
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ background: surfaces.neutralFaint }}
                    />
                  </div>
                  {outgoingRequests.map((req) => (
                    <RequestItem
                      key={`out-${req.initiatorHandId}-${req.recipientHandId}`}
                      req={req}
                      gameState={gameState}
                      rankMap={rankMap}
                      totalHands={totalHands}
                      variant="desktop"
                      onAccept={onAcceptAcquire}
                      onCancel={onCancelAcquire}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ borderTop: `1px solid ${surfaces.faintFill}` }}
      >
        <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={onSendChat} />
      </div>
    </div>
  );
}

export const RequestsSidebar = memo(RequestsSidebarImpl);
