import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   TECH DATA
───────────────────────────────────────────── */
const TECH = [
  { name: "HTML",       icon: "https://www.w3.org/html/logo/badge/html5-badge-h-solo.png",                                                                        color: "#e34f26", glow: "#ff6a35", orbit: 1.05, size: 0.52, speed: 0.68, tilt: 0.00, desc: "Structure of the web"          },
  { name: "CSS",        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/CSS3_logo_and_wordmark.svg/1452px-CSS3_logo_and_wordmark.svg.png",        color: "#1572b6", glow: "#38aaff", orbit: 1.55, size: 0.52, speed: 0.54, tilt: 0.14, desc: "Styling & animations"           },
  { name: "JavaScript", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/JavaScript-logo.png/800px-JavaScript-logo.png",                           color: "#f7df1e", glow: "#ffe566", orbit: 2.1,  size: 0.58, speed: 0.42, tilt: 0.09, desc: "Dynamic scripting language"    },
  { name: "PHP",        icon: "https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg",                                                                   color: "#8993be", glow: "#b0b8e8", orbit: 2.68, size: 0.58, speed: 0.33, tilt: 0.18, desc: "Server-side scripting"         },
  { name: "WordPress",  icon: "https://upload.wikimedia.org/wikipedia/commons/9/98/WordPress_blue_logo.svg",                                                        color: "#21759b", glow: "#3bb5e8", orbit: 3.3,  size: 0.64, speed: 0.25, tilt: 0.11, desc: "World's #1 CMS"               },
  { name: "MySQL",      icon: "https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg",                                                                      color: "#4479a1", glow: "#70b8e8", orbit: 3.95, size: 0.6,  speed: 0.19, tilt: 0.20, desc: "Relational database"           },
  { name: "React",      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",                                                                 color: "#61dafb", glow: "#a0eeff", orbit: 4.65, size: 0.66, speed: 0.14, tilt: 0.07, desc: "UI library by Meta"            },
  { name: "Bootstrap",  icon: "https://getbootstrap.com/docs/5.3/assets/brand/bootstrap-logo-shadow.png",                                                           color: "#7952b3", glow: "#b088ff", orbit: 5.35, size: 0.62, speed: 0.10, tilt: 0.25, desc: "CSS component framework"      },
];

const CX = -1.6; // sun center-x offset inside solarSystem group

/* ─────────────────────────────────────────────
   COMET SYSTEM
───────────────────────────────────────────── */
function createCometSystem(scene, count = 5) {
  const comets = [];
  for (let i = 0; i < count; i++) {
    // tail geometry — a line of decreasing opacity points
    const tailLen = 60;
    const tailPos = new Float32Array(tailLen * 3);
    const tailAlpha = new Float32Array(tailLen);
    for (let j = 0; j < tailLen; j++) {
      tailPos[j * 3] = tailPos[j * 3 + 1] = tailPos[j * 3 + 2] = 0;
      tailAlpha[j] = 1 - j / tailLen;
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos.slice(), 3));
    tailGeo.setAttribute("alpha", new THREE.BufferAttribute(tailAlpha, 1));

    const tailMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.0;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uColor, vAlpha * vAlpha);
        }
      `,
    });

    const tail = new THREE.Line(tailGeo, tailMat);
    scene.add(tail);

    // head — bright point
    const headGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(headGeo, headMat);
    scene.add(head);

    // inner glow halo around head
    const haloGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal); vV = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        uniform vec3 uColor;
        void main() {
          float r = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
          gl_FragColor = vec4(uColor, r * 0.85);
        }`,
      uniforms: { uColor: { value: new THREE.Color(0xffffff) } },
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // random comet color
    const hue = Math.random();
    const col = new THREE.Color().setHSL(hue, 0.9, 0.85);
    tailMat.uniforms.uColor.value = col;
    haloMat.uniforms.uColor.value = col;
    headMat.color = col;

    // trajectory params — sweeping diagonally across the scene
    const spawnComet = () => ({
      // start far off one side, travel to opposite side
      startX: (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 6),
      startY: (Math.random() - 0.5) * 10,
      startZ: (Math.random() - 0.5) * 4,
      dirX:   (Math.random() - 0.5) * 2,
      dirY:   (Math.random() - 0.5) * 1.4,
      dirZ:   (Math.random() - 0.5) * 0.8,
      speed:  3.5 + Math.random() * 4.5,
      life:   0,
      maxLife: 2.8 + Math.random() * 2.0,
      history: [],
    });

    comets.push({ tail, tailGeo, head, halo, tailMat, state: spawnComet(), spawnComet });
  }
  return comets;
}

