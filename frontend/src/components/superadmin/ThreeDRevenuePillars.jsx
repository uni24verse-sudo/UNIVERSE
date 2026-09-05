import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDRevenuePillars = ({ data = [], metric = 'revenue', autoRotate = false }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const chartGroupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Prepare standard 8 to 10 time intervals for maximum clarity
  const formattedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { label: '10:00 AM', value: 1250, orders: 8, labelShort: '10 AM' },
        { label: '12:00 PM', value: 3400, orders: 22, labelShort: '12 PM' },
        { label: '02:00 PM', value: 4850, orders: 31, labelShort: '2 PM' },
        { label: '04:00 PM', value: 2100, orders: 14, labelShort: '4 PM' },
        { label: '06:00 PM', value: 3900, orders: 25, labelShort: '6 PM' },
        { label: '08:00 PM', value: 5600, orders: 36, labelShort: '8 PM' },
        { label: '10:00 PM', value: 2800, orders: 18, labelShort: '10 PM' }
      ];
    }

    // If data has hourly stats, pick key intervals
    if (data.length > 12) {
      // Pick every 2nd or 3rd hour for clear visualization
      return data.filter((_, idx) => idx % 3 === 0 || idx === data.length - 1).map(item => {
        let val = item.revenue || item.todayRevenue || item.totalRevenue || 0;
        if (metric === 'orders') val = item.orders || item.todayOrders || item.totalOrders || 0;
        if (metric === 'commission') val = Math.round(val * 0.03);
        if (metric === 'active') val = item.activeRate || item.activeQueue || 0;
        return {
          label: item.hour || item.name || 'Slot',
          labelShort: item.hour ? item.hour.replace(':00', '') + 'h' : (item.name?.slice(0, 6) || 'Slot'),
          value: val,
          orders: item.orders || item.todayOrders || item.totalOrders || 0,
          raw: item
        };
      });
    }

    return data.map(item => {
      let val = item.revenue || item.todayRevenue || item.totalRevenue || 0;
      if (metric === 'orders') val = item.orders || item.todayOrders || item.totalOrders || 0;
      if (metric === 'commission') val = Math.round(val * 0.03);
      if (metric === 'active') val = item.activeRate || item.activeQueue || 0;
      return {
        label: item.hour || item.name || 'Slot',
        labelShort: item.hour ? item.hour.replace(':00', '') + 'h' : (item.name?.slice(0, 8) || 'Slot'),
        value: val,
        orders: item.orders || item.todayOrders || item.totalOrders || 0,
        raw: item
      };
    });
  }, [data, metric]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    // 1. Scene & Camera Setup (Clean 3D Isometric View)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Clean executive off-white background

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 26);
    camera.lookAt(0, 2, 0);

    // 2. High Quality WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // 3. Studio Lighting (Soft Shadows, Crisp Highlights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
    mainLight.position.set(15, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 60;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.8);
    fillLight.position.set(-15, 20, -10);
    scene.add(fillLight);

    // 4. Clean Glass Podium Baseplate
    const baseGeo = new THREE.BoxGeometry(24, 0.4, 10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.2;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Subtle Grid lines on podium
    const grid = new THREE.GridHelper(22, 11, 0xe2e8f0, 0xf1f5f9);
    grid.position.y = 0.01;
    scene.add(grid);

    // 5. Dynamic 3D Bar Pillars Group
    const chartGroup = new THREE.Group();
    scene.add(chartGroup);
    chartGroupRef.current = chartGroup;

    // Calculate heights
    const maxVal = Math.max(...formattedData.map(d => d.value), 100);
    const maxHeight = 8.5;
    const barCount = formattedData.length;
    const totalSpan = 18;
    const barSpacing = totalSpan / (barCount - 1 || 1);
    const startX = -totalSpan / 2;

    const bars = [];

    formattedData.forEach((d, idx) => {
      const height = Math.max(0.4, (d.value / maxVal) * maxHeight);
      const x = startX + idx * barSpacing;
      const z = 0;

      // Rounded Box Pillar
      const barGeo = new THREE.BoxGeometry(1.4, height, 1.4);
      barGeo.translate(0, height / 2, 0);

      // Gradient colors: Orange for peak, Indigo for steady, Emerald for start
      let barColor = 0x6366f1; // Modern Indigo
      if (d.value === maxVal) barColor = 0xef4123; // Peak Orange
      else if (idx % 2 === 0) barColor = 0x3b82f6; // Royal Blue

      const barMat = new THREE.MeshPhysicalMaterial({
        color: barColor,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.15
      });

      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(x, 0, z);
      barMesh.castShadow = true;
      barMesh.receiveShadow = true;
      barMesh.userData = { data: d, height, index: idx };
      chartGroup.add(barMesh);
      bars.push(barMesh);

      // Glossy Top Cap
      const topCapGeo = new THREE.BoxGeometry(1.45, 0.15, 1.45);
      const topCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
      const topCap = new THREE.Mesh(topCapGeo, topCapMat);
      topCap.position.set(0, height + 0.08, 0);
      barMesh.add(topCap);
    });

    // 6. Raycaster & Mouse Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      // Drag to rotate chart
      if (isDraggingRef.current && chartGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;
        chartGroupRef.current.rotation.y += deltaX * 0.006;
        camera.position.y = Math.max(6, Math.min(26, camera.position.y - deltaY * 0.05));
        camera.lookAt(0, 2, 0);
        previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
      }

      // Check Bar Hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(chartGroup.children, true);

      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        while (topObj.parent && topObj.parent !== chartGroup) {
          topObj = topObj.parent;
        }
        if (topObj.userData && topObj.userData.data) {
          setHoveredBar(topObj.userData.data);
          setTooltipPos({ x: event.clientX - rect.left + 15, y: event.clientY - rect.top - 20 });
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredBar(null);
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

    // 7. Animation Loop
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
  }, [formattedData, autoRotate, metric]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      
      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Clean Financial Chart Legend & Controls Header */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
            3D Revenue Distribution • Drag to Rotate
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4123' }}></span> Peak Volume
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6366f1' }}></span> Regular Volume
          </span>
        </div>
      </div>

      {/* Axis X-Labels Bar along bottom */}
      <div style={{ position: 'absolute', bottom: '12px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        {formattedData.map((d, i) => (
          <span key={i} style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {d.labelShort}
          </span>
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredBar && (
        <div style={{
          position: 'absolute',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          pointerEvents: 'none',
          background: '#1e293b',
          borderRadius: '10px',
          padding: '10px 14px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 50,
          minWidth: '130px'
        }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
            {hoveredBar.label}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#38bdf8' }}>
            {metric === 'revenue' && `₹${hoveredBar.value.toLocaleString()}`}
            {metric === 'orders' && `${hoveredBar.value} Orders`}
            {metric === 'commission' && `₹${hoveredBar.value.toLocaleString()} Net`}
            {metric === 'active' && `${hoveredBar.value} Active`}
          </p>
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{hoveredBar.orders} orders fulfilled</span>
        </div>
      )}
    </div>
  );
};

export default ThreeDRevenuePillars;
