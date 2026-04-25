export function getSeatPosition(
  playerIndex: number,
  totalPlayers: number,
  selfIndex: number,
  xRadius = 41,
  yRadius = 38
): { x: number; y: number } {
  const step = 360 / totalPlayers;
  // Self always at 90° (bottom center). Angle 0° = right, 90° = bottom.
  const angleDeg = ((playerIndex - selfIndex) * step + 90 + 3600) % 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + xRadius * Math.cos(angleRad),
    y: 50 + yRadius * Math.sin(angleRad),
  };
}

export function computeTableLayout({
  playerCount,
  handsPerPlayer,
  isMobile,
  isLandscape,
}: {
  playerCount: number;
  handsPerPlayer: number;
  isMobile: boolean;
  isLandscape: boolean;
}): { xRadius: number; yRadius: number; opponentScale: number } {
  const n = playerCount;
  const load = n * handsPerPlayer;
  const xRadius = isMobile
    ? isLandscape
      ? load >= 12 ? 26 : n >= 5 ? 29 : 32
      : load >= 12 ? 37 : n >= 5 ? 40 : 43
    : 46;
  const yRadius = isMobile
    ? isLandscape
      ? load >= 12 ? 28 : n >= 5 ? 32 : 36
      : load >= 12 ? 20 : n >= 5 ? 23 : 28
    : 43;
  const opponentScale = isMobile
    ? Math.max(0.6, 1 - Math.max(0, load - 4) * 0.04)
    : 1;
  return { xRadius, yRadius, opponentScale };
}
