import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ============================================================
// GARSO VARIKLIS — erdvinis
// ============================================================
function createSpatialSound(type) {
  const cfg = { panningModel: "HRTF", distanceModel: "exponential", refDistance: 2, maxDistance: 40 };
  switch(type) {
    case "bassRumble": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const flt = new Tone.Filter(80, "lowpass").connect(p3d);
      const syn = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:1.5,decay:0.5,sustain:0.9,release:3}, volume:-25 }).connect(flt);
      const noise = new Tone.Noise("brown").connect(new Tone.Filter(50,"lowpass").connect(new Tone.Gain(0.1).connect(flt)));
      noise.start(); syn.triggerAttack("C1");
      return { panner:p3d, update:(d)=>{ syn.volume.rampTo(Math.max(-60,-8-d*2),0.3); flt.frequency.rampTo(Math.max(30,120-d*5),0.2); }, dispose:()=>{ syn.triggerRelease(); noise.stop(); setTimeout(()=>{try{syn.dispose();flt.dispose();noise.dispose();p3d.dispose();}catch(e){}},3000);} };
    }
    case "lowHum": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const rev = new Tone.Reverb({decay:4,wet:0.4}).connect(p3d);
      const flt = new Tone.Filter(200,"lowpass").connect(rev);
      const syn = new Tone.Synth({ oscillator:{type:"sawtooth"}, envelope:{attack:2,decay:1,sustain:0.8,release:3}, volume:-25 }).connect(flt);
      const lfo = new Tone.LFO(0.4,-8,0).start(); lfo.connect(syn.volume);
      syn.triggerAttack("A1");
      return { panner:p3d, update:(d)=>{ syn.volume.rampTo(Math.max(-60,-10-d*2),0.3); flt.frequency.rampTo(Math.max(60,400-d*15),0.2); }, dispose:()=>{ syn.triggerRelease(); setTimeout(()=>{try{syn.dispose();rev.dispose();flt.dispose();lfo.dispose();p3d.dispose();}catch(e){}},3000);} };
    }
    case "sibilantBreath": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const flt = new Tone.Filter(4000,"bandpass").connect(p3d);
      const noise = new Tone.Noise("white").connect(flt);
      const lfo = new Tone.LFO(1,2000,8000).start(); lfo.connect(flt.frequency);
      noise.start(); noise.volume.value = -30;
      return { panner:p3d, update:(d)=>{ noise.volume.rampTo(Math.max(-60,-10-d*2.5),0.3); lfo.frequency.rampTo(Math.max(0.3,3-d*0.15),0.2); }, dispose:()=>{ noise.stop(); setTimeout(()=>{try{noise.dispose();flt.dispose();lfo.dispose();p3d.dispose();}catch(e){}},1000);} };
    }
    case "modulationReverb": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const rev = new Tone.Reverb({decay:6,wet:0.7}).connect(p3d);
      const cho = new Tone.Chorus(0.8,3.5,0.7).connect(rev).start();
      const syn = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:2,decay:1,sustain:0.6,release:4}, volume:-25 }).connect(cho);
      syn.triggerAttack("A3");
      return { panner:p3d, update:(d)=>{ syn.volume.rampTo(Math.max(-60,-12-d*2),0.3); cho.frequency.rampTo(Math.max(0.1,2-d*0.08),0.2); }, dispose:()=>{ syn.triggerRelease(); setTimeout(()=>{try{syn.dispose();cho.dispose();rev.dispose();p3d.dispose();}catch(e){}},4000);} };
    }
    case "glitchClicks": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const syn = new Tone.MetalSynth({ frequency:300, envelope:{attack:0.001,decay:0.04,release:0.01}, harmonicity:8, modulationIndex:20, resonance:2000, octaves:2, volume:-30 }).connect(p3d);
      let running=true;
      const loop = new Tone.Loop((time)=>{ if(!running)return; if(Math.random()>0.25) syn.triggerAttackRelease("C4","64n",time,Math.random()*0.4+0.2); }, 1/8);
      Tone.getTransport().start(); loop.start(0);
      return { panner:p3d, update:(d)=>{ syn.volume.value=Math.max(-60,-8-d*3); loop.interval=1/Math.max(2,20-d); }, dispose:()=>{ running=false; loop.stop(); setTimeout(()=>{try{loop.dispose();syn.dispose();p3d.dispose();}catch(e){}},500);} };
    }
    case "kikiCluster": {
      const p3d = new Tone.Panner3D(cfg).toDestination();
      const syns=[];
      for(let i=0;i<4;i++){ const s=new Tone.FMSynth({ frequency:2400+i*137, modulationIndex:6, harmonicity:1.5+Math.random()*2.5, envelope:{attack:0.01,decay:2,sustain:0.3,release:2}, modulation:{type:"square"}, volume:-35 }).connect(p3d); s.triggerAttack(2400+i*137); syns.push(s); }
      return { panner:p3d, update:(d)=>{ const v=Math.max(-60,-12-d*3); syns.forEach(s=>{s.volume.rampTo(v,0.3);s.modulationIndex.rampTo(Math.max(1,12-d*0.5),0.2);}); }, dispose:()=>{ syns.forEach(s=>{try{s.triggerRelease();}catch(e){}}); setTimeout(()=>{syns.forEach(s=>{try{s.dispose();}catch(e){}}); try{p3d.dispose();}catch(e){}},2000);} };
    }
    default: return { panner:null, update:()=>{}, dispose:()=>{} };
  }
}

