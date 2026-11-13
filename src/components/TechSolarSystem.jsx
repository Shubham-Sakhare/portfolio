import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Tech stack with their brand colors and icon URLs
const techData = [
  {
    name: "HTML",
    icon: "https://www.w3.org/html/logo/badge/html5-badge-h-solo.png",
    color: "#e34f26",
    orbit: 1.1,
    size: 0.14,
    speed: 0.72,
    tilt: 0.0,
    desc: "Markup language for the web",
  },
  {
    name: "CSS",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/CSS3_logo_and_wordmark.svg/1452px-CSS3_logo_and_wordmark.svg.png",
    color: "#1572b6",
    orbit: 1.55,
    size: 0.14,
    speed: 0.58,
    tilt: 0.12,
    desc: "Styling language for the web",
  },
  {
    name: "JavaScript",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/JavaScript-logo.png/800px-JavaScript-logo.png",
    color: "#f7df1e",
    orbit: 2.0,
    size: 0.17,
    speed: 0.47,
    tilt: 0.08,
    desc: "Dynamic scripting language",
  },
  {
    name: "PHP",
    icon: "https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg",
    color: "#777bb4",
    orbit: 2.5,
    size: 0.17,
    speed: 0.37,
    tilt: 0.15,
    desc: "Server-side scripting language",
  },
  {
    name: "WordPress",
    icon: "https://upload.wikimedia.org/wikipedia/commons/9/98/WordPress_blue_logo.svg",
    color: "#21759b",
    orbit: 3.05,
    size: 0.2,
    speed: 0.28,
    tilt: 0.1,
    desc: "World's #1 CMS platform",
  },
  {
    name: "MySQL",
    icon: "https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg",
    color: "#4479a1",
    orbit: 3.6,
    size: 0.19,
    speed: 0.21,
    tilt: 0.18,
    desc: "Open-source relational database",
  },
  {
    name: "React",
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
    color: "#61dafb",
    orbit: 4.2,
    size: 0.22,
    speed: 0.16,
    tilt: 0.06,
    desc: "Frontend UI library by Meta",
  },
  {
    name: "Bootstrap",
    icon: "https://getbootstrap.com/docs/5.3/assets/brand/bootstrap-logo-shadow.png",
    color: "#7952b3",
    orbit: 4.8,
    size: 0.2,
    speed: 0.12,
    tilt: 0.22,
    desc: "CSS utility & component framework",
  },
];

const CENTER_X = -1.8;
const SUN_COLOR = "#7a5cff";

