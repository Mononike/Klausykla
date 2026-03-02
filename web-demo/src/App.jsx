import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSAS - Kiki Cluster
// ============================================================
function createKikiSound() {
  const cfg = { panningModel: "HRTF", distanceModel: "exponential", refDistance: 4, maxDistance: 30 };
  
  const p3d = new Tone.Panner3D(cfg).toDestination();
  const syns = [];
  
  for(let i = 0; i < 4; i++) { 
    const s = new Tone.FMSynth({ 
      frequency: 2400 + i * 137, 
      modulationIndex: 6, 
      harmonicity: 1.5 + Math.random() * 2.5, 
      envelope: { attack: 0.01, decay: 2, sustain: 0.3, release: 2 }, 
      modulation: { type: "square" }, 
      volume: -35 
    }).connect(p3d); 
    s.triggerAttack(2400 + i * 137); 
    syns.push(s); 
  }
  
  return { 
    panner: p3d, 
    update: (d) => { 
      const v = Math.max(-60, -12 - d * 3); 
      syns.forEach(s => {
        s.volume.rampTo(v, 0.3);
        s.modulationIndex.rampTo(Math.max(1, 12 - d * 0.5), 0.2);
      }); 
    }, 
    dispose: () => { 
      syns.forEach(s => { try { s.triggerRelease(); } catch(e) {} }); 
      setTimeout(() => { 
        syns.forEach(s => { try { s.dispose(); } catch(e) {} }); 
        try { p3d.dispose(); } catch(e) {} 
      }, 2000);
    } 
  };
}

// ============================================================
// GEOMETRIJA - Kiki Geo
// ============================================================
function createKikiGeo() {
  const pts = [];
  const seed = [0.23, 0.67, 0.45, 0.89, 0.12, 0.56, 0.78, 0.34, 0.91, 0.08, 0.62, 0.43];
  
  for(let i = 0; i < 12; i++) { 
    const a = (i / 12) * Math.PI * 2; 
    const r = (i % 2 === 0) ? 1.8 : 0.5 + seed[i] * 0.4; 
    pts.push(new THREE.Vector3(
      Math.cos(a) * r,
      (seed[i] - 0.5) * 1.2,
      Math.sin(a) * r
    )); 
  }
  
  const geo = new THREE.BufferGeometry();
  const v = [];
  
  for(let i = 0; i < pts.length; i++) { 
    const n = pts[(i + 1) % pts.length]; 
    v.push(0, -0.4, 0, pts[i].x, pts[i].y, pts[i].z, n.x, n.y, n.z); 
    v.push(0, 1.2, 0, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y + 0.8, n.z); 
    v.push(pts[i].x, pts[i].y, pts[i].z, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y, n.z); 
    v.push(n.x, n.y, n.z, pts[i].x, pts[i].y + 0.8, pts[i].z, n.x, n.y + 0.8, n.z); 
  }
  
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); 
  geo.computeVertexNormals(); 
  return geo;
}

