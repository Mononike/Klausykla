import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

// ============================================================
// FORMU KONFIGURCIJA
// Kiekviena raide = SVG path + garso tipas + spalva
// Norint pakeisti forma: pakeisk "path" lauka
//
// Kaip gauti SVG path:
// 1. Nupiesk forma bet kurioje programoje (Illustrator, Figma, Inkscape)
// 2. Eksportuok kaip SVG
// 3. Atidaryk SVG faila teksto redaktoriuje
// 4. Surask <path d="..."> ir kopijuok ta "d" reiksme
// 5. Idek ja i "path" lauka zemiau
// ============================================================

const LETTERS = [
  {
    id: "K1",
    letter: "K",
    soundType: "kikiCluster",
    label: "Kiki Cluster",
    color: "#c43a3a",
    glow: "rgba(196, 58, 58, 0.35)",
    // Kampuota K — aštrios linijos
    path: "M30 180 L30 20 L50 20 L50 90 L120 20 L148 20 L80 88 L155 180 L125 180 L62 100 L50 112 L50 180Z",
  },
  {
    id: "L",
    letter: "L",
    soundType: "bassRumble",
    label: "Bass Rumble",
    color: "#5a3a7a",
    glow: "rgba(90, 58, 122, 0.35)",
    // Stabili L — sunkus pagrindas
    path: "M35 20 L60 20 L60 155 L160 155 L160 180 L35 180Z",
  },
  {
    id: "A",
    letter: "A",
    soundType: "modulationReverb",
    label: "Modulation",
    color: "#2a7a6a",
    glow: "rgba(42, 122, 106, 0.35)",
    // A su erdve viduje — khora
    path: "M95 20 L170 180 L145 180 L128 140 L62 140 L45 180 L20 180Z M75 118 L115 118 L95 58Z",
  },
  {
    id: "U",
    letter: "U",
    soundType: "lowHum",
    label: "Low Hum",
    color: "#2a4a8f",
    glow: "rgba(42, 74, 143, 0.35)",
    // Apvali U — bouba siluma
    path: "M30 20 L55 20 L55 115 Q55 160 95 160 Q135 160 135 115 L135 20 L160 20 L160 120 Q160 185 95 185 Q30 185 30 120Z",
  },
  {
    id: "S",
    letter: "S",
    soundType: "modulationReverb",
    label: "Modulation",
    color: "#2a7a6a",
    glow: "rgba(42, 122, 106, 0.35)",
    // Vingiuota S — tarp formu
    path: "M140 55 Q140 20 95 20 Q50 20 50 55 Q50 85 95 92 Q145 100 145 135 Q145 180 95 180 Q45 180 45 140 L68 140 Q70 158 95 158 Q122 158 122 138 Q122 112 95 105 Q48 96 48 58 Q48 20 95 20 Q142 20 142 55Z",
  },
  {
    id: "Y",
    letter: "Y",
    soundType: "glitchClicks",
    label: "Glitch Clicks",
    color: "#8a6a1a",
    glow: "rgba(138, 106, 26, 0.35)",
    // Y — susikerta ir fragmentuojasi
    path: "M15 20 L42 20 L95 95 L148 20 L175 20 L108 115 L108 180 L82 180 L82 115Z",
  },
  {
    id: "K2",
    letter: "K",
    soundType: "kikiCluster",
    label: "Kiki Cluster",
    color: "#c43a3a",
    glow: "rgba(196, 58, 58, 0.35)",
    path: "M30 180 L30 20 L50 20 L50 90 L120 20 L148 20 L80 88 L155 180 L125 180 L62 100 L50 112 L50 180Z",
  },
];

// ============================================================
// GARSO VARIKLIS
// Kiekvienas garsas priima "intensity" (0-1) kuri valdo
// parametrus — kaip piezo reiksme SuperCollider kode
// ============================================================