// ============================================================
// GEOMETRIJOS
// ============================================================
function createKikiGeo() {
  const pts=[], seed=[.23,.67,.45,.89,.12,.56,.78,.34,.91,.08,.62,.43];
  for(let i=0;i<12;i++){ const a=(i/12)*Math.PI*2, r=(i%2===0)?1.8:0.5+seed[i]*0.4; pts.push(new THREE.Vector3(Math.cos(a)*r,(seed[i]-.5)*1.2,Math.sin(a)*r)); }
  const geo=new THREE.BufferGeometry(), v=[];
  for(let i=0;i<pts.length;i++){ const n=pts[(i+1)%pts.length]; v.push(0,-.4,0,pts[i].x,pts[i].y,pts[i].z,n.x,n.y,n.z); v.push(0,1.2,0,pts[i].x,pts[i].y+.8,pts[i].z,n.x,n.y+.8,n.z); v.push(pts[i].x,pts[i].y,pts[i].z,pts[i].x,pts[i].y+.8,pts[i].z,n.x,n.y,n.z); v.push(n.x,n.y,n.z,pts[i].x,pts[i].y+.8,pts[i].z,n.x,n.y+.8,n.z); }
  geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); geo.computeVertexNormals(); return geo;
}
function createHumGeo() {
  const g=new THREE.SphereGeometry(1.5,32,24), p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+Math.sin(x*3)*.1+Math.cos(y*4+z*2)*.08;p.setXYZ(i,x*n,y*.7*n,z*n);}
  g.computeVertexNormals(); return g;
}
function createRumbleGeo() {
  const g=new THREE.BoxGeometry(2,2.8,2,6,8,6), p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=(y+1.4)/2.8,b=1+(1-w)*.2;p.setXYZ(i,x*b+Math.sin(x*8+z*6)*.04,y,z*b+Math.sin(x*6)*.04);}
  g.computeVertexNormals(); return g;
}
function createModGeo() {
  const g=new THREE.TorusGeometry(1.2,.5,24,48), p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x,y+Math.sin(Math.atan2(z,x)*2)*.3,z);}
  g.computeVertexNormals(); return g;
}
function createSibilantGeo() {
  const g=new THREE.CylinderGeometry(.4,.4,3,24,48,false), p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x+Math.sin(y*2.5)*.7,y,z+Math.cos(y*3.5)*.25);}
  g.computeVertexNormals(); return g;
}
function createGlitchGeo() {
  const g=new THREE.IcosahedronGeometry(1.4,1), p=g.attributes.position, seed=[.17,.83,.42,.65,.28,.91,.54,.36,.72,.09];
  for(let i=0;i<p.count;i++){if(i%3===0){const s=.2+seed[i%10]*.15;p.setXYZ(i,p.getX(i)+s,p.getY(i)-s*.5,p.getZ(i)+s*.3);}}
  g.computeVertexNormals(); return g;
}

