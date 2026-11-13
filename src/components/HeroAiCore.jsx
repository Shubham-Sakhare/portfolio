import { useEffect, useRef } from "react";
import * as THREE from "three";

const HeroAiCore = () => {
  const hostRef = useRef(null);
  const motionRef = useRef({ x: 0, y: 0, zoom: 1, dragging: false });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchDevice = window.matchMedia("(pointer: coarse)");
    const interactionTarget = host.closest(".hero-section") || host;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, host.clientWidth / host.clientHeight || 1, 0.1, 100);
    camera.position.set(0, 0, 8.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);

    const coreRig = new THREE.Group();
    const homePosition = { x: 1.55, y: 0.05 };
    coreRig.position.set(homePosition.x, homePosition.y, 0);
    scene.add(coreRig);

    const universe = new THREE.Group();
    scene.add(universe);

    const nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int octave = 0; octave < 5; octave++) {
              value += noise(p) * amplitude;
              p = mat2(1.62, 1.18, -1.18, 1.62) * p;
              amplitude *= 0.5;
            }
            return value;
          }
          void main() {
            vec2 p = (vUv - vec2(0.57, 0.5)) * vec2(1.35, 1.05);
            vec2 drift = vec2(uTime * 0.002, -uTime * 0.0014);
            float broad = fbm(vUv * vec2(4.0, 3.0) + drift);
            float detail = fbm(vUv * vec2(11.0, 8.5) - drift * 2.0);
            float turbulence = broad * 0.66 + detail * 0.34;
            float cloud = smoothstep(0.3, 0.7, turbulence + 0.16 * sin(p.x * 4.0 + p.y * 5.0));
            float filament = smoothstep(0.48, 0.78, detail + 0.17 * sin(p.x * 8.0 - p.y * 3.0));
            float core = exp(-dot(p * vec2(0.72, 1.0), p * vec2(0.72, 1.0)) * 0.92);
            float wisps = exp(-abs(p.y + 0.2 * sin(p.x * 4.0)) * 2.2) * smoothstep(1.15, 0.1, abs(p.x));
            vec2 spiralPoint = p * vec2(1.0, 1.25);
            float spiralAngle = atan(spiralPoint.y, spiralPoint.x);
            float spiralRadius = length(spiralPoint);
            float spiralPattern = cos(spiralAngle * 3.0 - spiralRadius * 7.5 + detail * 1.8);
            float arms = pow(max(spiralPattern, 0.0), 9.0) * exp(-spiralRadius * 0.82);
            vec3 color = mix(vec3(0.025, 0.11, 0.38), vec3(0.34, 0.055, 0.62), smoothstep(0.34, 0.7, detail));
            color = mix(color, vec3(0.055, 0.48, 0.72), smoothstep(0.58, 0.88, broad) * 0.8);
            color += vec3(0.16, 0.1, 0.38) * arms;
            float alpha = (cloud * 0.58 + filament * 0.36 + wisps * 0.2 + arms * 0.3) * core;
            alpha *= smoothstep(1.9, 0.12, length(p));
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    );
    nebula.position.z = -14;
    scene.add(nebula);

    const nebulaHeight = 2 * (camera.position.z - nebula.position.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    nebula.scale.set(nebulaHeight * camera.aspect, nebulaHeight, 1);

    const starMaterial = () => new THREE.ShaderMaterial({
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
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vColor = aColor;
          vTwinkle = 0.76 + 0.24 * sin(uTime * 0.8 + position.x * 17.0 + position.y * 13.0);
          gl_PointSize = aSize * (34.0 / max(1.0, -viewPosition.z));
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          float halo = exp(-radius * 11.0) * 0.62;
          float center = 1.0 - smoothstep(0.02, 0.16, radius);
          float alpha = (halo + center * 0.82) * vTwinkle;
          gl_FragColor = vec4(vColor * alpha, alpha);
        }
      `,
    });

    const createStarLayer = (count, maxDepth, minSize, maxSize) => {
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const palettes = [0x9fcaff, 0xc3e8ff, 0xffffff, 0x7beaff, 0xffd5bd].map((value) => new THREE.Color(value));
      for (let index = 0; index < count; index += 1) {
        const depth = Math.random() * maxDepth + 2;
        const viewHeight = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        positions[index * 3] = (Math.random() - 0.5) * viewHeight * camera.aspect;
        positions[index * 3 + 1] = (Math.random() - 0.5) * viewHeight;
        positions[index * 3 + 2] = camera.position.z - depth;
        sizes[index] = minSize + Math.pow(Math.random(), 3) * (maxSize - minSize);
        const color = palettes[Math.floor(Math.random() * palettes.length)];
        const brightness = 0.62 + Math.random() * 0.38;
        colors[index * 3] = color.r * brightness;
        colors[index * 3 + 1] = color.g * brightness;
        colors[index * 3 + 2] = color.b * brightness;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      return new THREE.Points(geometry, starMaterial());
    };
    const distantStars = createStarLayer(touchDevice.matches ? 850 : 2400, 28, 1.0, 2.9);
    const nearStars = createStarLayer(touchDevice.matches ? 180 : 460, 12, 1.8, 4.4);
    universe.add(distantStars, nearStars);

    const createGalaxy = (count) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let index = 0; index < count; index += 1) {
        const radius = Math.pow(Math.random(), 0.72) * 3.1;
        const arm = Math.floor(Math.random() * 3);
        const angle = arm * (Math.PI * 2 / 3) + radius * 2.0 + (Math.random() - 0.5) * (0.08 + radius * 0.075);
        const dust = (Math.random() - 0.5) * (0.06 + radius * 0.08);
        positions[index * 3] = Math.cos(angle) * radius + dust;
        positions[index * 3 + 1] = Math.sin(angle) * radius * 0.54 + dust * 0.6;
        positions[index * 3 + 2] = -4.5 - radius * 0.32 + (Math.random() - 0.5) * 0.35;
        const warmth = THREE.MathUtils.clamp(1 - radius / 3.8, 0, 1);
        const color = new THREE.Color().setHSL(0.58 - warmth * 0.43, 0.72 - warmth * 0.24, 0.55 + warmth * 0.35);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
        sizes[index] = 0.65 + Math.pow(Math.random(), 3) * 1.55;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      const points = new THREE.Points(geometry, starMaterial());
      points.position.set(1.5, 0, 0);
      return points;
    };
    const galaxy = createGalaxy(touchDevice.matches ? 1500 : 4200);
    galaxy.rotation.set(0.36, -0.16, 0.12);
    galaxy.position.set(1.5, 0, -0.5);
    universe.add(galaxy);

    scene.add(new THREE.AmbientLight(0x628dff, 1.1));
    const blueLight = new THREE.PointLight(0x00bfff, 14, 12);
    blueLight.position.set(-2.2, 1.5, 2.8);
    scene.add(blueLight);
    const violetLight = new THREE.PointLight(0x8b5cff, 18, 12);
    violetLight.position.set(2, -1.3, -1.2);
    scene.add(violetLight);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.78, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0x071a3a,
        emissive: 0x006aff,
        emissiveIntensity: 1.65,
        metalness: 0.35,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.9,
      }),
    );
    coreRig.add(core);

    const coreWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.84, 2),
      new THREE.MeshBasicMaterial({
        color: 0x5ceaff,
        wireframe: true,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
      }),
    );
    coreRig.add(coreWire);

    const energyShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.96, 40, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0x00cfff) } },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewPosition = -viewPosition.xyz;
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.6);
            float bands = 0.78 + 0.22 * sin(time * 1.4 + vNormal.y * 12.0);
            gl_FragColor = vec4(color, fresnel * bands * 0.92);
          }
        `,
      }),
    );
    coreRig.add(energyShell);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x00cfff, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }),
      new THREE.MeshBasicMaterial({ color: 0x8b5cff, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }),
      new THREE.MeshBasicMaterial({ color: 0x71f7ff, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending }),
      new THREE.MeshBasicMaterial({ color: 0x4c79ff, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending }),
    ];
    const rings = [
      { mesh: new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.012, 8, 180), ringMaterials[0]), speed: 0.2, axis: "y" },
      { mesh: new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.009, 8, 180), ringMaterials[1]), speed: -0.15, axis: "x" },
      { mesh: new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.006, 6, 180), ringMaterials[2]), speed: 0.1, axis: "z" },
      { mesh: new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.006, 6, 160), ringMaterials[3]), speed: -0.27, axis: "y" },
    ];
    rings.forEach(({ mesh }, index) => {
      mesh.rotation.set(0.72 + index * 0.33, index * 0.54, 0.22 + index * 0.37);
      coreRig.add(mesh);
    });

    const particleCount = touchDevice.matches ? 90 : 190;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.15 + Math.random() * 1.45;
      const theta = Math.random() * Math.PI * 2;
      const vertical = (Math.random() - 0.5) * 3.8;
      particlePositions[index * 3] = Math.cos(theta) * radius;
      particlePositions[index * 3 + 1] = vertical;
      particlePositions[index * 3 + 2] = Math.sin(theta) * radius;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x78eaff,
        size: 0.025,
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    coreRig.add(particles);

    const nodeGeometry = new THREE.SphereGeometry(0.035, 10, 10);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x9af8ff });
    const nodes = [];
    for (let index = 0; index < 12; index += 1) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.userData = { phase: (index / 12) * Math.PI * 2, radius: 1.48 + (index % 3) * 0.18 };
      coreRig.add(node);
      nodes.push(node);
    }

    const circuitPositions = new Float32Array([
      -2.35, 1.18, 0, -1.7, 1.18, 0,
      -1.7, 1.18, 0, -1.42, 0.9, 0,
      2.25, 1.36, 0, 1.7, 1.36, 0,
      1.7, 1.36, 0, 1.42, 1.08, 0,
      -2.28, -1.35, 0, -1.68, -1.35, 0,
      1.68, -1.22, 0, 2.3, -1.22, 0,
    ]);
    const circuitGeometry = new THREE.BufferGeometry();
    circuitGeometry.setAttribute("position", new THREE.BufferAttribute(circuitPositions, 3));
    const circuits = new THREE.LineSegments(
      circuitGeometry,
      new THREE.LineBasicMaterial({ color: 0x30bfff, transparent: true, opacity: 0.46, blending: THREE.AdditiveBlending }),
    );
    coreRig.add(circuits);

    const pointer = { x: 0, y: 0, proximity: 0, zoom: 1 };
    const motionEnabled = !touchDevice.matches && !reducedMotion.matches;
    const onPointerMove = (event) => {
      if (!motionEnabled) return;
      const bounds = interactionTarget.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      if (motionRef.current.dragging) {
        pointer.x = THREE.MathUtils.clamp((x - 0.72) * 1.65, -1, 1);
        pointer.y = THREE.MathUtils.clamp((0.5 - y) * 1.6, -1, 1);
      }
      const distance = Math.hypot((x - 0.72) * 1.35, (y - 0.5) * 1.55);
      pointer.proximity = THREE.MathUtils.clamp(1 - distance, 0, 1);
    };
    const onPointerDown = (event) => {
      if (!motionEnabled || event.button !== 0 || event.target.closest("a, button")) return;
      motionRef.current.dragging = true;
      interactionTarget.classList.add("hero-dragging");
    };
    const onPointerUp = () => {
      motionRef.current.dragging = false;
      pointer.x = 0;
      pointer.y = 0;
      interactionTarget.classList.remove("hero-dragging");
    };
    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
      pointer.proximity = 0;
    };
    const onWheel = (event) => {
      if (!motionEnabled) return;
      event.preventDefault();
      pointer.zoom = THREE.MathUtils.clamp(pointer.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.72, 1.55);
    };
    interactionTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    interactionTarget.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    interactionTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });
    interactionTarget.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      const mobile = width < 700;
      camera.position.z = mobile ? 10.2 : 8.6;
      homePosition.x = mobile ? 0 : 1.55;
      homePosition.y = mobile ? -1.65 : 0.05;
      camera.updateProjectionMatrix();
      const nebulaHeight = 2 * (camera.position.z - nebula.position.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      nebula.scale.set(nebulaHeight * camera.aspect, nebulaHeight, 1);
      renderer.setSize(width, height);
    });
    resizeObserver.observe(host);

    let visible = true;
    const clock = new THREE.Clock();
    const smooth = motionRef.current;
    let frameId;
    const animate = () => {
      frameId = undefined;
      if (!visible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const easing = 1 - Math.exp(-delta * 3.6);
      smooth.x += (pointer.x - smooth.x) * easing;
      smooth.y += (pointer.y - smooth.y) * easing;
      smooth.zoom += (THREE.MathUtils.clamp(pointer.zoom + pointer.proximity * 0.12, 0.72, 1.62) - smooth.zoom) * easing;

      coreRig.rotation.y += (0.12 + smooth.x * 0.055) * delta;
      coreRig.rotation.x += (smooth.y * 0.13 - coreRig.rotation.x) * easing;
      coreRig.position.x += (homePosition.x + smooth.x * 0.24 - coreRig.position.x) * easing;
      coreRig.position.y += (homePosition.y - smooth.y * 0.16 - coreRig.position.y) * easing;
      const coreSize = host.clientWidth < 700 ? 0.9 : 1.1;
      coreRig.scale.setScalar(coreSize * smooth.zoom * (1 + Math.sin(time * 1.15) * 0.018));
      universe.rotation.y = Math.sin(time * 0.035) * 0.025 + smooth.x * 0.025;
      universe.position.x += (-smooth.x * 0.11 - universe.position.x) * easing;
      universe.position.y += (smooth.y * 0.08 - universe.position.y) * easing;
      distantStars.rotation.y = time * 0.003;
      nearStars.rotation.y = -time * 0.012;
      nearStars.rotation.x = Math.sin(time * 0.06) * 0.018;
      distantStars.material.uniforms.uTime.value = time;
      nearStars.material.uniforms.uTime.value = time * 1.3;
      galaxy.material.uniforms.uTime.value = time * 0.7;
      nebula.material.uniforms.uTime.value = time;
      galaxy.rotation.z = time * 0.005;
      core.rotation.y = time * 0.11;
      core.rotation.x = time * 0.08;
      coreWire.rotation.set(-time * 0.1, time * 0.16, time * 0.04);
      energyShell.material.uniforms.time.value = time;
      particles.rotation.y = -time * 0.025;
      particles.rotation.x = Math.sin(time * 0.18) * 0.04;
      rings.forEach(({ mesh, speed, axis }, index) => {
        mesh.rotation[axis] += speed * delta + smooth.x * 0.02 * delta;
        mesh.rotation.x += smooth.y * 0.012 * delta;
        mesh.material.opacity = 0.5 + (Math.sin(time * (0.8 + index * 0.16) + index) + 1) * 0.12;
      });
      nodes.forEach((node, index) => {
        const phase = node.userData.phase + time * (index % 2 ? 0.24 : -0.18);
        node.position.set(
          Math.cos(phase) * node.userData.radius,
          Math.sin(phase * 1.7) * 1.16,
          Math.sin(phase) * node.userData.radius,
        );
        const pulse = 0.8 + (Math.sin(time * 2.1 + index) + 1) * 0.35;
        node.scale.setScalar(pulse);
      });
      blueLight.intensity = 12 + (Math.sin(time * 1.6) + 1) * 2.8;
      violetLight.intensity = 14 + (Math.sin(time * 1.1 + 1) + 1) * 3.5;

      renderer.render(scene, camera);
      if (reducedMotion.matches) return;
      frameId = window.requestAnimationFrame(animate);
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && frameId === undefined) {
        clock.start();
        frameId = window.requestAnimationFrame(animate);
      } else if (!visible && frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
        frameId = undefined;
      }
    });
    visibilityObserver.observe(host);

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      interactionTarget.removeEventListener("pointermove", onPointerMove);
      interactionTarget.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      interactionTarget.removeEventListener("pointerleave", onPointerLeave);
      interactionTarget.removeEventListener("wheel", onWheel);
      interactionTarget.classList.remove("hero-dragging");
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="hero-ai-scene hero-ai-backdrop" ref={hostRef} aria-label="Interactive animated holographic AI core">
      <div className="hero-ai-vignette" aria-hidden="true" />
      <div className="hero-ai-grid" aria-hidden="true" />
      <div className="ai-hud-panel ai-hud-top" aria-hidden="true">
        <span className="ai-hud-kicker">NEURAL INTERFACE</span>
        <strong>J.A.R.V.I.S. <i>ONLINE</i></strong>
        <span className="ai-hud-bars"><i /><i /><i /><i /><i /><i /><i /></span>
      </div>
      <div className="ai-hud-panel ai-hud-side" aria-hidden="true">
        <span>CORE TEMP</span><strong>32.8<span>°</span></strong>
        <span>ENERGY FLOW</span><strong className="energy-value">98.4%</strong>
        <span className="hud-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
      </div>
      <div className="ai-hud-panel ai-hud-bottom" aria-hidden="true">
        <span className="hud-status-dot" /> SYSTEMS NOMINAL
        <span className="hud-coordinate">AI CORE // 01</span>
      </div>
      <div className="ai-drag-hint" aria-hidden="true">HOLD + DRAG TO ORBIT <span>SCROLL TO ZOOM</span></div>
      <div className="ai-scan-beam" aria-hidden="true" />
    </div>
  );
};

export default HeroAiCore;