import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSO VARIKLIS — viena skulptūra
// ============================================================
function createSpatialSound(type) {
  const cfg = { panningModel: "HRTF", distanceModel: "exponential", refDistance: 4, maxDistance: 30 };
  
  // Single sound: atmospheric pads
  const p3d = new Tone.Panner3D(cfg).toDestination();
  const rev = new Tone.Reverb({ decay: 5, wet: 0.5 }).connect(p3d);
  const flt = new Tone.Filter(800, "lowpass").connect(rev);
  const syn = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 2, decay: 1, sustain: 0.8, release: 4 }
  }).connect(flt);
  
  const lfo = new Tone.LFO(0.2, 200, 800).start();
  lfo.connect(flt.frequency);
  
  syn.volume.value = -20;
  syn.triggerAttack(["C3", "E3", "G3"]);
  
  return {
    panner: p3d,
    update: (d) => {
      const intensity = Math.max(0, 1 - d / 20);
      syn.volume.rampTo(-20 + (1 - intensity) * 20, 0.5);
    },
    dispose: () => {
      syn.releaseAll();
      setTimeout(() => {
        try { syn.dispose(); rev.dispose(); flt.dispose(); lfo.dispose(); p3d.dispose(); } catch(e) {}
      }, 2000);
    }
  };
}

// ============================================================
// VIENOS SKULPTŪROS GEOMETRIJA
// ============================================================
function createSculptureGeo() {
  const g = new THREE.TorusKnotGeometry(1.2, 0.4, 64, 8, 2, 3);
  const p = g.attributes.position;
  for(let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + Math.sin(x * 2) * 0.1 + Math.cos(z * 2) * 0.1;
    p.setXYZ(i, x * n, y * n + Math.sin(x * 3) * 0.2, z * n);
  }
  g.computeVertexNormals();
  return g;
}

