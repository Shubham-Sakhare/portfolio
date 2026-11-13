import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const planetData = [
  { name: "Mercury", file: "2k_mercury.jpg", size: 0.13, orbit: 0.92, speed: 0.9, color: 0xb9a894, fact: "Smallest planet · 88-day orbit" },
  { name: "Venus", file: "2k_venus_surface.jpg", size: 0.21, orbit: 1.32, speed: 0.68, color: 0xe7bd87, fact: "Dense carbon-dioxide atmosphere" },
  { name: "Earth", file: "2k_earth_daymap.jpg", night: "2k_earth_nightmap.jpg", size: 0.25, orbit: 1.78, speed: 0.52, color: 0x4caeff, fact: "Our home · one natural Moon" },
  { name: "Mars", file: "2k_mars.jpg", size: 0.19, orbit: 2.26, speed: 0.42, color: 0xff7557, fact: "The Red Planet · two small moons" },
  { name: "Jupiter", file: "2k_jupiter.jpg", size: 0.46, orbit: 3.04, speed: 0.28, color: 0xe6b580, fact: "Largest planet · giant storm systems" },
  { name: "Saturn", file: "2k_saturn.jpg", size: 0.39, orbit: 3.88, speed: 0.21, color: 0xf3d294, ring: true, fact: "Gas giant surrounded by icy rings" },
  { name: "Uranus", file: "2k_uranus.jpg", size: 0.29, orbit: 4.68, speed: 0.15, color: 0x92e4e6, fact: "Ice giant rotating on its side" },
  { name: "Neptune", file: "2k_neptune.jpg", size: 0.29, orbit: 5.42, speed: 0.11, color: 0x548cff, fact: "Distant ice giant with supersonic winds" },
];

const getFocusZoom = (name) => {
  if (name === "System") return 13.6;
  if (name === "Sun") return 4.5;
  if (name === "Moon" || name === "Mercury") return 2.4;
  if (name === "Jupiter" || name === "Saturn") return 3.2;
  if (name === "Uranus" || name === "Neptune") return 3;
  return 2.8;
};

