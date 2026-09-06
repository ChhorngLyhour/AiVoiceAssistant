

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Mic, MicOff, Radio, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0A0E14",
  panel: "#0F1621",
  panelBorder: "rgba(94, 234, 212, 0.18)",
  accent: "#5EEAD4", // cyan — system / bot
  accent2: "#FFB86B", // amber — user
  danger: "#FF6B6B",
  textPrimary: "#E6EDF3",
  textMuted: "#7C8B9B",
};

function App() {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [messages, setMessages] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [level, setLevel] = useState(0); // fake amplitude for the waveform
  const roomRef = useRef(null);
  const scrollRef = useRef(null);
  const liveMessageIds = useRef(new Map()); // streamId -> messages[] index

  // -------------------------------------------------------------------------
  // Waveform animation — reacts to mic state, purely decorative pulse
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (status !== "connected" || !micEnabled) {
      setLevel(0);
      return;
    }
    let raf;
    const tick = () => {
      setLevel(0.25 + Math.random() * 0.75);
      raf = setTimeout(tick, 120);
    };
    tick();
    return () => clearTimeout(raf);
  }, [status, micEnabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Transcript handling
  // Appends a chunk to a message identified by streamId, creating it if new.
  // -------------------------------------------------------------------------
  const upsertTranscript = useCallback((streamId, from, chunk, replace = false) => {
    setMessages((prev) => {
      const idx = liveMessageIds.current.get(streamId);
      if (idx !== undefined && prev[idx]) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          text: replace ? chunk : next[idx].text + chunk,
        };
        return next;
      }
      const next = [...prev, { from, text: chunk, id: streamId, ts: Date.now() }];
      liveMessageIds.current.set(streamId, next.length - 1);
      return next;
    });
  }, []);

  async function joinRoom() {
    setStatus("connecting");
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://aivoiceassistant-backend.onrender.com";
      const res = await fetch(`${backendUrl}/token`);
      if (!res.ok) throw new Error("Failed to fetch token");
      const data = await res.json();
      const { token } = data;
      const url = data.url || "wss://voiceai-1az4n5r4.livekit.cloud";

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      }); 
      roomRef.current = room;

      // Handle audio playback for the agent's voice automatically
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus("idle");
      });

      // Register transcription listener
      room.registerTextStreamHandler("lk.transcription", async (reader, participantInfo) => {
        const streamId = reader.info.id;
        const isLocal = participantInfo.identity === room.localParticipant.identity;
        const from = isLocal ? "user" : "bot"; 

        upsertTranscript(streamId, from, "", true);

        try {
          for await (const chunk of reader) {
            upsertTranscript(streamId, from, chunk, false);
          }
        } catch (err) {
          console.error("transcript stream error:", err);
        }
      });

      // Connect to the room
      await room.connect(url, token);

      // Enable local microphone (Triggers Agent Dispatch in LiveKit Cloud)
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("connected");
    } catch (err) {
      console.error("joinRoom error:", err);
      setStatus("error");
    }
  }

  async function leaveRoom() {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
    setMessages([]);
    liveMessageIds.current.clear();
  }

  async function toggleMic() {
    if (!roomRef.current) return;
    const next = !micEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }

  const connected = status === "connected";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 50% 0%, #131C2B 0%, ${COLORS.bg} 60%)`,
        color: COLORS.textPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px",
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      }}
    >
      <Header status={status} />

      <AnimatePresence mode="wait">
        {!connected ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
          >
            <RadialButton status={status} onClick={joinRoom} />
            <p style={{ color: COLORS.textMuted, fontSize: 14, letterSpacing: 0.2 }}>
              {status === "connecting" ? "Opening the channel…" : status === "error" ? "Couldn't connect — try again" : "Tap to open the channel"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="console"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ width: "100%", maxWidth: 640, marginTop: 40 }}
          >
            <Waveform level={level} muted={!micEnabled} />

            <div
              style={{
                position: "relative",
                background: COLORS.panel,
                border: `1px solid ${COLORS.panelBorder}`,
                borderRadius: 4,
                padding: "20px 20px 16px",
                marginTop: 24,
              }}
            >
              <Corner pos="tl" />
              <Corner pos="tr" />
              <Corner pos="bl" />
              <Corner pos="br" />

              <div
                ref={scrollRef}
                style={{
                  height: 360,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  paddingRight: 6,
                }}
              >
                {messages.length === 0 && (
                  <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginTop: 140 }}>
                    Say something — the transcript appears here in real time.
                  </p>
                )}
                {messages.map((msg) => (
                  <TranscriptLine key={msg.id} msg={msg} />
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: `1px solid ${COLORS.panelBorder}`,
                }}
              >
                <button onClick={toggleMic} style={pillButtonStyle(micEnabled ? COLORS.accent : COLORS.danger)}>
                  {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                  {micEnabled ? "Live" : "Muted"}
                </button>
                <button onClick={leaveRoom} style={pillButtonStyle(COLORS.textMuted, true)}>

                  End session
                  
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Header({ status }) {
  const label = { idle: "Standby", connecting: "Connecting", connected: "Online", error: "Offline" }[status];
  const dotColor = { idle: COLORS.textMuted, connecting: COLORS.accent2, connected: COLORS.accent, error: COLORS.danger }[status];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: 1,
          margin: 0,
          color: COLORS.textPrimary,
        }}
      >
        
        FRIDAY

      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.textMuted }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: status === "connected" ? `0 0 8px ${dotColor}` : "none",
          }}
        />
        {label}
      </div>
    </div>
  );
}

