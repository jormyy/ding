"use client";

/**
 * GameSession context — encapsulates the per-room socket lifecycle, masked
 * game-state updates, identity (myId), notifications, and the send helpers.
 *
 * Intent (from the GameMode-engine plan): RoomPage drops to a thin shell
 * that mounts this provider and a phase router; everything else reaches for
 * `useGameSession()` rather than threading socket props down.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import PartySocket from "partysocket";
import type { ClientMessage, GameState, Phase, ServerMessage } from "@/lib/types";
import { findPlayerById } from "@/lib/utils";
import { NOTIFICATION_FADE_MS } from "@/lib/constants";
import {
  playDingSound,
  playFuckoffSound,
  speakCustomOutput,
  primeAudio,
} from "@/lib/sound";

export interface Notification {
  id: string;
  playerName: string;
}

export interface ChaosNotification {
  id: string;
  event: string;
  affected: string[];
  phase: Phase;
  modeId: string;
}

export interface GameSessionValue {
  /** Room code (uppercased). */
  code: string;
  /** Persistent player id (sessionStorage). */
  myId: string | null;
  /** Latest masked game state from the server. */
  gameState: GameState | null;
  /** Connection error string, if any. */
  connectionError: string | null;
  /** Whether the player has the custom-output marker. */
  isCustom: boolean;

  /** Send a typed client message over the socket. */
  send(msg: ClientMessage): void;
  /** Send "ding" + play local sound. */
  ding(): void;
  /** Send "fuckoff" + play local sound. */
  fuckoff(): void;
  /** Send custom output + speak locally. */
  customOutput(text: string, rate: number, pitch: number, voiceURI?: string): void;
  /** Leave the room: send `leave`, close socket, clear identity, navigate home. */
  leave(): void;

  /** Recent ding events to display as toasts. */
  dingNotifications: Notification[];
  /** Recent fuckoff events to display as toasts. */
  fuckoffNotifications: Notification[];
  /** Recent phase-effect events to display as toasts. */
  chaosNotifications: ChaosNotification[];
}

const Ctx = createContext<GameSessionValue | null>(null);

export function useGameSession(): GameSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGameSession must be used inside <GameSessionProvider>");
  return v;
}

/**
 * Optional sessionStorage helpers — wrapped so we can null-check `window`
 * in non-browser contexts (SSR safety).
 */
function getOrCreatePid(): string {
  if (typeof window === "undefined") return "";
  let pid = sessionStorage.getItem("ding-player-id");
  if (!pid) {
    pid = crypto.randomUUID();
    sessionStorage.setItem("ding-player-id", pid);
  }
  return pid;
}

export function GameSessionProvider({
  code,
  playerName,
  children,
}: {
  code: string;
  playerName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [dingNotifications, setDingNotifications] = useState<Notification[]>([]);
  const [fuckoffNotifications, setFuckoffNotifications] = useState<Notification[]>([]);
  const [chaosNotifications, setChaosNotifications] = useState<ChaosNotification[]>([]);

  const socketRef = useRef<PartySocket | null>(null);
  const myNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameState && myId) {
      const me = findPlayerById(gameState.players, myId);
      myNameRef.current = me?.name ?? null;
    }
  }, [gameState, myId]);

  const stateRef = useRef<GameState | null>(null);
  const myIdRef = useRef<string | null>(null);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { myIdRef.current = myId; }, [myId]);

  useEffect(() => {
    if (!playerName) return;
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
    const socket = new PartySocket({ host, room: code });
    socketRef.current = socket;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const w = window as unknown as { __dingSend: (m: ClientMessage) => void; __dingState: () => GameState | null; __dingMyId: () => string | null };
      w.__dingSend = (m) => socket.send(JSON.stringify(m));
      w.__dingState = () => stateRef.current;
      w.__dingMyId = () => myIdRef.current;
    }

    socket.addEventListener("open", () => {
      const pid = getOrCreatePid();
      socket.send(JSON.stringify({ type: "join", name: playerName, pid } satisfies ClientMessage));
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === "welcome") {
          setMyId(msg.playerId);
        } else if (msg.type === "state") {
          setGameState(msg.state);
        } else if (msg.type === "ding") {
          playDingSound();
          const id = crypto.randomUUID();
          setDingNotifications((prev) => [...prev, { id, playerName: msg.playerName }]);
          setTimeout(() => {
            setDingNotifications((prev) => prev.filter((n) => n.id !== id));
          }, NOTIFICATION_FADE_MS);
        } else if (msg.type === "fuckoff") {
          if (msg.playerName !== myNameRef.current) playFuckoffSound();
          const id = crypto.randomUUID();
          setFuckoffNotifications((prev) => [...prev, { id, playerName: msg.playerName }]);
          setTimeout(() => {
            setFuckoffNotifications((prev) => prev.filter((n) => n.id !== id));
          }, NOTIFICATION_FADE_MS);
        } else if (msg.type === "chaos-event") {
          const id = crypto.randomUUID();
          setChaosNotifications((prev) => [
            ...prev,
            {
              id,
              event: msg.event,
              affected: msg.affected,
              phase: msg.phase,
              modeId: msg.modeId,
            },
          ]);
          setTimeout(() => {
            setChaosNotifications((prev) => prev.filter((n) => n.id !== id));
          }, NOTIFICATION_FADE_MS);
        } else if (msg.type === "customOutput") {
          if (msg.playerName !== myNameRef.current) {
            speakCustomOutput(msg.text, msg.rate, msg.pitch, msg.voiceURI);
          }
        } else if (msg.type === "error") {
          if (msg.message === "Removed by host") {
            socketRef.current?.close();
            router.push("/");
            return;
          }
          setConnectionError(msg.message);
        }
      } catch {
        // ignore parse errors
      }
    });

    socket.addEventListener("error", () => {
      setConnectionError("Connection error. Please try again.");
    });

    return () => {
      socket.close();
    };
  }, [playerName, code, router]);

  const send = useCallback((msg: ClientMessage): void => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const ding = useCallback((): void => {
    primeAudio();
    send({ type: "ding" });
  }, [send]);

  const fuckoff = useCallback((): void => {
    playFuckoffSound();
    send({ type: "fuckoff" });
  }, [send]);

  const customOutput = useCallback(
    (text: string, rate: number, pitch: number, voiceURI?: string): void => {
      speakCustomOutput(text, rate, pitch, voiceURI);
      send({ type: "customOutput", text, rate, pitch, voiceURI });
    },
    [send]
  );

  const leave = useCallback((): void => {
    send({ type: "leave" });
    socketRef.current?.close();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ding-player-id");
      sessionStorage.removeItem("ding-player-name");
    }
    router.push("/");
  }, [send, router]);

  const isCustom = findPlayerById(gameState?.players ?? [], myId)?.isCustom ?? false;

  const value: GameSessionValue = {
    code,
    myId,
    gameState,
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
