import { useState, useRef } from "react";
import * as THREE from "three";

// ============================================================
// KLAUSYK SKULPTURU OBJ EKSPORTERIS
// Generuoja visas 6 formas kaip .obj failus
// Atsidaro narsykleje, paspaudus mygtuka — parsisiuncia
// ============================================================

// === GEOMETRIJOS (tos pacios kaip instaliacijoje) ===

function createKikiGeo() {
  const pts = [];
  // Fiksuotas seed kad visada ta pati forma
  const seed = [0.23, 0.67, 0.45, 0.89, 0.12, 0.56, 0.78, 0.34, 0.91, 0.08, 0.62, 0.43];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = (i % 2 === 0) ? 1.8 : 0.5 + seed[i] * 0.4;
    const y = (seed[i] - 0.5) * 1.2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry();
  const v = [];
  for (let i = 0; i < pts.length; i++) {
    const n = pts[(i + 1) % pts.length];
    // Apatinis kugis
    v.push(0, -0.4, 0, pts[i].x, pts[i].y, pts[i].z, n.x, n.y, n.z);
    // Virsutinis kugis
    v.push(0, 1.2, 0, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y + 0.8, n.z);
    // Sonai
    v.push(pts[i].x, pts[i].y, pts[i].z, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y, n.z);
    v.push(n.x, n.y, n.z, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y + 0.8, n.z);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

function createHumGeo() {
  const geo = new THREE.SphereGeometry(1.5, 48, 36);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + Math.sin(x * 3) * 0.1 + Math.cos(y * 4 + z * 2) * 0.08;
    pos.setXYZ(i, x * n, y * 0.7 * n, z * n);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRumbleGeo() {
  const geo = new THREE.BoxGeometry(2, 2.8, 2, 8, 12, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const w = (y + 1.4) / 2.8;
    const b = 1 + (1 - w) * 0.2;
    pos.setXYZ(i, x * b + Math.sin(x * 8 + z * 6) * 0.04, y, z * b + Math.sin(x * 6) * 0.04);
  }
  geo.computeVertexNormals();
  return geo;
}

function createModGeo() {
  const geo = new THREE.TorusGeometry(1.2, 0.5, 32, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    pos.setXYZ(i, x, y + Math.sin(angle * 2) * 0.3, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createSibilantGeo() {
  const geo = new THREE.CylinderGeometry(0.4, 0.4, 3, 24, 48, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const wave = Math.sin(y * 2.5) * 0.7;
    const wave2 = Math.cos(y * 3.5) * 0.25;
    pos.setXYZ(i, x + wave, y, z + wave2);
  }
  geo.computeVertexNormals();
  return geo;
}

function createGlitchGeo() {
  const geo = new THREE.IcosahedronGeometry(1.4, 2); // daugiau detaliu spausdinimui
  const pos = geo.attributes.position;
  const seed = [0.17, 0.83, 0.42, 0.65, 0.28, 0.91, 0.54, 0.36, 0.72, 0.09];
  for (let i = 0; i < pos.count; i++) {
    if (i % 3 === 0) {
      const s = 0.2 + seed[i % 10] * 0.15;
      pos.setXYZ(i, pos.getX(i) + s, pos.getY(i) - s * 0.5, pos.getZ(i) + s * 0.3);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// === OBJ KONVERTERIS ===

function geometryToOBJ(geometry, name) {
  let output = `# KLAUSYK Skulptura: ${name}\n`;
  output += `# Laipciaus Klausykla — magistro teze\n`;
  output += `o ${name}\n`;

  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const index = geometry.index;

  // Vertices
  for (let i = 0; i < pos.count; i++) {
    output += `v ${pos.getX(i).toFixed(6)} ${pos.getY(i).toFixed(6)} ${pos.getZ(i).toFixed(6)}\n`;
  }

  // Normals
  if (normal) {
    for (let i = 0; i < normal.count; i++) {
      output += `vn ${normal.getX(i).toFixed(6)} ${normal.getY(i).toFixed(6)} ${normal.getZ(i).toFixed(6)}\n`;
    }
  }

  // Faces
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i) + 1;
      const b = index.getX(i + 1) + 1;
      const c = index.getX(i + 2) + 1;
      if (normal) {
        output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        output += `f ${a} ${b} ${c}\n`;
      }
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const a = i + 1;
      const b = i + 2;
      const c = i + 3;
      if (normal) {
        output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        output += `f ${a} ${b} ${c}\n`;
      }
    }
  }

  return output;
}

function downloadOBJ(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAllAsZip(sculptures) {
  // Kadangi neturim JSZip — siunciam po viena
  sculptures.forEach((s, i) => {
    setTimeout(() => {
      const geo = s.geo();
      const obj = geometryToOBJ(geo, s.name);
      downloadOBJ(obj, `${s.filename}.obj`);
    }, i * 500);
  });
}

// === SKULPTURU KONFIGURCIJA ===

const SCULPTURES = [
  { name: "K_Kiki_Cluster", filename: "K_kiki", letter: "K", desc: "Sprogstanti žvaigždė — aštrūs kampai, fragmentuoti paviršiai", sound: "Aukšti FM dažniai, disonansai", color: "#c43a3a", geo: createKikiGeo },
  { name: "L_Bass_Rumble", filename: "L_bass", letter: "L", desc: "Sunkus monolitas — deformuotas kubas, platesnis pagrindas", sound: "Sub-dažniai, jaučiami kūnu", color: "#6a4a8a", geo: createRumbleGeo },
  { name: "A_Modulation", filename: "A_mod", letter: "A", desc: "Susuktas toras — Möbius forma, vidus/išorė neatskiriamai", sound: "Chorus, reverb, erdvinis plaukiojimas", color: "#2a8a7a", geo: createModGeo },
  { name: "U_Low_Hum", filename: "U_hum", letter: "U", desc: "Organiškas akmuo — deformuota sfera, minkšti paviršiai", sound: "Žemas drone su vibrato", color: "#3a5a9f", geo: createHumGeo },
  { name: "S_Sibilant_Breath", filename: "S_sibilant", letter: "S", desc: "Banguota gyvatė — vingiuotas cilindras, S forma", sound: "Filtruotas triukšmas, šnabždesys", color: "#5a9a5a", geo: createSibilantGeo },
  { name: "Y_Glitch_Clicks", filename: "Y_glitch", letter: "Y", desc: "Sugedęs ikosaedras — beveik taisyklingas, bet sulaužytas", sound: "Fragmentuoti spragtelėjimai, temporal masking", color: "#9a7a2a", geo: createGlitchGeo },
];

// === UI ===

export default function App() {
  const [previews, setPreviews] = useState({});
  const canvasRefs = useRef({});

  // 3D preview generavimas
  const generatePreview = (sculpture, canvasEl) => {
    if (!canvasEl || previews[sculpture.name]) return;

    const w = 200, h = 200;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0e);
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    cam.position.set(3, 2, 3);
    cam.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    renderer.setSize(w, h);

    const geo = sculpture.geo();
    const mat = new THREE.MeshStandardMaterial({
      color: sculpture.color,
      roughness: 0.6,
      metalness: 0.3,
      emissive: sculpture.color,
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0x333344, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 5, 3);
    scene.add(dir);

    let t = 0;
    const animate = () => {
      t += 0.01;
      mesh.rotation.y = t;
      mesh.rotation.x = Math.sin(t * 0.5) * 0.15;
      renderer.render(scene, cam);
      requestAnimationFrame(animate);
    };
    animate();

    setPreviews(p => ({ ...p, [sculpture.name]: true }));
  };

  return (
    <div style={{
      width: "100vw", minHeight: "100vh", background: "#08080a",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      padding: "40px 20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ color: "#fff", fontSize: "32px", letterSpacing: "14px", fontWeight: 300 }}>KLAUSYK</div>
        <div style={{ color: "#444", fontSize: "12px", letterSpacing: "3px", marginTop: "8px", fontStyle: "italic" }}>
          skulptūrų OBJ eksporteris — Blender / 3D spausdinimas
        </div>

        <button
          onClick={() => downloadAllAsZip(SCULPTURES)}
          style={{
            marginTop: "24px", padding: "12px 32px",
            background: "transparent", color: "#888", border: "1px solid #333",
            fontSize: "12px", letterSpacing: "3px", cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = "#888"; e.target.style.color = "#fff"; }}
          onMouseLeave={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#888"; }}
        >
          PARSISIUSTI VISAS 6 OBJ
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "24px", maxWidth: "1000px", margin: "0 auto",
      }}>
        {SCULPTURES.map(s => (
          <div key={s.name} style={{
            border: "1px solid #1a1a22", padding: "16px", borderRadius: "4px",
            transition: "border-color 0.3s",
          }}>
            {/* 3D Preview */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <canvas
                width={200} height={200}
                ref={el => { if (el) generatePreview(s, el); }}
                style={{ borderRadius: "2px" }}
              />
            </div>

            <div style={{ color: s.color, fontSize: "28px", fontWeight: 600, letterSpacing: "4px", textAlign: "center" }}>
              {s.letter}
            </div>
            <div style={{ color: "#aaa", fontSize: "12px", letterSpacing: "2px", textAlign: "center", marginTop: "4px" }}>
              {s.name.replace(/_/g, ' ')}
            </div>
            <div style={{ color: "#555", fontSize: "11px", marginTop: "8px", lineHeight: "1.6", textAlign: "center" }}>
              {s.desc}
            </div>
            <div style={{ color: "#333", fontSize: "10px", marginTop: "4px", textAlign: "center", fontStyle: "italic" }}>
              Garsas: {s.sound}
            </div>

            <button
              onClick={() => {
                const geo = s.geo();
                const obj = geometryToOBJ(geo, s.name);
                downloadOBJ(obj, `${s.filename}.obj`);
              }}
              style={{
                display: "block", width: "100%", marginTop: "12px",
                padding: "8px", background: "transparent",
                color: "#555", border: `1px solid ${s.color}33`,
                fontSize: "10px", letterSpacing: "2px", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.3s",
              }}
              onMouseEnter={e => { e.target.style.borderColor = s.color; e.target.style.color = s.color; }}
              onMouseLeave={e => { e.target.style.borderColor = s.color + "33"; e.target.style.color = "#555"; }}
            >
              PARSISIUSTI OBJ
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "40px", color: "#333", fontSize: "11px", letterSpacing: "2px", lineHeight: "2.2" }}>
        Blender: File → Import → Wavefront (.obj)<br/>
        Mastelis: 1 unit = ~10cm fiziniame pasaulyje<br/>
        3D spausdinimui: eksportuok iš Blender kaip .stl
      </div>

      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #08080a; }`}</style>
    </div>
  );
}
