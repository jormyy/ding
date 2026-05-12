"use client";

/**
 * GameModeRouter — picks the right top-level component for the current
 * `gameState.phase`. Today we hardcode the Ding components; once the
 * GameMode registry is fully wired to drive the client side, this dispatches
 * to `getMode(state.modeId).Lobby/Game/Reveal`.
 *
 * Wraps everything in NotificationToasts so all phases get the toast strip
 * for free.
 */

import { useGameSession } from "@/contexts/GameSession";
import { NotificationToasts } from "@/components/NotificationToasts";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import Reveal from "@/components/Reveal";
import LoadingScreen from "@/components/LoadingScreen";
import ConnectionErrorScreen from "@/components/ConnectionErrorScreen";
import { getMode } from "@/modes/registry";
// Side-effect import: registers Ding's view in the registry. Future modes
// register the same way (one import to wire them up).
import "@/modes/ding/view";

export function GameModeRouter() {
  const session = useGameSession();
  const {
    code,
    gameState,
    myId,
    connectionError,
    isCustom,
    send,
    ding,
    fuckoff,
    customOutput,
    leave,
    dingNotifications,
    fuckoffNotifications,
    chaosNotifications,
  } = session;

  if (connectionError) return <ConnectionErrorScreen message={connectionError} />;
  if (!gameState || !myId) return <LoadingScreen code={code} />;

  // Look up the active mode by id. Today only "ding" registers; the lookup
  // exists so adding a second mode is a one-line registry insertion.
  const mode = getMode(gameState.modeId ?? "ding");
  if (!mode) {
    return <ConnectionErrorScreen message={`Unknown game mode: ${gameState.modeId}`} />;
  }

  if (gameState.phase === "lobby") {
    return (
      <>
        <Lobby
          gameState={gameState}
          myId={myId}
          code={code}
          onSend={send}
          onLeave={leave}
        />
        <NotificationToasts
          dingNotifications={dingNotifications}
          fuckoffNotifications={fuckoffNotifications}
          chaosNotifications={chaosNotifications}
        />
      </>
    );
  }

  if (gameState.phase === "reveal") {
    return (
      <>
        <Reveal
          gameState={gameState}
          myId={myId}
          onSend={send}
          onDing={ding}
          dingNotifications={dingNotifications}
          onFuckoff={fuckoff}
          fuckoffNotifications={fuckoffNotifications}
          isCustom={isCustom}
          onCustomOutput={customOutput}
        />
        <NotificationToasts
          dingNotifications={[]}
          fuckoffNotifications={[]}
          chaosNotifications={chaosNotifications}
        />
      </>
    );
  }

  return (
    <>
      <GameBoard
        gameState={gameState}
        myId={myId}
        code={code}
        onSend={send}
        onDing={ding}
        dingNotifications={dingNotifications}
        onFuckoff={fuckoff}
        fuckoffNotifications={fuckoffNotifications}
        isCustom={isCustom}
        onCustomOutput={customOutput}
      />
      <NotificationToasts
        dingNotifications={[]}
        fuckoffNotifications={[]}
        chaosNotifications={chaosNotifications}
      />
    </>
  );
}