const TechSolarSystem = () => {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [selected, setSelected] = useState("WordPress");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    // ── Scene setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, host.clientWidth / host.clientHeight || 1, 0.1, 160);
    camera.position.set(0, 0, 13.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.1 : 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    host.prepend(renderer.domElement);

    // ── Root groups ───────────────────────────────────────────────
    const universe = new THREE.Group();
    scene.add(universe);

    const solarSystem = new THREE.Group();
    const homePos = { x: 2.8, y: 0.1 };
    solarSystem.position.set(homePos.x, homePos.y, 0);
    universe.add(solarSystem);

    // ── Background stars ─────────────────────────────────────────
    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          vColor = aColor;
          vTwinkle = 0.74 + 0.26 * sin(uTime * 0.9 + position.x * 19.0 + position.y * 11.0);
          gl_PointSize = aSize * (36.0 / max(1.0, -mvp.z));
          gl_Position = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          float alpha = exp(-r * 10.0) * vTwinkle;
          gl_FragColor = vec4(vColor * alpha, alpha);
        }
      `,
    });

    const buildStars = (count, maxDepth) => {
      const pos = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const palette = [0x9fcaff, 0xc3e8ff, 0xffffff, 0x7beaff, 0xffd5bd].map((c) => new THREE.Color(c));
      for (let i = 0; i < count; i++) {
        const depth = Math.random() * maxDepth + 2;
        const h = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        pos[i * 3]     = (Math.random() - 0.5) * h * camera.aspect;
        pos[i * 3 + 1] = (Math.random() - 0.5) * h;
        pos[i * 3 + 2] = camera.position.z - depth;
        sizes[i] = 0.9 + Math.pow(Math.random(), 3) * 2.4;
        const c = palette[Math.floor(Math.random() * palette.length)];
        const br = 0.6 + Math.random() * 0.4;
        colors[i * 3] = c.r * br; colors[i * 3 + 1] = c.g * br; colors[i * 3 + 2] = c.b * br;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      return new THREE.Points(geo, starMat.clone());
    };

    const stars1 = buildStars(coarsePointer.matches ? 800 : 2200, 26);
    const stars2 = buildStars(coarsePointer.matches ? 160 : 440, 10);
    universe.add(stars1, stars2);

    // ── Lighting ──────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xaabbff, 0.3));
    const sunLight = new THREE.PointLight(0xd0a8ff, 80, 80, 1.4);
    sunLight.position.set(CENTER_X, 0, 0);
    solarSystem.add(sunLight);

    // ── Sun (represents "Me" / developer core) ────────────────────
    const sunGroup = new THREE.Group();
    sunGroup.position.x = CENTER_X;
    solarSystem.add(sunGroup);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, 48, 40),
      new THREE.MeshBasicMaterial({ color: 0x7a5cff }),
    );
    sunGroup.add(sunMesh);

    // Sun glow / corona
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 36, 28),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vN; varying vec3 vV;
          void main() {
            float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.2);
            float pulse = 0.78 + 0.14 * sin(uTime * 1.6 + vN.y * 7.0);
            gl_FragColor = vec4(0.5, 0.36, 1.0, rim * pulse * 0.72);
          }
        `,
      }),
    );
    sunGroup.add(sunGlow);

    // "S" text label on sun via canvas texture
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 128; labelCanvas.height = 128;
    const lc = labelCanvas.getContext("2d");
    lc.fillStyle = "transparent";
    lc.clearRect(0, 0, 128, 128);
    lc.fillStyle = "#fff";
    lc.font = "bold 72px Poppins, sans-serif";
    lc.textAlign = "center";
    lc.textBaseline = "middle";
    lc.fillText("S", 64, 64);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const sunLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.44),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false }),
    );
    sunLabel.position.z = 0.58;
    sunGroup.add(sunLabel);

    // ── Tech orbit rings & icon sprites ───────────────────────────
    const loader = new THREE.TextureLoader();
    const techObjects = [];
    const orbitLines = [];
    const selectableMeshes = [];
    const focusRings = new Map();

    techData.forEach((tech, idx) => {
      // Orbit ellipse
      const curve = new THREE.EllipseCurve(
        CENTER_X, 0,
        tech.orbit, tech.orbit * 0.3,
        0, Math.PI * 2, false, 0,
      );
      const pts = curve.getPoints(260).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const orbitMat = new THREE.LineBasicMaterial({
        color: idx % 2 ? 0x7a5cff : 0x44aaff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      solarSystem.add(orbitLine);
      orbitLines.push(orbitMat);

      // Pivot group for orbiting
      const pivot = new THREE.Group();
      pivot.rotation.x = tech.tilt;
      solarSystem.add(pivot);

      // Icon sprite using canvas
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 128; spriteCanvas.height = 128;
      const ctx = spriteCanvas.getContext("2d");

      // Draw background circle
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 14, 28, 0.88)";
      ctx.fill();
      ctx.strokeStyle = tech.color;
      ctx.lineWidth = 5;
      ctx.stroke();

      const spriteTex = new THREE.CanvasTexture(spriteCanvas);
      const iconMat = new THREE.SpriteMaterial({
        map: spriteTex,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(iconMat);
      sprite.scale.set(tech.size * 3.2, tech.size * 3.2, 1);
      sprite.userData.techName = tech.name;
      pivot.add(sprite);
      selectableMeshes.push(sprite);

      // Load actual icon image into canvas texture
      loader.load(tech.icon, (tex) => {
        const img = tex.image;
        ctx.clearRect(0, 0, 128, 128);
        // Redraw background
        ctx.beginPath();
        ctx.arc(64, 64, 58, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 14, 28, 0.9)";
        ctx.fill();
        ctx.strokeStyle = tech.color;
        ctx.lineWidth = 5;
        ctx.stroke();
        // Draw icon inside circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 52, 0, Math.PI * 2);
        ctx.clip();
        const size = 80;
        ctx.drawImage(img, (128 - size) / 2, (128 - size) / 2, size, size);
        ctx.restore();
        spriteTex.needsUpdate = true;
      });

      // Focus ring (torus around sprite when selected)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(tech.size * 1.6, 0.025, 6, 80),
        new THREE.MeshBasicMaterial({
          color: 0x9deaff,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.visible = false;
      pivot.add(ring);
      focusRings.set(tech.name, { ring, pivot });

      techObjects.push({ ...tech, pivot, sprite, ring });
    });

    // ── Interaction state ─────────────────────────────────────────
    const interaction = {
      orbitX: -0.18,
      orbitY: 0.04,
      targetOrbitX: -0.18,
      targetOrbitY: 0.04,
      zoom: 7.4,
      targetZoom: 7.4,
      focus: "WordPress",
      pointerX: 0,
      pointerY: 0,
    };
    sceneRef.current = { interaction };

    // ── Raycaster for click ───────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    // ── Resize observer ───────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.position.z = w < 700 ? 10.5 : 13.5;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(host);

    // ── Pointer events ────────────────────────────────────────────
    const onPointerMove = (e) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - bounds.left) / bounds.width;
      const y = (e.clientY - bounds.top) / bounds.height;
      interaction.pointerX = (x - 0.5) * 2;
      interaction.pointerY = (y - 0.5) * 2;

      if (dragRef.current.active && !coarsePointer.matches && !reducedMotion.matches) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
        interaction.targetOrbitY += dx * 0.004;
        interaction.targetOrbitX = THREE.MathUtils.clamp(
          interaction.targetOrbitX + dy * 0.003, -0.9, 0.9,
        );
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
      }
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 || e.target.closest(".tech-copy, a, button")) return;
      dragRef.current = { active: true, moved: false, x: e.clientX, y: e.clientY };
      host.classList.add("hero-dragging");
    };

    const onPointerUp = (e) => {
      if (!dragRef.current.active) return;
      const wasDrag = dragRef.current.moved;
      dragRef.current.active = false;
      host.classList.remove("hero-dragging");
      if (wasDrag) return;

      const bounds = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((e.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(selectableMeshes, false);
      if (hits.length) {
        const name = hits[0].object.userData.techName;
        interaction.focus = name;
        interaction.targetZoom = 7.5;
        setSelected(name);
      }
    };

    const onWheel = (e) => {
      if (!e.target.closest(".tech-solar-scene")) return;
      e.preventDefault();
      interaction.targetZoom = THREE.MathUtils.clamp(
        interaction.targetZoom + e.deltaY * 0.011, 2.5, 22,
      );
    };

    const onPointerLeave = () => {
      interaction.pointerX = 0;
      interaction.pointerY = 0;
    };

    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("pointerleave", onPointerLeave, { passive: true });

    // ── Animation loop ────────────────────────────────────────────
    const clock = new THREE.Clock();
    let frameId;
    let visible = true;

    const getFocusOrbit = (name) => {
      const tech = techData.find((t) => t.name === name);
      return tech ? tech.orbit : 0;
    };

    const animate = () => {
      frameId = undefined;
      if (!visible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const ease = 1 - Math.exp(-delta * 2.8);

      interaction.orbitX += (interaction.targetOrbitX - interaction.orbitX) * ease;
      interaction.orbitY += (interaction.targetOrbitY - interaction.orbitY) * ease;
      interaction.zoom  += (interaction.targetZoom  - interaction.zoom)  * ease;

      universe.rotation.set(interaction.orbitX, interaction.orbitY, 0);
      universe.position.x += (-interaction.pointerX * 0.17 - universe.position.x) * ease;
      universe.position.y += ( interaction.pointerY * 0.13 - universe.position.y) * ease;

      // Follow focused tech planet
      const focusedTech = techObjects.find((t) => t.name === interaction.focus);
      const focusOffset = new THREE.Vector3();
      if (focusedTech) focusOffset.copy(focusedTech.pivot.children[0].position);

      const mobile = host.clientWidth < 700;
      const fcx = mobile ? 0 : homePos.x;
      const fcy = mobile ? -1.5 : homePos.y;
      const target = new THREE.Vector3(fcx - focusOffset.x, fcy - focusOffset.y, -focusOffset.z);
      solarSystem.position.lerp(target, ease * 0.65);
      camera.position.z = interaction.zoom;

      // Orbit each tech icon
      techObjects.forEach((tech, idx) => {
        const phase = time * tech.speed + idx * 1.72;
        const px = CENTER_X + Math.cos(phase) * tech.orbit;
        const py = Math.sin(phase) * tech.orbit * 0.3;
        tech.pivot.children[0].position.set(px, py, 0); // sprite
        if (tech.ring) tech.ring.position.set(px, py, 0);

        // Focus ring visibility & pulse
        const isSelected = interaction.focus === tech.name;
        tech.ring.visible = isSelected;
        if (isSelected) {
          tech.ring.material.opacity = 0.55 + (Math.sin(time * 2.4) + 1) * 0.15;
        }
      });

      // Sun rotation
      sunMesh.rotation.y += delta * 0.08;
      sunGlow.material.uniforms.uTime.value = time;
      sunLabel.rotation.y = -sunMesh.rotation.y; // keep label facing camera

      // Orbit line pulse
      orbitLines.forEach((mat, idx) => {
        mat.opacity = 0.12 + (Math.sin(time * 0.4 + idx) + 1) * 0.05;
      });

      // Star animation
      stars1.rotation.y = time * 0.003;
      stars2.rotation.y = -time * 0.011;
      stars1.material.uniforms.uTime.value = time;
      stars2.material.uniforms.uTime.value = time * 1.4;

      renderer.render(scene, camera);
      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(animate);
    };

    const visObs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && frameId === undefined) { clock.start(); frameId = window.requestAnimationFrame(animate); }
      else if (!visible && frameId !== undefined) { window.cancelAnimationFrame(frameId); frameId = undefined; }
    });
    visObs.observe(host);

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visObs.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.classList.remove("hero-dragging");
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  const focusTech = (name) => {
    const st = sceneRef.current?.interaction;
    if (!st) return;
    st.focus = name;
    st.targetZoom = 7.5;
    setSelected(name);
  };

  const adjustZoom = (amount) => {
    const st = sceneRef.current?.interaction;
    if (!st) return;
    st.targetZoom = THREE.MathUtils.clamp(st.targetZoom + amount, 2.5, 22);
  };

  const selectedTech = techData.find((t) => t.name === selected);

  return (
    <div
      className="hero-ai-scene hero-ai-backdrop tech-solar-scene"
      ref={hostRef}
      aria-label="Interactive tech solar system. Drag to orbit, scroll to zoom, click a technology to inspect it."
    >
      <div className="hero-ai-vignette" aria-hidden="true" />

      {/* Top label */}
      <div className="solar-title" aria-hidden="true">
        <span>TECH UNIVERSE</span>
        <i>MY STACK / 2024</i>
      </div>

      {/* Selected tech info panel */}
      <div className="solar-detail" aria-live="polite">
        <span className="solar-detail-kicker">TECHNOLOGY ARCHIVE</span>
        <strong style={{ color: selectedTech?.color || "#e7f7ff" }}>{selected}</strong>
        <small>{selectedTech?.desc}</small>
      </div>

      {/* Tech selector buttons */}
      <div className="solar-selector" aria-label="Select a technology">
        {techData.map((tech) => (
          <button
            key={tech.name}
            type="button"
            className={selected === tech.name ? "selected" : ""}
            onClick={() => focusTech(tech.name)}
            aria-pressed={selected === tech.name}
          >
            <span
              className="planet-swatch"
              style={{ background: tech.color, boxShadow: `0 0 7px ${tech.color}` }}
            />
            {tech.name}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="solar-zoom-controls" aria-label="Zoom controls">
        <button type="button" onClick={() => adjustZoom(-1.2)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" onClick={() => adjustZoom(1.2)} aria-label="Zoom out" title="Zoom out">−</button>
      </div>

      <div className="solar-hint" aria-hidden="true">
        DRAG TO EXPLORE <span>SCROLL TO ZOOM</span><span>CLICK TO FOCUS</span>
      </div>

      <div className="ai-scan-beam" aria-hidden="true" />
    </div>
  );
};

export default TechSolarSystem;
