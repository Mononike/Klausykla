import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// Paprasta geometrija testavimui
function createSimpleGeo() {
  const geo = new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16);
  return geo;
}

function createKikiSound() {
  const cfg = { 
    panningModel: "HRTF", 
    distanceModel: "exponential", 
    refDistance: 4, 
    maxDistance: 30 
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
  const [debug, setDebug] = useState("Pradžia");
  const [vrSupported, setVrSupported] = useState(false);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    
    console.log("🚀 Paleidžiama...");
    setDebug("Paleidžiama...");
    
    const container = containerRef.current;

    try {
      // ========== PATIKRINIMAI ==========
      if (!navigator.xr) {
        console.error("❌ WebXR nepalaikomas");
        setDebug("WebXR nepalaikomas");
      } else {
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
          console.log("📱 VR palaikomas:", supported);
          setVrSupported(supported);
          setDebug(supported ? "VR palaikomas ✓" : "VR nepalaikomas ✗");
        });
      }

      // ========== SCENE ==========
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x220022);
      console.log("✅ Scena sukurta");

      // ========== KAMERA ==========
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(2, 1.6, 4);
      console.log("✅ Kamera sukurta");

      // ========== RENDERERIS ==========
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          powerPreference: "high-performance",
          xrCompatible: true
        });
        console.log("✅ WebGL rendereris sukurtas");
      } catch (e) {
        console.error("❌ WebGL klaida:", e);
        setDebug("WebGL klaida: " + e.message);
        return;
      }
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(2);
      renderer.xr.enabled = true;
      container.appendChild(renderer.domElement);
      console.log("✅ DOM elementas pridėtas");

      // ========== ŠVIESOS ==========
      const ambientLight = new THREE.AmbientLight(0x404060);
      scene.add(ambientLight);
      
      const light1 = new THREE.PointLight(0xff3366, 2, 10);
      light1.position.set(1, 2, 1);
      scene.add(light1);
      
      const light2 = new THREE.PointLight(0x3366ff, 1, 10);
      light2.position.set(-1, 1, -1);
      scene.add(light2);
      
      console.log("✅ Šviesos pridėtos");

      // ========== GRINDYS ==========
      const gridHelper = new THREE.GridHelper(10, 20, 0xff3366, 0x333366);
      gridHelper.position.y = 0;
      scene.add(gridHelper);
      
      // Ryškus rutulys testavimui
      const sphereGeo = new THREE.SphereGeometry(0.2, 16);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(0, 0.2, 0);
      scene.add(sphere);
      
      console.log("✅ Grid helper pridėtas");

      // ========== SKULPTŪRA ==========
      let mesh;
      try {
        const geometry = createSimpleGeo();
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xff3366,
          emissive: 0x330000,
          roughness: 0.3,
          metalness: 0.1
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 1.8, 0);
        scene.add(mesh);
        console.log("✅ Skulptūra pridėta");
        setDebug("Viskas paruošta ✓");
      } catch (e) {
        console.error("❌ Skulptūros klaida:", e);
        setDebug("Geometrijos klaida");
      }

      // ========== GARSAS ==========
      let kikiSound = null;
      let soundActive = false;

      // ========== VR MYGTUKAS ==========
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

      // ========== ANIMACIJA ==========
      const clock = new THREE.Clock();

      renderer.setAnimationLoop(() => {
        const time = performance.now() / 1000;

        if (mesh) {
          mesh.rotation.y += 0.01;
          mesh.rotation.x = Math.sin(time) * 0.1;
        }

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
        
        if (mesh) {
          const dist = camPos.distanceTo(mesh.position);
          
          // Garsas
          if (dist < 10 && !soundActive) {
            try {
              kikiSound = createKikiSound();
              soundActive = true;
              console.log('🎵 Garsas įjungtas, atstumas:', dist);
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
              kikiSound.panner.positionX.value = mesh.position.x;
              kikiSound.panner.positionY.value = mesh.position.y;
              kikiSound.panner.positionZ.value = mesh.position.z;
            }
            kikiSound.update(dist);
          }
        }

        renderer.render(scene, camera);
      });

      console.log("✅ Animacijos ciklas paleistas");

    } catch (e) {
      console.error("❌ FATALI KLAIDA:", e);
      setDebug("Klaida: " + e.message);
    }

    return () => {
      console.log("🧹 Valomi resursai...");
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }
    };
  }, [started]);

  if (!started) {
    return (
      <div onClick={async () => { 
        console.log("🎯 Pradedama...");
        await Tone.start(); 
        setStarted(true); 
      }} style={{
        width: "100vw", 
        height: "100vh",
        background: "#220022",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center",
        cursor: "pointer", 
        fontFamily: "monospace",
        color: "#ff3366"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "40px" }}>
          TEST
        </div>
        <div style={{ color: "white", textAlign: "center", lineHeight: "2" }}>
          Spustelėk bet kur<br/>
          <span style={{ color: "#ff3366" }}>Meta Quest 3 testas</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      
      {/* Debug info */}
      <div style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        background: "rgba(0,0,0,0.8)",
        color: "#ff3366",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "14px",
        zIndex: 10001,
        borderRadius: "5px"
      }}>
        Status: {debug}<br/>
        VR: {vrSupported ? "✓" : "✗"}<br/>
      </div>
    </div>
  );
}
