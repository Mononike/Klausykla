import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

function createKikiSound() {
  const cfg = { 
    panningModel: "HRTF", 
    distanceModel: "exponential", 
    refDistance: 4, 
    maxDistance: 30,
    rolloffFactor: 1.5
  };
  
  const p3d = new Tone.Panner3D(cfg).toDestination();
  const syn = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
  }).connect(p3d);
  
  syn.volume.value = -20;
  syn.triggerAttack("C4");
  
  return { 
    panner: p3d, 
    update: (d) => {
      const vol = Math.max(-40, -20 - d);
      syn.volume.rampTo(vol, 0.1);
    }, 
    dispose: () => { 
      syn.triggerRelease();
      setTimeout(() => {
        try { syn.dispose(); p3d.dispose(); } catch(e) {}
      }, 1000);
    } 
  };
}

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    
    const container = containerRef.current;

    // === 1. PIRMA SUKURIAME CANVAS SU TEISINGAIS PARAMETRAIS ===
    const canvas = document.createElement('canvas');
    
    // SVARBU: xrCompatible: true turi būti iškart, o ne per makeXRCompatible()
    // Tai išsprendžia ContextLost klaidą Quest Link [citation:1]
    const gl = canvas.getContext('webgl', { 
      xrCompatible: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    
    if (!gl) {
      console.error('WebGL nepalaikomas');
      return;
    }

    // === 2. SCENE SU PAPRASTOMIS SPALVOMIS ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x226622); // Ryškiai žalia - jei matosi, vadinasi veikia

    // === 3. KAMERA ===
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 1.6, 4);

    // === 4. RENDERERIS SU JAU PARUOŠTU CANVAS ===
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(2);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // === 5. ŠVIESOS ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const light1 = new THREE.PointLight(0xff3366, 2, 10);
    light1.position.set(2, 3, 2);
    scene.add(light1);
    
    const light2 = new THREE.PointLight(0x3366ff, 1, 10);
    light2.position.set(-2, 2, -2);
    scene.add(light2);

    // === 6. PAPRASTAS OBJEKTAS - RUTULYS ===
    // Naudojam paprastą geometriją, kuri tikrai veiks
    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({ 
      color: 0xffaa00,
      emissive: 0x442200
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(0, 1.5, 0);
    scene.add(sphere);

    // Pridedam tinklelį, kad matytųsi grindys
    const gridHelper = new THREE.GridHelper(10, 20, 0xff3366, 0x333366);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // === 7. GARSAS ===
    let kikiSound = null;
    let soundActive = false;

    // === 8. VR MYGTUKAS ===
    const vrButton = document.createElement('button');
    vrButton.textContent = '🎮 PRADĖTI VR';
    vrButton.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      padding: 20px 60px;
      background: #ff3366;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 0 30px #ff3366;
      border: 3px solid #ff6699;
    `;
    container.appendChild(vrButton);

    vrButton.onclick = async () => {
      try {
        if (renderer.xr.isPresenting) {
          await renderer.xr.getSession().end();
          vrButton.textContent = '🎮 PRADĖTI VR';
        } else {
          console.log("🎯 Bandau pradėti VR sesiją...");
          
          // NEBANDOME daryti makeXRCompatible() - jau padarėme per xrCompatible: true
          const session = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor']
          });
          
          session.addEventListener('end', () => {
            vrButton.textContent = '🎮 PRADĖTI VR';
          });
          
          renderer.xr.setSession(session);
          vrButton.textContent = '⏹️ BAIGTI VR';
          console.log("✅ VR sesija aktyvi");
        }
      } catch (e) {
        console.error('❌ VR klaida:', e);
        alert('VR klaida: ' + e.message);
      }
    };

    // === 9. ANIMACIJA ===
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const time = performance.now() / 1000;

      // Sukam rutulį
      sphere.rotation.y += 0.01;
      sphere.rotation.x = Math.sin(time) * 0.1;

      // Gauname kameros poziciją
      const camPos = new THREE.Vector3();
      if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera();
        xrCamera.getWorldPosition(camPos);
      } else {
        camPos.copy(camera.position);
      }
      
      const dist = camPos.distanceTo(sphere.position);
      setDistance(dist);
      
      // Garsas
      if (dist < 10 && !soundActive) {
        try {
          kikiSound = createKikiSound();
          soundActive = true;
          console.log('🎵 Garsas įjungtas');
        } catch(e) { 
          console.warn('Garso klaida:', e); 
        }
      } else if (dist > 15 && soundActive) {
        if (kikiSound) kikiSound.dispose();
        kikiSound = null;
        soundActive = false;
      }

      if (kikiSound && soundActive) {
        if (kikiSound.panner) {
          kikiSound.panner.positionX.value = sphere.position.x;
          kikiSound.panner.positionY.value = sphere.position.y;
          kikiSound.panner.positionZ.value = sphere.position.z;
        }
        kikiSound.update(dist);
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (kikiSound) kikiSound.dispose();
      if (vrButton && container.contains(vrButton)) container.removeChild(vrButton);
    };
  }, [started]);

  if (!started) {
    return (
      <div onClick={async () => { 
        await Tone.start(); 
        setStarted(true); 
      }} style={{
        width: "100vw", 
        height: "100vh",
        background: "#226622",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center",
        cursor: "pointer", 
        fontFamily: "Arial, sans-serif",
        color: "white"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "40px" }}>
          QUEST 3 TESTAS
        </div>
        <div style={{ textAlign: "center", lineHeight: "2" }}>
          Spustelėk bet kur pradėti<br/>
          <span style={{ color: "#ffaa00" }}>Jei matai šį tekstą - puslapis veikia</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      
      {/* Atstumo indikatorius */}
      <div style={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "white",
        fontSize: "24px",
        background: "rgba(0,0,0,0.5)",
        padding: "10px 20px",
        borderRadius: "10px",
        zIndex: 10001
      }}>
        Atstumas: {distance.toFixed(1)}m
      </div>
    </div>
  );
}