const SolarSystemHero = () => {
  const hostRef = useRef(null);
  const sceneStateRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [selected, setSelected] = useState("Earth");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const interactionTarget = host.closest(".hero-section") || host;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight || 1, 0.1, 180);
    camera.position.set(0, 0, 13.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.1 : 1.45));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    host.prepend(renderer.domElement);

    const universe = new THREE.Group();
    scene.add(universe);

    const skyLoader = new THREE.TextureLoader();
    const loadedTextures = [];
    let cancelled = false;
    const loadTexture = (file, onLoad) => {
      skyLoader.load(`/assets/planets/${file}`, (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        loadedTextures.push(texture);
        texture.colorSpace = THREE.SRGBColorSpace;
        onLoad?.(texture);
      });
    };

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(78, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x777777, side: THREE.BackSide, depthWrite: false, toneMapped: false }),
    );
    universe.add(skyDome);
    loadTexture("2k_stars_milky_way.jpg", (texture) => {
      skyDome.material.map = texture;
      skyDome.material.needsUpdate = true;
    });

    scene.add(new THREE.AmbientLight(0x9abaff, 0.25));
    const sunLight = new THREE.PointLight(0xffd49a, 100, 90, 1.35);

    const sunSystem = new THREE.Group();
    const systemHome = { x: 1.55, y: 0.12 };
    sunSystem.position.set(systemHome.x, systemHome.y, 0);
    universe.add(sunSystem);

    const sunGroup = new THREE.Group();
    sunGroup.position.x = -2.2;
    sunSystem.add(sunGroup);
    sunLight.position.set(0, 0, 0);
    sunGroup.add(sunLight);

    const selectableMeshes = [];
    const focusRings = new Map();
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 48, 40),
      new THREE.MeshBasicMaterial({ color: 0xffb33e }),
    );
    sun.userData.planetName = "Sun";
    sunGroup.add(sun);
    selectableMeshes.push(sun);
    loadTexture("2k_sun.jpg", (texture) => {
      sun.material.map = texture;
      sun.material.color.set(0xffffff);
      sun.material.needsUpdate = true;
    });

    const sunCorona = new THREE.Mesh(
      new THREE.SphereGeometry(0.67, 40, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = -viewPosition.xyz;
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.0);
            float pulse = 0.76 + 0.12 * sin(uTime * 1.4 + vNormal.y * 8.0);
            gl_FragColor = vec4(1.0, 0.38 + rim * 0.3, 0.08, rim * pulse * 0.7);
          }
        `,
      }),
    );
    sunGroup.add(sunCorona);

    const solarObjects = [];
    const orbitMaterials = [];
    const orbitGeometry = new THREE.BufferGeometry();

    planetData.forEach((planet, index) => {
      const orbitCurve = new THREE.EllipseCurve(-2.2, 0, planet.orbit, planet.orbit * 0.29, 0, Math.PI * 2, false, 0);
      const orbitPoints = orbitCurve.getPoints(240).map((point) => new THREE.Vector3(point.x, point.y, 0));
      const geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: index % 2 ? 0x8377d1 : 0x63b8d5,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      orbitMaterials.push(orbitMaterial);
      sunSystem.add(new THREE.LineLoop(geometry, orbitMaterial));

      const orbitObject = new THREE.Group();
      sunSystem.add(orbitObject);
      const material = new THREE.MeshStandardMaterial({
        color: planet.color,
        roughness: planet.name === "Earth" ? 0.78 : 0.88,
        metalness: 0.02,
        emissive: planet.name === "Earth" ? 0x102544 : 0x090909,
        emissiveIntensity: planet.name === "Earth" ? 0.32 : 0.08,
      });
      const body = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 40, 32), material);
      orbitObject.add(body);
      body.userData.planetName = planet.name;
      selectableMeshes.push(body);
      const focusRing = new THREE.Mesh(
        new THREE.TorusGeometry(planet.size * 1.48, Math.max(0.012, planet.size * 0.045), 6, 96),
        new THREE.MeshBasicMaterial({ color: 0x9deaff, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      focusRing.rotation.x = Math.PI * 0.5;
      focusRing.visible = false;
      body.add(focusRing);
      focusRings.set(planet.name, focusRing);
      loadTexture(planet.file, (texture) => {
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      });

      if (planet.night) {
        loadTexture(planet.night, (texture) => {
          material.emissiveMap = texture;
          material.emissive.set(0xffc777);
          material.emissiveIntensity = 0.8;
          material.needsUpdate = true;
        });
      }

      if (planet.name === "Earth") {
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(planet.size * 1.08, 36, 30),
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vView;
              void main() {
                vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vView = -viewPosition.xyz;
                gl_Position = projectionMatrix * viewPosition;
              }
            `,
            fragmentShader: `
              varying vec3 vNormal;
              varying vec3 vView;
              void main() {
                float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
                gl_FragColor = vec4(0.16, 0.56, 1.0, rim * 0.74);
              }
            `,
          }),
        );
        orbitObject.add(atmosphere);

        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.38,
          alphaTest: 0.04,
          depthWrite: false,
          roughness: 1,
        });
        const clouds = new THREE.Mesh(
          new THREE.SphereGeometry(planet.size * 1.025, 40, 32),
          cloudMaterial,
        );
        orbitObject.add(clouds);
        loadTexture("2k_earth_clouds.jpg", (texture) => {
          cloudMaterial.alphaMap = texture;
          cloudMaterial.needsUpdate = true;
        });

        const moonOrbit = new THREE.Group();
        orbitObject.add(moonOrbit);
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(0.047, 24, 20),
          new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1 }),
        );
        moon.position.x = 0.37;
        moon.userData.planetName = "Moon";
        moonOrbit.add(moon);
        selectableMeshes.push(moon);
        loadTexture("2k_moon.jpg", (texture) => {
          moon.material.map = texture;
          moon.material.color.set(0xffffff);
          moon.material.needsUpdate = true;
        });
        solarObjects.push({ ...planet, orbitObject, body, moonOrbit, clouds });
      } else {
        solarObjects.push({ ...planet, orbitObject, body });
      }

      if (planet.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(planet.size * 1.28, planet.size * 2.1, 96),
          new THREE.MeshBasicMaterial({ color: 0xd8bd8c, side: THREE.DoubleSide, transparent: true, opacity: 0.82 }),
        );
        ring.rotation.x = Math.PI / 2.32;
        orbitObject.add(ring);
        loadTexture("2k_saturn_ring_alpha.png", (texture) => {
          ring.material.alphaMap = texture;
          ring.material.needsUpdate = true;
        });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const interaction = {
      orbitX: -0.19,
      orbitY: 0.03,
      targetOrbitX: -0.19,
      targetOrbitY: 0.03,
      zoom: 4.2,
      targetZoom: 2.8,
      focus: "Earth",
      pointerX: 0,
      pointerY: 0,
    };
    sceneStateRef.current = { interaction };

    let size = { width: host.clientWidth, height: host.clientHeight };
    const resizeObserver = new ResizeObserver(() => {
      size = { width: host.clientWidth, height: host.clientHeight };
      if (!size.width || !size.height) return;
      camera.aspect = size.width / size.height;
      const mobile = size.width < 700;
      camera.position.z = mobile ? 10.2 : 13.6;
      if (mobile && !interaction.mobileFocusSet) {
        interaction.focus = "Earth";
        interaction.targetZoom = 3.4;
        interaction.mobileFocusSet = true;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(size.width, size.height);
    });
    resizeObserver.observe(host);

    let frameId;
    let visible = true;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = undefined;
      if (!visible) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const easing = 1 - Math.exp(-delta * 2.8);

      interaction.orbitX += (interaction.targetOrbitX - interaction.orbitX) * easing;
      interaction.orbitY += (interaction.targetOrbitY - interaction.orbitY) * easing;
      interaction.zoom += (interaction.targetZoom - interaction.zoom) * easing;
      universe.rotation.set(interaction.orbitX, interaction.orbitY, 0);
      universe.position.x += (-interaction.pointerX * 0.18 - universe.position.x) * easing;
      universe.position.y += (interaction.pointerY * 0.14 - universe.position.y) * easing;

      const focusName = interaction.focus === "Moon" ? "Earth" : interaction.focus;
      const focus = solarObjects.find((item) => item.name === focusName);
      const focusOffset = new THREE.Vector3();
      if (focus) {
        focusOffset.copy(focus.orbitObject.position);
        if (interaction.focus === "Moon" && focus.moonOrbit) {
          const moonAngle = time * 0.9;
          focusOffset.x += Math.cos(moonAngle) * 0.37;
          focusOffset.z -= Math.sin(moonAngle) * 0.37;
        }
      } else if (interaction.focus === "Sun") {
        focusOffset.set(-2.2, 0, 0);
      }
      const mobile = host.clientWidth < 700;
      const focusCenterX = mobile ? 0 : interaction.zoom < 6 ? 0.55 : systemHome.x;
      const focusCenterY = mobile
        ? interaction.zoom < 6 ? -0.65 : -1.65
        : systemHome.y;
      const focusTarget = interaction.focus
        ? new THREE.Vector3(focusCenterX - focusOffset.x, focusCenterY - focusOffset.y, -focusOffset.z)
        : new THREE.Vector3(systemHome.x, systemHome.y, 0);
      sunSystem.position.lerp(focusTarget, easing * 0.72);
      camera.position.z = interaction.zoom;

      solarObjects.forEach((item, index) => {
        const phase = time * item.speed + index * 1.67;
        item.orbitObject.position.set(-2.2 + Math.cos(phase) * item.orbit, Math.sin(phase) * item.orbit * 0.29, 0);
        item.body.rotation.y += delta * (item.name === "Jupiter" ? 0.34 : 0.18);
        if (item.clouds) item.clouds.rotation.y += delta * 0.2;
        if (item.moonOrbit) item.moonOrbit.rotation.y = time * 0.9;
      });
      focusRings.forEach((ring, name) => {
        ring.visible = interaction.focus === name;
        if (ring.visible) ring.material.opacity = 0.58 + (Math.sin(time * 2.2) + 1) * 0.14;
      });
      sun.rotation.y += delta * 0.055;
      sunCorona.material.uniforms.uTime.value = time;
      orbitMaterials.forEach((material, index) => {
        material.opacity = 0.15 + (Math.sin(time * 0.35 + index) + 1) * 0.05;
      });

      renderer.render(scene, camera);
      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(animate);
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

    const onPointerMove = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      interaction.pointerX = (x - 0.5) * 2;
      interaction.pointerY = (y - 0.5) * 2;

      if (dragRef.current.active && !coarsePointer.matches && !reducedMotion.matches) {
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
        interaction.targetOrbitY += dx * 0.004;
        interaction.targetOrbitX = THREE.MathUtils.clamp(interaction.targetOrbitX + dy * 0.003, -0.85, 0.85);
        dragRef.current.x = event.clientX;
        dragRef.current.y = event.clientY;
      }
    };
    const onPointerDown = (event) => {
      if (event.button !== 0 || event.target.closest(".hero-copy, a, button")) return;
      dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
      interactionTarget.classList.add("hero-dragging");
    };
    const onPointerUp = (event) => {
      if (!dragRef.current.active) return;
      const wasDrag = dragRef.current.moved;
      dragRef.current.active = false;
      interactionTarget.classList.remove("hero-dragging");
      if (wasDrag) return;

      const bounds = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const intersections = raycaster.intersectObjects(selectableMeshes, false);
      if (intersections.length) {
        const planet = intersections[0].object.userData.planetName;
        interaction.focus = planet;
        interaction.targetZoom = getFocusZoom(planet);
        setSelected(planet);
      }
    };
    const onWheel = (event) => {
      if (!event.target.closest(".solar-system-scene")) return;
      event.preventDefault();
      interaction.targetZoom = THREE.MathUtils.clamp(interaction.targetZoom + event.deltaY * 0.012, 2, 23);
    };
    const onPointerLeave = () => {
      interaction.pointerX = 0;
      interaction.pointerY = 0;
    };
    interactionTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    interactionTarget.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    interactionTarget.addEventListener("wheel", onWheel, { passive: false });
    interactionTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const startFrame = () => {
      if (visible && frameId === undefined) frameId = window.requestAnimationFrame(animate);
    };
    startFrame();

    return () => {
      cancelled = true;
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      interactionTarget.removeEventListener("pointermove", onPointerMove);
      interactionTarget.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      interactionTarget.removeEventListener("wheel", onWheel);
      interactionTarget.removeEventListener("pointerleave", onPointerLeave);
      interactionTarget.classList.remove("hero-dragging");
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose();
      });
      loadedTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      sceneStateRef.current = null;
    };
  }, []);

  const focusPlanet = (name) => {
    const interaction = sceneStateRef.current?.interaction;
    if (!interaction) return;
    interaction.focus = name === "System" ? null : name;
    interaction.targetZoom = getFocusZoom(name);
    setSelected(name);
  };

  const adjustZoom = (amount) => {
    const interaction = sceneStateRef.current?.interaction;
    if (!interaction) return;
    interaction.targetZoom = THREE.MathUtils.clamp(interaction.targetZoom + amount, 2, 23);
  };

  const selectedPlanet = planetData.find((planet) => planet.name === selected);
  const selectedFact = selected === "Sun"
    ? "The star at the center of our solar system"
    : selected === "Moon"
      ? "Earth's natural satellite · tidally locked"
      : selectedPlanet?.fact;

  return (
    <div className="hero-ai-scene hero-ai-backdrop solar-system-scene" ref={hostRef} aria-label="Interactive solar system. Drag to orbit, scroll to zoom, select a planet to inspect it.">
      <div className="hero-ai-vignette" aria-hidden="true" />
      <div className="solar-title" aria-hidden="true"><span>SOLAR SYSTEM</span><i>LOCAL GROUP / 01</i></div>
      <div className="solar-detail" aria-live="polite">
        <span className="solar-detail-kicker">PLANETARY ARCHIVE</span>
        <strong>{selected}</strong>
        <small>{selectedFact}</small>
      </div>
      <div className="solar-selector" aria-label="Select a solar system body">
        <button
          type="button"
          className={selected === "System" ? "selected system-button" : "system-button"}
          onClick={() => focusPlanet("System")}
          aria-pressed={selected === "System"}
        >
          <span className="planet-swatch swatch-system" />System
        </button>
        {["Sun", ...planetData.map((planet) => planet.name), "Moon"].map((name) => (
          <button
            type="button"
            key={name}
            className={selected === name ? "selected" : ""}
            onClick={() => focusPlanet(name)}
            aria-pressed={selected === name}
          >
            <span className={`planet-swatch swatch-${name.toLowerCase()}`} />{name}
          </button>
        ))}
      </div>
      <div className="solar-zoom-controls" aria-label="Solar system zoom controls">
        <button type="button" onClick={() => adjustZoom(-1.2)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" onClick={() => adjustZoom(1.2)} aria-label="Zoom out" title="Zoom out">−</button>
      </div>
      <div className="solar-hint" aria-hidden="true">DRAG TO EXPLORE <span>SCROLL TO ZOOM</span><span>CLICK A PLANET TO FOCUS</span></div>
      <div className="ai-scan-beam" aria-hidden="true" />
    </div>
  );
};

export default SolarSystemHero;
