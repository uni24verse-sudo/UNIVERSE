import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeDFinanceOrbit = ({ financeData = {}, autoRotate = false }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const chartGroupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  const {
    totalRevenue = 3174,
    vendorShare = 3079,
    platformCommission = 95
  } = financeData;

  const vendorPercent = totalRevenue > 0 ? ((vendorShare / totalRevenue) * 100).toFixed(1) : '97.0';
  const platformPercent = totalRevenue > 0 ? ((platformCommission / totalRevenue) * 100).toFixed(1) : '3.0';

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 24);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // Studio Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(12, 24, 18);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Group for 3D Donut Chart
    const chartGroup = new THREE.Group();
    scene.add(chartGroup);
    chartGroupRef.current = chartGroup;

    // 1. Vendor Share Segment (Major 97% Arch)
    const vendorAngle = (parseFloat(vendorPercent) / 100) * Math.PI * 2;
    const vendorGeo = new THREE.TorusGeometry(6.5, 1.3, 32, 64, vendorAngle);
    const vendorMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981, // Emerald Green
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.6
    });
    const vendorMesh = new THREE.Mesh(vendorGeo, vendorMat);
    vendorMesh.rotation.x = Math.PI / 2.5;
    chartGroup.add(vendorMesh);

    // 2. UniVerse Commission Segment (3% Arch)
    const platformAngle = (parseFloat(platformPercent) / 100) * Math.PI * 2;
    const platformGeo = new THREE.TorusGeometry(6.5, 1.35, 32, 32, Math.max(0.3, platformAngle));
    const platformMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4123, // UniVerse Brand Orange
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.rotation.x = Math.PI / 2.5;
    platformMesh.rotation.z = vendorAngle + 0.05;
    chartGroup.add(platformMesh);

    // 3. Central Core Pillar
    const coreGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.8, 32);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.x = Math.PI / 2.5;
    chartGroup.add(coreMesh);

    // Mouse Interaction
    const handleMouseMove = (event) => {
      if (isDraggingRef.current && chartGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;
        chartGroupRef.current.rotation.y += deltaX * 0.006;
        camera.position.y = Math.max(6, Math.min(26, camera.position.y - deltaY * 0.05));
        camera.lookAt(0, 0, 0);
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

    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isDraggingRef.current && chartGroupRef.current) {
        chartGroupRef.current.rotation.y += 0.003;
      }
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
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, [totalRevenue, vendorShare, platformCommission, autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      
      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Header Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
          3D Financial Flow Donut • Drag to Rotate
        </span>
      </div>

      {/* Clear Executive Financial Breakdown Overlay Card */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        right: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Vendor Payouts ({vendorPercent}%)</span>
          </div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>₹{vendorShare.toLocaleString()}</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4123' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>UniVerse Take ({platformPercent}%)</span>
          </div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#ef4123' }}>₹{platformCommission.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDFinanceOrbit;
