import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ==================== GARSAS ====================
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

// ==================== SKULPTŪRA ====================
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

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    
    const container = containerRef.current;

    // ========== SCENE ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // ========== KAMERA ==========
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 1.6, 5);

    // ========== RENDERERIS ==========
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(2); // Quest 3 turi gerą rezoliuciją
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // ========== ŠVIESOS ==========
    const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
    scene.add(ambientLight);
    
    // Pagrindinė šviesa
    const mainLight = new THREE.DirectionalLight(0xffccaa, 1.5);
    mainLight.position.set(2, 5, 3);
    scene.add(mainLight);
    
    // Spalvotos šviesos
    const redLight = new THREE.PointLight(0xc43a3a, 2, 10);
    redLight.position.set(1.5, 3, 1.5);
    scene.add(redLight);
    
    const blueLight = new THREE.PointLight(0x3a6ac4, 1.5, 10);
    blueLight.position.set(-1.5, 2.5, -1.5);
    scene.add(blueLight);

    // ========== GRINDYS ==========
    // Tinklelis orientacijai
    const gridHelper = new THREE.GridHelper(15, 30, 0xc43a3a, 0x333366);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    
    // Peršviečiamas grindų paviršius
    const groundGeometry = new THREE.CircleGeometry(15, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222233,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // ========== SKULPTŪRA ==========
    const geometry = createKikiGeo();
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xc43a3a, 
      emissive: 0x4a0808,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 2.5, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Aplink plūduriuojantys taškai
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      
      posArray[i] = Math.sin(theta) * Math.cos(phi) * radius;
      posArray[i+1] = Math.sin(theta) * Math.sin(phi) * radius + 2.5;
      posArray[i+2] = Math.cos(theta) * radius;
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0xc43a3a,
      size: 0.05,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // ========== GARSAS ==========
    let kikiSound = null;
    let soundActive = false;

    // ========== VR MYGTUKAS (Quest 3 optimizuotas) ==========
    const vrButton = document.createElement('button');
    vrButton.textContent = 'ĮJUNGTI VR REŽIMĄ';
    vrButton.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      padding: 20px 60px;
      background: #c43a3a;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 0 30px rgba(196,58,58,0.8);
      border: 2px solid #ff6b6b;
      font-family: Arial, sans-serif;
    `;
    container.appendChild(vrButton);

    // Tikrinam ar Quest 3 palaiko VR
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (!supported) {
          vrButton.textContent = 'VR NEPALAIKOMAS';
          vrButton.style.background = '#666';
          vrButton.disabled = true;
        }
      });
    } else {
      vrButton.textContent = 'WEBXR NERASTAS';
      vrButton.style.background = '#666';
      vrButton.disabled = true;
    }

    vrButton.onclick = async () => {
      try {
        if (renderer.xr.isPresenting) {
          await renderer.xr.getSession().end();
          vrButton.textContent = 'ĮJUNGTI VR REŽIMĄ';
        } else {
          const session = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking']
          });
          
          session.addEventListener('end', () => {
            vrButton.textContent = 'ĮJUNGTI VR REŽIMĄ';
          });
          
          renderer.xr.setSession(session);
          vrButton.textContent = 'IŠJUNGTI VR REŽIMĄ';
        }
      } catch (e) {
        console.error('VR klaida:', e);
        alert('Nepavyko įjungti VR: ' + e.message);
      }
    };

    // ========== KONTROLERIAI ==========
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    
    // Pridedam kontrollerių modelius (paprastas linijas)
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc43a3a });
    
    const line1 = new THREE.Line(lineGeometry, lineMaterial);
    controller1.add(line1);
    
    const line2 = new THREE.Line(lineGeometry, lineMaterial);
    controller2.add(line2);
    
    scene.add(controller1);
    scene.add(controller2);

    // ========== ANIMACIJA ==========
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      const time = performance.now() / 1000;

      // Sukam skulptūrą
      mesh.rotation.y += 0.005;
      mesh.rotation.x = Math.sin(time * 0.5) * 0.1;
      
      // Sukam daleles
      particles.rotation.y += 0.001;

      // Gauname kameros poziciją
      const camPos = new THREE.Vector3();
      if (renderer.xr.isPresenting) {
        // VR režime - imam iš XR kameros
        const xrCamera = renderer.xr.getCamera();
        xrCamera.getWorldPosition(camPos);
      } else {
        // Desktop režime
        camPos.copy(camera.position);
      }
      
      // Atstumas iki skulptūros
      const dist = camPos.distanceTo(mesh.position);
      
      // Garsas
      if (dist < 15 && !soundActive) {
        try {
          kikiSound = createKikiSound();
          soundActive = true;
          console.log('🎵 Garsas įjungtas, atstumas:', dist);
        } catch(e) { 
          console.warn('Garso klaida:', e); 
        }
      } else if (dist > 20 && soundActive) {
        if (kikiSound) kikiSound.dispose();
        kikiSound = null;
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
      const intensity = Math.max(0.5, 2 - dist / 5);
      redLight.intensity = intensity;
      blueLight.intensity = intensity * 0.8;

      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (kikiSound) kikiSound.dispose();
      if (vrButton && container.contains(vrButton)) container.removeChild(vrButton);
    };
  }, [started]);

  // ========== PRADŽIOS EKRANAS ==========
  if (!started) {
    return (
      <div onClick={async () => { 
        await Tone.start(); 
        setStarted(true); 
      }} style={{
        width: "100vw", 
        height: "100vh",
        background: "radial-gradient(circle at center, #2a1a2a, #0a0a1a)",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center",
        cursor: "pointer", 
        fontFamily: "Arial, sans-serif",
        color: "#c43a3a"
      }}>
        <div style={{ 
          fontSize: "64px", 
          marginBottom: "40px",
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
          <span style={{ color: "#c43a3a" }}>✓ Palaiko Meta Quest 3</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
  );
}
