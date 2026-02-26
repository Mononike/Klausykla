import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSO VARIKLIS — erdvinis garsas su Tone.js
// Atstumas nuo objekto valdo intensyvuma ir panorama
// ============================================================
function createSpatialSound(type) {
  const p = 0.5;
  switch(type) {
    case "lowHum": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF" }).toDestination();
      const rev = new Tone.Reverb({ decay: 4, wet: 0.4 }).connect(panner);
      const filter = new Tone.Filter(200, "lowpass").connect(rev);
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 2.0, decay: 1.0, sustain: 0.8, release: 3.0 },
        volume: -30,
      }).connect(filter);
      const lfo = new Tone.LFO(0.4, -8, 0).start();
      lfo.connect(synth.volume);
      synth.triggerAttack("A1");
      return {
        panner,
        update: (dist, angle) => {
          const vol = Math.max(-60, -10 - dist * 3);
          synth.volume.rampTo(vol, 0.3);
          const cutoff = Math.max(60, 400 - dist * 20);
          filter.frequency.rampTo(cutoff, 0.2);
          panner.positionX.rampTo(Math.sin(angle) * dist, 0.1);
          panner.positionZ.rampTo(Math.cos(angle) * dist, 0.1);
        },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();rev.dispose();filter.dispose();lfo.dispose();panner.dispose();}catch(e){} }, 3000); }
      };
    }
    case "bassRumble": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF" }).toDestination();
      const filter = new Tone.Filter(80, "lowpass").connect(panner);
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 1.5, decay: 0.5, sustain: 0.9, release: 3.0 },
        volume: -30,
      }).connect(filter);
      const noise = new Tone.Noise("brown").connect(
        new Tone.Filter(50, "lowpass").connect(new Tone.Gain(0.12).connect(filter))
      );
      noise.start();
      synth.triggerAttack("C1");
      return {
        panner,
        update: (dist, angle) => {
          const vol = Math.max(-60, -8 - dist * 3);
          synth.volume.rampTo(vol, 0.3);
          filter.frequency.rampTo(Math.max(30, 120 - dist * 6), 0.2);
          panner.positionX.rampTo(Math.sin(angle) * dist, 0.1);
          panner.positionZ.rampTo(Math.cos(angle) * dist, 0.1);
        },
        dispose: () => { synth.triggerRelease(); noise.stop(); setTimeout(() => { try{synth.dispose();filter.dispose();noise.dispose();panner.dispose();}catch(e){} }, 3000); }
      };
    }
    case "modulationReverb": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF" }).toDestination();
      const rev = new Tone.Reverb({ decay: 6, wet: 0.7 }).connect(panner);
      const chorus = new Tone.Chorus(0.8, 3.5, 0.7).connect(rev).start();
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 2.0, decay: 1.0, sustain: 0.6, release: 4.0 },
        volume: -30,
      }).connect(chorus);
      synth.triggerAttack("A3");
      return {
        panner,
        update: (dist, angle) => {
          const vol = Math.max(-60, -12 - dist * 2.5);
          synth.volume.rampTo(vol, 0.3);
          chorus.frequency.rampTo(Math.max(0.1, 2.0 - dist * 0.1), 0.2);
          panner.positionX.rampTo(Math.sin(angle) * dist, 0.1);
          panner.positionZ.rampTo(Math.cos(angle) * dist, 0.1);
        },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();chorus.dispose();rev.dispose();panner.dispose();}catch(e){} }, 4000); }
      };
    }
    case "glitchClicks": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF" }).toDestination();
      const synth = new Tone.MetalSynth({
        frequency: 300,
        envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
        harmonicity: 8,
        modulationIndex: 20,
        resonance: 2000,
        octaves: 2,
        volume: -30,
      }).connect(panner);
      let running = true;
      let rate = 8;
      const loop = new Tone.Loop((time) => {
        if (!running) return;
        if (Math.random() > 0.25) {
          synth.triggerAttackRelease("C4", "64n", time, Math.random() * 0.4 + 0.2);
        }
      }, 1 / rate);
      Tone.getTransport().start();
      loop.start(0);
      return {
        panner,
        update: (dist, angle) => {
          const vol = Math.max(-60, -8 - dist * 3);
          synth.volume.value = vol;
          const newRate = Math.max(2, 20 - dist * 1.2);
          loop.interval = 1 / newRate;
          panner.positionX.rampTo(Math.sin(angle) * dist, 0.1);
          panner.positionZ.rampTo(Math.cos(angle) * dist, 0.1);
        },
        dispose: () => { running = false; loop.stop(); setTimeout(() => { try{loop.dispose();synth.dispose();panner.dispose();}catch(e){} }, 500); }
      };
    }
    case "kikiCluster": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF" }).toDestination();
      const synths = [];
      const baseFreq = 2400;
      for (let i = 0; i < 4; i++) {
        const s = new Tone.FMSynth({
          frequency: baseFreq + i * 137,
          modulationIndex: 6,
          harmonicity: 1.5 + Math.random() * 2.5,
          envelope: { attack: 0.01, decay: 2.0, sustain: 0.3, release: 2.0 },
          modulation: { type: "square" },
          volume: -35,
        }).connect(panner);
        s.triggerAttack(baseFreq + i * 137);
        synths.push(s);
      }
      return {
        panner,
        update: (dist, angle) => {
          const vol = Math.max(-60, -12 - dist * 3);
          synths.forEach((s, i) => {
            s.volume.rampTo(vol, 0.3);
            s.modulationIndex.rampTo(Math.max(1, 12 - dist * 0.6), 0.2);
          });
          panner.positionX.rampTo(Math.sin(angle) * dist, 0.1);
          panner.positionZ.rampTo(Math.cos(angle) * dist, 0.1);
        },
        dispose: () => {
          synths.forEach(s => { try{s.triggerRelease();}catch(e){} });
          setTimeout(() => { synths.forEach(s => { try{s.dispose();}catch(e){} }); try{panner.dispose();}catch(e){} }, 2000);
        }
      };
    }
    default: return { panner: null, update: () => {}, dispose: () => {} };
  }
}

