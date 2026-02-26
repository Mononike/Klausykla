import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSO VARIKLIS (tas pats kaip 2D versijoje)
// ============================================================
function createSound(type, intensity) {
  const p = Math.max(0.05, Math.min(1, intensity));
  switch(type) {
    case "lowHum": {
      const freq = 40 + p * 40;
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
      const rate = 4 + p * 21;
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
      const panners = [];
      const baseFreq = 1800 + p * 2200;
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

// ============================================================
// 3D FORMU KURIMAS
// Kiekviena forma atspindi garso psychoacoustini charakteri
// ============================================================
function createKikiGeometry() {
  // Sprogstanti zvaigzde — asmus kampai
  const pts = [];
  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const r = (i % 2 === 0) ? 1.2 : 0.4 + Math.random() * 0.3;
    const y = (Math.random() - 0.5) * 0.8;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry();
  const vertices = [];
  const center = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    vertices.push(center.x, center.y, center.z);
    vertices.push(pts[i].x, pts[i].y, pts[i].z);
    vertices.push(next.x, next.y, next.z);
    // top cap
    vertices.push(0, 0.5, 0);
    vertices.push(pts[i].x, pts[i].y + 0.5, pts[i].z);
    vertices.push(next.x, next.y + 0.5, next.z);
    // sides
    vertices.push(pts[i].x, pts[i].y, pts[i].z);
    vertices.push(pts[i].x, pts[i].y + 0.5, pts[i].z);
    vertices.push(next.x, next.y, next.z);
    vertices.push(next.x, next.y, next.z);
    vertices.push(pts[i].x, pts[i].y + 0.5, pts[i].z);
    vertices.push(next.x, next.y + 0.5, next.z);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

function createLowHumGeometry() {
  // Lygus akmuo — deformuota sfera
  const geo = new THREE.SphereGeometry(1, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = 1 + Math.sin(x * 3) * 0.08 + Math.cos(y * 4 + z * 2) * 0.06;
    pos.setXYZ(i, x * noise, y * 0.75 * noise, z * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

function createBassRumbleGeometry() {
  // Sunkus monolitas — deformuotas kubas
  const geo = new THREE.BoxGeometry(1.4, 1.8, 1.4, 6, 8, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const weight = (y + 0.9) / 1.8;
    const bulge = 1 + (1 - weight) * 0.15;
    const roughness = Math.sin(x * 8 + z * 6) * 0.03;
    pos.setXYZ(i, x * bulge + roughness, y, z * bulge + roughness);
  }
  geo.computeVertexNormals();
  return geo;
}

function createModulationGeometry() {
  // Mobius / toras — erdve tarp
  const geo = new THREE.TorusGeometry(0.8, 0.35, 24, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const twist = Math.sin(angle * 2) * 0.2;
    pos.setXYZ(i, x, y + twist, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createGlitchGeometry() {
  // Beveik-taisyklingas ikosaedras su glitch deformacijomis
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Kas trecias vertex paslinktas — "sugedintas" rastas
    if (i % 3 === 0) {
      const shift = 0.15 + Math.random() * 0.1;
      pos.setXYZ(i, x + shift, y - shift * 0.5, z + shift * 0.3);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// KONFIGURCIJA
// ============================================================
const OBJECTS = [
  { id: "kiki1", label: "K — Kiki Cluster", soundType: "kikiCluster", color: 0xc43a3a, emissive: 0x3a0808, createGeo: createKikiGeometry, x: -4.5 },
  { id: "bass", label: "L — Bass Rumble", soundType: "bassRumble", color: 0x6a4a8a, emissive: 0x150a1e, createGeo: createBassRumbleGeometry, x: -2.25 },
  { id: "mod", label: "A — Modulation", soundType: "modulationReverb", color: 0x2a8a7a, emissive: 0x081e1a, createGeo: createModulationGeometry, x: 0 },
  { id: "hum", label: "U — Low Hum", soundType: "lowHum", color: 0x3a5a9f, emissive: 0x080e1e, createGeo: createLowHumGeometry, x: 2.25 },
  { id: "glitch", label: "Y — Glitch Clicks", soundType: "glitchClicks", color: 0x9a7a2a, emissive: 0x1e1808, createGeo: createGlitchGeometry, x: 4.5 },
];

export default function App() {
  const containerRef = useRef(null);
  const sceneRef = useRef({});
  const soundRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [activeLabel, setActiveLabel] = useState(null);
  const [intensity, setIntensity] = useState(0);

  // Three.js setup
  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080a);
    scene.fog = new THREE.FogExp2(0x08080a, 0.06);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4466aa, 0.4, 20);
    pointLight.position.set(-3, 4, 2);
    scene.add(pointLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    scene.add(ground);

    // Objects
    const meshes = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(9999, 9999);

    OBJECTS.forEach((obj) => {
      const geo = obj.createGeo();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1e,
        emissive: 0x000000,
        roughness: 0.7,
        metalness: 0.2,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obj.x, 0, 0);
      mesh.userData = { ...obj, baseColor: 0x1a1a1e, targetColor: 0x1a1a1e, targetEmissive: 0x000000 };
      scene.add(mesh);
      meshes.push(mesh);
    });

    sceneRef.current = { scene, camera, renderer, meshes, raycaster, mouse, activeObj: null };

    // Mouse tracking
    let hoveredObj = null;

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;
        const dist = hit.distance;
        const p = Math.max(0.05, Math.min(1, 1 - (dist - 5) / 8));

        if (hoveredObj !== obj) {
          // Senas objektas — reset
          if (hoveredObj) {
            hoveredObj.userData.targetColor = 0x1a1a1e;
            hoveredObj.userData.targetEmissive = 0x000000;
          }
          hoveredObj = obj;
          // Naujas garsas
          if (soundRef.current) {
            try { soundRef.current.dispose(); } catch(ex) {}
          }
          Tone.start().then(() => {
            soundRef.current = createSound(obj.userData.soundType, p);
          });
        } else {
          // Update garsas
          if (soundRef.current && soundRef.current.update) {
            soundRef.current.update(p);
          }
        }

        obj.userData.targetColor = obj.userData.color;
        obj.userData.targetEmissive = obj.userData.emissive;
        obj.userData.intensity = p;
        setActiveLabel(obj.userData.label);
        setIntensity(p);

      } else {
        if (hoveredObj) {
          hoveredObj.userData.targetColor = 0x1a1a1e;
          hoveredObj.userData.targetEmissive = 0x000000;
          hoveredObj = null;
          if (soundRef.current) {
            try { soundRef.current.dispose(); } catch(ex) {}
            soundRef.current = null;
          }
          setActiveLabel(null);
          setIntensity(0);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    let frame = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      meshes.forEach((mesh) => {
        // Letas sukimasis
        mesh.rotation.y += 0.003;
        mesh.rotation.x = Math.sin(t * 0.5 + mesh.position.x) * 0.1;

        // Spalvos interpoliacija
        const current = mesh.material.color;
        const target = new THREE.Color(mesh.userData.targetColor);
        current.lerp(target, 0.08);

        const currentEm = mesh.material.emissive;
        const targetEm = new THREE.Color(mesh.userData.targetEmissive);
        currentEm.lerp(targetEm, 0.08);

        // Active — pulsuoja
        if (mesh.userData.targetColor !== 0x1a1a1e) {
          const p = mesh.userData.intensity || 0.5;
          const pulse = 1 + Math.sin(t * 3) * 0.03 * p;
          mesh.scale.setScalar(pulse);
          mesh.material.emissiveIntensity = 0.3 + p * 0.7;
        } else {
          mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
          mesh.material.emissiveIntensity = 0;
        }
      });

      // Letas kameros judejimas
      camera.position.x = Math.sin(t * 0.1) * 0.5;
      camera.position.y = 2 + Math.sin(t * 0.15) * 0.3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (soundRef.current) {
        try { soundRef.current.dispose(); } catch(e) {}
      }
    };
  }, [started]);

  if (!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        width: "100vw", height: "100vh", background: "#08080a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ color: "#fff", fontSize: "36px", letterSpacing: "16px", fontWeight: 300 }}>KLAUSYK</div>
        <div style={{ color: "#444", fontSize: "13px", letterSpacing: "4px", marginTop: "12px" }}>paspausk kad pradeti</div>
        <div style={{ marginTop: "48px", animation: "breathe 3s ease-in-out infinite" }}>
          <svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="#333" strokeWidth="1"/><circle cx="25" cy="25" r="5" fill="#333"/></svg>
        </div>
        <style>{`@keyframes breathe { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.15); } }`}</style>
      </div>
    );
  }

  const activeObj = activeLabel ? OBJECTS.find(o => o.label === activeLabel) : null;
  const activeHex = activeObj ? "#" + activeObj.color.toString(16).padStart(6, "0") : "#333";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#08080a", position: "relative", overflow: "hidden", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />

      {/* 3D Canvas */}
      <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "crosshair" }} />

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        textAlign: "center", padding: "20px", pointerEvents: "none",
      }}>
        <div style={{ color: "#fff", fontSize: "16px", letterSpacing: "10px", fontWeight: 300, textTransform: "uppercase" }}>
          Laipciaus Klausykla
        </div>
        <div style={{ color: "#333", fontSize: "11px", letterSpacing: "3px", marginTop: "4px", fontStyle: "italic" }}>
          3D skulpturos — vesk pele ant formos
        </div>
      </div>

      {/* Bottom HUD */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "16px 24px", pointerEvents: "none",
      }}>
        {/* intensity bar */}
        <div style={{ height: "2px", background: "#111", borderRadius: "1px", marginBottom: "10px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: activeLabel ? `${intensity * 100}%` : "0%",
            background: activeHex, transition: "width 0.1s ease, background 0.3s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            color: activeLabel ? activeHex : "#1a1a1e",
            fontSize: "14px", letterSpacing: "4px", fontWeight: 600, textTransform: "uppercase",
            transition: "color 0.3s ease",
          }}>
            {activeLabel || ". . ."}
          </span>
          {activeLabel && (
            <span style={{ color: "#444", fontSize: "11px", letterSpacing: "2px", fontFamily: "monospace" }}>
              piezo: {intensity.toFixed(2)}
            </span>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
          {OBJECTS.map(obj => {
            const hex = "#" + obj.color.toString(16).padStart(6, "0");
            const isActive = activeLabel === obj.label;
            return (
              <div key={obj.id} style={{
                fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase",
                color: isActive ? hex : "#1e1e22", transition: "color 0.3s",
                textAlign: "center", flex: 1,
              }}>
                {obj.label.split(" — ")[0]}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #08080a; overflow: hidden; }`}</style>
    </div>
  );
}
