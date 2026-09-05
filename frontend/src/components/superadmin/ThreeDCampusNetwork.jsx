import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ThreeDCampusNetwork = ({ zones = [], autoRotate = true, onSelectZone }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const networkGroupRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 420;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x060913, 0.018);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 26, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    currentMount.innerHTML = '';
    currentMount.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2);
    dirLight.position.set(15, 30, 15);
    scene.add(dirLight);

    const centerPoint = new THREE.PointLight(0xef4123, 3, 40);
    centerPoint.position.set(0, 5, 0);
    scene.add(centerPoint);

    // 5. Holographic Ground Grid & Coordinate Circles
    const grid = new THREE.GridHelper(40, 20, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.05;
    scene.add(grid);

    // Cyber Network Floor Concentric Rings
    [10, 16, 22].forEach(r => {
      const ringG = new THREE.RingGeometry(r - 0.05, r + 0.05, 64);
      const ringM = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
      const ringMesh = new THREE.Mesh(ringG, ringM);
      ringMesh.rotation.x = Math.PI / 2;
      scene.add(ringMesh);
    });

    // 6. Network Group
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);
    networkGroupRef.current = networkGroup;

    // Particle streams collection for animation
    const particleStreams = [];

    // 7. Populate Campus Nodes & Laser Arcs
    const safeZones = zones.length > 0 ? zones : [
      { name: 'BH1 Boys Hostel Hub', type: 'Hostel', storeCount: 12, totalOrders: 280, todayRevenue: 18450, activeOrders: 8 },
      { name: 'Law Gate Food Strip', type: 'Market', storeCount: 18, totalOrders: 420, todayRevenue: 34200, activeOrders: 14 },
      { name: 'Block 34 Tech Hub', type: 'Academic', storeCount: 8, totalOrders: 190, todayRevenue: 14200, activeOrders: 5 },
      { name: 'Central Food Court', type: 'Food Court', storeCount: 15, totalOrders: 350, todayRevenue: 28900, activeOrders: 11 },
      { name: 'GH Girls Hostel Gate', type: 'Hostel', storeCount: 9, totalOrders: 160, todayRevenue: 12300, activeOrders: 4 }
    ];

    const nodePositions = [];
    const count = safeZones.length;
    const campusRadius = 11;

    // Create Central Hub Node (UniVerse Main Gateway)
    const centralGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 8);
    const centralMat = new THREE.MeshPhysicalMaterial({ color: 0xef4123, metalness: 0.8, roughness: 0.2, emissive: 0xef4123, emissiveIntensity: 0.4 });
    const centralNode = new THREE.Mesh(centralGeo, centralMat);
    centralNode.position.set(0, 0.6, 0);
    centralNode.userData = {
      isCentral: true,
      name: 'UniVerse Campus Central Gateway',
      storeCount: safeZones.reduce((s, z) => s + (z.storeCount || 0), 0),
      todayRevenue: safeZones.reduce((s, z) => s + (z.todayRevenue || 0), 0),
      activeOrders: safeZones.reduce((s, z) => s + (z.activeOrders || 0), 0)
    };
    networkGroup.add(centralNode);
    nodePositions.push(new THREE.Vector3(0, 0.6, 0));

    // Outer Zone Nodes
    safeZones.forEach((zone, index) => {
      const angle = (index / count) * Math.PI * 2;
      const x = Math.sin(angle) * campusRadius;
      const z = Math.cos(angle) * campusRadius;
      const nodeHeight = Math.max(1.2, ((zone.todayRevenue || 1000) / 40000) * 6);

      // Node Cylinder Base
      const nodeGeo = new THREE.CylinderGeometry(1.2, 1.4, nodeHeight, 6);
      nodeGeo.translate(0, nodeHeight / 2, 0);

      const colorPalette = [0x38bdf8, 0x10b981, 0xa855f7, 0xf59e0b, 0xec4899];
      const nodeColor = colorPalette[index % colorPalette.length];

      const nodeMat = new THREE.MeshPhysicalMaterial({
        color: nodeColor,
        metalness: 0.7,
        roughness: 0.2,
        clearcoat: 0.8,
        emissive: nodeColor,
        emissiveIntensity: 0.25
      });

      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, 0, z);
      nodeMesh.userData = zone;
      networkGroup.add(nodeMesh);

      const topPos = new THREE.Vector3(x, nodeHeight + 0.2, z);
      nodePositions.push(topPos);

      // Glowing Beacon Orb on top of node
      const orbGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      orbMesh.position.set(0, nodeHeight + 0.5, 0);
      nodeMesh.add(orbMesh);

      // Pulsating ground radar under active nodes
      const radarGeo = new THREE.RingGeometry(1.6, 2.2, 32);
      const radarMat = new THREE.MeshBasicMaterial({ color: nodeColor, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      const radarMesh = new THREE.Mesh(radarGeo, radarMat);
      radarMesh.rotation.x = Math.PI / 2;
      radarMesh.position.set(0, 0.05, 0);
      nodeMesh.add(radarMesh);

      // 8. 3D Laser Spline Curve from Zone to Central Gateway
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x, nodeHeight, z),
        new THREE.Vector3(x * 0.5, nodeHeight + 4, z * 0.5),
        new THREE.Vector3(0, 1.2, 0)
      );

      const points = curve.getPoints(30);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: nodeColor, transparent: true, opacity: 0.45, linewidth: 2 });
      const splineLine = new THREE.Line(lineGeo, lineMat);
      networkGroup.add(splineLine);

      // Particle moving along spline
      const particleGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const particleMesh = new THREE.Mesh(particleGeo, particleMat);
      networkGroup.add(particleMesh);

      particleStreams.push({
        mesh: particleMesh,
        curve: curve,
        progress: Math.random()
      });
    });

    // 9. Raycasting & Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      if (isDraggingRef.current && networkGroupRef.current) {
        const deltaX = event.clientX - previousMousePositionRef.current.x;
        const deltaY = event.clientY - previousMousePositionRef.current.y;

        networkGroupRef.current.rotation.y += deltaX * 0.008;
        camera.position.y = Math.max(10, Math.min(40, camera.position.y - deltaY * 0.08));
        camera.lookAt(0, 0, 0);

        previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(networkGroup.children, true);

      if (intersects.length > 0) {
        let topObject = intersects[0].object;
        while (topObject.parent && topObject.parent !== networkGroup) {
          topObject = topObject.parent;
        }
        if (topObject.userData && topObject.userData.name) {
          setHoveredNode(topObject.userData);
          setTooltipPos({ x: event.clientX - rect.left + 15, y: event.clientY - rect.top - 15 });
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredNode(null);
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
      camera.position.z = Math.max(15, Math.min(55, camera.position.z + event.deltaY * 0.02));
    };

    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    currentMount.addEventListener('wheel', handleWheel, { passive: false });

    // 10. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate && !isDraggingRef.current && networkGroupRef.current) {
        networkGroupRef.current.rotation.y += 0.003;
      }

      // Animate laser particles along splines
      particleStreams.forEach((stream) => {
        stream.progress = (stream.progress + 0.012) % 1;
        const pos = stream.curve.getPointAt(stream.progress);
        stream.mesh.position.copy(pos);
      });

      // Pulse central hub
      centralNode.rotation.y += 0.01;

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
  }, [zones, autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', background: 'radial-gradient(circle at center, #0b1329 0%, #030712 100%)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)' }}>
      
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating 3D HUD Badge */}
      <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 12px #38bdf8' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          3D Spatial Campus Hubs • Live Dispatch Network
        </span>
      </div>

      {/* Interactive 3D Node Tooltip */}
      {hoveredNode && (
        <div style={{
          position: 'absolute',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #38bdf8',
          boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#ffffff',
          zIndex: 50,
          minWidth: '180px',
          animation: 'fadeIn 0.15s ease'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8' }}>
            {hoveredNode.name}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Stores</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#f8fafc' }}>{hoveredNode.storeCount || 0}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Prep</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>{hoveredNode.activeOrders || 0}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Today Rev</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#f59e0b' }}>₹{hoveredNode.todayRevenue || 0}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Orders</span>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#cbd5e1' }}>{hoveredNode.totalOrders || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDCampusNetwork;