// ============================================================
// 3D FORMOS (tos pacios kaip anksciau)
// ============================================================
function createKikiGeo() {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = (i % 2 === 0) ? 1.8 : 0.5 + Math.random() * 0.4;
    const y = (Math.random() - 0.5) * 1.2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry();
  const v = [];
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    v.push(0,0,0, pts[i].x,pts[i].y,pts[i].z, next.x,next.y,next.z);
    v.push(0,0.8,0, pts[i].x,pts[i].y+0.8,pts[i].z, next.x,next.y+0.8,next.z);
    v.push(pts[i].x,pts[i].y,pts[i].z, pts[i].x,pts[i].y+0.8,pts[i].z, next.x,next.y,next.z);
    v.push(next.x,next.y,next.z, pts[i].x,pts[i].y+0.8,pts[i].z, next.x,next.y+0.8,next.z);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

function createHumGeo() {
  const geo = new THREE.SphereGeometry(1.5, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + Math.sin(x*3)*0.1 + Math.cos(y*4+z*2)*0.08;
    pos.setXYZ(i, x*n, y*0.7*n, z*n);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRumbleGeo() {
  const geo = new THREE.BoxGeometry(2, 2.8, 2, 6, 8, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const w = (y+1.4)/2.8;
    const b = 1 + (1-w)*0.2;
    pos.setXYZ(i, x*b + Math.sin(x*8+z*6)*0.04, y, z*b + Math.sin(x*6)*0.04);
  }
  geo.computeVertexNormals();
  return geo;
}

function createModGeo() {
  const geo = new THREE.TorusGeometry(1.2, 0.5, 24, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    pos.setXYZ(i, x, y + Math.sin(angle*2)*0.3, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createGlitchGeo() {
  const geo = new THREE.IcosahedronGeometry(1.4, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (i % 3 === 0) {
      const s = 0.2 + Math.random() * 0.15;
      pos.setXYZ(i, pos.getX(i)+s, pos.getY(i)-s*0.5, pos.getZ(i)+s*0.3);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// OBJEKTU KONFIGURCIJA — pozicijos 3D erdveje
// ============================================================
const SCULPTURES = [
  { id:"kiki", label:"K — Kiki Cluster", sound:"kikiCluster", color:0xc43a3a, emissive:0x4a0808, geo:createKikiGeo, pos:[0, 0, -20] },
  { id:"rumble", label:"L — Bass Rumble", sound:"bassRumble", color:0x6a4a8a, emissive:0x1a0a2a, geo:createRumbleGeo, pos:[-15, 0, -8] },
  { id:"mod", label:"A — Modulation", sound:"modulationReverb", color:0x2a8a7a, emissive:0x0a2a1e, geo:createModGeo, pos:[16, 0, -12] },
  { id:"hum", label:"U — Low Hum", sound:"lowHum", color:0x3a5a9f, emissive:0x0a0e2a, geo:createHumGeo, pos:[-8, 0, -30] },
  { id:"glitch", label:"Y — Glitch Clicks", sound:"glitchClicks", color:0x9a7a2a, emissive:0x2a1e08, geo:createGlitchGeo, pos:[10, 0, -35] },
];

export default function WorldDemo({ onBack }) {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [dist, setDist] = useState(0);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // === SCENE ===
    const scene = new THREE.Scene();

    // === CAMERA (pirmas asmuo) ===
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 800);
    camera.position.set(0, 1.6, 5); // akiu aukstis
    camera.rotation.order = 'YXZ';

    // === RENDERER ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    container.appendChild(renderer.domElement);

    // === SKYBOX — procedurine atmosfera ===
    const skyGeo = new THREE.SphereGeometry(400, 64, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }
        void main() {
          vec3 dir = normalize(vWorldPos);
          float y = dir.y * 0.5 + 0.5;
          vec3 col;
          if (y > 0.5) {
            col = mix(vec3(0.04, 0.04, 0.08), vec3(0.01, 0.01, 0.03), (y - 0.5) * 2.0);
          } else {
            col = mix(vec3(0.06, 0.03, 0.07), vec3(0.04, 0.04, 0.08), y * 2.0);
          }
          if (y > 0.35) {
            float stars = hash(floor(dir * 350.0));
            float twinkle = sin(uTime * 0.4 + stars * 100.0) * 0.5 + 0.5;
            if (stars > 0.997) col += vec3(0.5, 0.55, 0.7) * twinkle * (y - 0.35) * 3.0;
            else if (stars > 0.993) col += vec3(0.2, 0.2, 0.3) * twinkle * 0.4 * (y - 0.35) * 3.0;
          }
          float hGlow = exp(-abs(y - 0.32) * 10.0) * 0.025;
          col += vec3(0.08, 0.05, 0.1) * hGlow;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Zvaigzdes
    const starCount = 600;
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1), r = 100+Math.random()*250;
      sp[i*3] = r*Math.sin(ph)*Math.cos(th);
      sp[i*3+1] = Math.abs(r*Math.cos(ph))*0.7 + 15;
      sp[i*3+2] = r*Math.sin(ph)*Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x8888bb, size: 0.7, transparent: true, opacity: 0.35, depthWrite: false,
    })));

    scene.fog = new THREE.FogExp2(0x06060c, 0.008);

    // === SVIESOS ===
    scene.add(new THREE.AmbientLight(0x181830, 0.3));
    const moon = new THREE.DirectionalLight(0x8888cc, 0.3);
    moon.position.set(20, 40, -20);
    scene.add(moon);

    // === GRINDYS ===
    const groundGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      gPos.setZ(i, (Math.random() - 0.5) * 0.15);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({
      color: 0x0a0a10, roughness: 0.95, metalness: 0.0,
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    // === SKULPTUROS ===
    const meshes = [];
    const sounds = [];

    SCULPTURES.forEach((s) => {
      const geo = s.geo();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1a22,
        emissive: 0x000000,
        roughness: 0.6,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.pos[0], s.pos[1] + 1.5, s.pos[2]);
      mesh.userData = { ...s, targetColor: 0x1a1a22, targetEmissive: 0x000000 };
      scene.add(mesh);
      meshes.push(mesh);

      // Sviesos stulpas po skulptura — subtilus orientyras
      const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
      const pillarMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.15 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(s.pos[0], 0, s.pos[2]);
      scene.add(pillar);

      // Point light prie skulpturos
      const light = new THREE.PointLight(s.color, 0, 8);
      light.position.set(s.pos[0], 2.5, s.pos[2]);
      scene.add(light);
      mesh.userData.light = light;

      // Garsas
      const sound = createSpatialSound(s.sound);
      sounds.push(sound);
    });

    // === VALDYMAS — WASD + pele ===
    const keys = {};
    const moveSpeed = 0.08;
    let yaw = 0;
    let pitch = 0;
    let isLocked = false;

    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onPointerLock = () => {
      isLocked = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener('pointerlockchange', onPointerLock);

    renderer.domElement.addEventListener('click', () => {
      if (!isLocked) renderer.domElement.requestPointerLock();
    });

    const onMouseMove = (e) => {
      if (!isLocked) return;
      yaw -= e.movementX * 0.002;
      pitch -= e.movementY * 0.002;
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
    };
    document.addEventListener('mousemove', onMouseMove);

    // === ANIMACIJOS CIKLAS ===
    let frame = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Skybox
      skyMat.uniforms.uTime.value = t;

      // Judejimas
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

      if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, moveSpeed);
      if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -moveSpeed);
      if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -moveSpeed);
      if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, moveSpeed);

      camera.position.y = 1.6; // fiksuotas aukstis
      camera.rotation.set(pitch, yaw, 0);

      // Skulpturu animacija + garsas
      let nearestDist = Infinity;
      let nearestLabel = null;

      meshes.forEach((mesh, i) => {
        mesh.rotation.y += 0.005;
        mesh.rotation.x = Math.sin(t * 0.3 + i) * 0.1;

        // Atstumas iki zaidejo
        const dx = camera.position.x - mesh.position.x;
        const dz = camera.position.z - mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        // Garso atnaujinimas
        sounds[i].update(d, angle);

        // Artimiausia skulptura
        if (d < nearestDist) {
          nearestDist = d;
          nearestLabel = mesh.userData.label;
        }

        // Vizualinis aktyvumas pagal atstuma
        const proximity = Math.max(0, 1 - d / 15);
        const targetCol = proximity > 0.1 ? mesh.userData.color : 0x1a1a22;
        const targetEm = proximity > 0.1 ? mesh.userData.emissive : 0x000000;

        mesh.material.color.lerp(new THREE.Color(targetCol), 0.05);
        mesh.material.emissive.lerp(new THREE.Color(targetEm), 0.05);
        mesh.material.emissiveIntensity = proximity * 1.5;

        // Sviesa
        mesh.userData.light.intensity = proximity * 0.8;

        // Pulsavimas kai arti
        if (proximity > 0.2) {
          const pulse = 1 + Math.sin(t * 2.5) * 0.03 * proximity;
          mesh.scale.setScalar(pulse);
        } else {
          mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.05);
        }
      });

      setNearest(nearestDist < 20 ? nearestLabel : null);
      setDist(nearestDist);

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w2 = container.clientWidth, h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    // Help auto-hide
    setTimeout(() => setShowHelp(false), 6000);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLock);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sounds.forEach(s => { try{s.dispose();}catch(e){} });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [started]);

  // === START SCREEN ===
  if (!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        width:"100vw", height:"100vh", background:"#06060a",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        cursor:"pointer", fontFamily:"'Cormorant Garamond', Georgia, serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ color:"#fff", fontSize:"42px", letterSpacing:"18px", fontWeight:300 }}>KLAUSYK</div>
        <div style={{ color:"#444", fontSize:"13px", letterSpacing:"4px", marginTop:"14px", fontWeight:300 }}>
          paspausk kad pradeti
        </div>
        <div style={{ color:"#333", fontSize:"11px", letterSpacing:"2px", marginTop:"40px", textAlign:"center", lineHeight:"2" }}>
          WASD — judeti<br/>
          Pele — dairytis<br/>
          Eik link skulpturu — girdesi garsa
        </div>
        <div style={{ marginTop:"40px", animation:"breathe 3s ease-in-out infinite" }}>
          <svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="#333" strokeWidth="1"/><circle cx="25" cy="25" r="5" fill="#333"/></svg>
        </div>
        <style>{`@keyframes breathe { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.9;transform:scale(1.15)} }`}</style>
      </div>
    );
  }

  // === GAME UI ===
  const nearestObj = nearest ? SCULPTURES.find(s => s.label === nearest) : null;
  const nearHex = nearestObj ? "#" + nearestObj.color.toString(16).padStart(6,"0") : "#333";
  const proximity = nearestObj ? Math.max(0, Math.min(1, 1 - dist / 15)) : 0;

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#06060a", position:"relative", overflow:"hidden",
      fontFamily:"'Cormorant Garamond', Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />

      <div ref={containerRef} style={{ width:"100%", height:"100%", cursor:"none" }} />

      {/* Crosshair */}
      <div style={{
        position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none",
      }}>
        <div style={{ width:"2px", height:"14px", background: nearestObj ? nearHex : "#333",
          position:"absolute", top:"-7px", left:"-1px", opacity:0.5, transition:"background 0.3s" }} />
        <div style={{ width:"14px", height:"2px", background: nearestObj ? nearHex : "#333",
          position:"absolute", top:"-1px", left:"-7px", opacity:0.5, transition:"background 0.3s" }} />
      </div>

      {/* Title */}
      <div style={{
        position:"absolute", top:"16px", left:"20px", pointerEvents:"auto",
      }}>
        <div style={{ color:"#fff", fontSize:"13px", letterSpacing:"8px", fontWeight:300, opacity:0.4 }}>
          KLAUSYKLA
        </div>
        {onBack && <div onClick={() => { document.exitPointerLock(); onBack(); }} style={{
          color:"#333", fontSize:"10px", letterSpacing:"2px", marginTop:"6px",
          cursor:"pointer", transition:"color 0.3s",
        }} onMouseEnter={e => e.target.style.color="#888"} onMouseLeave={e => e.target.style.color="#333"}>
          ← atgal (ESC pirma)
        </div>}
      </div>

      {/* Help overlay */}
      {showHelp && (
        <div style={{
          position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
          color:"#555", fontSize:"12px", letterSpacing:"3px", textAlign:"center",
          lineHeight:"2.2", pointerEvents:"none", animation:"fadeOut 6s forwards",
        }}>
          paspausk kad uzfiksuoti pele<br/>
          WASD — judeti | ESC — atlaisvinti
          <style>{`@keyframes fadeOut { 0%,60%{opacity:1} 100%{opacity:0} }`}</style>
        </div>
      )}

      {/* Bottom HUD */}
      <div style={{
        position:"absolute", bottom:"0", left:"0", right:"0",
        padding:"12px 20px", pointerEvents:"none",
      }}>
        {/* Proximity bar */}
        <div style={{ height:"1px", background:"#111", marginBottom:"8px", overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${proximity * 100}%`,
            background: nearHex, transition:"width 0.2s, background 0.3s",
          }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{
            color: nearestObj ? nearHex : "#1a1a1e", fontSize:"12px",
            letterSpacing:"4px", fontWeight:600, textTransform:"uppercase",
            transition:"color 0.3s",
          }}>
            {nearest || ". . ."}
          </span>
          {nearestObj && (
            <span style={{ color:"#444", fontSize:"10px", fontFamily:"monospace", letterSpacing:"1px" }}>
              {dist.toFixed(1)}m
            </span>
          )}
        </div>
      </div>

      {/* Compass dots — sculpture directions */}
      <div style={{ position:"absolute", bottom:"50px", left:"50%", transform:"translateX(-50%)", pointerEvents:"none",
        display:"flex", gap:"12px" }}>
        {SCULPTURES.map(s => {
          const hex = "#" + s.color.toString(16).padStart(6,"0");
          const isNearest = nearest === s.label;
          return (
            <div key={s.id} style={{
              width:"6px", height:"6px", borderRadius:"50%",
              background: isNearest ? hex : "#1a1a1e",
              boxShadow: isNearest ? `0 0 8px ${hex}` : "none",
              transition:"all 0.3s",
            }} />
          );
        })}
      </div>

      <style>{`* { margin:0; padding:0; box-sizing:border-box; } body { background:#06060a; overflow:hidden; }`}</style>
    </div>
  );
}