function RadialButton({ status, onClick }) {
  const busy = status === "connecting";
  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileHover={{ scale: busy ? 1 : 1.04 }}
      whileTap={{ scale: busy ? 1 : 0.97 }}
      style={{
        width: 148,
        height: 148,
        borderRadius: "50%",
        border: `1px solid ${COLORS.panelBorder}`,
        background: `radial-gradient(circle at 30% 30%, rgba(94,234,212,0.12), ${COLORS.panel})`,
        color: COLORS.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: busy ? "default" : "pointer",
      }}
    >
      {busy ? <Loader2 size={34} className="spin" style={{ animation: "spin 1s linear infinite" }} /> : <Radio size={34} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.button>
  );
}

function Waveform({ level, muted }) {
  const bars = 28;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 44 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const center = bars / 2;
        const falloff = 1 - Math.abs(i - center) / center;
        const h = muted ? 3 : Math.max(3, level * 40 * falloff * (0.5 + Math.random() * 0.5));
        return (
          <motion.span
            key={i}
            animate={{ height: h }}
            transition={{ duration: 0.12 }}
            style={{
              width: 3,
              borderRadius: 2,
              background: muted ? COLORS.textMuted : COLORS.accent,
              opacity: muted ? 0.3 : 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

function Corner({ pos }) {
  const size = 14;
  const base = { position: "absolute", width: size, height: size, borderColor: COLORS.accent, opacity: 0.6 };
  const styles = {
    tl: { ...base, top: -1, left: -1, borderTop: "2px solid", borderLeft: "2px solid" },
    tr: { ...base, top: -1, right: -1, borderTop: "2px solid", borderRight: "2px solid" },
    bl: { ...base, bottom: -1, left: -1, borderBottom: "2px solid", borderLeft: "2px solid" },
    br: { ...base, bottom: -1, right: -1, borderBottom: "2px solid", borderRight: "2px solid" },
  };
  return <span style={styles[pos]} />;
}

function TranscriptLine({ msg }) {
  const isUser = msg.from === "user";
  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUser ? "rgba(255,184,108,0.12)" : "rgba(94,234,212,0.12)",
          color: isUser ? COLORS.accent2 : COLORS.accent,
        }}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        style={{
          maxWidth: "78%",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${isUser ? "rgba(255,184,108,0.15)" : "rgba(94,234,212,0.15)"}`,
          borderRadius: 10,
          padding: "9px 13px",
          fontSize: 14,
          lineHeight: 1.5,
          color: COLORS.textPrimary,
        }}
      >
        {msg.text || <span style={{ opacity: 0.4 }}>…</span>}
      </div>
    </motion.div>
  );
}

function pillButtonStyle(color, ghost = false) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 999,
    border: `1px solid ${ghost ? "rgba(255,255,255,0.12)" : color}`,
    background: ghost ? "transparent" : `${color}1A`,
    color: ghost ? COLORS.textMuted : color,
    cursor: "pointer",
  };
}

export default App;
