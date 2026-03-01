import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSO VARIKLIS — erdvinis (tas pats kaip world versijoje)
// ============================================================
function createSpatialSound(type) {
  switch(type) {
    case "lowHum": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const rev = new Tone.Reverb({ decay: 4, wet: 0.4 }).connect(panner);
      const filter = new Tone.Filter(200, "lowpass").connect(rev);
      const synth = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 }, volume: -20 }).connect(filter);
      const lfo = new Tone.LFO(0.4, -8, 0).start();
      lfo.connect(synth.volume);
      synth.triggerAttack("A1");
      return { panner, update: (d) => { const vol = Math.max(-60, -10 - d * 2); synth.volume.rampTo(vol, 0.3); filter.frequency.rampTo(Math.max(60, 400 - d * 15), 0.2); },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();rev.dispose();filter.dispose();lfo.dispose();panner.dispose();}catch(e){} }, 3000); } };
    }
    case "bassRumble": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const filter = new Tone.Filter(80, "lowpass").connect(panner);
      const synth = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 1.5, decay: 0.5, sustain: 0.9, release: 3 }, volume: -20 }).connect(filter);
      synth.triggerAttack("C1");
      return { panner, update: (d) => { synth.volume.rampTo(Math.max(-60, -8 - d * 2), 0.3); filter.frequency.rampTo(Math.max(30, 120 - d * 5), 0.2); },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();filter.dispose();panner.dispose();}catch(e){} }, 3000); } };
    }
    case "modulationReverb": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const rev = new Tone.Reverb({ decay: 6, wet: 0.7 }).connect(panner);
      const chorus = new Tone.Chorus(0.8, 3.5, 0.7).connect(rev).start();
      const synth = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 2, decay: 1, sustain: 0.6, release: 4 }, volume: -20 }).connect(chorus);
      synth.triggerAttack("A3");
      return { panner, update: (d) => { synth.volume.rampTo(Math.max(-60, -12 - d * 2), 0.3); chorus.frequency.rampTo(Math.max(0.1, 2 - d * 0.08), 0.2); },
        dispose: () => { synth.triggerRelease(); setTimeout(() => { try{synth.dispose();chorus.dispose();rev.dispose();panner.dispose();}catch(e){} }, 4000); } };
    }
    case "sibilantBreath": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const filter = new Tone.Filter(4000, "bandpass").connect(panner);
      const noise = new Tone.Noise("white").connect(filter);
      const lfo = new Tone.LFO(1, 2000, 8000).start();
      lfo.connect(filter.frequency);
      noise.start();
      noise.volume.value = -30;
      return { panner, update: (d) => { noise.volume.rampTo(Math.max(-60, -10 - d * 2.5), 0.3); lfo.frequency.rampTo(Math.max(0.3, 3 - d * 0.15), 0.2); },
        dispose: () => { noise.stop(); setTimeout(() => { try{noise.dispose();filter.dispose();lfo.dispose();panner.dispose();}catch(e){} }, 1000); } };
    }
    case "glitchClicks": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const synth = new Tone.MetalSynth({ frequency: 300, envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 8, modulationIndex: 20, resonance: 2000, octaves: 2, volume: -30 }).connect(panner);
      let running = true;
      const loop = new Tone.Loop((time) => { if (!running) return; if (Math.random() > 0.25) synth.triggerAttackRelease("C4", "64n", time, Math.random() * 0.4 + 0.2); }, 1 / 8);
      Tone.getTransport().start();
      loop.start(0);
      return { panner, update: (d) => { synth.volume.value = Math.max(-60, -8 - d * 3); loop.interval = 1 / Math.max(2, 20 - d * 1); },
        dispose: () => { running = false; loop.stop(); setTimeout(() => { try{loop.dispose();synth.dispose();panner.dispose();}catch(e){} }, 500); } };
    }
    case "kikiCluster": {
      const panner = new Tone.Panner3D({ panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 30 }).toDestination();
      const synths = [];
      for (let i = 0; i < 4; i++) {
        const s = new Tone.FMSynth({ frequency: 2400 + i * 137, modulationIndex: 6, harmonicity: 1.5 + Math.random() * 2.5, envelope: { attack: 0.01, decay: 2, sustain: 0.3, release: 2 }, modulation: { type: "square" }, volume: -35 }).connect(panner);
        s.triggerAttack(2400 + i * 137);
        synths.push(s);
      }
      return { panner, update: (d) => { const vol = Math.max(-60, -12 - d * 3); synths.forEach(s => { s.volume.rampTo(vol, 0.3); s.modulationIndex.rampTo(Math.max(1, 12 - d * 0.5), 0.2); }); },
        dispose: () => { synths.forEach(s => { try{s.triggerRelease();}catch(e){} }); setTimeout(() => { synths.forEach(s => { try{s.dispose();}catch(e){} }); try{panner.dispose();}catch(e){} }, 2000); } };
    }
    default: return { panner: null, update: () => {}, dispose: () => {} };
  }
}

