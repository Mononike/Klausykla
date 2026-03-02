import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSAS - Kiki Cluster (originalus)
// ============================================================
function createKikiSound() {
  const cfg = { 
    panningModel: "HRTF", 
    distanceModel: "exponential", 
    refDistance: 4, 
    maxDistance: 30,
    rolloffFactor: 1.5
  };
  
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
// GEOMETRIJA - Kiki Geo (originali)
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

// ============================================================
// SKULPTŪROS DUOMENYS
// ============================================================
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
  const [debug, setDebug] = useState("Pradžia");

  useEffect(() => {
    if (!started || !containerRef.current) return;
    
    const container = containerRef.current;
    
    // ============================================================
    // SVARBIAUSIA DALIS - TEISINGAS WEBGL KONTEKSTO SUKŪRIMAS QUEST 3
    // ============================================================
    try {
      setDebug("Kuriamas canvas...");
      
      // 1. Susikuriame canvas patys (ne per Three.js)
      const canvas = document.createElement('canvas');
      
      // 2. Iš karto sukuriam WebGL kontekstą su xrCompatible: true
      //    Tai išsprendžia CONTEXT_LOST klaidą Meta Quest naršyklėje
      const gl = canvas.getContext('webgl', { 
        xrCompatible: true,        // KRITIŠKAI SVARBU Quest 3
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        depth: true,
        stencil: false
      });
      
      if (!gl) {
        setDebug("WebGL nepalaikomas!");
        console.error('WebGL nepalaikomas');
        return;
      }
      
      setDebug("WebGL kontekstas sukurtas");
      
      // 3. Sukuriame Three.js rendererį su jau paruoštu canvas ir kontekstu
      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        context: gl,
        antialias: true,
        powerPreference: "high-performance"
      });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.xr.enabled = true;
      
      container.appendChild(renderer.domElement);
      setDebug("Rendereris sukurtas");

      // ============================================================
      // SCENA IR KAMERA
      // ============================================================
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e); // Tamsiai mėlyna
      
      // Pridedame miglą, kad geriau jaustųsi gylis
      scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(3, 1.8, 5);
      camera.rotation.order = 'YXZ';

      // ============================================================
      // ŠVIESOS - ryškios, kad gerai matytųsi Quest 3 ekrane
      // ============================================================
      const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
      scene.add(ambientLight);
      
      // Pagrindinė šviesa iš viršaus
      const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
      topLight.position.set(0, 10, 0);
      scene.add(topLight);
      
      // Spalvotos šviesos skulptūrai
      const light1 = new THREE.PointLight(SCULPTURE.color, 1.5, 15);
      light1.position.set(2, 3, 2);
      scene.add(light1);
      
      const light2 = new THREE.PointLight(0x3a6ac4, 1.0, 15);
      light2.position.set(-2, 2, -2);
      scene.add(light2);
      
      const light3 = new THREE.PointLight(0x6a3ac4, 0.8, 15);
      light3.position.set(1, 4, -2);
      scene.add(light3);

      // ============================================================
      // GRINDYS - kad būtų atskaitos taškas
      // ============================================================
      // Peršviečiama platforma
      const groundGeo = new THREE.CircleGeometry(8, 32);
      const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x222233,
        emissive: 0x111122,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      scene.add(ground);
      
      // Tinklelis orientacijai
      const gridHelper = new THREE.GridHelper(15, 30, SCULPTURE.color, 0x333366);
      gridHelper.position.y = 0.01;
      scene.add(gridHelper);
      
      // Apskritimai aplinkui
      const ringGeo = new THREE.TorusGeometry(1.5, 0.03, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: SCULPTURE.color, emissive: SCULPTURE.emissive });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      scene.add(ring);

      // ============================================================
      // SKULPTŪRA
      // ============================================================
      setDebug("Kuriama skulptūra...");
      
      const geometry = SCULPTURE.geo();
      const material = new THREE.MeshStandardMaterial({
        color: SCULPTURE.color,
        emissive: SCULPTURE.emissive,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.1,
        flatShading: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, SCULPTURE.y + 1.0, 0);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);
      
      // Pridedame švytinčią apskritimą aplink skulptūrą
      const auraGeo = new THREE.SphereGeometry(1.8, 32, 16);
      const auraMat = new THREE.MeshBasicMaterial({
        color: SCULPTURE.color,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.copy(mesh.position);
      scene.add(aura);
      
      // Pridedame mažas švieselės aplinkui
      const particleCount = 50;
      const particleGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 2.2;
        particlePositions[i*3] = Math.cos(angle) * radius;
        particlePositions[i*3+1] = SCULPTURE.y + 1.0 + Math.sin(angle * 3) * 0.3;
        particlePositions[i*3+2] = Math.sin(angle) * radius;
      }
      
      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: SCULPTURE.color,
        size: 0.08,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);
      
      setDebug("Skulptūra sukurta");

      // ============================================================
      // GARSAS
      // ============================================================
      let kikiSound = null;
      let soundActive = false;

      // ============================================================
      // VR MYGTUKAS
      // ============================================================
      const vrButton = document.createElement('button');
      vrButton.textContent = '🎮 PRADĖTI VR REŽIMĄ';
      vrButton.style.cssText = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        padding: 22px 70px;
        background: #c43a3a;
        color: white;
        border: none;
        border-radius: 60px;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 0 40px rgba(196,58,58,0.8);
        border: 3px solid #ff6b6b;
        font-family: Arial, sans-serif;
        letter-spacing: 2px;
        transition: all 0.2s;
      `;
      
      vrButton.onmouseover = () => {
        vrButton.style.transform = 'translateX(-50%) scale(1.05)';
        vrButton.style.background = '#d54a4a';
      };
      
      vrButton.onmouseout = () => {
        vrButton.style.transform = 'translateX(-50%) scale(1)';
        vrButton.style.background = '#c43a3a';
      };
      
      container.appendChild(vrButton);

      // Patikriname ar VR palaikomas
      if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
          if (!supported) {
            vrButton.textContent = '❌ VR NEPALAIKOMAS';
            vrButton.style.background = '#666';
            vrButton.disabled = true;
            setDebug("VR nepalaikomas");
          } else {
            setDebug("VR palaikomas ✓");
          }
        });
      } else {
        vrButton.textContent = '❌ WEBXR NERASTAS';
        vrButton.style.background = '#666';
        vrButton.disabled = true;
        setDebug("WebXR nerastas");
      }

      vrButton.onclick = async () => {
        try {
          if (renderer.xr.isPresenting) {
            await renderer.xr.getSession().end();
            vrButton.textContent = '🎮 PRADĖTI VR REŽIMĄ';
            setIsInVR(false);
          } else {
            setDebug("Pradedama VR sesija...");
            
            // NEBANDOME daryti makeXRCompatible() - jau padarėme per xrCompatible: true
            const session = await navigator.xr.requestSession('immersive-vr', {
              requiredFeatures: ['local-floor'],
              optionalFeatures: ['hand-tracking']
            });
            
            session.addEventListener('end', () => {
              vrButton.textContent = '🎮 PRADĖTI VR REŽIMĄ';
              setIsInVR(false);
              setDebug("VR sesija baigta");
            });
            
            renderer.xr.setSession(session);
            vrButton.textContent = '⏹️ BAIGTI VR REŽIMĄ';
            setIsInVR(true);
            setDebug("VR aktyvus");
          }
        } catch (e) {
          console.error('VR klaida:', e);
          alert('Nepavyko įjungti VR: ' + e.message);
          setDebug("VR klaida: " + e.message);
        }
      };

      // ============================================================
      // KONTROLERIAI
      // ============================================================
      const controller1 = renderer.xr.getController(0);
      const controller2 = renderer.xr.getController(1);
      
      // Pridedame vizualizaciją kontroleriams
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -0.5)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: SCULPTURE.color });
      
      const line1 = new THREE.Line(lineGeo, lineMat);
      controller1.add(line1);
      
      const line2 = new THREE.Line(lineGeo, lineMat);
      controller2.add(line2);
      
      // Pridedame mažus rutuliukus ant kontrolerių
      const sphereGeoCtrl = new THREE.SphereGeometry(0.03, 8);
      const sphereMatCtrl = new THREE.MeshBasicMaterial({ color: SCULPTURE.color });
      
      const sphere1 = new THREE.Mesh(sphereGeoCtrl, sphereMatCtrl);
      sphere1.position.set(0, 0, -0.5);
      controller1.add(sphere1);
      
      const sphere2 = new THREE.Mesh(sphereGeoCtrl, sphereMatCtrl);
      sphere2.position.set(0, 0, -0.5);
      controller2.add(sphere2);
      
      scene.add(controller1);
      scene.add(controller2);

      // ============================================================
      // VALDYMAS KEYBOARD (desktop)
      // ============================================================
      const keys = {};
      let yaw = 0, pitch = 0;
      const moveSpeed = 0.15;

      window.addEventListener('keydown', (e) => { keys[e.code] = true; });
      window.addEventListener('keyup', (e) => { keys[e.code] = false; });

      // ============================================================
      // ANIMACIJA
      // ============================================================
      const clock = new THREE.Clock();

      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        const time = performance.now() / 1000;

        // Desktop judėjimas (tik kai ne VR)
        if (!renderer.xr.isPresenting) {
          if (keys['KeyW']) camera.position.z -= moveSpeed;
          if (keys['KeyS']) camera.position.z += moveSpeed;
          if (keys['KeyA']) camera.position.x -= moveSpeed;
          if (keys['KeyD']) camera.position.x += moveSpeed;
          if (keys['Space']) camera.position.y += moveSpeed * 0.8;
          if (keys['ShiftLeft']) camera.position.y -= moveSpeed * 0.8;
          
          // Apribojame aukštį
          camera.position.y = Math.max(0.5, Math.min(8, camera.position.y));
        }

        // Skulptūros animacija
        mesh.rotation.y += 0.005;
        mesh.rotation.x = Math.sin(time * 0.5) * 0.1;
        
        aura.rotation.y += 0.002;
        aura.rotation.x = Math.sin(time * 0.3) * 0.05;
        
        particles.rotation.y += 0.01;

        // Gauname kameros poziciją
        const camPos = new THREE.Vector3();
        if (renderer.xr.isPresenting) {
          const xrCamera = renderer.xr.getCamera();
          if (xrCamera) {
            xrCamera.getWorldPosition(camPos);
          } else {
            camPos.copy(camera.position);
          }
        } else {
          camPos.copy(camera.position);
        }
        
        // Atstumas iki skulptūros
        const dist = camPos.distanceTo(mesh.position);
        setDistance(dist);
        
        // Garsas - lazy loading
        if (dist < 15 && !soundActive) {
          try {
            kikiSound = createKikiSound();
            soundActive = true;
            console.log('🎵 Garsas įjungtas, atstumas:', dist.toFixed(1));
          } catch(e) { 
            console.warn('Garso klaida:', e); 
          }
        } else if (dist > 20 && soundActive) {
          if (kikiSound) {
            kikiSound.dispose();
            kikiSound = null;
          }
          soundActive = false;
          console.log('🔇 Garsas išjungtas');
        }

        if (kikiSound && soundActive) {
          if (kikiSound.panner) {
            kikiSound.panner.positionX.value = mesh.position.x;
            kikiSound.panner.positionY.value = mesh.position.y;
            kikiSound.panner.positionZ.value = mesh.position.z;
          }
          kikiSound.update(dist);
        }

        // Šviesų intensyvumas pagal atstumą
        const intensity = Math.max(0.5, 2.0 - dist / 8);
        light1.intensity = intensity;
        
        // Pulsavimas kai arti
        if (dist < 4) {
          const pulse = 1 + Math.sin(time * 5) * 0.1;
          mesh.scale.setScalar(pulse);
          aura.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
        } else {
          mesh.scale.setScalar(1);
          aura.scale.setScalar(1);
        }

        renderer.render(scene, camera);
      });

      setDebug("Veikia ✓");

      // ============================================================
      // RESIZE HANDLER
      // ============================================================
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      
      window.addEventListener('resize', onResize);

      // ============================================================
      // CLEANUP
      // ============================================================
      return () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        if (kikiSound) kikiSound.dispose();
        if (vrButton && container.contains(vrButton)) container.removeChild(vrButton);
      };
      
    } catch (error) {
      console.error("Klaida:", error);
      setDebug("Klaida: " + error.message);
    }
  }, [started]);

  // ============================================================
  // PRADŽIOS EKRANAS
  // ============================================================
  if (!started) {
    return (
      <div onClick={async () => { 
        try {
          await Tone.start(); 
          setStarted(true); 
        } catch(e) {
          console.warn("Garso paleidimo klaida:", e);
          setStarted(true);
        }
      }} style={{
        width: "100vw", 
        height: "100vh",
        background: "radial-gradient(circle at center, #2a1a2a, #0a0a1a)",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center",
        cursor: "pointer", 
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{ 
          fontSize: "64px", 
          marginBottom: "40px",
          color: "#c43a3a",
          textShadow: "0 0 30px rgba(196,58,58,0.5)"
        }}>
          KIKI
        </div>
        <div style={{ 
          color: "white", 
          textAlign: "center", 
          lineHeight: "2",
          fontSize: "20px"
        }}>
          Spustelėk bet kur pradėti<br/>
          <span style={{ color: "#c43a3a" }}>✓ Optimizuota Meta Quest 3</span>
        </div>
        <div style={{ 
          color: "#666", 
          marginTop: "60px",
          fontSize: "14px"
        }}>
          Jei negirdi garso - spustelėk dar kartą
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGRINDINIS RODINYS
  // ============================================================
  const proximity = Math.max(0, Math.min(1, 1 - distance / 15));
  const colorHex = "#" + SCULPTURE.color.toString(16).padStart(6, "0");

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily: "Arial, sans-serif"
    }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Crosshair - lengvai matomas */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 1000
      }}>
        <div style={{ 
          width: "6px", 
          height: "6px", 
          background: colorHex, 
          borderRadius: "50%",
          boxShadow: "0 0 15px " + colorHex
        }} />
      </div>

      {/* Informacija viršuje */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        color: "white",
        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        zIndex: 1000,
        background: "rgba(0,0,0,0.3)",
        padding: "10px 20px",
        borderRadius: "30px",
        backdropFilter: "blur(5px)"
      }}>
        <div style={{ color: colorHex, fontSize: "18px", fontWeight: "bold" }}>
          {SCULPTURE.label}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.8 }}>
          {SCULPTURE.desc}
        </div>
      </div>

      {/* Atstumo indikatorius apačioje */}
      <div style={{
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "white",
        fontSize: "28px",
        fontWeight: "bold",
        textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        zIndex: 1000,
        background: "rgba(0,0,0,0.3)",
        padding: "10px 30px",
        borderRadius: "50px",
        backdropFilter: "blur(5px)",
        border: "1px solid " + colorHex
      }}>
        {distance.toFixed(1)} <span style={{ fontSize: "16px", opacity: 0.7 }}>metrų</span>
      </div>

      {/* Artumo juosta */}
      <div style={{
        position: "absolute",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "300px",
        height: "4px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "2px",
        zIndex: 1000
      }}>
        <div style={{
          width: `${proximity * 100}%`,
          height: "100%",
          background: colorHex,
          borderRadius: "2px",
          boxShadow: "0 0 20px " + colorHex,
          transition: "width 0.1s"
        }} />
      </div>

      {/* VR indikatorius */}
      {isInVR && (
        <div style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          color: colorHex,
          fontSize: "14px",
          background: "rgba(0,0,0,0.5)",
          padding: "5px 15px",
          borderRadius: "20px",
          border: "1px solid " + colorHex,
          zIndex: 1000
        }}>
          🥽 VR AKTYVUS
        </div>
      )}

      {/* Debug info (neprivaloma) */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        color: "#666",
        fontSize: "12px",
        zIndex: 1000
      }}>
        {debug}
      </div>
    </div>
  );
}