// Vienos skulptūros duomenys — centre
const SCULPTURE = {
  id: "center",
  label: "GARSO SKULPTŪRA",
  sound: "atmo",
  color: 0x7a5a9a,
  emissive: 0x2a1a3a,
  geo: createSculptureGeo,
  y: 2,
  desc: "Aplinkui sklinda garsas"
};

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [distance, setDistance] = useState(0);
  const [isInVR, setIsInVR] = useState(false);
  const [playerY, setPlayerY] = useState(1.6);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88aacc); // Šviesus dangus
    scene.fog = new THREE.Fog(0x88aacc, 10, 50);

    const camera = new THREE.PerspectiveCamera(65, w/h, 0.1, 800);
    camera.position.set(0, 1.6, 8);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // ========== VR PALAIKYMAS ==========
    let xrSession = null;
    let vrButton = null;
    let controller1 = null, controller2 = null;
    let isVR = false;

    // Teleport marker
    const teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 32).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.5 })
    );
    scene.add(teleportMarker);

    const vrRaycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    // Platforma teleportacijai
    const groundPlane = new THREE.Mesh(
      new THREE.CircleGeometry(15, 32),
      new THREE.MeshStandardMaterial({ color: 0x88aa88, transparent: true, opacity: 0 })
    );
    groundPlane.rotation.x = -Math.PI/2;
    groundPlane.position.y = 0;
    scene.add(groundPlane);

    if(navigator.xr){
      navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        if(!supported) return;

        vrButton = document.createElement('button');
        vrButton.textContent = 'ENTER VR';
        vrButton.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 32px;background:rgba(30,40,60,0.8);color:#fff;border:1px solid #88aacc;font-family:inherit;font-size:14px;letter-spacing:4px;cursor:pointer;z-index:100;border-radius:30px;backdrop-filter:blur(5px);';
        container.appendChild(vrButton);

        vrButton.onclick = async () => {
          if(!xrSession){
            xrSession = await navigator.xr.requestSession('immersive-vr', {
              optionalFeatures: ['local-floor']
            });
            renderer.xr.setSession(xrSession);
            isVR = true;
            setIsInVR(true);
            vrButton.textContent = 'EXIT VR';
            xrSession.addEventListener('end', () => { 
              xrSession = null; 
              isVR = false; 
              setIsInVR(false); 
              vrButton.textContent = 'ENTER VR'; 
            });
          } else {
            xrSession.end();
          }
        };

        // Kontroleriai
        controller1 = renderer.xr.getController(0);
        controller2 = renderer.xr.getController(1);
        scene.add(controller1);
        scene.add(controller2);

        // Kontrolerių linijos
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x88aaff, opacity: 0.3, transparent: true });
        controller1.add(new THREE.Line(lineGeo, lineMat));
        controller2.add(new THREE.Line(lineGeo.clone(), lineMat.clone()));

        // Teleportacijos trigger
        controller1.addEventListener('selectstart', () => {
          if(teleportMarker.material.opacity > 0.1){
            const pos = teleportMarker.position;
            camera.position.set(pos.x, pos.y + 1.6, pos.z);
          }
        });

        // Thumbstick judėjimas
        const handleThumbstick = () => {
          const session = renderer.xr.getSession();
          if(!session) return;
          for(const source of session.inputSources){
            if(!source.gamepad) continue;
            const axes = source.gamepad.axes;
            const handedness = source.handedness;

            if(handedness === 'left' && axes.length >= 4){
              const lx = Math.abs(axes[2]) > 0.15 ? axes[2] : 0;
              const ly = Math.abs(axes[3]) > 0.15 ? axes[3] : 0;
              if(lx !== 0 || ly !== 0){
                const xrCam = renderer.xr.getCamera();
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCam.quaternion);
                dir.y = 0; dir.normalize();
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(xrCam.quaternion);
                right.y = 0; right.normalize();
                camera.position.addScaledVector(dir, -ly * 0.1);
                camera.position.addScaledVector(right, lx * 0.1);
              }
            }
          }
        };
        
        // Add to animation loop
        renderer.setAnimationLoop(() => {
          if(isVR) handleThumbstick();
        });
      });
    }

    // ========== ŠVIESUS APLINKA ==========
    // Dangus
    const skyGeo = new THREE.SphereGeometry(100, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ 
      color: 0xaaccff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.8
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Grindys
    const groundGeo = new THREE.CircleGeometry(30, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0xaaccaa,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x224422,
      emissiveIntensity: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    scene.add(ground);

    // Aplinkos šviesos
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x88aaff, 0.5);
    fillLight.position.set(-3, 5, 5);
    scene.add(fillLight);

    // ========== SKULPTŪRA ==========
    let sculptureSound = null;
    let soundActive = false;

    const geo = SCULPTURE.geo();
    const mat = new THREE.MeshStandardMaterial({
      color: SCULPTURE.color,
      emissive: SCULPTURE.emissive,
      roughness: 0.3,
      metalness: 0.2,
      emissiveIntensity: 0.3
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, SCULPTURE.y + 0.5, 0);
    scene.add(mesh);

    // Aplink šviesos taškai
    const pointLight1 = new THREE.PointLight(SCULPTURE.color, 1, 15);
    pointLight1.position.set(2, 4, 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(SCULPTURE.color, 1, 15);
    pointLight2.position.set(-2, 4, -2);
    scene.add(pointLight2);

    // Aura
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

    // ========== VALDYMAS ==========
    const keys = {};
    let yaw = 0, pitch = 0, isLocked = false;
    const moveSpeed = 0.15;

    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    document.addEventListener('pointerlockchange', () => { 
      isLocked = document.pointerLockElement === renderer.domElement; 
    });
    renderer.domElement.addEventListener('click', () => { 
      if(!isLocked && !isVR) renderer.domElement.requestPointerLock(); 
    });
    document.addEventListener('mousemove', (e) => {
      if(!isLocked || isVR) return;
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, pitch - e.movementY * 0.002));
    });

    // ========== ANIMACIJA ==========
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      const delta = Math.min(0.1, clock.getDelta());

      // VR teleport ray
      if(isVR && controller1){
        tempMatrix.identity().extractRotation(controller1.matrixWorld);
        vrRaycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        vrRaycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMatrix);
        const hits = vrRaycaster.intersectObject(groundPlane);
        if(hits.length > 0){
          teleportMarker.position.copy(hits[0].point);
          teleportMarker.material.opacity = 0.5;
        } else {
          teleportMarker.material.opacity *= 0.9;
        }
      }

      // Desktop judėjimas
      if(!isVR){
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        if(keys['KeyW']) camera.position.addScaledVector(forward, moveSpeed);
        if(keys['KeyS']) camera.position.addScaledVector(forward, -moveSpeed);
        if(keys['KeyA']) camera.position.addScaledVector(right, -moveSpeed);
        if(keys['KeyD']) camera.position.addScaledVector(right, moveSpeed);
        if(keys['Space']) camera.position.y += moveSpeed * 0.8;
        if(keys['ShiftLeft']) camera.position.y -= moveSpeed * 0.8;

        camera.position.y = Math.max(1.0, Math.min(8, camera.position.y));
        camera.rotation.set(pitch, yaw, 0);
      }

      // Kameros pozicija
      const camPos = new THREE.Vector3();
      if(isVR){
        const xrCam = renderer.xr.getCamera();
        xrCam.getWorldPosition(camPos);
      } else {
        camPos.copy(camera.position);
      }

      // Skulptūros animacija
      mesh.rotation.y += 0.005;
      mesh.rotation.x = Math.sin(t * 0.5) * 0.1;
      mesh.rotation.z = Math.cos(t * 0.3) * 0.1;
      
      aura.rotation.y += 0.001;
      aura.scale.setScalar(1 + Math.sin(t * 2) * 0.05);

      // Atstumas iki skulptūros
      const dx = camPos.x;
      const dy = camPos.y - (SCULPTURE.y + 0.5);
      const dz = camPos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      // Garsas
      if(dist < 15 && !soundActive) {
        try {
          sculptureSound = createSpatialSound(SCULPTURE.sound);
          soundActive = true;
        } catch(e) { console.warn('Sound error:', e); }
      } else if(dist >= 20 && soundActive) {
        try { if(sculptureSound) sculptureSound.dispose(); } catch(e) {}
        sculptureSound = null;
        soundActive = false;
      }

      if(sculptureSound && soundActive) {
        if(sculptureSound.panner) {
          sculptureSound.panner.positionX.value = mesh.position.x;
          sculptureSound.panner.positionY.value = mesh.position.y;
          sculptureSound.panner.positionZ.value = mesh.position.z;
        }
        sculptureSound.update(dist);
      }

      // Šviesų pulsavimas pagal atstumą
      const intensity = Math.max(0.2, 1 - dist/15);
      pointLight1.intensity = 0.5 + intensity * 1.5;
      pointLight2.intensity = 0.5 + intensity * 1.5;
      
      mesh.material.emissiveIntensity = 0.2 + intensity * 0.6;
      aura.material.opacity = 0.1 + intensity * 0.2;

      setDistance(dist);
      setPlayerY(camPos.y);

      renderer.render(scene, camera);
    });

    // Resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if(sculptureSound) sculptureSound.dispose();
      if(vrButton && container.contains(vrButton)) container.removeChild(vrButton);
      if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [started]);

  // ========== PRADŽIOS EKRANAS ==========
  if(!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        width: "100vw", height: "100vh",
        background: "linear-gradient(135deg, #88aacc, #aaccaa)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "'Inter', sans-serif",
        color: "#1a2a3a"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ fontSize: "48px", fontWeight: 300, letterSpacing: "8px", marginBottom: "20px" }}>
          GARSO KAMBARYS
        </div>
        <div style={{ fontSize: "14px", opacity: 0.6, textAlign: "center", lineHeight: "2" }}>
          SPUSTELĖK KAD PRADĖTI<br/>
          ←↑↓→ judėjimas | SPACE kilti | SHIFT leistis
        </div>
      </div>
    );
  }

  // ========== ŽAIDIMO UI ==========
  const proximity = Math.max(0, Math.min(1, 1 - distance / 15));
  const colorHex = "#" + SCULPTURE.color.toString(16).padStart(6, "0");

  return (
    <div style={{
      width: "100vw", height: "100vh",
      position: "relative", overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
      
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Crosshair */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none"
      }}>
        <div style={{ width: "2px", height: "20px", background: "#fff", opacity: 0.5, position: "absolute", left: "-1px", top: "-10px" }} />
        <div style={{ width: "20px", height: "2px", background: "#fff", opacity: 0.5, position: "absolute", left: "-10px", top: "-1px" }} />
      </div>

      {/* Informacija apačioje */}
      <div style={{
        position: "absolute", bottom: "30px", left: "30px", right: "30px",
        display: "flex", justifyContent: "space-between",
        pointerEvents: "none"
      }}>
        <div>
          <div style={{ color: colorHex, fontSize: "24px", fontWeight: 300, marginBottom: "4px" }}>
            {SCULPTURE.label}
          </div>
          <div style={{ color: "#fff", opacity: 0.7, fontSize: "14px" }}>
            {SCULPTURE.desc}
          </div>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontSize: "32px", fontWeight: 300 }}>
            {distance.toFixed(1)}<span style={{ fontSize: "16px", opacity: 0.5 }}>m</span>
          </div>
          <div style={{ color: "#fff", opacity: 0.5, fontSize: "12px" }}>
            {isInVR ? "VR režimas" : "Desktop režimas"}
          </div>
        </div>
      </div>

      {/* Artumo indikatorius */}
      <div style={{
        position: "absolute", bottom: "100px", left: "30px", right: "30px",
        height: "2px", background: "rgba(255,255,255,0.1)"
      }}>
        <div style={{
          height: "100%", width: `${proximity * 100}%`,
          background: colorHex,
          transition: "width 0.2s"
        }} />
      </div>
    </div>
  );
}
