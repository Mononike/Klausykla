import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// TIKSLUS GARSAS IŠ BUVUSIO KODO - Kiki Cluster
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
// TIKSLI GEOMETRIJA IŠ BUVUSIO KODO - Kiki Geo
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
// VIENA SKULPTŪRA - KIKI
// ============================================================
const SCULPTURE = {
  id: "kiki",
  label: "KIKI CLUSTER",
  sound: "kikiCluster",
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
  const [playerY, setPlayerY] = useState(1.6);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88aacc);
    scene.fog = new THREE.Fog(0x88aacc, 10, 40);

    const camera = new THREE.PerspectiveCamera(65, w/h, 0.1, 800);
    camera.position.set(3, 1.6, 5);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // ========== VR ==========
    let xrSession = null;
    let vrButton = null;
    let controller1 = null;
    let isVR = false;

    const teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 32).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({ color: 0xc43a3a, transparent: true, opacity: 0.5 })
    );
    scene.add(teleportMarker);

    const vrRaycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const groundPlane = new THREE.Mesh(
      new THREE.CircleGeometry(15, 32),
      new THREE.MeshStandardMaterial({ color: 0xaaccaa, transparent: true, opacity: 0 })
    );
    groundPlane.rotation.x = -Math.PI/2;
    groundPlane.position.y = 0;
    scene.add(groundPlane);

    if(navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        if(!supported) return;

        vrButton = document.createElement('button');
        vrButton.textContent = 'ENTER VR';
        vrButton.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 32px;background:rgba(30,30,40,0.8);color:#c43a3a;border:1px solid #c43a3a;font-family:inherit;font-size:14px;letter-spacing:4px;cursor:pointer;z-index:100;border-radius:30px;backdrop-filter:blur(5px);';
        container.appendChild(vrButton);

        vrButton.onclick = async () => {
          if(!xrSession) {
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

        controller1 = renderer.xr.getController(0);
        scene.add(controller1);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xc43a3a, opacity: 0.3, transparent: true });
        controller1.add(new THREE.Line(lineGeo, lineMat));

        controller1.addEventListener('selectstart', () => {
          if(teleportMarker.material.opacity > 0.1) {
            const pos = teleportMarker.position;
            camera.position.set(pos.x, pos.y + 1.6, pos.z);
          }
        });

        const handleThumbstick = () => {
          const session = renderer.xr.getSession();
          if(!session) return;
          for(const source of session.inputSources) {
            if(!source.gamepad) continue;
            const axes = source.gamepad.axes;
            if(source.handedness === 'left' && axes.length >= 4) {
              const lx = Math.abs(axes[2]) > 0.15 ? axes[2] : 0;
              const ly = Math.abs(axes[3]) > 0.15 ? axes[3] : 0;
              if(lx !== 0 || ly !== 0) {
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
        
        renderer.setAnimationLoop(() => {
          if(isVR) handleThumbstick();
        });
      });
    }

    // ========== ŠVIESOS ==========
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    
    const dirLight = new THREE.DirectionalLight(0xffaa88, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    
    const fillLight = new THREE.PointLight(0x88aaff, 0.5);
    fillLight.position.set(-3, 5, 5);
    scene.add(fillLight);

    // Grindys
    const groundGeo = new THREE.CircleGeometry(30, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0xaaccaa,
      roughness: 0.7,
      emissive: 0x224422,
      emissiveIntensity: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    scene.add(ground);

    // ========== SKULPTŪRA ==========
    let sculptureSound = null;
    let soundActive = false;

    const geo = SCULPTURE.geo();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a10,
      emissive: SCULPTURE.emissive,
      roughness: 0.6,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, SCULPTURE.y + 0.5, 0);
    scene.add(mesh);

    // Šviesos stulpas
    const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, SCULPTURE.y + 1, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: SCULPTURE.color, transparent: true, opacity: 0.08 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, (SCULPTURE.y + 0.5)/2, 0);
    scene.add(beam);

    // Apskritimas ant žemės
    const dotGeo = new THREE.CircleGeometry(0.5, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: SCULPTURE.color, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI/2;
    dot.position.set(0, 0, 0);
    scene.add(dot);

    const light = new THREE.PointLight(SCULPTURE.color, 0, 20);
    light.position.set(0, SCULPTURE.y + 1.5, 0);
    scene.add(light);

    // ========== VALDYMAS ==========
    const keys = {};
    let yaw = 0, pitch = 0, isLocked = false;
    const moveSpeed = 0.15;

    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    renderer.domElement.addEventListener('click', () => { 
      if(!isLocked && !isVR) renderer.domElement.requestPointerLock(); 
    });
    
    document.addEventListener('mousemove', (e) => {
      if(!isLocked || isVR) return;
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, pitch - e.movementY * 0.002));
    });

    document.addEventListener('pointerlockchange', () => { 
      isLocked = document.pointerLockElement === renderer.domElement; 
    });

    // ========== ANIMACIJA ==========
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      // VR ray
      if(isVR && controller1) {
        tempMatrix.identity().extractRotation(controller1.matrixWorld);
        vrRaycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        vrRaycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMatrix);
        const hits = vrRaycaster.intersectObject(groundPlane);
        if(hits.length > 0) {
          teleportMarker.position.copy(hits[0].point);
          teleportMarker.material.opacity = 0.5;
        } else {
          teleportMarker.material.opacity *= 0.9;
        }
      }

      // Desktop judėjimas
      if(!isVR) {
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
      if(isVR) {
        const xrCam = renderer.xr.getCamera();
        xrCam.getWorldPosition(camPos);
      } else {
        camPos.copy(camera.position);
      }

      // Skulptūros animacija
      mesh.rotation.y += 0.004;
      mesh.rotation.x = Math.sin(t * 0.3) * 0.08;

      // Atstumas
      const dx = camPos.x;
      const dy = camPos.y - (SCULPTURE.y + 1.5);
      const dz = camPos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      // Garsas - tiksliai kaip originaliame kode
      if(dist < 15 && !soundActive) {
        try {
          sculptureSound = createKikiSound();
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

      // Vizualinis atgalinis ryšys
      const proximity = Math.max(0, 1 - dist/12);
      const zone3 = Math.max(0, 1 - dist/3);
      
      if(proximity > 0.05) {
        mesh.material.color.lerp(new THREE.Color(SCULPTURE.color), 0.08);
        mesh.material.emissive.lerp(new THREE.Color(SCULPTURE.emissive), 0.06);
        mesh.material.emissiveIntensity = zone3 * 4.0;
        light.intensity = zone3 * 3.0;
        beam.material.opacity = 0.03 + proximity * 0.15;
        
        if(zone3 > 0.2) {
          const pulse = 1 + Math.sin(t * 2.5) * 0.05 * zone3;
          mesh.scale.setScalar(pulse);
        }
      } else {
        mesh.material.color.lerp(new THREE.Color(0x0a0a10), 0.03);
        mesh.material.emissive.lerp(new THREE.Color(0x000000), 0.03);
        mesh.material.emissiveIntensity = 0;
        light.intensity *= 0.93;
        mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.03);
      }

      setDistance(dist);
      setPlayerY(camPos.y);

      renderer.render(scene, camera);
    });

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
        background: "linear-gradient(135deg, #1a1a2a, #2a1a2a)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontFamily: "'Inter', sans-serif",
        color: "#c43a3a"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ fontSize: "48px", fontWeight: 300, letterSpacing: "8px", marginBottom: "20px" }}>
          KIKI
        </div>
        <div style={{ fontSize: "14px", opacity: 0.6, textAlign: "center", lineHeight: "2", color: "#fff" }}>
          SPUSTELĖK KAD PRADĖTI<br/>
          ←↑↓→ judėk | SPACE kilti | SHIFT leistis
        </div>
      </div>
    );
  }

  // ========== UI ==========
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
        <div style={{ width: "2px", height: "20px", background: colorHex, opacity: 0.5, position: "absolute", left: "-1px", top: "-10px" }} />
        <div style={{ width: "20px", height: "2px", background: colorHex, opacity: 0.5, position: "absolute", left: "-10px", top: "-1px" }} />
      </div>

      {/* Informacija */}
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
        </div>
      </div>

      {/* Artumo juosta */}
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
