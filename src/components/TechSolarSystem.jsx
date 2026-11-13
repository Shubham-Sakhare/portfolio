/**
 * TechSolarSystem - Advanced interactive 3D tech stack visualisation
 * Features: shader sun, comet tails, nebula, asteroid belt, orbit trails,
 *           3D icon planets, focus rings, holographic HUD, mouse parallax
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ================================================================
   TECH DATA
================================================================ */
const TECH = [
  { name: "HTML",       icon: "https://www.w3.org/html/logo/badge/html5-badge-h-solo.png",                                                                        color: "#e34f26", glow: "#ff7040", orbit: 1.08, r: 0.19, speed: 0.68, tilt: 0.00, desc: "Web's structural backbone"       },
  { name: "CSS",        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/CSS3_logo_and_wordmark.svg/1452px-CSS3_logo_and_wordmark.svg.png",        color: "#1572b6", glow: "#38aaff", orbit: 1.62, r: 0.18, speed: 0.54, tilt: 0.14, desc: "Styling & layout engine"          },
  { name: "JavaScript", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/JavaScript-logo.png/800px-JavaScript-logo.png",                           color: "#f7df1e", glow: "#ffe040", orbit: 2.22, r: 0.21, speed: 0.42, tilt: 0.08, desc: "Dynamic scripting language"        },
  { name: "PHP",        icon: "https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg",                                                                   color: "#8993be", glow: "#b0b8f8", orbit: 2.86, r: 0.20, speed: 0.33, tilt: 0.17, desc: "Server-side powerhouse"            },
  { name: "WordPress",  icon: "https://upload.wikimedia.org/wikipedia/commons/9/98/WordPress_blue_logo.svg",                                                        color: "#21759b", glow: "#3bbff0", orbit: 3.54, r: 0.23, speed: 0.25, tilt: 0.11, desc: "World's #1 CMS platform"           },
  { name: "MySQL",      icon: "https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg",                                                                      color: "#4479a1", glow: "#60c0f0", orbit: 4.24, r: 0.21, speed: 0.19, tilt: 0.20, desc: "Open-source relational DB"         },
  { name: "React",      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",                                                                 color: "#61dafb", glow: "#90eeff", orbit: 4.98, r: 0.24, speed: 0.14, tilt: 0.07, desc: "Meta's UI component library"       },
  { name: "Bootstrap",  icon: "https://getbootstrap.com/docs/5.3/assets/brand/bootstrap-logo-shadow.png",                                                           color: "#7952b3", glow: "#b080ff", orbit: 5.74, r: 0.22, speed: 0.10, tilt: 0.24, desc: "Responsive CSS framework"          },
];

const SUN_X = -1.5;

/* ================================================================
   SHARED VERTEX SHADER (rim/fresnel)
================================================================ */
const rimVS = `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

/* ================================================================
   ICON CANVAS TEXTURE
================================================================ */
function makeIconTex(tech) {
  const S = 256, cr = 118;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");

  function drawBase() {
    ctx.clearRect(0, 0, S, S);
    const g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, cr);
    g.addColorStop(0, "rgba(18,24,52,0.97)");
    g.addColorStop(1, "rgba(8,12,30,0.99)");
    ctx.beginPath(); ctx.arc(S/2, S/2, cr, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }

  function drawRings() {
    ctx.beginPath(); ctx.arc(S/2, S/2, cr, 0, Math.PI * 2);
    ctx.lineWidth = 9; ctx.strokeStyle = tech.glow;
    ctx.shadowColor = tech.glow; ctx.shadowBlur = 28; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(S/2, S/2, cr - 10, 0, Math.PI * 2);
    ctx.lineWidth = 2.5; ctx.strokeStyle = tech.color + "55"; ctx.stroke();
  }

  drawBase(); drawRings();
  const tex = new THREE.CanvasTexture(cv);

  new THREE.TextureLoader().load(tech.icon, (imgTex) => {
    drawBase();
    // inner glow
    const ig = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, cr - 14);
    ig.addColorStop(0, tech.glow + "18"); ig.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(S/2, S/2, cr - 14, 0, Math.PI * 2);
    ctx.fillStyle = ig; ctx.fill();
    // icon
    ctx.save();
    ctx.beginPath(); ctx.arc(S/2, S/2, cr - 18, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(imgTex.image, 44, 44, 168, 168);
    ctx.restore();
    drawRings();
    // scan lines
    for (let y = 0; y < S; y += 4) { ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(0, y, S, 2); }
    tex.needsUpdate = true;
  });

  return tex;
}

/* ================================================================
   LABEL TEXTURE
================================================================ */
function makeLabelTex(tech) {
  const W = 200, H = 44;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.font = "bold 24px Poppins, Arial, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = tech.glow; ctx.shadowBlur = 14;
  ctx.fillStyle = "rgba(230,245,255,0.92)";
  ctx.fillText(tech.name, W/2, H/2);
  return new THREE.CanvasTexture(cv);
}

/* ================================================================
   ORBIT LINE
================================================================ */
function buildOrbitLine(cx, orbit, tilt, hexColor) {
  const N = 360;
  const pts = new Float32Array(N * 3);
  const cols = new Float32Array(N * 3);
  const col = new THREE.Color(hexColor);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts[i*3]   = cx + Math.cos(a) * orbit;
    pts[i*3+1] = Math.sin(a) * orbit * 0.28;
    pts[i*3+2] = 0;
    const br = 0.5 + 0.5 * Math.pow(Math.sin(a), 2);
    cols[i*3] = col.r * br; cols[i*3+1] = col.g * br; cols[i*3+2] = col.b * br;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.26, depthWrite: false });
  const line = new THREE.LineLoop(geo, mat);
  line.rotation.x = tilt;
  return { line, mat };
}

/* ================================================================
   NEBULA
================================================================ */
function buildNebula(camera) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+45.3); return fract(p.x*p.y); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=0.5;
          for(int o=0;o<6;o++){ v+=noise(p)*a; p=mat2(1.6,1.2,-1.2,1.6)*p; a*=0.5; } return v; }
        void main(){
          vec2 p = (vUv - vec2(0.54, 0.5)) * 1.4;
          vec2 d = vec2(uTime*0.0014, -uTime*0.001);
          float broad = fbm(vUv*3.6 + d);
          float fine  = fbm(vUv*9.0  - d*2.2);
          float c1 = smoothstep(0.26, 0.65, broad*0.6 + fine*0.4);
          float core = exp(-dot(p*vec2(0.72,1.0), p*vec2(0.72,1.0)) * 0.86);
          float arm = pow(max(cos(atan(p.y,p.x)*2.5 - length(p)*5.0 + fine*2.0), 0.0), 8.0) * exp(-length(p)*0.9);
          vec3 col = mix(vec3(0.02,0.07,0.28), vec3(0.24,0.03,0.52), smoothstep(0.28,0.72,fine));
          col = mix(col, vec3(0.03,0.32,0.62), smoothstep(0.58,0.92,broad)*0.7);
          col += vec3(0.14,0.06,0.42) * arm * 1.2;
          float alpha = (c1*0.52 + arm*0.28) * core * smoothstep(2.2, 0.08, length(p));
          gl_FragColor = vec4(col, alpha*0.78);
        }
      `,
    }),
  );
  mesh.position.z = -16;
  const h = 2 * (camera.position.z - mesh.position.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  mesh.scale.set(h * camera.aspect * 1.1, h * 1.1, 1);
  return mesh;
}

