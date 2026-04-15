"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  myId: string;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, myId, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-none px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
          Chat
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-xs text-center mt-4">
            No messages yet. Say hi!
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.playerId === myId;
            return (
              <div
                key={m.id}
                className="text-xs leading-snug break-words"
                title={new Date(m.ts).toLocaleTimeString()}
              >
                <span
                  className={`font-bold ${
                    isMine ? "text-green-300" : "text-white"
                  }`}
                >
                  {m.playerName}
                </span>
                <span className="text-gray-600">: </span>
                <span className="text-gray-200">{m.text}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex-none border-t border-gray-800 p-2 flex items-center gap-1.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Type a message..."
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-600"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
