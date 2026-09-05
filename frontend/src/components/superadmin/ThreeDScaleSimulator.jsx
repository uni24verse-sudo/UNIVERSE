import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDScaleSimulator = ({ campusCount = 5, autoRotate = true }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const curveMeshGroupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Calculated metrics based on campusCount
  const metrics = React.useMemo(() => {
    const storesPerCampus = 14;
    const ordersPerDayPerCampus = 450;
    const avgTicket = 220;
    
    const totalStores = campusCount * storesPerCampus;
    const dailyOrders = campusCount * ordersPerDayPerCampus;
    const monthlyGMV = dailyOrders * 30 * avgTicket;
    const annualGMV = monthlyGMV * 12;
    const annualTakeRateProfit = annualGMV * 0.03 + (annualGMV * 0.04 * 0.05); // 3% take + cancel fee
    const monthlyCloudSpend = 3390 + (campusCount - 1) * 650; // AWS RDS scales efficiently

    return {
      totalStores,
      dailyOrders,
      monthlyGMV,
      annualGMV,
      annualTakeRateProfit: Math.round(annualTakeRateProfit),
      monthlyCloudSpend: Math.round(monthlyCloudSpend),
      softwareGrossMargin: ((1 - (monthlyCloudSpend * 12) / annualTakeRateProfit) * 100).toFixed(1)
    };
  }, [campusCount]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 380;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.02);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 28);
    camera.lookAt(0, 2, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xef4123, 3);
    dirLight1.position.set(20, 30, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 2.5);
    dirLight2.position.set(-20, 20, -10);
    scene.add(dirLight2);

    // 4. Ground Grid
    const grid = new THREE.GridHelper(36, 18, 0x10b981, 0x1e293b);
    grid.position.y = -0.05;
    scene.add(grid);

    // 5. Main 3D Curve Mesh Group
    const group = new THREE.Group();
    scene.add(group);
    curveMeshGroupRef.current = group;

    // 6. Build Dynamic 3D Scalability Step Mesh
    const points = [];
    const maxStages = 10;
    const stepWidth = 2.4;
    const startX = -((maxStages * stepWidth) / 2);

    for (let i = 0; i <= maxStages; i++) {
      const simulatedCampuses = (i / maxStages) * 50;
      const heightVal = Math.pow(i / maxStages, 1.6) * 12 * (campusCount / 25);
      const x = startX + i * stepWidth;
      const z = Math.sin(i * 0.4) * 2;
      points.push(new THREE.Vector3(x, heightVal, z));

      // 3D Pillar per checkpoint
      const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, heightVal || 0.2, 8);
      pillarGeo.translate(0, (heightVal || 0.2) / 2, 0);
      
      const isCurrentTarget = Math.abs(simulatedCampuses - campusCount) <= 5;
      const pillarMat = new THREE.MeshPhysicalMaterial({
        color: isCurrentTarget ? 0xef4123 : 0x10b981,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 0.9,
        emissive: isCurrentTarget ? 0xef4123 : 0x10b981,
        emissiveIntensity: isCurrentTarget ? 0.4 : 0.15
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(x, 0, z);
      group.add(pillarMesh);

      // Add Glowing Bead on Top
      const beadGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const beadMat = new THREE.MeshBasicMaterial({ color: isCurrentTarget ? 0xffffff : 0x38bdf8 });
      const beadMesh = new THREE.Mesh(beadGeo, beadMat);
      beadMesh.position.set(x, heightVal + 0.3, z);
      group.add(beadMesh);
    }

    // 7. Glowing Spline Tube connecting all checkpoints
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.25, 8, false);
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4123,
      metalness: 0.5,
      roughness: 0.1,
      transmission: 0.3,
      clearcoat: 1.0,
      emissive: 0xef4123,
      emissiveIntensity: 0.3
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(tubeMesh);

    // Mouse Drag Rotation
    const handleMouseMove = (event) => {
      if (isDraggingRef.current && curveMeshGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;
        curveMeshGroupRef.current.rotation.y += deltaX * 0.008;
        camera.position.y = Math.max(6, Math.min(30, camera.position.y - deltaY * 0.08));
        camera.lookAt(0, 2, 0);
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
      camera.position.z = Math.max(14, Math.min(48, camera.position.z + event.deltaY * 0.02));
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

      if (autoRotate && !isDraggingRef.current && curveMeshGroupRef.current) {
        curveMeshGroupRef.current.rotation.y += 0.003;
      }

      tubeMat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight || 380;
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
  }, [campusCount, autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '380px', background: 'radial-gradient(circle at center, #091322 0%, #020617 100%)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)' }}>
      {/* WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating HUD Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          3D Multi-Campus ARR Growth Curve • {campusCount} Active Campuses
        </span>
      </div>

      {/* Real-time Scaled Output HUD Bar */}
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
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239, 65, 35, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#ef4123', fontWeight: '700', textTransform: 'uppercase' }}>Annual GMV Run-Rate</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
            ₹{(metrics.annualGMV / 10000000).toFixed(2)} Cr / yr
          </p>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Net Annual Commission</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
            ₹{(metrics.annualTakeRateProfit / 100000).toFixed(1)} Lakhs
          </p>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '12px', padding: '8px 12px' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>AWS Cloud Efficiency</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
            {metrics.softwareGrossMargin}% Gross Margin
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDScaleSimulator;