function createSound(type, intensity) {
  const p = Math.max(0.05, Math.min(1, intensity));

  switch(type) {
    case "lowHum": {
      const freq = 40 + p * 40; // 40-80 Hz
      const rev = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
      const filter = new Tone.Filter(freq * (2 + p * 4), "lowpass").connect(rev);
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 2.0 },
        volume: -20 + p * 8,
      }).connect(filter);
      const lfo = new Tone.LFO(0.2 + p * 1.6, -6, 0).start();
      lfo.connect(synth.volume);
      synth.triggerAttack(Tone.Frequency(freq, "hz").toNote());
      return {
        update: (newP) => {
          const nf = 40 + newP * 40;
          synth.frequency.rampTo(Tone.Frequency(nf, "hz").toNote(), 0.1);
          filter.frequency.rampTo(nf * (2 + newP * 4), 0.1);
          lfo.frequency.rampTo(0.2 + newP * 1.6, 0.1);
        },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();rev.dispose();filter.dispose();lfo.dispose();}catch(e){} }, 2500); }
      };
    }
    case "bassRumble": {
      const freq = 25 + p * 25;
      const filter = new Tone.Filter(50 + p * 70, "lowpass").toDestination();
      const gain = new Tone.Gain(0.15).connect(filter);
      const noiseFilter = new Tone.Filter(60, "lowpass").connect(gain);
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 1.0, decay: 0.3, sustain: 0.9, release: 2.5 },
        volume: -16 + p * 6,
      }).connect(filter);
      const noise = new Tone.Noise("brown").connect(noiseFilter);
      noise.start();
      synth.triggerAttack(Tone.Frequency(freq, "hz").toNote());
      return {
        update: (newP) => {
          const nf = 25 + newP * 25;
          synth.frequency.rampTo(Tone.Frequency(nf, "hz").toNote(), 0.15);
          filter.frequency.rampTo(50 + newP * 70, 0.15);
        },
        dispose: () => { synth.triggerRelease(); noise.stop(); setTimeout(() => { try{synth.dispose();filter.dispose();noise.dispose();gain.dispose();noiseFilter.dispose();}catch(e){} }, 3000); }
      };
    }
    case "modulationReverb": {
      const freq = 200 + p * 500;
      const rev = new Tone.Reverb({ decay: 2 + p * 6, wet: 0.7 }).toDestination();
      const chorus = new Tone.Chorus(0.1 + p * 1.9, 3.5, 0.7).connect(rev).start();
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 1.5, decay: 1.0, sustain: 0.6, release: 3.0 },
        volume: -18 + p * 6,
      }).connect(chorus);
      synth.triggerAttack(Tone.Frequency(freq, "hz").toNote());
      return {
        update: (newP) => {
          const nf = 200 + newP * 500;
          synth.frequency.rampTo(Tone.Frequency(nf, "hz").toNote(), 0.2);
          chorus.frequency.rampTo(0.1 + newP * 1.9, 0.2);
        },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();chorus.dispose();rev.dispose();}catch(e){} }, 4000); }
      };
    }
    case "glitchClicks": {
      const dest = Tone.getDestination();
      const panner = new Tone.Panner(0).connect(dest);
      const synth = new Tone.MetalSynth({
        frequency: 200 + p * 400,
        envelope: { attack: 0.001, decay: 0.03 + p * 0.04, release: 0.01 },
        harmonicity: 5 + p * 8,
        modulationIndex: 10 + p * 20,
        resonance: 1500 + p * 2000,
        octaves: 1.5,
        volume: -20 + p * 8,
      }).connect(panner);

      let running = true;
      let loopCount = 0;
      const rate = 4 + p * 21; // clicks per second
      const loop = new Tone.Loop((time) => {
        if (!running || loopCount > 60) { loop.stop(); return; }
        if (Math.random() > 0.25) {
          panner.pan.setValueAtTime(Math.random() * 2 - 1, time);
          synth.triggerAttackRelease("C4", "64n", time, Math.random() * 0.4 + 0.2);
        }
        loopCount++;
      }, 1 / rate);
      Tone.getTransport().start();
      loop.start(0);

      return {
        update: (newP) => {
          synth.frequency.value = 200 + newP * 400;
          loop.interval = 1 / (4 + newP * 21);
        },
        dispose: () => { running = false; loop.stop(); setTimeout(() => { try{loop.dispose();synth.dispose();panner.dispose();}catch(e){} }, 500); }
      };
    }
    case "kikiCluster": {
      const dest = Tone.getDestination();
      const synths = [];
      const baseFreq = 1800 + p * 2200;
      const panners = [];
      for (let i = 0; i < 6; i++) {
        const pan = new Tone.Panner(Math.random() * 1.4 - 0.7).connect(dest);
        panners.push(pan);
        const s = new Tone.FMSynth({
          frequency: baseFreq + i * 137,
          modulationIndex: 1 + p * 11,
          harmonicity: 1.5 + Math.random() * 2.5,
          envelope: { attack: 0.001, decay: 0.4 + p * 0.8, sustain: 0.15, release: 0.4 },
          modulation: { type: "square" },
          volume: -24 + p * 8,
        }).connect(pan);
        s.triggerAttack(baseFreq + i * 137);
        synths.push(s);
      }
      return {
        update: (newP) => {
          const nf = 1800 + newP * 2200;
          synths.forEach((s, i) => {
            s.frequency.rampTo(nf + i * 137, 0.1);
            s.modulationIndex.rampTo(1 + newP * 11, 0.1);
          });
        },
        dispose: () => {
          synths.forEach(s => { try{s.triggerRelease();}catch(e){} });
          setTimeout(() => { synths.forEach(s => { try{s.dispose();}catch(e){} }); panners.forEach(p => { try{p.dispose();}catch(e){} }); }, 1500);
        }
      };
    }
    default: return { update: () => {}, dispose: () => {} };
  }
}