// ============================================================
// 3D FORMOS
// ============================================================
function createKikiGeo() {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = (i % 2 === 0) ? 1.8 : 0.5 + Math.random() * 0.4;
    pts.push(new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 1.2, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry();
  const v = [];
  for (let i = 0; i < pts.length; i++) {
    const n = pts[(i + 1) % pts.length];
    v.push(0,0,0, pts[i].x,pts[i].y,pts[i].z, n.x,n.y,n.z);
    v.push(0,.8,0, pts[i].x,pts[i].y+.8,pts[i].z, n.x,n.y+.8,n.z);
    v.push(pts[i].x,pts[i].y,pts[i].z, pts[i].x,pts[i].y+.8,pts[i].z, n.x,n.y,n.z);
    v.push(n.x,n.y,n.z, pts[i].x,pts[i].y+.8,pts[i].z, n.x,n.y+.8,n.z);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}
function createHumGeo() {
  const g = new THREE.SphereGeometry(1.5, 32, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x=p.getX(i),y=p.getY(i),z=p.getZ(i); const n=1+Math.sin(x*3)*.1+Math.cos(y*4+z*2)*.08; p.setXYZ(i,x*n,y*.7*n,z*n); }
  g.computeVertexNormals(); return g;
}
function createRumbleGeo() {
  const g = new THREE.BoxGeometry(2, 2.8, 2, 6, 8, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x=p.getX(i),y=p.getY(i),z=p.getZ(i); const w=(y+1.4)/2.8; const b=1+(1-w)*.2; p.setXYZ(i,x*b+Math.sin(x*8+z*6)*.04,y,z*b+Math.sin(x*6)*.04); }
  g.computeVertexNormals(); return g;
}
function createModGeo() {
  const g = new THREE.TorusGeometry(1.2, 0.5, 24, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x=p.getX(i),y=p.getY(i),z=p.getZ(i); p.setXYZ(i,x,y+Math.sin(Math.atan2(z,x)*2)*.3,z); }
  g.computeVertexNormals(); return g;
}
function createSibilantGeo() {
  // Banguota, gyvatiska forma — S raide
  const g = new THREE.CylinderGeometry(0.3, 0.3, 3, 16, 32, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const wave = Math.sin(y * 2.5) * 0.6;
    const wave2 = Math.cos(y * 3.5) * 0.2;
    p.setXYZ(i, x + wave, y, z + wave2);
  }
  g.computeVertexNormals(); return g;
}
function createGlitchGeo() {
  const g = new THREE.IcosahedronGeometry(1.4, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { if (i%3===0) { const s=.2+Math.random()*.15; p.setXYZ(i,p.getX(i)+s,p.getY(i)-s*.5,p.getZ(i)+s*.3); } }
  g.computeVertexNormals(); return g;
}

// ============================================================
// SKULPTURU KONFIGURCIJA
// ============================================================
const SCULPTURES = [
  { id:"kiki", label:"K — Kiki Cluster", sound:"kikiCluster", color:0xc43a3a, emissive:0x4a0808, geo:createKikiGeo, pos:[0, 0, -15] },
  { id:"rumble", label:"L — Bass Rumble", sound:"bassRumble", color:0x6a4a8a, emissive:0x1a0a2a, geo:createRumbleGeo, pos:[-12, 0, -6] },
  { id:"mod", label:"A — Modulation", sound:"modulationReverb", color:0x2a8a7a, emissive:0x0a2a1e, geo:createModGeo, pos:[13, 0, -10] },
  { id:"hum", label:"U — Low Hum", sound:"lowHum", color:0x3a5a9f, emissive:0x0a0e2a, geo:createHumGeo, pos:[-6, 0, -25] },
  { id:"sibilant", label:"S — Sibilant Breath", sound:"sibilantBreath", color:0x5a9a5a, emissive:0x0a2a0a, geo:createSibilantGeo, pos:[0, 0, -35] },
  { id:"glitch", label:"Y — Glitch Clicks", sound:"glitchClicks", color:0x9a7a2a, emissive:0x2a1e08, geo:createGlitchGeo, pos:[8, 0, -28] },
];

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [dist, setDist] = useState(0);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVR, setInVR] = useState(false);

  // Patikrink ar VR palaikomas
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        setVrSupported(supported);
      });
    }
  }, []);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // === SCENE ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 800);
    camera.position.set(0, 1.6, 5);
    camera.rotation.order = 'YXZ';

    // === RENDERER su WebXR ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.xr.enabled = true; // <--- WebXR ON
    container.appendChild(renderer.domElement);

    // === VR MYGTUKAS ===
    let xrSession = null;
    let vrButton = null;

    if (vrSupported) {
      vrButton = document.createElement('button');
      vrButton.textContent = 'ENTER VR';
      vrButton.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);padding:12px 32px;background:#1a1a2e;color:#fff;border:1px solid #333;font-family:inherit;font-size:13px;letter-spacing:4px;cursor:pointer;z-index:100;border-radius:2px;';
      container.appendChild(vrButton);

      vrButton.onclick = async () => {
        if (!xrSession) {
          xrSession = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
          });
          renderer.xr.setSession(xrSession);
          setInVR(true);
          vrButton.textContent = 'EXIT VR';

          xrSession.addEventListener('end', () => {
            xrSession = null;
            setInVR(false);
            vrButton.textContent = 'ENTER VR';
          });
        } else {
          xrSession.end();
        }
      };
    }

    // === SKYBOX ===
    const skyGeo = new THREE.SphereGeometry(400, 64, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vWorldPos; void main() { vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec3 vWorldPos;
        float hash(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
        void main() {
          vec3 dir = normalize(vWorldPos); float y = dir.y * 0.5 + 0.5;
          vec3 col; if (y > 0.5) col = mix(vec3(.04,.04,.08), vec3(.01,.01,.03), (y-.5)*2.0); else col = mix(vec3(.06,.03,.07), vec3(.04,.04,.08), y*2.0);
          if (y > .35) { float s = hash(floor(dir * 350.0)); float tw = sin(uTime*.4+s*100.)*.5+.5; if (s>.997) col += vec3(.5,.55,.7)*tw*(y-.35)*3.; else if (s>.993) col += vec3(.2,.2,.3)*tw*.4*(y-.35)*3.; }
          col += vec3(.08,.05,.1) * exp(-abs(y-.32)*10.) * .025;
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Zvaigzdes
    const sp = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) { const th=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*2-1),r=100+Math.random()*250; sp[i*3]=r*Math.sin(ph)*Math.cos(th); sp[i*3+1]=Math.abs(r*Math.cos(ph))*.7+15; sp[i*3+2]=r*Math.sin(ph)*Math.sin(th); }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8888bb, size: 0.7, transparent: true, opacity: 0.35, depthWrite: false })));

    scene.fog = new THREE.FogExp2(0x06060c, 0.008);
    scene.add(new THREE.AmbientLight(0x181830, 0.3));
    const moon = new THREE.DirectionalLight(0x8888cc, 0.3);
    moon.position.set(20, 40, -20);
    scene.add(moon);

    // Grindys
    const groundGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) gPos.setZ(i, (Math.random() - 0.5) * 0.15);
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5;
    scene.add(ground);

    // === SKULPTUROS ===
    const meshes = [];
    const sounds = [];

    SCULPTURES.forEach((s) => {
      const geo = s.geo();
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, emissive: 0x000000, roughness: 0.6, metalness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.pos[0], s.pos[1] + 1.5, s.pos[2]);
      mesh.userData = { ...s, targetColor: 0x1a1a22, targetEmissive: 0x000000 };
      scene.add(mesh);
      meshes.push(mesh);

      // Orientyras
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.15 })
      );
      pillar.position.set(s.pos[0], 0, s.pos[2]);
      scene.add(pillar);

      const light = new THREE.PointLight(s.color, 0, 8);
      light.position.set(s.pos[0], 2.5, s.pos[2]);
      scene.add(light);
      mesh.userData.light = light;

      const sound = createSpatialSound(s.sound);
      sounds.push(sound);
    });

    // === DESKTOP VALDYMAS (WASD + pele) ===
    const keys = {};
    let yaw = 0, pitch = 0, isLocked = false;

    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === renderer.domElement; });
    renderer.domElement.addEventListener('click', () => { if (!isLocked && !inVR) renderer.domElement.requestPointerLock(); });

    const onMouseMove = (e) => {
      if (!isLocked) return;
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, pitch - e.movementY * 0.002));
    };
    document.addEventListener('mousemove', onMouseMove);

    // === VR VALDYMAS — teleportacija ===
    let controller1, controller2;
    const teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.4, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.5 })
    );
    teleportMarker.visible = false;
    scene.add(teleportMarker);

    // Raycaster teleportacijai
    const vrRaycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    if (renderer.xr.enabled) {
      controller1 = renderer.xr.getController(0);
      controller2 = renderer.xr.getController(1);
      scene.add(controller1);
      scene.add(controller2);

      // Kontroleriu vizualizacija — linija
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.3 });
      const line1 = new THREE.Line(lineGeo, lineMat);
      const line2 = new THREE.Line(lineGeo.clone(), lineMat.clone());
      controller1.add(line1);
      controller2.add(line2);

      // Teleportacija su trigger
      controller1.addEventListener('selectstart', () => {
        if (teleportMarker.visible) {
          const cameraRig = renderer.xr.getCamera();
          const offset = new THREE.Vector3();
          offset.copy(teleportMarker.position);
          offset.y = 0;

          // VR kamera pozicija
          const baseRef = renderer.xr.getReferenceSpace();
          const offsetRef = new XRRigidTransform(
            { x: -offset.x, y: 0, z: -offset.z, w: 1 }
          );
          // Paprastesnis budas — tiesiog perkeliam camera
          camera.position.x = offset.x;
          camera.position.z = offset.z;
        }
      });
    }

    // === ANIMACIJOS CIKLAS ===
    const clock = new THREE.Clock();

    // Naudojam renderer.setAnimationLoop vietoj requestAnimationFrame — butina WebXR
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      skyMat.uniforms.uTime.value = t;

      // VR teleport ray
      if (renderer.xr.isPresenting && controller1) {
        tempMatrix.identity().extractRotation(controller1.matrixWorld);
        vrRaycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        vrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = vrRaycaster.intersectObject(ground);
        if (intersects.length > 0) {
          teleportMarker.position.copy(intersects[0].point);
          teleportMarker.position.y = 0.01;
          teleportMarker.visible = true;
        } else {
          teleportMarker.visible = false;
        }
      }

      // Desktop judejimas
      if (!renderer.xr.isPresenting) {
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, 0.08);
        if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -0.08);
        if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -0.08);
        if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, 0.08);
        camera.position.y = 1.6;
        camera.rotation.set(pitch, yaw, 0);
      }

      // Skulpturu animacija + garsas
      let nearestDist = Infinity, nearestLabel = null;

      // Kameros pozicija (desktop arba VR)
      const camPos = new THREE.Vector3();
      if (renderer.xr.isPresenting) {
        const xrCam = renderer.xr.getCamera();
        xrCam.getWorldPosition(camPos);
      } else {
        camPos.copy(camera.position);
      }

      meshes.forEach((mesh, i) => {
        mesh.rotation.y += 0.005;
        mesh.rotation.x = Math.sin(t * 0.3 + i) * 0.1;

        const dx = camPos.x - mesh.position.x;
        const dz = camPos.z - mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        // Garso pozicija
        if (sounds[i].panner) {
          sounds[i].panner.positionX.value = mesh.position.x;
          sounds[i].panner.positionZ.value = mesh.position.z;
          sounds[i].panner.positionY.value = mesh.position.y;
        }
        sounds[i].update(d);

        if (d < nearestDist) { nearestDist = d; nearestLabel = mesh.userData.label; }

        const proximity = Math.max(0, 1 - d / 15);
        mesh.material.color.lerp(new THREE.Color(proximity > 0.1 ? mesh.userData.color : 0x1a1a22), 0.05);
        mesh.material.emissive.lerp(new THREE.Color(proximity > 0.1 ? mesh.userData.emissive : 0x000000), 0.05);
        mesh.material.emissiveIntensity = proximity * 1.5;
        mesh.userData.light.intensity = proximity * 0.8;

        if (proximity > 0.2) mesh.scale.setScalar(1 + Math.sin(t * 2.5) * 0.03 * proximity);
        else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.05);
      });

      setNearest(nearestDist < 20 ? nearestLabel : null);
      setDist(nearestDist);

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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sounds.forEach(s => { try{s.dispose();}catch(e){} });
      if (vrButton && container.contains(vrButton)) container.removeChild(vrButton);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [started, vrSupported]);

  if (!started) {
    return (
      <div onClick={async () => { await Tone.start(); setStarted(true); }} style={{
        width:"100vw", height:"100vh", background:"#06060a",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        cursor:"pointer", fontFamily:"'Cormorant Garamond', Georgia, serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
        <div style={{ color:"#fff", fontSize:"42px", letterSpacing:"18px", fontWeight:300 }}>KLAUSYK</div>
        <div style={{ color:"#444", fontSize:"13px", letterSpacing:"4px", marginTop:"14px" }}>paspausk kad pradeti</div>
        <div style={{ color:"#333", fontSize:"11px", letterSpacing:"2px", marginTop:"40px", textAlign:"center", lineHeight:"2" }}>
          {vrSupported ? "VR akiniai aptikti — ENTER VR mygtukas viduje" : "Desktop: WASD + pele"}
          <br/>Eik link skulpturu — girdesi garsa
        </div>
        <div style={{ marginTop:"40px", animation:"breathe 3s ease-in-out infinite" }}>
          <svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="#333" strokeWidth="1"/><circle cx="25" cy="25" r="5" fill="#333"/></svg>
        </div>
        <style>{`@keyframes breathe{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.9;transform:scale(1.15)}}`}</style>
      </div>
    );
  }

  const nearestObj = nearest ? SCULPTURES.find(s => s.label === nearest) : null;
  const nearHex = nearestObj ? "#" + nearestObj.color.toString(16).padStart(6,"0") : "#333";
  const proximity = nearestObj ? Math.max(0, Math.min(1, 1 - dist / 15)) : 0;

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#06060a", position:"relative", overflow:"hidden", fontFamily:"'Cormorant Garamond', Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
      <div ref={containerRef} style={{ width:"100%", height:"100%", cursor: inVR ? "default" : "none" }} />

      {/* HUD — tik desktop, ne VR */}
      {!inVR && <>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}>
          <div style={{ width:"2px", height:"14px", background:nearestObj?nearHex:"#333", position:"absolute", top:"-7px", left:"-1px", opacity:.5, transition:"background .3s" }} />
          <div style={{ width:"14px", height:"2px", background:nearestObj?nearHex:"#333", position:"absolute", top:"-1px", left:"-7px", opacity:.5, transition:"background .3s" }} />
        </div>

        <div style={{ position:"absolute", top:"16px", left:"20px", pointerEvents:"none" }}>
          <div style={{ color:"#fff", fontSize:"13px", letterSpacing:"8px", fontWeight:300, opacity:.4 }}>KLAUSYKLA</div>
          {vrSupported && <div style={{ color:"#2a8a7a", fontSize:"10px", letterSpacing:"2px", marginTop:"4px" }}>VR palaikomas</div>}
        </div>

        <div style={{ position:"absolute", bottom:"0", left:"0", right:"0", padding:"12px 20px", pointerEvents:"none" }}>
          <div style={{ height:"1px", background:"#111", marginBottom:"8px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${proximity*100}%`, background:nearHex, transition:"width .2s,background .3s" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:nearestObj?nearHex:"#1a1a1e", fontSize:"12px", letterSpacing:"4px", fontWeight:600, textTransform:"uppercase", transition:"color .3s" }}>
              {nearest || ". . ."}
            </span>
            {nearestObj && <span style={{ color:"#444", fontSize:"10px", fontFamily:"monospace" }}>{dist.toFixed(1)}m</span>}
          </div>
          <div style={{ display:"flex", gap:"8px", marginTop:"10px", justifyContent:"center" }}>
            {SCULPTURES.map(s => {
              const hex="#"+s.color.toString(16).padStart(6,"0");
              return <div key={s.id} style={{ width:"6px", height:"6px", borderRadius:"50%", background:nearest===s.label?hex:"#1a1a1e", boxShadow:nearest===s.label?`0 0 8px ${hex}`:"none", transition:"all .3s" }} />;
            })}
          </div>
        </div>
      </>}

      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#06060a;overflow:hidden}`}</style>
    </div>
  );
}
