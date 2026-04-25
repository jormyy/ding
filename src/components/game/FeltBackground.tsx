"use client";

interface FeltBackgroundProps {
  overlay?: "vignette" | "gold-glow" | "none";
}

export default function FeltBackground({ overlay = "none" }: FeltBackgroundProps) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url('/felt.png') repeat, #0a3820",
          backgroundSize: "256px 256px",
          opacity: 0.18,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {overlay === "vignette" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.65) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {overlay === "gold-glow" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(201,165,74,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
    </>
  );
}