function updateComets(comets, delta) {
  comets.forEach((c) => {
    const s = c.state;
    s.life += delta;

    if (s.life > s.maxLife) {
      // respawn
      Object.assign(s, c.spawnComet());
      s.history = [];
      return;
    }

    const t = s.life;
    const px = s.startX + s.dirX * s.speed * t;
    const py = s.startY + s.dirY * s.speed * t;
    const pz = s.startZ + s.dirZ * s.speed * t;

    c.head.position.set(px, py, pz);
    c.halo.position.set(px, py, pz);

    // push history
    s.history.unshift({ x: px, y: py, z: pz });
    if (s.history.length > 60) s.history.length = 60;

    // update tail geometry
    const posArr = c.tailGeo.attributes.position.array;
    const len = s.history.length;
    for (let i = 0; i < 60; i++) {
      if (i < len) {
        posArr[i * 3]     = s.history[i].x;
        posArr[i * 3 + 1] = s.history[i].y;
        posArr[i * 3 + 2] = s.history[i].z;
      } else {
        posArr[i * 3]     = s.history[len - 1]?.x ?? px;
        posArr[i * 3 + 1] = s.history[len - 1]?.y ?? py;
        posArr[i * 3 + 2] = s.history[len - 1]?.z ?? pz;
      }
    }
    c.tailGeo.attributes.position.needsUpdate = true;

    // fade in/out based on life fraction
    const lifeRatio = s.life / s.maxLife;
    const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.85 ? (1 - lifeRatio) / 0.15 : 1.0;
    c.head.material.opacity = fade;
    c.tailMat.uniforms.uColor.value.multiplyScalar(1); // keep color stable
    c.tail.material.uniforms.uColor.value = c.tail.material.uniforms.uColor.value; // no-op to keep ref
    // apply fade via head scale
    const sc = 0.5 + fade * 0.8;
    c.head.scale.setScalar(sc);
    c.halo.scale.setScalar(sc * 1.1);
  });
}

/* ─────────────────────────────────────────────
   ICON SPRITE BUILDER
───────────────────────────────────────────── */
function buildIconSprite(tech, size) {
  const C = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = C;
  const ctx = cv.getContext("2d");

  // dark glassy bg
  const r = C / 2 - 6;
  const grad = ctx.createRadialGradient(C/2, C/2, 0, C/2, C/2, r);
  grad.addColorStop(0, "rgba(14, 20, 40, 0.95)");
  grad.addColorStop(1, "rgba(6, 10, 22, 0.98)");
  ctx.beginPath(); ctx.arc(C/2, C/2, r, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();

  // color glow ring
  ctx.beginPath(); ctx.arc(C/2, C/2, r, 0, Math.PI * 2);
  ctx.strokeStyle = tech.glow; ctx.lineWidth = 7;
  ctx.shadowBlur = 18; ctx.shadowColor = tech.glow;
  ctx.stroke(); ctx.shadowBlur = 0;

  // inner subtle ring
  ctx.beginPath(); ctx.arc(C/2, C/2, r - 10, 0, Math.PI * 2);
  ctx.strokeStyle = `${tech.color}44`; ctx.lineWidth = 2; ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);

  // load actual icon
  const loader = new THREE.TextureLoader();
  loader.load(tech.icon, (imgTex) => {
    const img = imgTex.image;
    ctx.clearRect(0, 0, C, C);
    // redraw bg
    const g2 = ctx.createRadialGradient(C/2, C/2, 0, C/2, C/2, r);
    g2.addColorStop(0, "rgba(14, 20, 40, 0.95)");
    g2.addColorStop(1, "rgba(6, 10, 22, 0.98)");
    ctx.beginPath(); ctx.arc(C/2, C/2, r, 0, Math.PI * 2);
    ctx.fillStyle = g2; ctx.fill();

    // draw icon clipped to inner circle
    ctx.save();
    ctx.beginPath(); ctx.arc(C/2, C/2, r - 14, 0, Math.PI * 2); ctx.clip();
    const pad = 36;
    ctx.drawImage(img, pad, pad, C - pad * 2, C - pad * 2);
    ctx.restore();

    // glow ring on top
    ctx.beginPath(); ctx.arc(C/2, C/2, r, 0, Math.PI * 2);
    ctx.strokeStyle = tech.glow; ctx.lineWidth = 7;
    ctx.shadowBlur = 20; ctx.shadowColor = tech.glow; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(C/2, C/2, r - 10, 0, Math.PI * 2);
    ctx.strokeStyle = `${tech.color}55`; ctx.lineWidth = 2; ctx.stroke();

    tex.needsUpdate = true;
  });

  return { sprite, tex };
}

