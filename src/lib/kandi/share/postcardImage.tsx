import { ImageResponse } from "next/og";

import type { SharedPostcardRecord } from "./types";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function beadsPreview(beadColors: string[]) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: 320,
        height: 320,
        borderRadius: "50%",
        alignItems: "center",
        justifyContent: "center",
        border: "4px solid rgba(20,24,30,0.56)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.42)",
        background: "rgba(16,18,23,0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {beadColors.slice(0, 40).map((color, index) => {
          const angle = (index / Math.max(beadColors.length, 1)) * Math.PI * 2;
          const radius = 132;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={`${index}-${color}`}
              style={{
                position: "absolute",
                left: 160 + x - 12,
                top: 160 + y - 12,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: color,
                border: "2px solid rgba(255,255,255,0.75)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.24)",
          background: "rgba(8,10,14,0.52)",
        }}
      />
    </div>
  );
}

export function createPostcardImage(record: SharedPostcardRecord): ImageResponse {
  const beadColors = record.design.beads.map((bead) => bead.color || "#ffffff");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 22% -10%, rgba(56,107,255,0.22) 0%, transparent 44%), radial-gradient(circle at 80% 0%, rgba(79,146,90,0.2) 0%, transparent 40%), linear-gradient(180deg, #171a22 0%, #12151c 55%, #0f1218 100%)",
          color: "#eef2fa",
        }}
      >
        {/* Temporarily avoid external image composition in OG rendering due runtime instability. */}

        <div
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "48px 56px",
            gap: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div
              style={{
                fontSize: 18,
                lineHeight: "22px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              Kandi Postcard
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 64,
                lineHeight: "70px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                display: "block",
              }}
            >
              {record.title}
            </div>
            {record.message ? (
              <div
                style={{
                  marginTop: 18,
                  fontSize: 31,
                  lineHeight: "40px",
                  color: "#d8deeb",
                  display: "block",
                }}
              >
                {record.message}
              </div>
            ) : null}
            <div
              style={{
                marginTop: 34,
                fontSize: 20,
                opacity: 0.66,
              }}
            >
              {record.design.beadCount} beads • kandi maker
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.24)",
              background: "rgba(16,18,23,0.34)",
            }}
          >
            {beadsPreview(beadColors)}
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    },
  );
}