// ============================================================
// SKULPTUROS — vertikalus isdestymas kaip kilimas
//
// L (bass)    — y:0   zemai, grindys dreba
// U (hum)     — y:6   pirmas aukstas, siltuma
// S (breath)  — y:12  vidurys, kvepavimas
// A (mod)     — y:18  auksciau, erdve atsiveria
// Y (glitch)  — y:24  beveik virsuje, nervinga
// K (kiki)    — y:30  virsune, oras virpa
//
// Kelias spirale — lankytojas kyla ratu
// ============================================================
const SCULPTURES = [
  { id:"bass",  label:"L — Bass Rumble",     sound:"bassRumble",      color:0x6a4a8a, emissive:0x1a0a2a, geo:createRumbleGeo,   y:0,   angle:0,     desc:"Grindys dreba po kojomis" },
  { id:"hum",   label:"U — Low Hum",         sound:"lowHum",          color:0x3a5a9f, emissive:0x0a0e2a, geo:createHumGeo,      y:6,   angle:60,    desc:"Šiluma kyla iš apačios" },
  { id:"sib",   label:"S — Sibilant Breath", sound:"sibilantBreath",  color:0x5a9a5a, emissive:0x0a2a0a, geo:createSibilantGeo, y:12,  angle:120,   desc:"Erdvė kvėpuoja" },
  { id:"mod",   label:"A — Modulation",       sound:"modulationReverb",color:0x2a8a7a, emissive:0x0a2a1e, geo:createModGeo,      y:18,  angle:200,   desc:"Sienos tirpsta" },
  { id:"glitch",label:"Y — Glitch Clicks",    sound:"glitchClicks",    color:0x9a7a2a, emissive:0x2a1e08, geo:createGlitchGeo,   y:24,  angle:280,   desc:"Oras trūkinėja" },
  { id:"kiki",  label:"K — Kiki Cluster",     sound:"kikiCluster",     color:0xc43a3a, emissive:0x4a0808, geo:createKikiGeo,     y:30,  angle:340,   desc:"Viršūnė — viskas virpa" },
];

// Spirales spindulys
const SPIRAL_R = 8;