/* ─────────────────────────────────────────────
   ORBIT LINE (dashed-style via points)
───────────────────────────────────────────── */
function buildOrbitLine(cx, orbit, tilt, color) {
  const segs = 320;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(
      cx + Math.cos(a) * orbit,
      Math.sin(a) * orbit * 0.28,
      0,
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 0.22, depthWrite: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  line.rotation.x = tilt;
  return { line, mat };
}

/* ─────────────────────────────────────────────
   ASTEROID BELT (decorative particles between orbits)
───────────────────────────────────────────── */
function buildAsteroidBelt(cx, innerR, outerR, count = 220) {
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = innerR + Math.random() * (outerR - innerR);
    const a = Math.random() * Math.PI * 2;
    pos[i*3]   = cx + Math.cos(a) * r;
    pos[i*3+1] = (Math.random() - 0.5) * 0.18;
    pos[i*3+2] = Math.sin(a) * r * 0.28;
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      uniform float uTime;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (28.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.3, 0.5, d);
        gl_FragColor = vec4(0.72, 0.65, 0.95, a * 0.45);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}

/* ─────────────────────────────────────────────
   NEBULA BACKGROUND PLANE
───────────────────────────────────────────── */
function buildNebula(camera) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        float h21(vec2 p) { p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float n(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);
        }
        float fbm(vec2 p) {
          float v=0.0, a=0.5;
          for(int o=0;o<5;o++){v+=n(p)*a; p=mat2(1.6,1.2,-1.2,1.6)*p; a*=0.5;}
          return v;
        }
        void main() {
          vec2 p=(vUv-vec2(0.55,0.5))*vec2(1.4,1.1);
          vec2 d=vec2(uTime*0.0018,-uTime*0.0012);
          float broad=fbm(vUv*vec2(3.8,2.9)+d);
          float detail=fbm(vUv*vec2(10.0,8.0)-d*2.0);
          float cloud=smoothstep(0.28,0.68,broad*0.65+detail*0.35+0.14*sin(p.x*5.0+p.y*4.0));
          float core=exp(-dot(p*vec2(0.7,1.0),p*vec2(0.7,1.0))*0.9);
          vec3 col=mix(vec3(0.02,0.08,0.3),vec3(0.28,0.04,0.55),smoothstep(0.3,0.7,detail));
          col=mix(col,vec3(0.04,0.38,0.68),smoothstep(0.6,0.9,broad)*0.7);
          col+=vec3(0.12,0.08,0.3)*cloud*0.4;
          float alpha=(cloud*0.5)*core*smoothstep(2.0,0.1,length(p));
          gl_FragColor=vec4(col, alpha*0.72);
        }
      `,
    }),
  );
  mesh.position.z = -16;
  const h = 2 * (camera.position.z - mesh.position.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  mesh.scale.set(h * camera.aspect * 1.1, h * 1.1, 1);
  return mesh;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const TechSolarSystem = () => {
  const hostRef  = useRef(null);
  const sceneRef = useRef(null);
  const dragRef  = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [selected,  setSelected]  = useState("WordPress");
  const [hovered,   setHovered]   = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePtr     = window.matchMedia("(pointer: coarse)");

    /* ── Renderer ─────────────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, host.clientWidth / host.clientHeight || 1, 0.1, 180);
    camera.position.set(0, 0, 13.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePtr.matches ? 1.1 : 1.6));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    host.prepend(renderer.domElement);

    /* ── Groups ───────────────────────────────────────── */
    const universe   = new THREE.Group();
    scene.add(universe);

    const solarSystem = new THREE.Group();
    const homePos = { x: 2.6, y: 0.08 };
    solarSystem.position.set(homePos.x, homePos.y, 0);
    universe.add(solarSystem);

    /* ── Nebula ───────────────────────────────────────── */
    const nebula = buildNebula(camera);
    scene.add(nebula);

    /* ── Stars ────────────────────────────────────────── */
    const starVS = `
      attribute float aSize; attribute vec3 aColor;
      varying vec3 vColor; varying float vTwinkle; uniform float uTime;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vColor = aColor;
        vTwinkle = 0.72 + 0.28*sin(uTime*0.85 + position.x*17.0 + position.y*13.0);
        gl_PointSize = aSize*(38.0/max(1.0,-mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `;
    const starFS = `
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = (exp(-r*11.0)*0.6 + (1.0-smoothstep(0.02,0.18,r))*0.8) * vTwinkle;
        gl_FragColor = vec4(vColor * a, a);
      }
    `;
    const mkStarMat = () => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: starVS, fragmentShader: starFS,
    });

    const buildStars = (count, maxD) => {
      const p = new Float32Array(count*3), s = new Float32Array(count), c = new Float32Array(count*3);
      const pal = [0x9fcaff,0xc3e8ff,0xffffff,0x7beaff,0xffd5bd].map(v=>new THREE.Color(v));
      for (let i = 0; i < count; i++) {
        const d = Math.random()*maxD+2;
        const h = 2*d*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
        p[i*3]=(Math.random()-0.5)*h*camera.aspect; p[i*3+1]=(Math.random()-0.5)*h; p[i*3+2]=camera.position.z-d;
        s[i]=0.8+Math.pow(Math.random(),3)*2.6;
        const col=pal[Math.floor(Math.random()*pal.length)], br=0.58+Math.random()*0.42;
        c[i*3]=col.r*br; c[i*3+1]=col.g*br; c[i*3+2]=col.b*br;
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(p,3));
      geo.setAttribute("aSize",    new THREE.BufferAttribute(s,1));
      geo.setAttribute("aColor",   new THREE.BufferAttribute(c,3));
      return new THREE.Points(geo, mkStarMat());
    };
    const starsA = buildStars(coarsePtr.matches ? 900  : 2600, 28);
    const starsB = buildStars(coarsePtr.matches ? 180  : 480,  12);
    universe.add(starsA, starsB);

    /* ── Lighting ─────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x9aaeff, 0.28));
    const sunPtLight = new THREE.PointLight(0xd0a8ff, 90, 90, 1.35);
    sunPtLight.position.set(CX, 0, 0);
    solarSystem.add(sunPtLight);

    /* ── Sun (developer core) ─────────────────────────── */
    const sunGroup = new THREE.Group();
    sunGroup.position.x = CX;
    solarSystem.add(sunGroup);

    // core sphere — gradient via shader
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 56, 44),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vN; varying vec3 vP; varying vec2 vUv;
          void main() {
            vN=normalize(normalMatrix*normal); vP=position; vUv=uv;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vN; varying vec3 vP; varying vec2 vUv;
          float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
          void main() {
            float n=noise(vUv*8.0+uTime*0.08)*0.4;
            float r=0.5+0.5*vP.y/0.58;
            vec3 c1=vec3(0.46,0.22,1.0);
            vec3 c2=vec3(0.1,0.52,1.0);
            vec3 c3=vec3(0.9,0.3,1.0);
            vec3 col=mix(mix(c1,c2,r+n),c3,n*0.6);
            float pulse=0.82+0.18*sin(uTime*2.0+vP.x*4.0);
            gl_FragColor=vec4(col*pulse, 1.0);
          }
        `,
      }),
    );
    sunGroup.add(sunMesh);

    // pulsing corona
    const sunCorona = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 40, 32),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 mv=modelViewMatrix*vec4(position,1.0);
            vN=normalize(normalMatrix*normal); vV=-mv.xyz;
            gl_Position=projectionMatrix*mv;
          }
        `,
        fragmentShader: `
          uniform float uTime; varying vec3 vN; varying vec3 vV;
          void main() {
            float rim=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),2.0);
            float pulse=0.74+0.18*sin(uTime*1.8+vN.y*9.0);
            vec3 col=mix(vec3(0.4,0.15,1.0),vec3(0.1,0.6,1.0),rim);
            gl_FragColor=vec4(col, rim*pulse*0.78);
          }
        `,
      }),
    );
    sunGroup.add(sunCorona);

    // outer soft halo
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 32, 24),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 mv=modelViewMatrix*vec4(position,1.0);
            vN=normalize(normalMatrix*normal); vV=-mv.xyz;
            gl_Position=projectionMatrix*mv;
          }
        `,
        fragmentShader: `
          uniform float uTime; varying vec3 vN; varying vec3 vV;
          void main() {
            float rim=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),3.5);
            float pulse=0.5+0.5*sin(uTime*0.9);
            gl_FragColor=vec4(0.3,0.1,0.9, rim*0.35*pulse);
          }
        `,
      }),
    );
    sunGroup.add(sunHalo);

    // "S" label
    const sunLabelCv = document.createElement("canvas");
    sunLabelCv.width = sunLabelCv.height = 128;
    const slc = sunLabelCv.getContext("2d");
    slc.clearRect(0,0,128,128);
    slc.font = "bold 78px Poppins, Arial, sans-serif";
    slc.fillStyle = "rgba(255,255,255,0.92)";
    slc.textAlign = "center"; slc.textBaseline = "middle";
    slc.shadowColor = "#a070ff"; slc.shadowBlur = 18;
    slc.fillText("S", 64, 66);
    const sunLabelTex = new THREE.CanvasTexture(sunLabelCv);
    const sunLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ map: sunLabelTex, transparent: true, depthWrite: false }),
    );
    sunLabel.position.z = 0.6;
    sunGroup.add(sunLabel);

    /* ── Asteroid belt (between orbit 3 and 4) ────────── */
    const asteroidBelt = buildAsteroidBelt(CX, 2.9, 3.4, coarsePtr.matches ? 100 : 240);
    solarSystem.add(asteroidBelt);

    /* ── Tech orbits & icons ──────────────────────────── */
    const techObjs  = [];
    const orbitMats = [];
    const selectables = [];

    TECH.forEach((tech, idx) => {
      // orbit line
      const { line, mat } = buildOrbitLine(CX, tech.orbit, tech.tilt, idx % 2 ? 0x7a5cff : 0x44aaff);
      solarSystem.add(line);
      orbitMats.push(mat);

      // icon sprite
      const spriteSize = tech.size * 0.72;
      const { sprite, tex } = buildIconSprite(tech, spriteSize);
      sprite.userData.techName = tech.name;
      solarSystem.add(sprite);
      selectables.push(sprite);

      // per-tech point light (subtle)
      const ptLight = new THREE.PointLight(new THREE.Color(tech.glow), 0, 3.5, 2);
      solarSystem.add(ptLight);

      // selection ring
      const ringGeo = new THREE.TorusGeometry(spriteSize * 0.72, 0.022, 8, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(tech.glow),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.08;
      solarSystem.add(ring);

      // outer pulse ring
      const pulseGeo = new THREE.TorusGeometry(spriteSize * 1.2, 0.012, 6, 80);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(tech.glow),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
      solarSystem.add(pulseRing);

      // orbit trail — faint trail behind icon
      const trailCount = 24;
      const trailPos = new Float32Array(trailCount * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
      const trailMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(tech.glow) } },
        vertexShader: `
          attribute float aAlpha; varying float vA;
          void main() { vA=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform vec3 uColor; varying float vA;
          void main() { gl_FragColor = vec4(uColor, vA * 0.55); }
        `,
      });

      // Add alpha per vertex for trail fade
      const trailAlphaArr = new Float32Array(trailCount);
      for (let i = 0; i < trailCount; i++) trailAlphaArr[i] = 1 - i / trailCount;
      trailGeo.setAttribute("aAlpha", new THREE.BufferAttribute(trailAlphaArr, 1));
      const trailLine = new THREE.Line(trailGeo, trailMat);
      solarSystem.add(trailLine);

      techObjs.push({
        ...tech, sprite, tex, ring, ringMat, pulseRing, pulseMat, ptLight,
        trailLine, trailGeo, trailHistory: [],
        phase: idx * (Math.PI * 2 / TECH.length),
      });
    });

    /* ── Comets ───────────────────────────────────────── */
    const comets = createCometSystem(scene, coarsePtr.matches ? 2 : 4);

    /* ── Interaction ──────────────────────────────────── */
    const interaction = {
      orbitX: -0.18, targetOrbitX: -0.18,
      orbitY:  0.04, targetOrbitY:  0.04,
      zoom: 7.6,     targetZoom:  7.6,
      focus: "WordPress",
      pointerX: 0, pointerY: 0,
    };
    sceneRef.current = { interaction };

    const raycaster   = new THREE.Raycaster();
    const pointerNdc  = new THREE.Vector2();

    /* ── Resize ───────────────────────────────────────── */
    const resizeObs = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.position.z = w < 700 ? 10.8 : 13.8;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      const nh = 2*(camera.position.z - nebula.position.z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      nebula.scale.set(nh*camera.aspect*1.1, nh*1.1, 1);
    });
    resizeObs.observe(host);

    /* ── Pointer events ───────────────────────────────── */
    const onMove = (e) => {
      const b = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width;
      const y = (e.clientY - b.top)  / b.height;
      interaction.pointerX = (x - 0.5) * 2;
      interaction.pointerY = (y - 0.5) * 2;

      if (dragRef.current.active && !coarsePtr.matches && !reducedMotion.matches) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
        interaction.targetOrbitY += dx * 0.0038;
        interaction.targetOrbitX = THREE.MathUtils.clamp(interaction.targetOrbitX + dy * 0.0028, -0.92, 0.92);
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
      }

      // hover detection
      pointerNdc.set((x*2-1), -(y*2-1));
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(selectables, false);
      setHovered(hits.length ? hits[0].object.userData.techName : null);
    };

    const onDown = (e) => {
      if (e.button !== 0 || e.target.closest("a, button")) return;
      dragRef.current = { active: true, moved: false, x: e.clientX, y: e.clientY };
      host.classList.add("hero-dragging");
    };

    const onUp = (e) => {
      if (!dragRef.current.active) return;
      const wasDrag = dragRef.current.moved;
      dragRef.current.active = false;
      host.classList.remove("hero-dragging");
      if (wasDrag) return;

      const b = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(((e.clientX-b.left)/b.width)*2-1, -((e.clientY-b.top)/b.height)*2+1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(selectables, false);
      if (hits.length) {
        const name = hits[0].object.userData.techName;
        interaction.focus = name;
        interaction.targetZoom = 7.6;
        setSelected(name);
      }
    };

    const onWheel = (e) => {
      if (!e.target.closest(".tech-solar-scene")) return;
      e.preventDefault();
      interaction.targetZoom = THREE.MathUtils.clamp(interaction.targetZoom + e.deltaY * 0.01, 2.5, 22);
    };

    const onLeave = () => { interaction.pointerX = 0; interaction.pointerY = 0; };

    host.addEventListener("pointermove", onMove,  { passive: true });
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup",  onUp);
    host.addEventListener("wheel",       onWheel, { passive: false });
    host.addEventListener("pointerleave", onLeave, { passive: true });

    /* ── Animation loop ───────────────────────────────── */
    const clock = new THREE.Clock();
    let frameId, visible = true;

    const animate = () => {
      frameId = undefined;
      if (!visible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const time  = clock.elapsedTime;
      const ease  = 1 - Math.exp(-delta * 2.9);

      // smooth interaction
      interaction.orbitX += (interaction.targetOrbitX - interaction.orbitX) * ease;
      interaction.orbitY += (interaction.targetOrbitY - interaction.orbitY) * ease;
      interaction.zoom   += (interaction.targetZoom   - interaction.zoom)   * ease;

      universe.rotation.set(interaction.orbitX, interaction.orbitY, 0);
      universe.position.x += (-interaction.pointerX * 0.16 - universe.position.x) * ease;
      universe.position.y += ( interaction.pointerY * 0.12 - universe.position.y) * ease;

      // follow focused tech
      const focusObj = techObjs.find(t => t.name === interaction.focus);
      const fOff = new THREE.Vector3();
      if (focusObj) fOff.copy(focusObj.sprite.position);
      const mobile = host.clientWidth < 700;
      const fcx = mobile ? 0 : homePos.x;
      const fcy = mobile ? -1.4 : homePos.y;
      solarSystem.position.lerp(new THREE.Vector3(fcx - fOff.x, fcy - fOff.y, 0), ease * 0.62);
      camera.position.z = interaction.zoom;

      // animate each tech
      techObjs.forEach((tech, idx) => {
        const phase = time * tech.speed + tech.phase;
        const px = CX + Math.cos(phase) * tech.orbit;
        const py = Math.sin(phase) * tech.orbit * 0.28;

        tech.sprite.position.set(px, py, 0);

        const isFocused = interaction.focus === tech.name;
        const isHov     = false; // hover via state is async; use ring for smooth feedback

        // ring pos
        tech.ring.position.set(px, py, 0);
        tech.pulseRing.position.set(px, py, 0);

        // ring opacity
        const targetOp = isFocused ? 0.72 + Math.sin(time * 2.6) * 0.14 : 0;
        tech.ringMat.opacity += (targetOp - tech.ringMat.opacity) * ease * 1.8;

        const pulseOp = isFocused ? (0.3 + Math.sin(time * 1.8 + 1) * 0.2) : 0;
        tech.pulseMat.opacity += (pulseOp - tech.pulseMat.opacity) * ease * 1.4;
        const pulseScale = 1 + 0.18 * Math.sin(time * 1.6 + idx);
        tech.pulseRing.scale.setScalar(pulseScale);

        // point light
        tech.ptLight.position.set(px, py, 0);
        tech.ptLight.intensity = isFocused ? 4.5 + Math.sin(time * 2.0) * 1.2 : 0;

        // trail
        tech.trailHistory.unshift({ x: px, y: py });
        if (tech.trailHistory.length > 24) tech.trailHistory.length = 24;
        const posArr = tech.trailGeo.attributes.position.array;
        for (let i = 0; i < 24; i++) {
          const h = tech.trailHistory[i] || { x: px, y: py };
          posArr[i*3] = h.x; posArr[i*3+1] = h.y; posArr[i*3+2] = 0;
        }
        tech.trailGeo.attributes.position.needsUpdate = true;
        tech.trailLine.material.uniforms.uColor.value.set(tech.glow);
        // trail only shows when focused
        tech.trailLine.material.opacity = isFocused ? 1 : 0;
      });

      // orbit lines pulse
      orbitMats.forEach((mat, idx) => {
        mat.opacity = 0.11 + (Math.sin(time * 0.38 + idx * 0.9) + 1) * 0.055;
      });

      // sun animation
      sunMesh.rotation.y  += delta * 0.07;
      sunMesh.rotation.x  = Math.sin(time * 0.4) * 0.08;
      sunCorona.material.uniforms.uTime.value = time;
      sunHalo.material.uniforms.uTime.value   = time;
      sunMesh.material.uniforms.uTime.value   = time;
      sunLabel.position.z = 0.6;
      sunLabel.lookAt(camera.position);
      sunGroup.scale.setScalar(1 + Math.sin(time * 1.2) * 0.014);

      // asteroids drift
      asteroidBelt.rotation.y = time * 0.015;
      asteroidBelt.rotation.x = Math.sin(time * 0.07) * 0.04;

      // nebula
      nebula.material.uniforms.uTime.value = time;

      // stars
      starsA.rotation.y = time * 0.0028;
      starsB.rotation.y = -time * 0.009;
      starsA.material.uniforms.uTime.value = time;
      starsB.material.uniforms.uTime.value = time * 1.3;

      // comets
      updateComets(comets, delta);

      renderer.render(scene, camera);
      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(animate);
    };

    const visObs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && frameId === undefined) { clock.start(); frameId = window.requestAnimationFrame(animate); }
      else if (!visible && frameId !== undefined) { cancelAnimationFrame(frameId); frameId = undefined; }
    });
    visObs.observe(host);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObs.disconnect();
      visObs.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerleave", onLeave);
      host.classList.remove("hero-dragging");
      scene.traverse(o => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  /* ── UI handlers ────────────────────────────────── */
  const focusTech = (name) => {
    const st = sceneRef.current?.interaction;
    if (!st) return;
    st.focus = name;
    st.targetZoom = 7.6;
    setSelected(name);
  };

  const adjustZoom = (amt) => {
    const st = sceneRef.current?.interaction;
    if (!st) return;
    st.targetZoom = THREE.MathUtils.clamp(st.targetZoom + amt, 2.5, 22);
  };

  const selectedTech = TECH.find(t => t.name === selected);

  return (
    <div
      className="hero-ai-scene hero-ai-backdrop tech-solar-scene"
      ref={hostRef}
      aria-label="Interactive tech solar system — drag to orbit, scroll to zoom, click a technology to focus it"
    >
      {/* vignette */}
      <div className="hero-ai-vignette" aria-hidden="true" />

      {/* grid overlay */}
      <div className="hero-ai-grid" aria-hidden="true" />

      {/* scan beam */}
      <div className="ai-scan-beam" aria-hidden="true" />

      {/* corner title badge */}
      <div className="ts-title-badge" aria-hidden="true">
        <span className="ts-badge-label">TECH UNIVERSE</span>
        <span className="ts-badge-sub">MY STACK · 2024</span>
        <span className="ts-badge-line" />
      </div>

      {/* selected tech detail card */}
      <div className="ts-detail-card" aria-live="polite">
        <span className="ts-detail-kicker">◈ TECHNOLOGY</span>
        <strong
          className="ts-detail-name"
          style={{ color: selectedTech?.glow ?? "#e7f7ff", textShadow: `0 0 20px ${selectedTech?.glow ?? "#a0cfff"}` }}
        >
          {selected}
        </strong>
        <p className="ts-detail-desc">{selectedTech?.desc}</p>
        <div className="ts-detail-swatch" style={{ background: selectedTech?.glow, boxShadow: `0 0 14px ${selectedTech?.glow}` }} />
      </div>

      {/* tech selector */}
      <div className="ts-selector" aria-label="Select a technology">
        {TECH.map(tech => (
          <button
            key={tech.name}
            type="button"
            className={`ts-btn${selected === tech.name ? " ts-btn--active" : ""}`}
            onClick={() => focusTech(tech.name)}
            aria-pressed={selected === tech.name}
            style={selected === tech.name ? {
              borderColor: tech.glow,
              boxShadow: `0 0 14px ${tech.glow}44, inset 0 0 10px ${tech.glow}18`,
            } : {}}
          >
            <span
              className="ts-swatch"
              style={{ background: tech.glow, boxShadow: `0 0 8px ${tech.glow}` }}
            />
            {tech.name}
          </button>
        ))}
      </div>

      {/* zoom controls */}
      <div className="ts-zoom" aria-label="Zoom controls">
        <button type="button" onClick={() => adjustZoom(-1.4)} aria-label="Zoom in">＋</button>
        <div className="ts-zoom-divider" />
        <button type="button" onClick={() => adjustZoom( 1.4)} aria-label="Zoom out">－</button>
      </div>

      {/* hint */}
      <div className="ts-hint" aria-hidden="true">
        <span>⟳ DRAG</span><span>⊕ SCROLL</span><span>◎ CLICK</span>
      </div>
    </div>
  );
};

export default TechSolarSystem;
