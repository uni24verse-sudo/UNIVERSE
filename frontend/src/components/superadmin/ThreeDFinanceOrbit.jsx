import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDFinanceOrbit = ({ financeData = {}, autoRotate = true }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const orbitGroupRef = useRef(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const {
    totalRevenue = 0,
    vendorShare = 0,
    platformCommission = 0,
    pgGatewayFee = 0,
    netPlatformMargin = 0
  } = financeData;

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 24);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const point1 = new THREE.PointLight(0xef4123, 4, 30);
    point1.position.set(10, 12, 10);
    scene.add(point1);

    const point2 = new THREE.PointLight(0x10b981, 3, 30);
    point2.position.set(-10, -10, -10);
    scene.add(point2);

    const point3 = new THREE.PointLight(0x6366f1, 2, 25);
    point3.position.set(0, 15, -10);
    scene.add(point3);

    // Main Orbit Container
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);
    orbitGroupRef.current = orbitGroup;

    // 1. Outer Torus Ring: Gross Platform Volume (UniVerse Brand Orange)
    const outerTorusGeo = new THREE.TorusGeometry(8, 0.45, 16, 100);
    const outerTorusMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4123,
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 0.9,
      emissive: 0xef4123,
      emissiveIntensity: 0.2
    });
    const outerTorus = new THREE.Mesh(outerTorusGeo, outerTorusMat);
    outerTorus.rotation.x = Math.PI / 3;
    orbitGroup.add(outerTorus);

    // 2. Middle Gyroscopic Ring: Vendor Payouts Share (Emerald Green)
    const midTorusGeo = new THREE.TorusGeometry(5.8, 0.4, 16, 100);
    const midTorusMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      metalness: 0.8,
      roughness: 0.15,
      clearcoat: 0.9,
      emissive: 0x10b981,
      emissiveIntensity: 0.2
    });
    const midTorus = new THREE.Mesh(midTorusGeo, midTorusMat);
    midTorus.rotation.y = Math.PI / 4;
    orbitGroup.add(midTorus);

    // 3. Inner Orbit Ring: Platform Commission & Margin (Cyber Indigo)
    const innerTorusGeo = new THREE.TorusGeometry(3.6, 0.35, 16, 80);
    const innerTorusMat = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1,
      metalness: 0.75,
      roughness: 0.2,
      clearcoat: 0.8,
      emissive: 0x6366f1,
      emissiveIntensity: 0.3
    });
    const innerTorus = new THREE.Mesh(innerTorusGeo, innerTorusMat);
    innerTorus.rotation.x = -Math.PI / 4;
    orbitGroup.add(innerTorus);

    // 4. Central Core Energy Sphere
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.1,
      wireframe: true
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    orbitGroup.add(coreSphere);

    // Solid inner glowing orb
    const glowingCoreGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const glowingCoreMat = new THREE.MeshBasicMaterial({ color: 0xef4123, transparent: true, opacity: 0.85 });
    const glowingCore = new THREE.Mesh(glowingCoreGeo, glowingCoreMat);
    orbitGroup.add(glowingCore);

    // 5. Star Particle Nebula
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 10 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.15, transparent: true, opacity: 0.6 });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    orbitGroup.add(particleSystem);

    // Mouse Drag Interaction
    const handleMouseMove = (event) => {
      if (isDraggingRef.current && orbitGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;

        orbitGroupRef.current.rotation.y += deltaX * 0.008;
        orbitGroupRef.current.rotation.x += deltaY * 0.008;
        previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
      }
    };

    const handleMouseDown = (event) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (event) => {
      event.preventDefault();
      camera.position.z = Math.max(12, Math.min(40, camera.position.z + event.deltaY * 0.02));
    };

    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    currentMount.addEventListener('wheel', handleWheel, { passive: false });

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (autoRotate && !isDraggingRef.current && orbitGroupRef.current) {
        orbitGroupRef.current.rotation.y += 0.005;
      }

      // Gyroscopic Differential Rotation
      outerTorus.rotation.z += 0.008;
      midTorus.rotation.x += 0.012;
      midTorus.rotation.z -= 0.006;
      innerTorus.rotation.y += 0.016;

      // Pulse Core
      const pulse = 1 + Math.sin(t * 3) * 0.08;
      coreSphere.scale.setScalar(pulse);
      coreSphere.rotation.y += 0.02;
      glowingCore.scale.setScalar(pulse * 0.95);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight || 420;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      currentMount.removeEventListener('mousemove', handleMouseMove);
      currentMount.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      currentMount.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, [autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)' }}>
      
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating HUD Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 12px #6366f1' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          3D Gyroscopic Orbit • Capital Flow Dynamics
        </span>
      </div>

      {/* Live Financial Legend HUD (Bottom Overlay) */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        right: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239, 65, 35, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#ef4123', fontWeight: '700', textTransform: 'uppercase' }}>Outer Ring</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>₹{totalRevenue.toLocaleString()} GMV</p>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Mid Ring (97%)</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>₹{vendorShare.toLocaleString()} Vendors</p>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase' }}>Core Profit</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>₹{platformCommission.toLocaleString()} Margin</p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDFinanceOrbit;
