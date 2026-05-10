"use client";

import { memo } from "react";
import type { AcquireRequest, GameState } from "@/lib/types";
import RequestItemDesktop from "./RequestItemDesktop";
import RequestItemMobileLandscape from "./RequestItemMobileLandscape";
import RequestItemMobilePortrait from "./RequestItemMobilePortrait";

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

function RequestItemImpl(props: RequestItemProps) {
  const { variant, ...rest } = props;
  if (variant === "mobile-landscape") return <RequestItemMobileLandscape {...rest} />;
  if (variant === "mobile-portrait") return <RequestItemMobilePortrait {...rest} />;
  return <RequestItemDesktop {...rest} />;
}

const RequestItem = memo(RequestItemImpl);
export default RequestItem;