const SCULPTURE = {
  id: "kiki",
  label: "KIKI CLUSTER",
  color: 0xc43a3a,
  emissive: 0x4a0808,
  geo: createKikiGeo,
  y: 2,
  desc: "Viršūnė — viskas virpa"
};

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [distance, setDistance] = useState(0);
  const [isInVR, setIsInVR] = useState(false);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // ========== SCENE ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2a); // Tamsus fonas, kad matytųsi šviesos
    
    // ŠVIESOS - labai svarbu VR
    const ambientLight = new THREE.AmbientLight(0x404060); // Ryškesnis ambient
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffaa88, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    
    const backLight = new THREE.PointLight(0x4466aa, 1);
    backLight.position.set(-3, 4, -5);
    scene.add(backLight);

    // Grindys - kad būtų atskaitos taškas
    const gridHelper = new THREE.GridHelper(20, 20, 0xc43a3a, 0x333344);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(20, 32),
      new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = -0.01;
    scene.add(ground);

    // ========== KAMERA ==========
    const camera = new THREE.PerspectiveCamera(65, w/h, 0.1, 1000);
    camera.position.set(3, 1.6, 5);
    camera.rotation.order = 'YXZ';

    // ========== RENDERERIS ==========
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; // Ryškiau
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // ========== SKULPTŪRA ==========
    const geo = SCULPTURE.geo();
    const mat = new THREE.MeshStandardMaterial({
      color: SCULPTURE.color,
      emissive: SCULPTURE.emissive,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.2
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, SCULPTURE.y + 1, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Šviesos aplink skulptūrą
    const light1 = new THREE.PointLight(SCULPTURE.color, 2, 10);
    light1.position.set(1.5, SCULPTURE.y + 1.5, 1.5);
    scene.add(light1);
    
    const light2 = new THREE.PointLight(SCULPTURE.color, 2, 10);
    light2.position.set(-1.5, SCULPTURE.y + 1.5, -1.5);
    scene.add(light2);

    // ========== GARSAS ==========
    let sculptureSound = null;
    let soundActive = false;

    // ========== VR NUSTATYMAI ==========
    let xrSession = null;
    let vrButton = null;
    let isVR = false;

    // Sukuriame VR mygtuką
    vrButton = document.createElement('button');
    vrButton.textContent = '🌌 ENTER VR';
    vrButton.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      padding: 16px 40px;
      background: rgba(196, 58, 58, 0.9);
      color: white;
      border: none;
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      letter-spacing: 4px;
      cursor: pointer;
      z-index: 1000;
      border-radius: 40px;
      backdrop-filter: blur(5px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      font-weight: 400;
    `;
    container.appendChild(vrButton);

    // VR paleidimas
    vrButton.onclick = async () => {
      try {
        if (!xrSession) {
          xrSession = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['bounded-floor']
          });
          
          renderer.xr.setSession(xrSession);
          isVR = true;
          setIsInVR(true);
          vrButton.textContent = '⬅️ EXIT VR';
          vrButton.style.background = 'rgba(30, 30, 40, 0.9)';
          
          xrSession.addEventListener('end', () => {
            xrSession = null;
            isVR = false;
            setIsInVR(false);
            vrButton.textContent = '🌌 ENTER VR';
            vrButton.style.background = 'rgba(196, 58, 58, 0.9)';
          });
        } else {
          xrSession.end();
        }
      } catch (e) {
        console.error('VR klaida:', e);
        alert('VR nepalaikomas arba įvyko klaida');
      }
    };

    // ========== VALDYMAS ==========
    const keys = {};
    let yaw = 0, pitch = 0;
    const moveSpeed = 0.15;

    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // ========== ANIMACIJA ==========
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      const delta = Math.min(0.1, clock.getDelta());

      // Desktop judėjimas (tik kai ne VR)
      if (!isVR) {
        if (keys['KeyW']) camera.position.z -= moveSpeed;
        if (keys['KeyS']) camera.position.z += moveSpeed;
        if (keys['KeyA']) camera.position.x -= moveSpeed;
        if (keys['KeyD']) camera.position.x += moveSpeed;
        if (keys['Space']) camera.position.y += moveSpeed;
        if (keys['ShiftLeft']) camera.position.y -= moveSpeed;
      }

      // GAUNAME KAMEROS POZICIJĄ - svarbu ir VR, ir desktop
      const camPos = new THREE.Vector3();
      
      if (isVR) {
        // VR režime imame iš XR kameros
        const xrCamera = renderer.xr.getCamera();
        if (xrCamera) {
          xrCamera.getWorldPosition(camPos);
        } else {
          // Fallback
          camPos.copy(camera.position);
        }
      } else {
        camPos.copy(camera.position);
      }

      // SKAIČIUOJAME ATSTUMĄ
      const dx = camPos.x - mesh.position.x;
      const dy = camPos.y - mesh.position.y;
      const dz = camPos.z - mesh.position.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      setDistance(dist);

      // ANIMACIJA - visada vyksta
      mesh.rotation.y += 0.005;
      mesh.rotation.x = Math.sin(t * 0.5) * 0.1;

      // GARSO VALDYMAS
      if (dist < 15 && !soundActive) {
        try {
          sculptureSound = createKikiSound();
          soundActive = true;
          console.log('Garsas sukurtas');
        } catch(e) { 
          console.warn('Garso klaida:', e); 
        }
      } else if (dist >= 20 && soundActive) {
        try { 
          if (sculptureSound) sculptureSound.dispose(); 
        } catch(e) {}
        sculptureSound = null;
        soundActive = false;
        console.log('Garsas išjungtas');
      }

      if (sculptureSound && soundActive) {
        if (sculptureSound.panner) {
          sculptureSound.panner.positionX.value = mesh.position.x;
          sculptureSound.panner.positionY.value = mesh.position.y;
          sculptureSound.panner.positionZ.value = mesh.position.z;
        }
        sculptureSound.update(dist);
      }

      // ŠVIESŲ PULSAVIMAS
      const intensity = 1 + Math.sin(t * 3) * 0.3;
      light1.intensity = 1.5 + (1 - Math.min(1, dist/10)) * 2;
      light2.intensity = 1.5 + (1 - Math.min(1, dist/10)) * 2;

      // RENDER
      renderer.render(scene, camera);
    });

    // Resize handler
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (sculptureSound) sculptureSound.dispose();
      if (vrButton && container.contains(vrButton)) container.removeChild(vrButton);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [started]);

  // Pradžios ekranas
  if (!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at center, #2a1a2a, #0a0a1a)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        color: "#c43a3a"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ fontSize: "64px", fontWeight: 300, letterSpacing: "12px", marginBottom: "20px", textShadow: "0 0 20px rgba(196,58,58,0.5)" }}>
          KIKI
        </div>
        <div style={{ fontSize: "16px", opacity: 0.8, textAlign: "center", lineHeight: "2", color: "#fff" }}>
          SPUSTELĖK KAD PRADĖTI<br/>
          ←↑↓→ judėk | SPACE kilti | SHIFT leistis<br/>
          <span style={{ color: "#c43a3a" }}>VR palaikomas</span>
        </div>
      </div>
    );
  }

  // UI
  const colorHex = "#" + SCULPTURE.color.toString(16).padStart(6, "0");
  const proximity = Math.max(0, Math.min(1, 1 - distance / 15));

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
      
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Crosshair */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 10
      }}>
        <div style={{ width: "4px", height: "4px", background: colorHex, borderRadius: "50%", opacity: 0.8 }} />
      </div>

      {/* Info */}
      <div style={{
        position: "absolute",
        bottom: "30px",
        left: "30px",
        color: "#fff",
        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        pointerEvents: "none",
        zIndex: 10
      }}>
        <div style={{ color: colorHex, fontSize: "24px", fontWeight: 300, marginBottom: "4px" }}>
          {SCULPTURE.label}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>
          {SCULPTURE.desc}
        </div>
        <div style={{ fontSize: "12px", opacity: 0.5, marginTop: "8px" }}>
          {isInVR ? '📱 VR AKTYVUS' : '💻 DESKTOP'}
        </div>
      </div>

      {/* Atstumas */}
      <div style={{
        position: "absolute",
        bottom: "30px",
        right: "30px",
        color: "#fff",
        fontSize: "32px",
        fontWeight: 300,
        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        pointerEvents: "none",
        zIndex: 10
      }}>
        {distance.toFixed(1)}<span style={{ fontSize: "16px", opacity: 0.5 }}>m</span>
      </div>
    </div>
  );
}