export default function App() {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [nearDist, setNearDist] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [playerX, setPlayerX] = useState(0);
  const [playerZ, setPlayerZ] = useState(5);
  const [playerYaw, setPlayerYaw] = useState(0);
  const [nearDesc, setNearDesc] = useState("");
  const [isInVR, setIsInVR] = useState(false);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, w/h, 0.1, 800);
    camera.position.set(0, 1.6, 5);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // ========== VR PALAIKYMAS ==========
    let xrSession = null;
    let vrButton = null;
    let controller1 = null, controller2 = null;
    let isVR = false;

    // Teleport marker
    const teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.4, 32).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0 })
    );
    scene.add(teleportMarker);

    const vrRaycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    // Platformos collision objektai teleportacijai
    const teleportTargets = [];

    if(navigator.xr){
      navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        if(!supported) return;

        vrButton = document.createElement('button');
        vrButton.textContent = 'ENTER VR';
        vrButton.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 32px;background:rgba(10,10,20,0.8);color:#fff;border:1px solid #333;font-family:inherit;font-size:12px;letter-spacing:4px;cursor:pointer;z-index:100;border-radius:2px;';
        container.appendChild(vrButton);

        vrButton.onclick = async () => {
          if(!xrSession){
            xrSession = await navigator.xr.requestSession('immersive-vr', {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
            });
            renderer.xr.setSession(xrSession);
            isVR = true;
            setIsInVR(true);
            vrButton.textContent = 'EXIT VR';
            xrSession.addEventListener('end', () => { xrSession=null; isVR=false; setIsInVR(false); vrButton.textContent='ENTER VR'; });
          } else {
            xrSession.end();
          }
        };

        // Kontroleriai
        controller1 = renderer.xr.getController(0);
        controller2 = renderer.xr.getController(1);
        scene.add(controller1);
        scene.add(controller2);

        // Kontroleriu linijos
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-8)]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.2 });
        controller1.add(new THREE.Line(lineGeo, lineMat));
        controller2.add(new THREE.Line(lineGeo.clone(), lineMat.clone()));

        // Trigger — teleport
        controller1.addEventListener('selectstart', () => {
          if(teleportMarker.material.opacity > 0.1){
            // Perkeliam kamera i teleport pozicija
            camera.position.x = teleportMarker.position.x;
            camera.position.y = teleportMarker.position.y + 1.6;
            camera.position.z = teleportMarker.position.z;
          }
        });
      });
    }

    // ========== SKYBOX — reaguoja i auksti ==========
    const skyGeo = new THREE.SphereGeometry(400, 64, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHeight: { value: 0 },        // zaidejo aukstis
        uBreath: { value: 0 },        // tamsus kvepavimas
        uNearColor: { value: new THREE.Color(0x000000) },
        uNearIntensity: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position,1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uHeight, uBreath, uNearIntensity;
        uniform vec3 uNearColor;
        varying vec3 vDir;
        float hash(vec3 p){p=fract(p*vec3(443.897,441.423,437.195));p+=dot(p,p.yzx+19.19);return fract((p.x+p.y)*p.z);}
        void main(){
          float y = vDir.y * 0.5 + 0.5;
          // Spalva keiciasi su auksiciu — apacioje tamsiau, virsuje siek tiek sviesesne
          float heightNorm = clamp(uHeight / 30.0, 0.0, 1.0);
          vec3 colBot = mix(vec3(0.02,0.01,0.03), vec3(0.04,0.02,0.06), heightNorm);
          vec3 colTop = mix(vec3(0.01,0.01,0.02), vec3(0.03,0.02,0.05), heightNorm);
          vec3 col = mix(colBot, colTop, y);

          // TAMSA KVEPUOJA — stipresne pulsacija
          float breath = sin(uTime * 0.3) * 0.4 + sin(uTime * 0.7) * 0.2 + sin(uTime * 1.3) * 0.1;
          col *= 1.0 + breath * 0.15 * uBreath;

          // Zvaigzdes — daugiau matosi auksciau
          float starThreshold = mix(0.998, 0.994, heightNorm);
          if(y > 0.3){
            float s = hash(floor(vDir * 350.0));
            float tw = sin(uTime*0.4+s*100.)*.5+.5;
            if(s > starThreshold) col += vec3(0.4,0.45,0.6) * tw * (y-0.3) * 3.0 * (0.5 + heightNorm * 0.5);
          }

          // Artimos skulpturos spalva atsispindi danguje
          col += uNearColor * uNearIntensity * 0.03;

          // Horizonto svytejimas
          col += vec3(0.06,0.03,0.08) * exp(-abs(y-0.32)*10.0) * 0.02;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide, depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Zvaigzdes
    const sp=new Float32Array(800*3);
    for(let i=0;i<800;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*2-1),r=100+Math.random()*250;sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
    const starGeo=new THREE.BufferGeometry();
    starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
    const starPoints = new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x8888bb,size:0.6,transparent:true,opacity:0.3,depthWrite:false}));
    scene.add(starPoints);

    // ========== DINAMINE TAMSA ==========
    // Stiprus fog — toli nuo skulpturu beveik nieko nematai
    scene.fog = new THREE.FogExp2(0x04040a, 0.04);

    // ========== SPIRALINIS KELIAS ==========
    // Subtili linija rodanti kelia aukstyn
    const pathPoints = [];
    for(let i=0; i<=120; i++){
      const t = i/120;
      const angle = t * Math.PI * 2 * 2; // du pilni ratai
      const y = t * 32;
      const r = SPIRAL_R + Math.sin(t*10)*0.5;
      pathPoints.push(new THREE.Vector3(Math.cos(angle)*r, y, Math.sin(angle)*r));
    }
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0x111118, transparent: true, opacity: 0.15 });
    scene.add(new THREE.Line(pathGeo, pathMat));

    // ========== PLATFORMA KIEKVIENAM AUKSTUI ==========
    SCULPTURES.forEach(s => {
      const rad = Math.toRadians ? s.angle * Math.PI/180 : s.angle * (Math.PI/180);
      const platGeo = new THREE.CircleGeometry(3, 32);
      const platMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a10,
        emissive: s.color,
        emissiveIntensity: 0.05,
        roughness: 0.95,
        transparent: true,
        opacity: 0.5,
      });
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.rotation.x = -Math.PI/2;
      plat.position.set(Math.cos(rad)*SPIRAL_R, s.y - 0.5, Math.sin(rad)*SPIRAL_R);
      scene.add(plat);
      teleportTargets.push(plat);
    });

    // ========== SVIESOS ==========
    scene.add(new THREE.AmbientLight(0x0a0a15, 0.3));
    // Menuli virsuje
    const moon = new THREE.DirectionalLight(0x6666aa, 0.15);
    moon.position.set(10, 50, -10);
    scene.add(moon);

    // ========== SKULPTUROS ==========
    const meshes = [];
    const sounds = [];
    const sculptureData = [];

    SCULPTURES.forEach((s) => {
      const rad = s.angle * (Math.PI/180);
      const x = Math.cos(rad) * SPIRAL_R;
      const z = Math.sin(rad) * SPIRAL_R;

      const geo = s.geo();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0a0a10, emissive: 0x000000,
        roughness: 0.6, metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, s.y + 1.5, z);
      mesh.userData = { ...s, worldX: x, worldZ: z };
      scene.add(mesh);
      meshes.push(mesh);

      // Sviesos stulpas — vertikalus orientyras, matomas is tolo
      const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, s.y > 0 ? s.y : 0.5, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.08 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, s.y/2, z);
      scene.add(beam);

      // Orientyrinis sviesos taskas zemeje — visada matomas
      const dotGeo = new THREE.CircleGeometry(0.5, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI/2;
      dot.position.set(x, s.y - 0.45, z);
      scene.add(dot);

      // Point light — stipresne
      const light = new THREE.PointLight(s.color, 0, 25);
      light.position.set(x, s.y + 2, z);
      scene.add(light);

      // Antra sviesa is apacios
      const light2 = new THREE.PointLight(s.color, 0, 15);
      light2.position.set(x, s.y + 0.5, z);
      scene.add(light2);

      // GLOW SFERA — svytintis halas aplink skulptura
      const glowGeo = new THREE.SphereGeometry(3, 16, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x, s.y + 1.5, z);
      scene.add(glow);

      mesh.userData.light = light;
      mesh.userData.light2 = light2;
      mesh.userData.glow = glow;
      mesh.userData.beam = beam;

      const sound = createSpatialSound(s.sound);
      sounds.push(sound);

      sculptureData.push({ mesh, sound, x, z, y: s.y, color: s.color, emissive: s.emissive });
    });

    // ========== VALDYMAS ==========
    const keys = {};
    let yaw = 0, pitch = 0, isLocked = false;
    const moveSpeed = 0.1;
    const verticalSpeed = 0.06; // kilimo greitis

    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === renderer.domElement; });
    renderer.domElement.addEventListener('click', () => { if(!isLocked) renderer.domElement.requestPointerLock(); });
    document.addEventListener('mousemove', (e) => {
      if(!isLocked) return;
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, pitch - e.movementY * 0.002));
    });

    // ========== ANIMACIJA ==========
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      // VR teleport ray
      if(isVR && controller1){
        tempMatrix.identity().extractRotation(controller1.matrixWorld);
        vrRaycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        vrRaycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMatrix);
        const hits = vrRaycaster.intersectObjects(teleportTargets);
        if(hits.length > 0){
          teleportMarker.position.copy(hits[0].point);
          teleportMarker.material.opacity = 0.4;
        } else {
          teleportMarker.material.opacity *= 0.9;
        }
      }

      // Desktop judejimas (tik ne VR)
      if(!isVR){
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        if(keys['KeyW']||keys['ArrowUp']) camera.position.addScaledVector(forward, moveSpeed);
        if(keys['KeyS']||keys['ArrowDown']) camera.position.addScaledVector(forward, -moveSpeed);
        if(keys['KeyA']||keys['ArrowLeft']) camera.position.addScaledVector(right, -moveSpeed);
        if(keys['KeyD']||keys['ArrowRight']) camera.position.addScaledVector(right, moveSpeed);

        // KILIMAS — Space kyla, Shift leidžiasi
        if(keys['Space']) camera.position.y += verticalSpeed;
        if(keys['ShiftLeft']||keys['ShiftRight']) camera.position.y -= verticalSpeed;
        camera.position.y = Math.max(1.6, Math.min(35, camera.position.y));

        camera.rotation.set(pitch, yaw, 0);
      }

      // Kamera pozicija (desktop arba VR)
      const camPos = new THREE.Vector3();
      if(isVR){
        const xrCam = renderer.xr.getCamera();
        xrCam.getWorldPosition(camPos);
      } else {
        camPos.copy(camera.position);
      }

      // Skybox
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uHeight.value = camPos.y;

      // Zvaigzdes juda su zaidejo auksiciu (parallax)
      starPoints.position.y = camPos.y * 0.3;

      // ========== DINAMINE TAMSA ==========
      // Fog tirštėja toli nuo skulptūrų, retėja arti
      let minDistToAny = 100;
      sculptureData.forEach(sd => {
        const dx = camPos.x - sd.x;
        const dy = camPos.y - sd.y - 1.5;
        const dz = camPos.z - sd.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if(d < minDistToAny) minDistToAny = d;
      });
      // Arti skulpturos — fog beveik dingsta, toli — labai tamsus
      const targetDensity = minDistToAny < 4 ? 0.01 : (minDistToAny < 10 ? 0.025 : 0.05);
      scene.fog.density += (targetDensity - scene.fog.density) * 0.03;

      // Tamsos kvepavimas — dangus pulsuoja kai esi toli
      const breathTarget = minDistToAny > 10 ? 1.0 : 0.2;
      skyMat.uniforms.uBreath.value += (breathTarget - skyMat.uniforms.uBreath.value) * 0.02;

      // ========== SKULPTUROS + GARSAS ==========
      let nearestDist = Infinity, nearestLabel = null, nearestDesc = "";
      let nearColor = new THREE.Color(0x000000);
      let nearIntensity = 0;

      sculptureData.forEach((sd, i) => {
        const mesh = sd.mesh;
        mesh.rotation.y += 0.004;
        mesh.rotation.x = Math.sin(t*0.3+i)*0.08;

        const dx = camPos.x - sd.x;
        const dy = camPos.y - sd.y - 1.5;
        const dz = camPos.z - sd.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Garsas
        if(sd.sound.panner){
          sd.sound.panner.positionX.value = sd.x;
          sd.sound.panner.positionY.value = sd.y + 1.5;
          sd.sound.panner.positionZ.value = sd.z;
        }
        sd.sound.update(d);

        if(d < nearestDist){ nearestDist = d; nearestLabel = mesh.userData.label; nearestDesc = mesh.userData.desc; }

        // Vizualinis artumas — 3 zonos
        const proximity = Math.max(0, 1 - d/12);

        if(proximity > 0.05){
          // Zona 1: toli (>8m) — matai tik blankia konturo sviesa
          // Zona 2: vidutiniskai (3-8m) — forma pradeda rysekti
          // Zona 3: arti (<3m) — pilnas atsiskleidimas, svytejimas

          const zone3 = Math.max(0, 1 - d/3);   // arti
          const zone2 = Math.max(0, 1 - d/8);   // vidutiniskai

          // Spalva palaipsniui atsiranda — ryskiau
          mesh.material.color.lerp(new THREE.Color(
            zone2 > 0.1 ? sd.color : 0x0a0a10
          ), 0.08);

          // Emissive — daug stipresne
          mesh.material.emissive.lerp(new THREE.Color(
            zone3 > 0.1 ? sd.color : (zone2 > 0.2 ? sd.emissive : 0x000000)
          ), 0.06);

          mesh.material.emissiveIntensity = zone3 * 4.0 + zone2 * 0.8;

          // Sviesos — stiprios
          mesh.userData.light.intensity = zone3 * 3.0 + zone2 * 0.5;
          mesh.userData.light2.intensity = zone3 * 2.0 + zone2 * 0.3;

          // GLOW halas — atsiranda artejant
          mesh.userData.glow.material.opacity = zone2 * 0.08 + zone3 * 0.12;
          mesh.userData.glow.scale.setScalar(1 + Math.sin(t * 1.5) * 0.1 * zone2);

          // Sviesos stulpas rysekja
          mesh.userData.beam.material.opacity = 0.03 + zone2 * 0.15;

          // Pulsavimas arti
          if(zone3 > 0.2){
            const pulse = 1 + Math.sin(t*2.5)*0.05*zone3;
            mesh.scale.setScalar(pulse);
          }

          // Dangaus spalva
          if(d < nearestDist + 0.01){
            nearColor = new THREE.Color(sd.color);
            nearIntensity = zone2;
          }
        } else {
          mesh.material.color.lerp(new THREE.Color(0x0a0a10), 0.03);
          mesh.material.emissive.lerp(new THREE.Color(0x000000), 0.03);
          mesh.material.emissiveIntensity = 0;
          mesh.userData.light.intensity *= 0.93;
          mesh.userData.light2.intensity *= 0.93;
          mesh.userData.glow.material.opacity *= 0.95;
          mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.03);
        }
      });

      // Skybox reaguoja
      skyMat.uniforms.uNearColor.value.lerp(nearColor, 0.03);
      skyMat.uniforms.uNearIntensity.value += (nearIntensity - skyMat.uniforms.uNearIntensity.value) * 0.03;

      setNearest(nearestDist < 15 ? nearestLabel : null);
      setNearDist(nearestDist);
      setNearDesc(nearestDesc);
      setPlayerY(camPos.y);
      setPlayerX(camPos.x);
      setPlayerZ(camPos.z);
      setPlayerYaw(yaw);

      renderer.render(scene, camera);
    });

    // Resize
    const onResize = () => { camera.aspect=container.clientWidth/container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth,container.clientHeight); };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sounds.forEach(s=>{try{s.dispose();}catch(e){}});
      if(vrButton && container.contains(vrButton)) container.removeChild(vrButton);
      if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [started]);

  // ========== START SCREEN ==========
  if(!started){
    return (
      <div onClick={async()=>{await Tone.start();setStarted(true);}} style={{
        width:"100vw",height:"100vh",background:"#04040a",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        cursor:"pointer",fontFamily:"'Cormorant Garamond',Georgia,serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />
        <div style={{color:"#fff",fontSize:"36px",letterSpacing:"14px",fontWeight:300,fontStyle:"italic"}}>laipčiaus klausykla</div>
        <div style={{color:"#222",fontSize:"12px",letterSpacing:"3px",marginTop:"60px",textAlign:"center",lineHeight:"2.8"}}>
          ← ↑ ↓ → judėk<br/>
          🪜↑ SPACE<br/>
          🪜↓ SHIFT
        </div>
        <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#04040a;overflow:hidden}`}</style>
      </div>
    );
  }

  // ========== GAME UI ==========
  const nearestObj = nearest ? SCULPTURES.find(s=>s.label===nearest) : null;
  const nearHex = nearestObj ? "#"+nearestObj.color.toString(16).padStart(6,"0") : "#222";
  const proximity = nearestObj ? Math.max(0,Math.min(1,1-nearDist/12)) : 0;
  const heightPercent = Math.min(100, ((playerY - 1.6) / 30) * 100);

  return (
    <div style={{width:"100vw",height:"100vh",background:"#04040a",position:"relative",overflow:"hidden",fontFamily:"'Cormorant Garamond',Georgia,serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />
      <div ref={containerRef} style={{width:"100%",height:"100%",cursor:"none"}} />

      {/* MINIMAP — kairys apatinis kampas */}
      <div style={{position:"absolute",bottom:"60px",left:"20px",pointerEvents:"none"}}>
        <svg width="120" height="120" viewBox="-15 -15 30 30" style={{opacity:0.6}}>
          {/* Fonas */}
          <circle cx="0" cy="0" r="14" fill="#04040a" stroke="#111" strokeWidth="0.3"/>

          {/* Spirales kelias */}
          <path d={(() => {
            let d = "M";
            for(let i=0;i<=60;i++){
              const t=i/60;
              const a=t*Math.PI*2*2;
              const r=SPIRAL_R*(12/SPIRAL_R); // scale to fit
              const scale = 12/20; // minimap scale
              const sx = Math.cos(a)*SPIRAL_R*scale;
              const sz = Math.sin(a)*SPIRAL_R*scale;
              d += `${i===0?"":"L"}${sx.toFixed(1)},${sz.toFixed(1)} `;
            }
            return d;
          })()} fill="none" stroke="#111" strokeWidth="0.2"/>

          {/* Skulpturos — spalvoti taskai */}
          {SCULPTURES.map(s => {
            const rad = s.angle * (Math.PI/180);
            const scale = 12/20;
            const sx = Math.cos(rad) * SPIRAL_R * scale;
            const sz = Math.sin(rad) * SPIRAL_R * scale;
            const hex = "#"+s.color.toString(16).padStart(6,"0");
            const isNear = nearest === s.label;
            // Rodyti tik skulpturas kurios yra panasiam aukscio lygyje (+/- 8m)
            const heightDiff = Math.abs(s.y - (playerY - 1.6));
            const visible = heightDiff < 10;
            return (
              <g key={s.id}>
                <circle cx={sx} cy={sz} r={isNear ? 1.2 : 0.7}
                  fill={visible ? hex : "#111"}
                  opacity={visible ? (isNear ? 0.9 : 0.4) : 0.1}
                >
                  {isNear && <animate attributeName="r" values="0.7;1.3;0.7" dur="2s" repeatCount="indefinite"/>}
                </circle>
                {isNear && <text x={sx} y={sz-2} textAnchor="middle" fill={hex} fontSize="1.8" fontFamily="monospace" opacity="0.7">{s.label.split(" — ")[0]}</text>}
              </g>
            );
          })}

          {/* Zaidejas — baltas taskas su krypties rodykle */}
          {(() => {
            const scale = 12/20;
            const px = playerX * scale;
            const pz = playerZ * scale;
            // Krypties rodykle
            const dirLen = 2;
            const dx = -Math.sin(playerYaw) * dirLen;
            const dz = -Math.cos(playerYaw) * dirLen;
            return (
              <g>
                <line x1={px} y1={pz} x2={px+dx} y2={pz+dz} stroke="#fff" strokeWidth="0.4" opacity="0.6"/>
                <circle cx={px} cy={pz} r="0.6" fill="#fff" opacity="0.8"/>
              </g>
            );
          })()}
        </svg>

        {/* Aukscio skaiciukas */}
        <div style={{textAlign:"center",marginTop:"4px",color:"#333",fontSize:"9px",fontFamily:"monospace",letterSpacing:"1px"}}>
          ↑ {Math.max(0, (playerY - 1.6)).toFixed(0)}m
        </div>
      </div>

      {/* Crosshair */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
        <div style={{width:"1px",height:"12px",background:nearestObj?nearHex:"#1a1a1e",position:"absolute",top:"-6px",left:"0",opacity:.4,transition:"background .3s"}} />
        <div style={{width:"12px",height:"1px",background:nearestObj?nearHex:"#1a1a1e",position:"absolute",top:"0",left:"-6px",opacity:.4,transition:"background .3s"}} />
      </div>

      {/* Virsutinis kairys */}
      <div style={{position:"absolute",top:"16px",left:"20px",pointerEvents:"none"}}>
        <div style={{color:"#fff",fontSize:"11px",letterSpacing:"6px",fontWeight:300,opacity:.3}}>KLAUSYKLA</div>
      </div>

      {/* AUKSCIO INDIKATORIUS — desine puse */}
      <div style={{position:"absolute",right:"20px",top:"50%",transform:"translateY(-50%)",width:"2px",height:"200px",background:"#0a0a10",pointerEvents:"none"}}>
        {/* Skulpturu taskai */}
        {SCULPTURES.map(s => {
          const yPos = (1 - s.y/32) * 100;
          const hex = "#"+s.color.toString(16).padStart(6,"0");
          const isNear = nearest === s.label;
          return (
            <div key={s.id} style={{
              position:"absolute", left:"-3px", top:`${yPos}%`,
              width:"8px", height:"2px",
              background: isNear ? hex : "#1a1a1e",
              boxShadow: isNear ? `0 0 6px ${hex}` : "none",
              transition:"all .5s",
            }}>
              {isNear && <span style={{
                position:"absolute", right:"14px", top:"-6px", whiteSpace:"nowrap",
                color: hex, fontSize:"9px", letterSpacing:"2px", opacity:.7,
              }}>{s.label.split(" — ")[0]}</span>}
            </div>
          );
        })}
        {/* Zaidejo pozicija */}
        <div style={{
          position:"absolute", left:"-2px", top:`${100 - heightPercent}%`,
          width:"6px", height:"6px", borderRadius:"50%",
          background:"#fff", opacity:.5,
          transition:"top .3s",
          boxShadow:"0 0 8px rgba(255,255,255,0.2)",
        }} />
      </div>

      {/* Apatinis HUD */}
      <div style={{position:"absolute",bottom:"0",left:"0",right:"0",padding:"12px 20px",pointerEvents:"none"}}>
        {/* Artumo juosta */}
        <div style={{height:"1px",background:"#0a0a10",marginBottom:"8px",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${proximity*100}%`,background:nearHex,transition:"width .2s,background .3s"}} />
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <span style={{color:nearestObj?nearHex:"#111",fontSize:"12px",letterSpacing:"4px",fontWeight:600,textTransform:"uppercase",transition:"color .5s"}}>
              {nearest || ". . ."}
            </span>
            {nearestObj && <div style={{color:"#333",fontSize:"10px",letterSpacing:"2px",marginTop:"3px",fontStyle:"italic",transition:"opacity .5s"}}>
              {nearDesc}
            </div>}
          </div>
          {nearestObj && <span style={{color:"#333",fontSize:"10px",fontFamily:"monospace"}}>{nearDist.toFixed(1)}m</span>}
        </div>
      </div>

      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#04040a;overflow:hidden}`}</style>
    </div>
  );
}
