import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDRevenuePillars = ({ data = [], metric = 'revenue', autoRotate = true, activeZone = 'all' }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pillarsGroupRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Prepare display items (up to 12 items for clean 3D spacing)
  const displayItems = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(0, 14);
  }, [data]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.015);

    // 2. Camera Setup (Isometric Angle)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 22, 32);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff7700, 2.5); // UniVerse Warm Glow
    dirLight1.position.set(20, 40, 20);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.8); // Cyber Cyan Accent
    dirLight2.position.set(-20, 25, -15);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x10b981, 2, 30); // Emerald Center Flare
    pointLight.position.set(0, 8, 0);
    scene.add(pointLight);

    // 5. Holographic Ground Grid & Circular Base
    const gridHelper = new THREE.GridHelper(36, 18, 0xef4123, 0x1e293b);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Glowing Cyber Ring on Floor
    const ringGeo = new THREE.RingGeometry(14.5, 15, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4123, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = 0;
    scene.add(floorRing);

    // 6. Group for Dynamic 3D Pillars
    const pillarsGroup = new THREE.Group();
    scene.add(pillarsGroup);
    pillarsGroupRef.current = pillarsGroup;

    // 7. Raycaster for Tooltips
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      // Handle Mouse Drag Rotate
      if (isDraggingRef.current && pillarsGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;

        pillarsGroupRef.current.rotation.y += deltaX * 0.008;
        camera.position.y = Math.max(8, Math.min(36, camera.position.y - deltaY * 0.08));
        camera.lookAt(0, 2, 0);

        previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
      }

      // Check Hover Intersections
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pillarsGroup.children, true);

      if (intersects.length > 0) {
        let topObject = intersects[0].object;
        while (topObject.parent && topObject.parent !== pillarsGroup) {
          topObject = topObject.parent;
        }
        if (topObject.userData && topObject.userData.item) {
          setHoveredData(topObject.userData.item);
          setTooltipPos({ x: event.clientX - rect.left + 15, y: event.clientY - rect.top - 15 });
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredData(null);
        document.body.style.cursor = 'default';
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
      const zoomDelta = event.deltaY * 0.02;
      camera.position.z = Math.max(16, Math.min(50, camera.position.z + zoomDelta));
    };

    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    currentMount.addEventListener('wheel', handleWheel, { passive: false });

    // 8. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle auto-rotation if enabled
      if (autoRotate && !isDraggingRef.current && pillarsGroupRef.current) {
        pillarsGroupRef.current.rotation.y += 0.004;
      }

      // Floating pulse on ground ring
      floorRing.scale.setScalar(1 + Math.sin(elapsedTime * 2) * 0.02);

      // Pulse pillar cap lights
      pillarsGroup.children.forEach((pillarMesh, idx) => {
        const glowCap = pillarMesh.getObjectByName('glowCap');
        if (glowCap) {
          glowCap.material.opacity = 0.65 + Math.sin(elapsedTime * 3 + idx) * 0.25;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
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

  // Update 3D Pillar Meshes when data or metric changes
  useEffect(() => {
    if (!pillarsGroupRef.current || displayItems.length === 0) return;
    const group = pillarsGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    // Find max metric value for normalization
    const values = displayItems.map(item => {
      if (metric === 'revenue') return item.revenue || item.todayRevenue || item.totalRevenue || 0;
      if (metric === 'orders') return item.orders || item.todayOrders || item.totalOrders || 0;
      if (metric === 'commission') return Math.round((item.revenue || item.totalRevenue || 0) * 0.03);
      return item.activeRate || item.activeQueue || 0;
    });

    const maxValue = Math.max(...values, 100);
    const maxPillarHeight = 12;

    // Arrange in a sleek circular / stadium orbit or dual row
    const count = displayItems.length;
    const radius = 9.5;

    displayItems.forEach((item, index) => {
      const rawVal = values[index];
      const targetHeight = Math.max(0.6, (rawVal / maxValue) * maxPillarHeight);
      
      const angle = (index / count) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      // Create Pillar Mesh (Hexagonal Cylinder)
      const pillarGeo = new THREE.CylinderGeometry(0.75, 0.85, targetHeight, 6);
      pillarGeo.translate(0, targetHeight / 2, 0);

      // Modern Cyber Gradients / Colors
      let baseColor = 0x06b6d4; // Cyan default
      if (index % 4 === 0) baseColor = 0xef4123; // UniVerse Orange
      else if (index % 4 === 1) baseColor = 0x10b981; // Emerald Green
      else if (index % 4 === 2) baseColor = 0x8b5cf6; // Purple Glow
      else baseColor = 0xf59e0b; // Amber Gold

      const pillarMat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0.65,
        roughness: 0.25,
        transmission: 0.15,
        reflectivity: 0.9,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      });

      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(x, 0, z);
      pillarMesh.castShadow = true;
      pillarMesh.receiveShadow = true;
      pillarMesh.userData = { item, rawVal, index };

      // Add Glowing Neon Cap on top
      const capGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 6);
      const capMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.name = 'glowCap';
      capMesh.position.set(0, targetHeight + 0.1, 0);
      pillarMesh.add(capMesh);

      // Add Hexagonal Base Anchor Ring
      const baseGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.15, 6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(0, 0.08, 0);
      pillarMesh.add(baseMesh);

      group.add(pillarMesh);
    });
  }, [displayItems, metric]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: 'radial-gradient(circle at center, #111827 0%, #030712 100%)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }}>
      
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating 3D HUD Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          3D Kinetic Cylinders • Drag to Rotate / Scroll to Zoom
        </span>
      </div>

      {/* Interactive 3D Tooltip */}
      {hoveredData && (
        <div style={{
          position: 'absolute',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #ef4123',
          boxShadow: '0 10px 25px -5px rgba(239, 65, 35, 0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          color: '#ffffff',
          zIndex: 50,
          minWidth: '150px',
          transform: 'translate(0, 0)',
          animation: 'fadeIn 0.15s ease'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
            {hoveredData.hour || hoveredData.name || 'Segment'}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>
            {metric === 'revenue' && `₹${hoveredData.revenue || hoveredData.todayRevenue || hoveredData.totalRevenue || 0}`}
            {metric === 'orders' && `${hoveredData.orders || hoveredData.todayOrders || hoveredData.totalOrders || 0} Orders`}
            {metric === 'commission' && `₹${Math.round((hoveredData.revenue || hoveredData.totalRevenue || 0) * 0.03)} Net Profit`}
            {metric === 'active' && `${hoveredData.activeRate || hoveredData.activeQueue || 0} In Queue`}
          </p>
          {hoveredData.market && (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📍 {hoveredData.market}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreeDRevenuePillars;