export default function App() {
  const [active, setActive] = useState(null);
  const [intensity, setIntensity] = useState(0);
  const [started, setStarted] = useState(false);
  const soundRef = useRef(null);
  const shapeRefs = useRef({});

  const getIntensity = useCallback((e, id) => {
    const el = shapeRefs.current[id];
    if (!el) return 0.5;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0.05, Math.min(1, 1 - dist * 0.7));
  }, []);

  const handleEnter = useCallback(async (e, letterObj) => {
    if (Tone.context.state !== "running") await Tone.start();
    if (soundRef.current) {
      try { soundRef.current.dispose(); } catch(ex) {}
      soundRef.current = null;
    }
    const p = getIntensity(e, letterObj.id);
    setActive(letterObj.id);
    setIntensity(p);
    soundRef.current = createSound(letterObj.soundType, p);
  }, [getIntensity]);

  const handleMove = useCallback((e, letterObj) => {
    if (active !== letterObj.id) return;
    const p = getIntensity(e, letterObj.id);
    setIntensity(p);
    if (soundRef.current && soundRef.current.update) {
      soundRef.current.update(p);
    }
  }, [active, getIntensity]);

  const handleLeave = useCallback(() => {
    setActive(null);
    setIntensity(0);
    if (soundRef.current) {
      try { soundRef.current.dispose(); } catch(ex) {}
      soundRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        try { soundRef.current.dispose(); } catch(e) {}
      }
    };
  }, []);

  if (!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        minHeight: "100vh", background: "#08080a", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", cursor: "pointer",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />
        <div style={{ color: "#fff", fontSize: "36px", letterSpacing: "16px", fontWeight: 300 }}>
          KLAUSYK
        </div>
        <div style={{ color: "#444", fontSize: "13px", letterSpacing: "4px", marginTop: "12px", fontWeight: 300 }}>
          paspausk kad pradeti
        </div>
        <div style={{ marginTop: "48px", animation: "breathe 3s ease-in-out infinite" }}>
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="18" fill="none" stroke="#333" strokeWidth="1" />
            <circle cx="25" cy="25" r="5" fill="#333" />
          </svg>
        </div>
        <style>{`
          @keyframes breathe {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  const activeLetter = LETTERS.find(l => l.id === active);

  return (
    <div style={{
      minHeight: "100vh", background: "#08080a",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />

      {/* header */}
      <div style={{ textAlign: "center", padding: "24px 0 0" }}>
        <div style={{ color: "#fff", fontSize: "16px", letterSpacing: "10px", fontWeight: 300, textTransform: "uppercase" }}>
          Laipciaus Klausykla
        </div>
        <div style={{ color: "#333", fontSize: "11px", letterSpacing: "3px", marginTop: "6px", fontWeight: 300, fontStyle: "italic" }}>
          judesk pele ant raides — atstumas nuo centro keicia garsa
        </div>
      </div>

      {/* letters */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: "6px", padding: "0 20px", maxWidth: "1100px", margin: "0 auto", width: "100%",
      }}>
        {LETTERS.map((item) => {
          const isActive = active === item.id;
          return (
            <div
              key={item.id}
              ref={el => shapeRefs.current[item.id] = el}
              onMouseEnter={(e) => handleEnter(e, item)}
              onMouseMove={(e) => handleMove(e, item)}
              onMouseLeave={handleLeave}
              style={{
                flex: 1, maxWidth: "140px", aspectRatio: "0.75",
                position: "relative", cursor: "crosshair",
                transition: "transform 0.3s ease",
                transform: isActive ? "scale(1.06)" : "scale(1)",
              }}
            >
              {/* glow background */}
              <div style={{
                position: "absolute", inset: "-30px", borderRadius: "50%",
                background: isActive
                  ? `radial-gradient(circle, ${item.glow.replace(/[\d.]+\)$/, (intensity * 0.5).toFixed(2) + ")")} 0%, transparent 70%)`
                  : "none",
                transition: "all 0.3s ease", pointerEvents: "none",
              }} />

              {/* SVG shape */}
              <svg viewBox="0 0 190 200" width="100%" height="100%" style={{ position: "relative" }}>
                {/* hover area - invisible wider stroke */}
                <path d={item.path} fill="transparent" stroke="transparent" strokeWidth="20" />

                {/* visible shape */}
                <path
                  d={item.path}
                  fill={isActive ? item.color + Math.round(intensity * 25).toString(16).padStart(2, '0') : "transparent"}
                  stroke={isActive ? item.color : "#1e1e22"}
                  strokeWidth={isActive ? 1.5 + intensity : 1.5}
                  style={{
                    transition: "stroke 0.2s ease, fill 0.3s ease",
                    filter: isActive ? `drop-shadow(0 0 ${intensity * 15}px ${item.glow})` : "none",
                  }}
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* info bar */}
      <div style={{
        padding: "0 20px 20px", maxWidth: "1100px", margin: "0 auto", width: "100%",
      }}>
        {/* intensity bar */}
        <div style={{
          height: "2px", background: "#111", borderRadius: "1px",
          marginBottom: "12px", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: "1px",
            width: activeLetter ? `${intensity * 100}%` : "0%",
            background: activeLetter ? activeLetter.color : "#333",
            transition: "width 0.1s ease, background 0.3s ease",
          }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "30px" }}>
          <div>
            {activeLetter ? (
              <span style={{ color: activeLetter.color, fontSize: "13px", letterSpacing: "4px", fontWeight: 600, textTransform: "uppercase" }}>
                {activeLetter.letter} — {activeLetter.label}
              </span>
            ) : (
              <span style={{ color: "#1e1e22", fontSize: "12px", letterSpacing: "3px" }}>. . .</span>
            )}
          </div>
          <div>
            {activeLetter && (
              <span style={{ color: "#444", fontSize: "11px", letterSpacing: "2px", fontFamily: "monospace" }}>
                piezo: {intensity.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* letter labels */}
        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {LETTERS.map((item) => (
            <div key={item.id} style={{ flex: 1, maxWidth: "140px", textAlign: "center" }}>
              <div style={{
                color: active === item.id ? item.color : "#1a1a1e",
                fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase",
                transition: "color 0.3s ease",
              }}>
                {item.letter}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #08080a; }
      `}</style>
    </div>
  );
}
