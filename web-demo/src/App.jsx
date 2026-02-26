import { useState } from "react";
import HoverDemo from "./HoverDemo.jsx";
import WorldDemo from "./WorldDemo.jsx";

export default function App() {
  const [mode, setMode] = useState(null);

  if (mode === "hover") return <HoverDemo onBack={() => setMode(null)} />;
  if (mode === "world") return <WorldDemo onBack={() => setMode(null)} />;

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#08080a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />

      <div style={{ color: "#fff", fontSize: "38px", letterSpacing: "16px", fontWeight: 300 }}>
        KLAUSYK
      </div>
      <div style={{ color: "#444", fontSize: "12px", letterSpacing: "4px", marginTop: "8px", fontStyle: "italic" }}>
        laipciaus klausykla — haptinis garso maketas
      </div>

      <div style={{ display: "flex", gap: "24px", marginTop: "60px" }}>
        {/* 2D Hover */}
        <div
          onClick={() => setMode("hover")}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#3a5a9f";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(58, 90, 159, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1a1a22";
            e.currentTarget.style.boxShadow = "none";
          }}
          style={{
            width: "220px", padding: "32px 24px", cursor: "pointer",
            border: "1px solid #1a1a22", borderRadius: "4px",
            transition: "all 0.4s ease", textAlign: "center",
          }}
        >
          <svg viewBox="0 0 190 120" width="100" height="60" style={{ margin: "0 auto 16px", display: "block" }}>
            <text x="95" y="75" textAnchor="middle" fill="#3a5a9f" fontSize="50" fontFamily="Georgia" opacity="0.6">
              KLAUSYK
            </text>
          </svg>
          <div style={{ color: "#ccc", fontSize: "15px", letterSpacing: "3px", fontWeight: 400 }}>
            2D Raides
          </div>
          <div style={{ color: "#444", fontSize: "11px", letterSpacing: "2px", marginTop: "8px", fontStyle: "italic" }}>
            hover ant raidziu
          </div>
        </div>

        {/* 3D World */}
        <div
          onClick={() => setMode("world")}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#6a4a8a";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(106, 74, 138, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1a1a22";
            e.currentTarget.style.boxShadow = "none";
          }}
          style={{
            width: "220px", padding: "32px 24px", cursor: "pointer",
            border: "1px solid #1a1a22", borderRadius: "4px",
            transition: "all 0.4s ease", textAlign: "center",
          }}
        >
          <svg viewBox="0 0 100 60" width="100" height="60" style={{ margin: "0 auto 16px", display: "block" }}>
            <circle cx="30" cy="35" r="12" fill="none" stroke="#6a4a8a" strokeWidth="1" opacity="0.6" />
            <rect x="55" y="18" width="18" height="28" fill="none" stroke="#6a4a8a" strokeWidth="1" opacity="0.4" transform="rotate(5,64,32)" />
            <polygon points="85,15 95,40 75,40" fill="none" stroke="#6a4a8a" strokeWidth="1" opacity="0.5" />
          </svg>
          <div style={{ color: "#ccc", fontSize: "15px", letterSpacing: "3px", fontWeight: 400 }}>
            3D Pasaulis
          </div>
          <div style={{ color: "#444", fontSize: "11px", letterSpacing: "2px", marginTop: "8px", fontStyle: "italic" }}>
            WASD + erdvinis garsas
          </div>
        </div>
      </div>

      <div style={{ color: "#222", fontSize: "10px", letterSpacing: "2px", marginTop: "60px" }}>
        rekomenduojama naudoti ausines
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #08080a; overflow: hidden; }
      `}</style>
    </div>
  );
}
