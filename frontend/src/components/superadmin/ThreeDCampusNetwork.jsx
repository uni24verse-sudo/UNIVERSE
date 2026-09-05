import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDCampusNetwork = ({ zones = [], autoRotate = false }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const groupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const safeZones = React.useMemo(() => {
    if (zones && zones.length > 0) return zones.slice(0, 6);
    return [
      { name: 'BH1 Boys Hostel Hub', type: 'Hostel', storeCount: 12, totalOrders: 280, todayRevenue: 18450, activeOrders: 8 },
      { name: 'Law Gate Food Strip', type: 'Market', storeCount: 18, totalOrders: 420, todayRevenue: 34200, activeOrders: 14 },
      { name: 'Block 34 Tech Hub', type: 'Academic', storeCount: 8, totalOrders: 190, todayRevenue: 14200, activeOrders: 5 },
      { name: 'Central Food Court', type: 'Food Court', storeCount: 15, totalOrders: 350, todayRevenue: 28900, activeOrders: 11 }
    ];
  }, [zones]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 18, 26);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(15, 25, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Clean Circular Map Plate
    const mapGeo = new THREE.CylinderGeometry(11, 11.2, 0.3, 64);
    const mapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.05 });
    const mapPlate = new THREE.Mesh(mapGeo, mapMat);
    mapPlate.position.y = -0.15;
    mapPlate.receiveShadow = true;
    scene.add(mapPlate);

    const ringGeo = new THREE.RingGeometry(10.8, 11, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const outerRing = new THREE.Mesh(ringGeo, ringMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.01;
    scene.add(outerRing);

    // Group for nodes
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Central UniVerse Server Gateway Hub
    const centralGeo = new THREE.CylinderGeometry(1.8, 2.0, 1.2, 32);
    const centralMat = new THREE.MeshStandardMaterial({ color: 0xef4123, metalness: 0.2, roughness: 0.2 });
    const centralHub = new THREE.Mesh(centralGeo, centralMat);
    centralHub.position.set(0, 0.6, 0);
    centralHub.castShadow = true;
    centralHub.receiveShadow = true;
    centralHub.userData = {
      name: 'UniVerse Campus Central Gateway',
      isCentral: true,
      storeCount: safeZones.reduce((s, z) => s + (z.storeCount || 0), 0),
      todayRevenue: safeZones.reduce((s, z) => s + (z.todayRevenue || 0), 0)
    };
    group.add(centralHub);

    // Outer Zone Nodes
    const count = safeZones.length;
    const radius = 7.5;
    const colors = [0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b, 0x06b6d4];

    safeZones.forEach((zone, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const nodeHeight = Math.max(1.4, Math.min(4.5, ((zone.todayRevenue || 5000) / 30000) * 4));

      // Zone Cylinder
      const nodeGeo = new THREE.CylinderGeometry(1.1, 1.2, nodeHeight, 24);
      nodeGeo.translate(0, nodeHeight / 2, 0);

      const nodeMat = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.7
      });

      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, 0, z);
      nodeMesh.castShadow = true;
      nodeMesh.receiveShadow = true;
      nodeMesh.userData = zone;
      group.add(nodeMesh);

      // Connecting Curved Road / Beam from Central Gateway
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x, nodeHeight / 2, z),
        new THREE.Vector3(x * 0.5, 2.5, z * 0.5),
        new THREE.Vector3(0, 0.8, 0)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(tubeMesh);
    });

    // Mouse Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      if (isDraggingRef.current && groupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;
        groupRef.current.rotation.y += deltaX * 0.006;
        camera.position.y = Math.max(8, Math.min(26, camera.position.y - deltaY * 0.05));
        camera.lookAt(0, 1, 0);
        previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);

      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        while (topObj.parent && topObj.parent !== group) {
          topObj = topObj.parent;
        }
        if (topObj.userData && topObj.userData.name) {
          setHoveredZone(topObj.userData);
          setTooltipPos({ x: event.clientX - rect.left + 15, y: event.clientY - rect.top - 20 });
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredZone(null);
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

    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isDraggingRef.current && groupRef.current) {
        groupRef.current.rotation.y += 0.003;
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
  }, [safeZones, autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      
      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Header Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
          Campus Node Network • Drag to Rotate
        </span>
      </div>

      {/* Hover Tooltip */}
      {hoveredZone && (
        <div style={{
          position: 'absolute',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          pointerEvents: 'none',
          background: '#1e293b',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 50,
          minWidth: '160px'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8' }}>
            {hoveredZone.name}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stores</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{hoveredZone.storeCount || 0}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Revenue</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>₹{(hoveredZone.todayRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDCampusNetwork;