/* ================================================================
   ASTEROID BELT
================================================================ */
function buildBelt(cx, r0, r1, n) {
  const p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = r0 + Math.random() * (r1 - r0), a = Math.random() * Math.PI * 2;
    p[i*3] = cx + Math.cos(a)*r; p[i*3+1] = (Math.random()-0.5)*0.22; p[i*3+2] = Math.sin(a)*r*0.28;
    s[i] = 0.4 + Math.random() * 1.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("aSize",    new THREE.BufferAttribute(s, 1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aSize; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*(30.0/max(1.0,-mv.z)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(0.68,0.6,0.92,(1.0-smoothstep(0.3,0.5,d))*0.42); }`,
  }));
}

/* ================================================================
   COMET SYSTEM
================================================================ */
const COMET_COLORS = [
  new THREE.Color(0xa0eeff),
  new THREE.Color(0xffe888),
  new THREE.Color(0xff90cc),
  new THREE.Color(0xb8aaff),
  new THREE.Color(0x90ffcc),
];

function newCometState() {
  const side = Math.random() > 0.5 ? 1 : -1;
  return {
    sx: side * (13 + Math.random() * 7),
    sy: (Math.random() - 0.5) * 9,
    sz: (Math.random() - 0.5) * 5,
    dx: -side * (0.6 + Math.random() * 0.6),
    dy: (Math.random() - 0.5) * 0.5,
    dz: (Math.random() - 0.5) * 0.3,
    spd: 4.5 + Math.random() * 5.5,
    life: -(Math.random() * 2.5),
    maxLife: 2.4 + Math.random() * 2.0,
    hist: [],
  };
}

function buildComet(scene, colorIdx) {
  const col = COMET_COLORS[colorIdx % COMET_COLORS.length];
  const N = 80;

  // main tail
  const tailPos = new Float32Array(N * 3);
  const tailA   = new Float32Array(N);
  for (let i = 0; i < N; i++) tailA[i] = 1 - i / N;
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute("position", new THREE.BufferAttribute(tailPos.slice(), 3));
  tGeo.setAttribute("aA",       new THREE.BufferAttribute(tailA, 1));
  const tMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: col.clone() }, uB: { value: 1.0 } },
    vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uB; varying float vA; void main(){ gl_FragColor=vec4(uCol*uB, vA*vA*uB); }`,
  });
  const tail = new THREE.Line(tGeo, tMat);
  scene.add(tail);

  // wide soft tail
  const wGeo = tGeo.clone();
  const wMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: col.clone() }, uB: { value: 0.3 } },
    vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uB; varying float vA; void main(){ gl_FragColor=vec4(uCol*uB, vA*0.4*uB); }`,
  });
  const wideTail = new THREE.Line(wGeo, wMat);
  scene.add(wideTail);

  // head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    new THREE.MeshBasicMaterial({ color: col.clone() }),
  );
  scene.add(head);

  // halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: col.clone() }, uB: { value: 1.0 } },
      vertexShader: rimVS,
      fragmentShader: `uniform vec3 uCol; uniform float uB; varying vec3 vN; varying vec3 vV;
        void main(){ float r=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),1.8); gl_FragColor=vec4(uCol, r*0.9*uB); }`,
    }),
  );
  scene.add(halo);

  // burst particles
  const bN = 12;
  const bPos = new Float32Array(bN * 3);
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  const burst = new THREE.Points(bGeo, new THREE.PointsMaterial({
    color: col.clone(), size: 0.07, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(burst);

  return { tail, tGeo, tMat, wideTail, wGeo, wMat, head, halo, burst, bPos, bGeo, state: newCometState(), col };
}

function tickComet(c, delta, time) {
  const s = c.state;
  s.life += delta;
  if (s.life > s.maxLife) { Object.assign(s, newCometState()); s.life = 0; s.hist = []; return; }
  if (s.life < 0) { c.head.visible = c.halo.visible = c.tail.visible = c.wideTail.visible = c.burst.visible = false; return; }

  c.head.visible = c.halo.visible = c.tail.visible = c.wideTail.visible = c.burst.visible = true;

  const t = s.life;
  const px = s.sx + s.dx * s.spd * t + Math.sin(t * 2.1) * 0.08;
  const py = s.sy + s.dy * s.spd * t;
  const pz = s.sz + s.dz * s.spd * t;

  s.hist.unshift({ x: px, y: py, z: pz });
  if (s.hist.length > 80) s.hist.length = 80;

  const lr = s.life / s.maxLife;
  const fade = lr < 0.08 ? lr / 0.08 : lr > 0.82 ? (1 - lr) / 0.18 : 1.0;

  const pa = c.tGeo.attributes.position.array;
  const wa = c.wGeo.attributes.position.array;
  for (let i = 0; i < 80; i++) {
    const h = s.hist[i] || s.hist[s.hist.length - 1] || { x: px, y: py, z: pz };
    pa[i*3] = wa[i*3] = h.x; pa[i*3+1] = wa[i*3+1] = h.y; pa[i*3+2] = wa[i*3+2] = h.z;
  }
  c.tGeo.attributes.position.needsUpdate = true;
  c.wGeo.attributes.position.needsUpdate = true;

  c.tMat.uniforms.uB.value = fade;
  c.wMat.uniforms.uB.value = fade * 0.4;

  c.head.position.set(px, py, pz); c.halo.position.set(px, py, pz);
  c.head.scale.setScalar(0.5 + fade * 0.8); c.halo.scale.setScalar(0.6 + fade * 0.9);

  for (let i = 0; i < 12; i++) {
    const a = time * 1.4 + i * (Math.PI * 2 / 12);
    const br = 0.09 + 0.06 * Math.sin(time * 3 + i);
    c.bPos[i*3] = px + Math.cos(a)*br; c.bPos[i*3+1] = py + Math.sin(a)*br; c.bPos[i*3+2] = pz + Math.sin(a*1.3)*br*0.5;
  }
  c.bGeo.attributes.position.needsUpdate = true;
  c.burst.material.opacity = fade * 0.75;
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
function TechSolarSystem() {
  const hostRef  = useRef(null);
  const sceneRef = useRef(null);
  const dragRef  = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [selected, setSelected] = useState("WordPress");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse   = window.matchMedia("(pointer: coarse)");

    /* -- Renderer ----------------------------------------------- */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, host.clientWidth / host.clientHeight || 1, 0.1, 190);
    camera.position.set(0, 0, 13.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse.matches ? 1.1 : 1.65));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    host.prepend(renderer.domElement);

    /* -- Groups -------------------------------------------------- */
    const universe = new THREE.Group(); scene.add(universe);
    const solar    = new THREE.Group();
    const homePos  = { x: 2.5, y: 0.06 };
    solar.position.set(homePos.x, homePos.y, 0);
    universe.add(solar);

    /* -- Nebula -------------------------------------------------- */
    const nebula = buildNebula(camera); scene.add(nebula);

    /* -- Stars --------------------------------------------------- */
    const starVS = `
      attribute float aSize; attribute vec3 aColor;
      varying vec3 vC; varying float vT; uniform float uTime;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = aColor;
        vT = 0.72 + 0.28*sin(uTime*0.82 + position.x*17.0 + position.y*13.0);
        gl_PointSize = aSize*(40.0/max(1.0,-mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `;
    const starFS = `
      varying vec3 vC; varying float vT;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = (exp(-r*10.0)*0.65 + (1.0-smoothstep(0.02,0.18,r))*0.78) * vT;
        gl_FragColor = vec4(vC*a, a);
      }
    `;
    const mkSMat = () => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: starVS, fragmentShader: starFS,
    });
    const mkStars = (n, md) => {
      const p = new Float32Array(n*3), s = new Float32Array(n), c = new Float32Array(n*3);
      const pal = [0x9fcaff, 0xc3e8ff, 0xffffff, 0x7beaff, 0xffd5bd].map(v => new THREE.Color(v));
      for (let i = 0; i < n; i++) {
        const d = Math.random()*md+2;
        const h = 2*d*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
        p[i*3]=(Math.random()-0.5)*h*camera.aspect; p[i*3+1]=(Math.random()-0.5)*h; p[i*3+2]=camera.position.z-d;
        s[i] = 0.75 + Math.pow(Math.random(), 3) * 2.8;
        const col = pal[Math.floor(Math.random()*pal.length)], br = 0.55 + Math.random()*0.45;
        c[i*3] = col.r*br; c[i*3+1] = col.g*br; c[i*3+2] = col.b*br;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
      geo.setAttribute("aSize",    new THREE.BufferAttribute(s, 1));
      geo.setAttribute("aColor",   new THREE.BufferAttribute(c, 3));
      return new THREE.Points(geo, mkSMat());
    };
    const starsA = mkStars(coarse.matches ? 900 : 2800, 30);
    const starsB = mkStars(coarse.matches ? 160 : 520, 13);
    universe.add(starsA, starsB);

    /* -- Lighting ------------------------------------------------ */
    scene.add(new THREE.AmbientLight(0x9aaeff, 0.25));
    const sunPL = new THREE.PointLight(0xd0a8ff, 110, 100, 1.3);
    sunPL.position.set(SUN_X, 0, 0); solar.add(sunPL);
    const fillL = new THREE.PointLight(0x4488ff, 12, 30, 2);
    fillL.position.set(-8, 4, 8); scene.add(fillL);

    /* -- Sun ----------------------------------------------------- */
    const sunGrp = new THREE.Group(); sunGrp.position.x = SUN_X; solar.add(sunGrp);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 64, 52),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vN; varying vec3 vP; varying vec2 vUv;
          void main(){ vN=normalize(normalMatrix*normal); vP=position; vUv=uv;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){
            float t=uTime*0.09;
            float n1=n(vUv*7.0+t), n2=n(vUv*14.0-t*0.7), n3=n(vUv*28.0+t*0.4);
            float flame = n1*0.5 + n2*0.3 + n3*0.2;
            float ang = 0.5 + 0.5*vP.y/0.6;
            vec3 inner=vec3(0.5,0.18,1.0), mid=vec3(0.1,0.5,1.0), outer=vec3(0.9,0.28,1.0);
            vec3 col = mix(inner, mid, ang + flame*0.4);
            col = mix(col, outer, flame*flame*0.5);
            float pulse = 0.84 + 0.16*sin(uTime*2.2 + vP.x*5.0 + vP.z*3.0);
            gl_FragColor = vec4(col*pulse, 1.0);
          }`,
      }),
    );
    sunGrp.add(sunMesh);

    // corona 1
    sunGrp.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 40, 32),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: rimVS,
        fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV;
          void main(){
            float rim = pow(1.0 - max(dot(normalize(vN),normalize(vV)),0.0), 2.0);
            float pulse = 0.72 + 0.2*sin(uTime*1.9 + vN.y*8.0);
            gl_FragColor = vec4(mix(vec3(0.42,0.12,1.0), vec3(0.08,0.55,1.0), rim), rim*pulse*0.82);
          }`,
      }),
    ));

    // corona 2 (wide halo)
    sunGrp.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 32, 24),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: rimVS,
        fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV;
          void main(){
            float rim = pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0), 4.0);
            float pulse = 0.45 + 0.4*sin(uTime*0.8 + vN.x*4.0);
            gl_FragColor = vec4(0.3, 0.1, 0.95, rim*0.4*pulse);
          }`,
      }),
    ));

    // sun particle ring
    const spN = coarse.matches ? 60 : 140;
    const spPos = new Float32Array(spN * 3), spS = new Float32Array(spN);
    for (let i = 0; i < spN; i++) {
      const a = (i / spN) * Math.PI * 2, br = 0.72 + Math.random() * 0.52;
      spPos[i*3] = Math.cos(a)*br; spPos[i*3+1] = (Math.random()-0.5)*0.14; spPos[i*3+2] = Math.sin(a)*br;
      spS[i] = 1.2 + Math.random() * 2.0;
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    spGeo.setAttribute("aSize",    new THREE.BufferAttribute(spS, 1));
    sunGrp.add(new THREE.Points(spGeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSize; uniform float uTime;
        void main(){
          vec3 p = position; p.y += sin(uTime*1.4 + p.x*8.0)*0.04;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          gl_PointSize = aSize*(35.0/max(1.0,-mv.z));
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(0.72,0.5,1.0,exp(-d*9.0)*0.85); }`,
    })));

    // "S" label
    const slCv = document.createElement("canvas"); slCv.width = slCv.height = 160;
    const slCtx = slCv.getContext("2d"); slCtx.clearRect(0, 0, 160, 160);
    slCtx.font = "bold 90px Poppins, Arial, sans-serif";
    slCtx.textAlign = "center"; slCtx.textBaseline = "middle";
    slCtx.shadowColor = "#c0a0ff"; slCtx.shadowBlur = 22;
    slCtx.fillStyle = "rgba(255,255,255,0.95)"; slCtx.fillText("S", 80, 84);
    const slTex = new THREE.CanvasTexture(slCv);
    const slMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.56),
      new THREE.MeshBasicMaterial({ map: slTex, transparent: true, depthWrite: false }),
    );
    slMesh.position.z = 0.62; sunGrp.add(slMesh);

    /* -- Asteroid belt ------------------------------------------- */
    const belt = buildBelt(SUN_X, 3.1, 3.65, coarse.matches ? 110 : 260);
    solar.add(belt);

    /* -- Tech planets -------------------------------------------- */
    const techObjs = [], orbitMats = [], selectables = [];

    TECH.forEach((tech, idx) => {
      const { line, mat } = buildOrbitLine(SUN_X, tech.orbit, tech.tilt, idx % 2 ? 0x7a5cff : 0x44aaff);
      solar.add(line); orbitMats.push(mat);

      // planet sphere
      const icoTex = makeIconTex(tech);
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(tech.r, 40, 32),
        new THREE.MeshStandardMaterial({
          map: icoTex,
          roughness: 0.35, metalness: 0.18,
          emissive: new THREE.Color(tech.glow),
          emissiveIntensity: 0.08,
        }),
      );
      planet.userData.techName = tech.name;
      solar.add(planet); selectables.push(planet);

      // atmosphere
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(tech.r * 1.22, 28, 22),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(tech.glow) } },
          vertexShader: rimVS,
          fragmentShader: `uniform vec3 uCol; uniform float uTime; varying vec3 vN; varying vec3 vV;
            void main(){
              float rim = pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0), 2.6);
              float pulse = 0.7 + 0.3*sin(uTime*1.5);
              gl_FragColor = vec4(uCol, rim*0.55*pulse);
            }`,
        }),
      );
      solar.add(atmo);

      // point light
      const ptL = new THREE.PointLight(new THREE.Color(tech.glow), 0, 4.5, 2.2);
      solar.add(ptL);

      // focus ring
      const focusRing = new THREE.Mesh(
        new THREE.TorusGeometry(tech.r * 1.65, 0.022, 8, 96),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tech.glow), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      focusRing.rotation.x = Math.PI * 0.1; solar.add(focusRing);

      // outer pulse ring
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(tech.r * 2.2, 0.011, 6, 80),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tech.glow), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      solar.add(outerRing);

      // energy dot on orbit
      const eDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 8, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tech.glow), transparent: true, opacity: 0.85 }),
      );
      solar.add(eDot);

      // name label
      const lTex = makeLabelTex(tech);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lTex, transparent: true, depthWrite: false, opacity: 0 }));
      label.scale.set(0.9, 0.22, 1); solar.add(label);

      // orbit trail
      const TN = 32;
      const tPos = new Float32Array(TN * 3), tA = new Float32Array(TN);
      for (let i = 0; i < TN; i++) tA[i] = 1 - i / TN;
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3));
      tGeo.setAttribute("aA",       new THREE.BufferAttribute(tA, 1));
      const tMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uCol: { value: new THREE.Color(tech.glow) }, uVis: { value: 0.0 } },
        vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uVis; varying float vA; void main(){ gl_FragColor=vec4(uCol, vA*vA*0.65*uVis); }`,
      });
      const tLine = new THREE.Line(tGeo, tMat); solar.add(tLine);

      techObjs.push({
        ...tech, planet, atmo, ptL,
        focusRing, focusRingMat: focusRing.material,
        outerRing, outerRingMat: outerRing.material,
        eDot,
        label, labelMat: label.material,
        tLine, tGeo, tMat, tHist: [],
        phase: idx * (Math.PI * 2 / TECH.length),
      });
    });

    /* -- Comets -------------------------------------------------- */
    const cometCount = coarse.matches ? 2 : 5;
    const comets = Array.from({ length: cometCount }, (_, i) => buildComet(scene, i));

    /* -- Interaction --------------------------------------------- */
    const ia = {
      orbitX: -0.17, tOrbitX: -0.17,
      orbitY:  0.04, tOrbitY:  0.04,
      zoom: 7.6,     tZoom:    7.6,
      focus: "WordPress",
      px: 0, py: 0,
    };
    sceneRef.current = { ia };

    const rc = new THREE.Raycaster(), pNdc = new THREE.Vector2();

    /* -- Resize -------------------------------------------------- */
    const rObs = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      camera.aspect = w / h;
      camera.position.z = w < 700 ? 10.8 : 13.8;
      camera.updateProjectionMatrix(); renderer.setSize(w, h);
      const nh = 2*(camera.position.z - nebula.position.z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      nebula.scale.set(nh*camera.aspect*1.1, nh*1.1, 1);
    });
    rObs.observe(host);

    /* -- Events -------------------------------------------------- */
    const onMove = (e) => {
      const b = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - b.left)/b.width, y = (e.clientY - b.top)/b.height;
      ia.px = (x - 0.5)*2; ia.py = (y - 0.5)*2;
      if (dragRef.current.active && !coarse.matches && !noMotion.matches) {
        const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
        ia.tOrbitY += dx * 0.0036;
        ia.tOrbitX = THREE.MathUtils.clamp(ia.tOrbitX + dy*0.0027, -0.95, 0.95);
        dragRef.current.x = e.clientX; dragRef.current.y = e.clientY;
      }
    };
    const onDown = (e) => {
      if (e.button !== 0 || e.target.closest("a, button")) return;
      dragRef.current = { active: true, moved: false, x: e.clientX, y: e.clientY };
      host.classList.add("hero-dragging");
    };
    const onUp = (e) => {
      if (!dragRef.current.active) return;
      const wasDrag = dragRef.current.moved;
      dragRef.current.active = false; host.classList.remove("hero-dragging");
      if (wasDrag) return;
      const b = renderer.domElement.getBoundingClientRect();
      pNdc.set(((e.clientX-b.left)/b.width)*2-1, -((e.clientY-b.top)/b.height)*2+1);
      rc.setFromCamera(pNdc, camera);
      const hits = rc.intersectObjects(selectables, false);
      if (hits.length) {
        const name = hits[0].object.userData.techName;
        ia.focus = name; ia.tZoom = 7.6; setSelected(name);
      }
    };
    const onWheel = (e) => {
      if (!e.target.closest(".tech-solar-scene")) return;
      e.preventDefault(); ia.tZoom = THREE.MathUtils.clamp(ia.tZoom + e.deltaY*0.01, 2.5, 22);
    };
    const onLeave = () => { ia.px = 0; ia.py = 0; };

    host.addEventListener("pointermove", onMove,  { passive: true });
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup",  onUp);
    host.addEventListener("wheel",        onWheel, { passive: false });
    host.addEventListener("pointerleave", onLeave, { passive: true });

    /* -- Animation loop ------------------------------------------ */
    const clock = new THREE.Clock(); let fid, vis = true;
    const animate = () => {
      fid = undefined; if (!vis) return;
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      const ez = 1 - Math.exp(-dt * 2.9);

      ia.orbitX += (ia.tOrbitX - ia.orbitX) * ez;
      ia.orbitY += (ia.tOrbitY - ia.orbitY) * ez;
      ia.zoom   += (ia.tZoom   - ia.zoom)   * ez;

      universe.rotation.set(ia.orbitX, ia.orbitY, 0);
      universe.position.x += (-ia.px*0.15 - universe.position.x) * ez;
      universe.position.y += ( ia.py*0.11 - universe.position.y) * ez;

      const fObj = techObjs.find(o => o.name === ia.focus);
      const fOff = new THREE.Vector3(); if (fObj) fOff.copy(fObj.planet.position);
      const mob = host.clientWidth < 700;
      solar.position.lerp(new THREE.Vector3((mob?0:homePos.x)-fOff.x, (mob?-1.4:homePos.y)-fOff.y, 0), ez*0.6);
      camera.position.z = ia.zoom;

      // planets
      techObjs.forEach((tech, idx) => {
        const phase = t * tech.speed + tech.phase;
        const px = SUN_X + Math.cos(phase) * tech.orbit;
        const py = Math.sin(phase) * tech.orbit * 0.28;

        tech.planet.position.set(px, py, 0);
        tech.atmo.position.set(px, py, 0);
        tech.atmo.material.uniforms.uTime.value = t;
        tech.ptL.position.set(px, py, 0);
        tech.focusRing.position.set(px, py, 0);
        tech.outerRing.position.set(px, py, 0);
        tech.label.position.set(px, py + tech.r * 1.9, 0.1);

        tech.planet.rotation.y += dt * 0.12;
        tech.planet.rotation.x = Math.sin(t*0.3 + idx) * 0.08;

        const isFocus = ia.focus === tech.name;

        const tOp = isFocus ? 0.68 + Math.sin(t*2.8)*0.14 : 0;
        tech.focusRingMat.opacity += (tOp - tech.focusRingMat.opacity) * ez * 1.9;
        const pOp = isFocus ? (0.28 + Math.sin(t*1.9+1)*0.18) : 0;
        tech.outerRingMat.opacity += (pOp - tech.outerRingMat.opacity) * ez * 1.4;
        const sc = 1 + 0.22 * Math.sin(t*1.7 + idx);
        tech.outerRing.scale.setScalar(isFocus ? sc : 1);

        tech.labelMat.opacity += ((isFocus ? 0.9 : 0) - tech.labelMat.opacity) * ez * 1.6;
        tech.ptL.intensity = isFocus ? 5 + Math.sin(t*2.2)*1.5 : 0;
        tech.planet.material.emissiveIntensity = isFocus ? 0.18 + Math.sin(t*2.0)*0.08 : 0.06;

        // trail
        tech.tHist.unshift({ x: px, y: py }); if (tech.tHist.length > 32) tech.tHist.length = 32;
        const pa = tech.tGeo.attributes.position.array;
        for (let i = 0; i < 32; i++) {
          const h = tech.tHist[i] || { x: px, y: py };
          pa[i*3] = h.x; pa[i*3+1] = h.y; pa[i*3+2] = 0;
        }
        tech.tGeo.attributes.position.needsUpdate = true;
        tech.tMat.uniforms.uVis.value += ((isFocus ? 1 : 0) - tech.tMat.uniforms.uVis.value) * ez * 1.8;

        // energy dot (leads planet at 2x speed)
        const ea = t * tech.speed * 2.1 + tech.phase + Math.PI;
        tech.eDot.position.set(SUN_X + Math.cos(ea)*tech.orbit, Math.sin(ea)*tech.orbit*0.28, 0);
        tech.eDot.material.opacity = 0.5 + 0.4*Math.sin(t*2.2 + idx);
      });

      orbitMats.forEach((m, i) => { m.opacity = 0.1 + (Math.sin(t*0.4 + i*1.1)+1)*0.07; });

      // sun
      sunMesh.material.uniforms.uTime.value = t;
      sunGrp.children.forEach(ch => { if (ch.material?.uniforms?.uTime) ch.material.uniforms.uTime.value = t; });
      sunGrp.scale.setScalar(1 + Math.sin(t*1.1)*0.012);
      slMesh.lookAt(camera.position);

      // belt + nebula + stars
      belt.rotation.y = t * 0.012; belt.rotation.z = Math.sin(t*0.08)*0.03;
      nebula.material.uniforms.uTime.value = t;
      starsA.rotation.y = t*0.0025; starsB.rotation.y = -t*0.0085;
      starsA.material.uniforms.uTime.value = t; starsB.material.uniforms.uTime.value = t*1.3;

      // comets
      comets.forEach(c => tickComet(c, dt, t));

      renderer.render(scene, camera);
      if (!noMotion.matches) fid = requestAnimationFrame(animate);
    };

    const vObs = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && fid === undefined) { clock.start(); fid = requestAnimationFrame(animate); }
      else if (!vis && fid !== undefined) { cancelAnimationFrame(fid); fid = undefined; }
    });
    vObs.observe(host);
    fid = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(fid); rObs.disconnect(); vObs.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup",  onUp);
      host.removeEventListener("wheel",        onWheel);
      host.removeEventListener("pointerleave", onLeave);
      host.classList.remove("hero-dragging");
      scene.traverse(o => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
      });
      renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null;
    };
  }, []);

  /* -- UI handlers ----------------------------------------------- */
  const focusTech = (name) => {
    const ia = sceneRef.current?.ia; if (!ia) return;
    ia.focus = name; ia.tZoom = 7.6; setSelected(name);
  };
  const zoom = (d) => {
    const ia = sceneRef.current?.ia; if (!ia) return;
    ia.tZoom = THREE.MathUtils.clamp(ia.tZoom + d, 2.5, 22);
  };

  const sel = TECH.find(t => t.name === selected);

  return (
    <div
      className="hero-ai-scene hero-ai-backdrop tech-solar-scene"
      ref={hostRef}
      aria-label="Interactive tech solar system — drag to orbit, scroll to zoom, click a planet"
    >
      <div className="hero-ai-vignette" aria-hidden="true" />
      <div className="hero-ai-grid"    aria-hidden="true" />
      <div className="ai-scan-beam"   aria-hidden="true" />

      {/* HUD corner badge */}
      <div className="ts-hud-corner" aria-hidden="true">
        <span className="ts-hud-title">TECH UNIVERSE</span>
        <span className="ts-hud-sub">DEVELOPER STACK · 2024</span>
        <div className="ts-hud-line" />
        <div className="ts-hud-bars"><i/><i/><i/><i/><i/><i/><i/></div>
      </div>

      {/* Detail card */}
      <div className="ts-card" aria-live="polite">
        <div className="ts-card-top">
          <span className="ts-card-kicker">◈ ACTIVE TECH</span>
          <div className="ts-card-dot" style={{ background: sel?.glow, boxShadow: `0 0 12px ${sel?.glow}` }} />
        </div>
        <strong className="ts-card-name" style={{ color: sel?.glow, textShadow: `0 0 22px ${sel?.glow}99` }}>
          {selected}
        </strong>
        <p className="ts-card-desc">{sel?.desc}</p>
        <div className="ts-card-bar" style={{ background: `linear-gradient(90deg, ${sel?.glow}cc, transparent)` }} />
        <div className="ts-card-stats">
          <span>ORBIT  <strong>{TECH.findIndex(t => t.name === selected) + 1}</strong></span>
          <span>TIER   <strong>{selected === "React" || selected === "WordPress" || selected === "JavaScript" ? "AAA" : "AA"}</strong></span>
        </div>
      </div>

      {/* Planet selector */}
      <nav className="ts-nav" aria-label="Select a technology">
        {TECH.map(tech => (
          <button
            key={tech.name}
            type="button"
            className={`ts-nav-btn${selected === tech.name ? " ts-nav-btn--on" : ""}`}
            onClick={() => focusTech(tech.name)}
            aria-pressed={selected === tech.name}
            style={selected === tech.name ? {
              borderColor: tech.glow,
              boxShadow: `0 0 14px ${tech.glow}55, inset 0 0 10px ${tech.glow}18`,
            } : {}}
          >
            <span className="ts-nav-dot" style={{ background: tech.glow, boxShadow: `0 0 7px ${tech.glow}` }} />
            {tech.name}
          </button>
        ))}
      </nav>

      {/* Zoom */}
      <div className="ts-zoom-wrap" aria-label="Zoom controls">
        <button type="button" className="ts-zoom-btn" onClick={() => zoom(-1.5)} aria-label="Zoom in">+</button>
        <div className="ts-zoom-sep" />
        <button type="button" className="ts-zoom-btn" onClick={() => zoom(1.5)}  aria-label="Zoom out">-</button>
      </div>

      {/* Hint */}
      <div className="ts-hint" aria-hidden="true">
        <span>DRAG</span><span>SCROLL</span><span>CLICK PLANET</span>
      </div>
    </div>
  );
}

export default TechSolarSystem;
