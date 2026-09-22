import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  GitBranch, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  Plus, 
  Smartphone, 
  Mail, 
  Layers, 
  Trash2, 
  X, 
  Zap, 
  Send, 
  Save, 
  Copy, 
  Settings, 
  Split, 
  ChevronRight,
  Workflow,
  Sparkles,
  MessageSquare,
  Star,
  Check,
  XCircle,
  Move,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RefreshCw,
  HelpCircle,
  Compass,
  ArrowRight,
  Globe,
  Tag,
  ExternalLink,
  Edit3,
  Sliders,
  Code,
  ZoomIn,
  ZoomOut,
  FilePlus,
  CheckSquare
} from 'lucide-react';

const TRIGGER_OPTIONS = [
  { value: 'Order Placed', label: 'Order Placed (Payment Verified)', desc: 'Fires immediately when student completes Razorpay payment & places order' },
  { value: 'Order Accepted', label: 'Order Accepted (Vendor Confirmed)', desc: 'Fires when vendor clicks Accept & begins cooking in kitchen' },
  { value: 'Order Ready', label: 'Order Ready (Kitchen Done)', desc: 'Fires when vendor marks order ready for pickup at counter' },
  { value: 'Order Completed', label: 'Order Completed / Handed Over', desc: 'Fires when vendor scans handover QR code or marks Completed' },
  { value: 'Order Cancelled', label: 'Order Cancelled / Rejected', desc: 'Fires when kitchen rejects order or automated refund is issued' },
  { value: 'First Lifetime Order', label: 'First Lifetime Order', desc: 'Fires when student completes their 1st paid order on UniVerse' },
  { value: 'Repeat Order Placed', label: 'Repeat Order Placed', desc: 'Fires when a returning student places an order' },
  { value: 'Inactive for 7 Days', label: 'Inactive for 7 Days', desc: 'Fires if student has not ordered for 7 consecutive days' },
  { value: 'Manual Enrollment', label: 'Manual Enrollment', desc: 'Fires only when manually enrolled or triggered via API' }
];

const NODE_PALETTE = [
  { type: 'wait_event', label: 'Wait for Live Event', desc: 'Pause contact until kitchen acts (Order Accepted, Ready, Handover QR scanned)', icon: Clock, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  { type: 'delay', label: 'Wait Timer / Delay', desc: 'Pause contact progression for custom minutes, hours, or days (e.g. 30 min meal time)', icon: Clock, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
  { type: 'action_whatsapp', label: 'Send WhatsApp Card', desc: 'Dispatch instant WhatsApp card via Baileys slot with interactive buttons', icon: Smartphone, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  { type: 'action_email', label: 'Send Email Campaign', desc: 'Send rich branded HTML email with hero banner & CTA button', icon: Mail, color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
  { type: 'condition', label: 'Decision Filter (Branch)', desc: 'Split flow into ACCEPTED vs REJECTED or YES/NO paths', icon: Split, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  { type: 'webhook', label: 'Outgoing Webhook', desc: 'Trigger external REST API or webhook endpoint with JSON payload', icon: Globe, color: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)' },
  { type: 'tag', label: 'Customer Tagging', desc: 'Add or remove tags on student profile (e.g. VIP, Biryani-Lover)', icon: Tag, color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)' }
];

const DYNAMIC_TAGS = [
  { tag: '{{name}}', desc: 'Customer Name' },
  { tag: '{{phone}}', desc: 'WhatsApp Phone' },
  { tag: '{{email}}', desc: 'Email Address' },
  { tag: '{{orderId}}', desc: 'Order Number / ID' },
  { tag: '{{storeName}}', desc: 'Outlet / Food Court' },
  { tag: '{{amount}}', desc: 'Order Amount (₹)' }
];

const SuperAdminJourneyBuilder = ({ token }) => {
  const [journeys, setJourneys] = useState([]);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [channelData, setChannelData] = useState({ whatsapp: { slots: [] }, email: { accounts: [] } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Freeform Dragging & Zoom Engine
  const [nodePositions, setNodePositions] = useState({});
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef(null);

  const handleZoomIn = () => setZoom(prev => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  const handleZoomReset = () => setZoom(1);

  // Inspector & Inserter Modals
  const [configuringNodeId, setConfiguringNodeId] = useState(null);
  const [spotlightModal, setSpotlightModal] = useState({ open: false, afterNodeId: null });

  // Journey CRUD Modals
  const [createModal, setCreateModal] = useState({ open: false, name: '', description: '', triggerType: 'Order Placed' });
  const [testModal, setTestModal] = useState({ open: false, journeyId: null, phone: '', name: '', email: '', enrolling: false, result: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, journey: null });

  // INLINE MASTER TEMPLATE CREATOR (No need to navigate away from Journey Builder!)
  const [newTemplateModal, setNewTemplateModal] = useState({
    open: false,
    channel: 'whatsapp',
    name: '',
    category: 'MARKETING',
    body: '',
    btn1Text: '⭐ 5 Stars - Loved It!',
    btn2Text: '💬 Share Feedback',
    emailSubject: '',
    emailCtaText: 'View in App →',
    emailCtaLink: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in',
    saving: false
  });
  const [quickSaveFeedback, setQuickSaveFeedback] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async (preserveSelectedId = null) => {
    try {
      setLoading(true);
      const [journeysRes, templRes, chanRes] = await Promise.all([
        axios.get(`${apiUrl}/api/super-admin/broadcasting/journeys`, { headers }),
        axios.get(`${apiUrl}/api/super-admin/master-templates`, { headers }),
        axios.get(`${apiUrl}/api/super-admin/channels/summary`, { headers })
      ]);

      setJourneys(journeysRes.data);
      setTemplates(templRes.data);
      if (chanRes.data.success) {
        setChannelData(chanRes.data);
      }

      const targetId = preserveSelectedId || selectedJourney?._id;
      if (targetId) {
        const found = journeysRes.data.find(j => j._id === targetId);
        if (found) setSelectedJourney(found);
        else if (journeysRes.data.length > 0) setSelectedJourney(journeysRes.data[0]);
      } else if (journeysRes.data.length > 0) {
        setSelectedJourney(journeysRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load journeys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Canvas Mouse Wheel Zoom Listener (Ctrl + Scroll or Trackpad Pinch)
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom(prev => Math.min(1.6, Math.max(0.5, Math.round((prev + delta) * 100) / 100)));
      }
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, []);

  // Compute Layout Positions (Hierarchical Horizontal Flow)
  useEffect(() => {
    if (!selectedJourney?.nodes) return;
    setNodePositions(prev => {
      const computed = { ...prev };
      const startX = 60;
      const startY = 140;
      const spacingX = 460;

      selectedJourney.nodes.forEach((node, idx) => {
        if (computed[node.id] && typeof computed[node.id].x === 'number') {
          return;
        }
        if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number' && (node.position.x > 0 || node.position.y > 0)) {
          computed[node.id] = { x: node.position.x, y: node.position.y };
        } else {
          computed[node.id] = { x: startX + idx * spacingX, y: startY };
        }
      });

      return computed;
    });
  }, [selectedJourney?._id]);

  // Global Mouse Move & Up for Smooth Zoom-Aware Dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingNodeId || !canvasRef.current) return;
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const mouseCanvasX = (e.clientX - rect.left + scrollLeft) / zoom;
      const mouseCanvasY = (e.clientY - rect.top + scrollTop) / zoom;

      const newX = Math.max(20, Math.round(mouseCanvasX - dragOffset.x));
      const newY = Math.max(20, Math.round(mouseCanvasY - dragOffset.y));

      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY }
      }));
    };

    const handleMouseUp = () => {
      if (draggingNodeId) {
        setDraggingNodeId(null);
      }
    };

    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, dragOffset, zoom]);

  // Start Node Drag
  const startDragNode = (nodeId, e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;
    const currentPos = nodePositions[nodeId] || { x: 60, y: 140 };

    const mouseCanvasX = (e.clientX - rect.left + scrollLeft) / zoom;
    const mouseCanvasY = (e.clientY - rect.top + scrollTop) / zoom;

    setDragOffset({
      x: mouseCanvasX - currentPos.x,
      y: mouseCanvasY - currentPos.y
    });
    setDraggingNodeId(nodeId);
  };

  // Auto-Align Workflow Layout
  const autoAlignWorkflow = () => {
    if (!selectedJourney?.nodes) return;
    const arranged = {};
    const startX = 60;
    const startY = 140;
    const spacingX = 460;

    selectedJourney.nodes.forEach((node, idx) => {
      // Special offset for condition branches if rejected
      if (node.id === 'node_msg_rejected') {
        arranged[node.id] = { x: startX + 3 * spacingX, y: 440 };
      } else if (node.id === 'node_msg_accepted') {
        arranged[node.id] = { x: startX + 3 * spacingX, y: 60 };
      } else {
        arranged[node.id] = { x: startX + idx * spacingX, y: startY };
      }
    });

    setNodePositions(arranged);
  };

  // Toggle Active/Paused Status
  const handleToggleStatus = async (j) => {
    const newStatus = j.status === 'Active' ? 'Paused' : 'Active';
    try {
      const res = await axios.put(`${apiUrl}/api/super-admin/broadcasting/journeys/${j._id}`, { status: newStatus }, { headers });
      setJourneys(prev => prev.map(item => item._id === j._id ? res.data : item));
      if (selectedJourney?._id === j._id) setSelectedJourney(res.data);
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Save Flow to MongoDB Atlas with Node Coordinates
  const handleSaveJourney = async () => {
    if (!selectedJourney) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const updatedNodes = (selectedJourney.nodes || []).map((node, i, arr) => ({
        ...node,
        nextNodeId: node.nextNodeId || (i < arr.length - 1 ? arr[i + 1].id : null),
        position: nodePositions[node.id] || { x: 60 + i * 460, y: 140 }
      }));

      const res = await axios.put(`${apiUrl}/api/super-admin/broadcasting/journeys/${selectedJourney._id}`, {
        name: selectedJourney.name,
        description: selectedJourney.description,
        triggerType: selectedJourney.triggerType,
        status: selectedJourney.status,
        nodes: updatedNodes
      }, { headers });

      setSelectedJourney(res.data);
      setJourneys(prev => prev.map(j => j._id === res.data._id ? res.data : j));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save journey: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Delete Journey
  const handleDeleteJourney = async () => {
    if (!deleteConfirmModal.journey) return;
    try {
      await axios.delete(`${apiUrl}/api/super-admin/broadcasting/journeys/${deleteConfirmModal.journey._id}`, { headers });
      setDeleteConfirmModal({ open: false, journey: null });
      setSelectedJourney(null);
      await fetchData();
    } catch (err) {
      alert('Error deleting journey: ' + (err.response?.data?.message || err.message));
    }
  };

  // Clone Journey
  const handleCloneJourney = async (j) => {
    try {
      const clonedNodes = (j.nodes || []).map((n, idx) => ({
        ...n,
        id: `node_${Date.now()}_${idx + 1}`,
        nextNodeId: null,
        position: nodePositions[n.id] ? { x: nodePositions[n.id].x + 40, y: nodePositions[n.id].y + 40 } : { x: 60 + idx * 460, y: 140 }
      }));

      for (let i = 0; i < clonedNodes.length - 1; i++) {
        clonedNodes[i].nextNodeId = clonedNodes[i + 1].id;
      }

      const res = await axios.post(`${apiUrl}/api/super-admin/broadcasting/journeys`, {
        name: `${j.name} (Copy)`,
        description: j.description,
        triggerType: j.triggerType,
        nodes: clonedNodes,
        status: 'Draft'
      }, { headers });

      await fetchData(res.data._id);
    } catch (err) {
      alert('Error cloning journey: ' + err.message);
    }
  };

  // 1-CLICK PRESET: FULL REAL-TIME ORDER LIFECYCLE WORKFLOW
  const handleLoadFullOrderLifecyclePreset = () => {
    const lifecycleNodes = [
      {
        id: 'node_order_placed',
        type: 'trigger',
        label: '1. Order Placed Trigger',
        config: {},
        position: { x: 60, y: 160 },
        nextNodeId: 'node_msg_placed'
      },
      {
        id: 'node_msg_placed',
        type: 'action',
        label: 'WhatsApp: Order Placed Card',
        config: {
          channel: 'whatsapp',
          customBody: 'Your order #{{orderId}} has been placed successfully at {{storeName}}! We will notify you once the kitchen accepts it.',
          btn1Text: '📍 Live Status',
          btn2Text: '💬 Support'
        },
        position: { x: 520, y: 160 },
        nextNodeId: 'node_wait_decision'
      },
      {
        id: 'node_wait_decision',
        type: 'wait_event',
        label: '2. Wait for Kitchen Decision',
        config: {
          eventType: 'order_decision',
          timeoutMinutes: 30
        },
        position: { x: 980, y: 160 },
        nextNodeId: 'node_msg_accepted',
        trueNodeId: 'node_msg_accepted',
        falseNodeId: 'node_msg_rejected'
      },
      {
        id: 'node_msg_accepted',
        type: 'action',
        label: 'WhatsApp: Order Accepted',
        config: {
          channel: 'whatsapp',
          customBody: 'Good news! Your order #{{orderId}} has been accepted by {{storeName}} and is being prepared in the kitchen. 🍳',
          btn1Text: '📍 Prep Status',
          btn2Text: '🧾 Digital Bill'
        },
        position: { x: 1460, y: 60 },
        nextNodeId: 'node_wait_ready'
      },
      {
        id: 'node_msg_rejected',
        type: 'action',
        label: 'WhatsApp: Order Rejected & Refund',
        config: {
          channel: 'whatsapp',
          customBody: "We're sorry, {{storeName}} couldn't accept your order #{{orderId}}. Your full refund of ₹{{amount}} has been initiated back to your original payment method.",
          btn1Text: '🔄 Re-order Food',
          btn2Text: '💬 Support'
        },
        position: { x: 1460, y: 440 },
        nextNodeId: null
      },
      {
        id: 'node_wait_ready',
        type: 'wait_event',
        label: '3. Wait for Kitchen Ready',
        config: {
          eventType: 'Order Ready',
          timeoutMinutes: 45
        },
        position: { x: 1940, y: 60 },
        nextNodeId: 'node_msg_ready'
      },
      {
        id: 'node_msg_ready',
        type: 'action',
        label: 'WhatsApp: Ready for Pickup',
        config: {
          channel: 'whatsapp',
          customBody: '🎉 Your order #{{orderId}} is hot & READY for pickup at {{storeName}} counter! Please show your pickup QR code to collect.',
          btn1Text: '📲 Show Pickup QR',
          btn2Text: '📍 Counter Map'
        },
        position: { x: 2420, y: 60 },
        nextNodeId: 'node_wait_complete'
      },
      {
        id: 'node_wait_complete',
        type: 'wait_event',
        label: '4. Wait for QR Handover Scan',
        config: {
          eventType: 'Order Completed',
          timeoutMinutes: 60
        },
        position: { x: 2900, y: 60 },
        nextNodeId: 'node_delay_feedback'
      },
      {
        id: 'node_delay_feedback',
        type: 'delay',
        label: 'Wait 30 Mins (Meal Time)',
        config: {
          delayDays: 0,
          delayHours: 0,
          delayMinutes: 30
        },
        position: { x: 3380, y: 60 },
        nextNodeId: 'node_msg_feedback'
      },
      {
        id: 'node_msg_feedback',
        type: 'action',
        label: '5. WhatsApp Thank You Message',
        config: {
          channel: 'whatsapp',
          customBody: 'Thank you for ordering with UniVerse! ❤️\n\nWe hope you enjoyed your meal from {{storeName}}.\nSee you again soon! 🌟\n\n_UniVerse • Smart Campus Dining_',
          btn1Text: '',
          btn2Text: ''
        },
        position: { x: 3860, y: 60 },
        nextNodeId: null
      }
    ];

    const positions = {};
    lifecycleNodes.forEach(n => {
      positions[n.id] = { ...n.position };
    });

    setSelectedJourney({
      ...selectedJourney,
      name: 'Full End-to-End Order Lifecycle Flow',
      triggerType: 'Order Placed',
      nodes: lifecycleNodes
    });
    setNodePositions(positions);
  };

  // Insert New Node from Spotlight Palette
  const handleInsertNodeFromPalette = (paletteItem) => {
    if (!selectedJourney) return;

    let nodeType = paletteItem.type;
    let defaultLabel = paletteItem.label;
    let config = {};

    if (nodeType === 'delay') {
      defaultLabel = 'Wait 30 Minutes';
      config = { delayDays: 0, delayHours: 0, delayMinutes: 30 };
    } else if (nodeType === 'wait_event') {
      defaultLabel = 'Wait for Kitchen Event';
      config = { eventType: 'Order Ready', timeoutMinutes: 60 };
    } else if (nodeType === 'action_whatsapp') {
      nodeType = 'action';
      defaultLabel = 'WhatsApp Update Card';
      const slot1 = channelData.whatsapp.slots?.[0];
      const tpl = templates.find(t => t.channel === 'whatsapp') || templates[0];
      config = {
        channel: 'whatsapp',
        channelAccountId: slot1?._id || null,
        masterTemplateId: tpl?._id || null,
        customBody: 'Hi {{name}}, your order #{{orderId}} is updated at {{storeName}}.',
        btn1Text: '📍 View Status',
        btn2Text: '💬 Help'
      };
    } else if (nodeType === 'action_email') {
      nodeType = 'action';
      defaultLabel = 'Send Email Campaign';
      const tpl = templates.find(t => t.channel === 'email') || templates[0];
      config = {
        channel: 'email',
        channelAccountId: null,
        masterTemplateId: tpl?._id || null,
        subject: 'Your UniVerse Order Details & Receipt',
        customBody: 'Hi {{name}},\n\nThank you for ordering on UniVerse Campus! We hope you enjoyed your meal from {{storeName}}.',
        ctaText: 'View Order Details →',
        ctaLink: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'
      };
    } else if (nodeType === 'condition') {
      defaultLabel = 'Decision: Vendor Accepted?';
      config = { conditionType: 'order_status_accepted', conditionValue: '' };
    } else if (nodeType === 'webhook') {
      defaultLabel = 'Trigger External Webhook';
      config = { webhookUrl: 'https://api.external.com/event', method: 'POST', payload: '{"event":"journey_step","user":"{{phone}}"}' };
    } else if (nodeType === 'tag') {
      defaultLabel = 'Apply VIP Customer Tag';
      config = { action: 'add_tag', tagName: 'VIP-Spender' };
    }

    const currentNodes = selectedJourney.nodes || [];
    const afterIndex = currentNodes.findIndex(n => n.id === spotlightModal.afterNodeId);

    let targetX = 60;
    let targetY = 140;

    if (afterIndex !== -1) {
      const afterNode = currentNodes[afterIndex];
      const afterPos = nodePositions[afterNode.id] || { x: 60 + afterIndex * 460, y: 140 };
      targetX = afterPos.x + 460;
      targetY = afterPos.y;
    } else if (currentNodes.length > 0) {
      let maxX = 60;
      let maxY = 140;
      currentNodes.forEach((n, i) => {
        const p = nodePositions[n.id] || { x: 60 + i * 460, y: 140 };
        if (p.x >= maxX) {
          maxX = p.x;
          maxY = p.y;
        }
      });
      targetX = maxX + 460;
      targetY = maxY;
    }

    const newNode = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: nodeType,
      label: defaultLabel,
      config,
      position: { x: targetX, y: targetY },
      nextNodeId: null,
      trueNodeId: null,
      falseNodeId: null
    };

    const updatedNodes = [...currentNodes];
    if (afterIndex !== -1) {
      updatedNodes.splice(afterIndex + 1, 0, newNode);
    } else {
      updatedNodes.push(newNode);
    }

    // Connect node sequence
    for (let i = 0; i < updatedNodes.length; i++) {
      if (updatedNodes[i].type !== 'condition') {
        updatedNodes[i].nextNodeId = i < updatedNodes.length - 1 ? updatedNodes[i + 1].id : null;
      }
    }

    setNodePositions(prev => ({
      ...prev,
      [newNode.id]: { x: targetX, y: targetY }
    }));

    setSelectedJourney({ ...selectedJourney, nodes: updatedNodes });
    setSpotlightModal({ open: false, afterNodeId: null });
  };

  // Delete Node from Journey
  const handleDeleteNode = (nodeId, e) => {
    if (e) e.stopPropagation();
    if (!selectedJourney) return;
    const targetNode = selectedJourney.nodes.find(n => n.id === nodeId);
    if (targetNode?.type === 'trigger') {
      alert('The root trigger node cannot be deleted.');
      return;
    }

    const updatedNodes = selectedJourney.nodes.filter(n => n.id !== nodeId);
    for (let i = 0; i < updatedNodes.length; i++) {
      if (updatedNodes[i].type !== 'condition') {
        updatedNodes[i].nextNodeId = i < updatedNodes.length - 1 ? updatedNodes[i + 1].id : null;
      }
    }

    setSelectedJourney({ ...selectedJourney, nodes: updatedNodes });
    if (configuringNodeId === nodeId) setConfiguringNodeId(null);
  };

  // Update Node in state
  const updateConfiguringNode = (field, value) => {
    if (!selectedJourney || !configuringNodeId) return;
    const idx = selectedJourney.nodes.findIndex(n => n.id === configuringNodeId);
    if (idx === -1) return;

    const updatedNodes = [...selectedJourney.nodes];
    const node = { ...updatedNodes[idx] };

    if (field === 'label') {
      node.label = value;
    } else if (field.startsWith('config.')) {
      const configKey = field.split('.')[1];
      node.config = { ...(node.config || {}), [configKey]: value };
    }

    updatedNodes[idx] = node;
    setSelectedJourney({ ...selectedJourney, nodes: updatedNodes });
  };

  // Helper to insert tag into text fields
  const insertTagToField = (fieldName, tagString) => {
    const currentVal = activeConfigNode?.config?.[fieldName] || '';
    updateConfiguringNode(`config.${fieldName}`, currentVal + tagString);
  };

  // DIRECT INLINE SAVE: Create a reusable Master Template without leaving Journey Builder!
  const handleSaveCurrentAsMasterTemplate = async () => {
    if (!activeConfigNode) return;
    const isWhatsapp = activeConfigNode.config?.channel !== 'email';
    const bodyContent = activeConfigNode.config?.customBody || '';

    if (!bodyContent.trim()) {
      alert('Please enter some message text before saving as a Master Template.');
      return;
    }

    const templateName = prompt(
      'Enter a name for this new Master Template:',
      `${activeConfigNode.label || 'Workflow'} Template`
    );
    if (!templateName || !templateName.trim()) return;

    try {
      const payload = {
        name: templateName.trim(),
        channel: isWhatsapp ? 'whatsapp' : 'email',
        category: 'MARKETING',
        body: bodyContent,
        buttons: isWhatsapp ? [
          { text: activeConfigNode.config?.btn1Text || '⭐ 5 Stars - Loved It!', type: 'QUICK_REPLY' },
          { text: activeConfigNode.config?.btn2Text || '💬 Share Feedback', type: 'QUICK_REPLY' }
        ] : [],
        emailSubject: !isWhatsapp ? (activeConfigNode.config?.subject || 'UniVerse Campus Order') : '',
        emailCtaText: !isWhatsapp ? (activeConfigNode.config?.ctaText || 'View in App') : '',
        emailCtaLink: !isWhatsapp ? (activeConfigNode.config?.ctaLink || (typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in')) : ''
      };

      const res = await axios.post(`${apiUrl}/api/super-admin/master-templates`, payload, { headers });
      
      // Update template dropdown and select this new template
      setTemplates(prev => [res.data, ...prev]);
      updateConfiguringNode('config.masterTemplateId', res.data._id);
      
      setQuickSaveFeedback('✅ Saved directly to Master Templates DB!');
      setTimeout(() => setQuickSaveFeedback(''), 3500);
    } catch (err) {
      alert('Failed to save Master Template: ' + (err.response?.data?.message || err.message));
    }
  };

  // INLINE MODAL CREATE: Create new Master Template modal handler
  const handleCreateNewTemplateModalSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplateModal.name.trim() || !newTemplateModal.body.trim()) {
      alert('Please fill in both template name and message body.');
      return;
    }

    setNewTemplateModal(prev => ({ ...prev, saving: true }));
    try {
      const isWhatsapp = newTemplateModal.channel === 'whatsapp';
      const payload = {
        name: newTemplateModal.name.trim(),
        channel: newTemplateModal.channel,
        category: newTemplateModal.category,
        body: newTemplateModal.body,
        buttons: isWhatsapp ? [
          { text: newTemplateModal.btn1Text || '⭐ 5 Stars - Loved It!', type: 'QUICK_REPLY' },
          { text: newTemplateModal.btn2Text || '💬 Share Feedback', type: 'QUICK_REPLY' }
        ] : [],
        emailSubject: !isWhatsapp ? newTemplateModal.emailSubject : '',
        emailCtaText: !isWhatsapp ? newTemplateModal.emailCtaText : '',
        emailCtaLink: !isWhatsapp ? newTemplateModal.emailCtaLink : ''
      };

      const res = await axios.post(`${apiUrl}/api/super-admin/master-templates`, payload, { headers });
      setTemplates(prev => [res.data, ...prev]);

      // If active node is being configured, automatically link it to this new template
      if (activeConfigNode) {
        updateConfiguringNode('config.masterTemplateId', res.data._id);
        updateConfiguringNode('config.customBody', res.data.body);
      }

      setNewTemplateModal({
        open: false,
        channel: 'whatsapp',
        name: '',
        category: 'MARKETING',
        body: '',
        btn1Text: '⭐ 5 Stars - Loved It!',
        btn2Text: '💬 Share Feedback',
        emailSubject: '',
        emailCtaText: 'View in App →',
        emailCtaLink: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in',
        saving: false
      });
      setQuickSaveFeedback('✅ New Master Template created & selected!');
      setTimeout(() => setQuickSaveFeedback(''), 3500);
    } catch (err) {
      alert('Error creating template: ' + (err.response?.data?.message || err.message));
      setNewTemplateModal(prev => ({ ...prev, saving: false }));
    }
  };

  // Test Enrollment Simulator
  const handleTestEnroll = async (e) => {
    e.preventDefault();
    setTestModal(prev => ({ ...prev, enrolling: true, result: '', executionTrace: [] }));
    try {
      const res = await axios.post(`${apiUrl}/api/super-admin/broadcasting/journeys/${testModal.journeyId}/enroll-test`, {
        phone: testModal.phone,
        name: testModal.name,
        email: testModal.email
      }, { headers });

      setTestModal(prev => ({
        ...prev,
        enrolling: false,
        result: `✅ ${res.data.message || 'Trigger event fired successfully!'}`,
        executionTrace: res.data.executionTrace || []
      }));
      fetchData();
    } catch (err) {
      setTestModal(prev => ({
        ...prev,
        enrolling: false,
        result: `❌ Error: ${err.response?.data?.message || err.message}`,
        executionTrace: []
      }));
    }
  };

  const activeConfigNode = selectedJourney?.nodes?.find(n => n.id === configuringNodeId);

  return (
    <div style={{ paddingBottom: '1rem', width: '100%', height: isFullscreen ? '100vh' : 'auto' }}>
      
      {/* Top Strip: Flow Selector & Management (Never Clipped) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--surface-border)',
        padding: '0.6rem 1rem',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'nowrap'
      }}>
        {/* Left: Studio Branding & Flow Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px', borderRight: '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4123, #ea580c)', color: 'white', padding: '6px', borderRadius: '10px', display: 'flex' }}>
              <Workflow size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: '900', color: '#0f172a', lineHeight: 1.1 }}>Journey Studio</div>
              <div style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: '800' }}>AWS RDS Engine</div>
            </div>
          </div>

          {/* Horizontal Flow Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '2px', scrollbarWidth: 'thin' }}>
            {journeys.map(j => {
              const isSelected = selectedJourney?._id === j._id;
              const isActive = j.status === 'Active';

              return (
                <button
                  key={j._id}
                  onClick={() => setSelectedJourney(j)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '10px',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                    background: isSelected ? 'rgba(239, 65, 35, 0.08)' : '#f8fafc',
                    color: isSelected ? 'var(--primary)' : '#334155',
                    fontWeight: isSelected ? '900' : '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isActive ? '#10b981' : '#94a3b8' }} />
                  {j.name}
                  <span style={{ fontSize: '0.65rem', background: isSelected ? 'rgba(239, 65, 35, 0.15)' : '#e2e8f0', color: isSelected ? 'var(--primary)' : '#64748b', padding: '1px 5px', borderRadius: '6px', fontWeight: '800' }}>
                    {j.nodes?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions (1-Click Lifecycle Flow Preset + New Journey) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleLoadFullOrderLifecyclePreset}
            title="Load the 5-Stage Live Order Lifecycle (Placed -> Accepted/Rejected -> Ready -> Completed -> Feedback)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #fed7aa',
              background: '#fff7ed',
              color: '#c2410c',
              fontWeight: '800',
              fontSize: '0.76rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            <Sparkles size={14} color="#ea580c" /> ⚡ Full Lifecycle Flow Preset
          </button>

          <button
            onClick={() => setCreateModal({ open: true, name: '', description: '', triggerType: 'Order Placed' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4123, #ea580c)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)'
            }}
          >
            <Plus size={14} /> New Journey
          </button>
        </div>
      </div>

      {/* Main Spacious Canvas Workspace */}
      {selectedJourney ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          height: isFullscreen ? '100vh' : 'calc(100vh - 150px)',
          minHeight: '660px',
          width: '100%',
          overflow: 'hidden',
          position: isFullscreen ? 'fixed' : 'relative',
          inset: isFullscreen ? 0 : 'auto',
          zIndex: isFullscreen ? 99999 : 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
        }}>
          
          {/* Canvas Header Toolbar: Flow Title, Status & Actions */}
          <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--surface-border)',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            zIndex: 30
          }}>
            {/* Flow Info & Inline Title Editing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={15} color="#ef4123" />
                <input
                  type="text"
                  value={selectedJourney.name}
                  onChange={e => setSelectedJourney({ ...selectedJourney, name: e.target.value })}
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: '900',
                    color: '#0f172a',
                    border: '1px solid transparent',
                    background: 'transparent',
                    borderRadius: '8px',
                    padding: '2px 6px',
                    margin: 0,
                    outline: 'none',
                    minWidth: '220px'
                  }}
                  onFocus={e => e.target.style.border = '1px solid #cbd5e1'}
                  onBlur={e => e.target.style.border = '1px solid transparent'}
                />
              </div>

              <button
                onClick={() => handleToggleStatus(selectedJourney)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '100px',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  background: selectedJourney.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : '#e2e8f0',
                  color: selectedJourney.status === 'Active' ? '#10b981' : '#64748b'
                }}
              >
                {selectedJourney.status === 'Active' ? '🟢 Active' : '⏸️ Paused'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span>Trigger: <strong style={{ color: '#b45309' }}>{selectedJourney.triggerType}</strong></span>
                <span>•</span>
                <span>Enrolled: <strong style={{ color: '#0f172a' }}>{selectedJourney.totalEnrolled || 0}</strong></span>
                <span>•</span>
                <span>Done: <strong style={{ color: '#10b981' }}>{selectedJourney.totalCompleted || 0}</strong></span>
              </div>
            </div>

            {/* Action Buttons Toolbar & Zoom Controls */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Prominent Zoom Controller Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '2px',
                gap: '2px'
              }}>
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out (Finger Pinch or Ctrl+Scroll Down)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  <ZoomOut size={14} />
                </button>

                <button
                  onClick={handleZoomReset}
                  title="Reset Zoom to 100%"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0 6px',
                    fontSize: '0.76rem',
                    fontWeight: '900',
                    color: '#0f172a',
                    cursor: 'pointer',
                    minWidth: '44px',
                    textAlign: 'center'
                  }}
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  onClick={handleZoomIn}
                  title="Zoom In (Finger Expand or Ctrl+Scroll Up)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              <button
                onClick={() => setSpotlightModal({ open: true, afterNodeId: null })}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.45rem 0.8rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '9px', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <Plus size={13} /> Add Step
              </button>

              <button
                onClick={autoAlignWorkflow}
                title="Auto-align cards into smooth horizontal flow"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.45rem 0.8rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '9px', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <LayoutGrid size={13} color="#0284c7" /> Auto-Align
              </button>

              <button
                onClick={() => setTestModal({ open: true, journeyId: selectedJourney._id, phone: '', name: '', email: '', enrolling: false, result: '' })}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.45rem 0.8rem', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '9px', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <Play size={13} color="#ef4123" /> Test Run
              </button>

              <button
                onClick={() => handleCloneJourney(selectedJourney)}
                title="Clone this journey"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.45rem 0.65rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '9px', fontWeight: '700', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <Copy size={13} />
              </button>

              <button
                onClick={() => setDeleteConfirmModal({ open: true, journey: selectedJourney })}
                title="Delete journey"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.45rem 0.65rem', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '9px', fontWeight: '700', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <Trash2 size={13} />
              </button>

              <button
                onClick={handleSaveJourney}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 1.1rem',
                  background: saveSuccess ? '#10b981' : 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: '9px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(239, 65, 35, 0.25)', transition: 'all 0.2s', flexShrink: 0
                }}
              >
                <Save size={13} /> {saving ? 'Saving...' : (saveSuccess ? 'Saved to AWS RDS!' : 'Save Flow')}
              </button>
            </div>
          </div>

          {/* Interactive Zoomable 2D Viewport */}
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              position: 'relative',
              background: '#f8fafc',
              backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
              overflow: 'auto',
              userSelect: 'none',
              padding: '2rem'
            }}
          >
            
            {/* Spatial Container with CSS Zoom Transform */}
            <div style={{
              position: 'relative',
              width: `${Math.max(4400, (selectedJourney.nodes?.length || 1) * 500 + 800)}px`,
              minHeight: '1400px',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              transition: draggingNodeId ? 'none' : 'transform 0.15s ease'
            }}>
              
              {/* Dynamic SVG Connecting Bezier Wires */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                <defs>
                  <linearGradient id="wireGradFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4123" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <marker id="arrowHeadFlow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4123" />
                  </marker>
                  <marker id="arrowHeadGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#16a34a" />
                  </marker>
                  <marker id="arrowHeadRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
                  </marker>
                </defs>

                {(selectedJourney.nodes || []).map((node, i, arr) => {
                  const posA = nodePositions[node.id] || { x: 60 + i * 460, y: 140 };
                  const cardWidth = 360;
                  const cardHeightA = node.type === 'action' ? 240 : (node.type === 'condition' ? 180 : 130);

                  // 1. Condition Fork Branch Wires (Accepted / True in Green, Rejected / False in Red)
                  if (node.type === 'condition') {
                    const trueTarget = arr.find(n => n.id === node.trueNodeId || n.id === node.nextNodeId || n.id === 'node_msg_accepted');
                    const falseTarget = arr.find(n => n.id === node.falseNodeId || n.id === 'node_msg_rejected');

                    const startX = posA.x + cardWidth;
                    const startY = posA.y + (cardHeightA / 2);

                    const elements = [];

                    if (trueTarget) {
                      const posTrue = nodePositions[trueTarget.id] || { x: posA.x + 480, y: posA.y - 80 };
                      const cardHeightTrue = trueTarget.type === 'action' ? 240 : 130;
                      const endX = posTrue.x;
                      const endY = posTrue.y + (cardHeightTrue / 2);
                      const deltaX = Math.max(40, endX - startX);
                      const pathTrue = `M ${startX} ${startY - 12} C ${startX + deltaX * 0.45} ${startY - 12}, ${endX - deltaX * 0.45} ${endY}, ${endX} ${endY}`;
                      elements.push(
                        <g key={`wire_true_${node.id}`}>
                          <path d={pathTrue} stroke="#bbf7d0" strokeWidth="4" fill="none" />
                          <path d={pathTrue} stroke="#16a34a" strokeWidth="2.5" fill="none" markerEnd="url(#arrowHeadGreen)" />
                          <text x={startX + 30} y={startY - 20} fill="#16a34a" fontSize="11" fontWeight="800">✓ ACCEPTED</text>
                        </g>
                      );
                    }

                    if (falseTarget) {
                      const posFalse = nodePositions[falseTarget.id] || { x: posA.x + 480, y: posA.y + 240 };
                      const cardHeightFalse = falseTarget.type === 'action' ? 240 : 130;
                      const endX = posFalse.x;
                      const endY = posFalse.y + (cardHeightFalse / 2);
                      const deltaX = Math.max(40, endX - startX);
                      const pathFalse = `M ${startX} ${startY + 12} C ${startX + deltaX * 0.45} ${startY + 12}, ${endX - deltaX * 0.45} ${endY}, ${endX} ${endY}`;
                      elements.push(
                        <g key={`wire_false_${node.id}`}>
                          <path d={pathFalse} stroke="#fecaca" strokeWidth="4" fill="none" />
                          <path d={pathFalse} stroke="#ef4444" strokeWidth="2.5" fill="none" markerEnd="url(#arrowHeadRed)" />
                          <text x={startX + 30} y={startY + 30} fill="#ef4444" fontSize="11" fontWeight="800">✗ REJECTED</text>
                        </g>
                      );
                    }

                    return <React.Fragment key={`cond_group_${node.id}`}>{elements}</React.Fragment>;
                  }

                  // 2. Linear Sequential Wire
                  if (node.id === 'node_msg_rejected') {
                    return null; // Terminal branch
                  }

                  if (!node.nextNodeId && i >= arr.length - 1) return null;
                  const nextNode = node.nextNodeId ? arr.find(n => n.id === node.nextNodeId) : arr[i + 1];
                  if (!nextNode) return null;

                  const posB = nodePositions[nextNode.id] || { x: 60 + (i + 1) * 460, y: 140 };
                  const cardHeightB = nextNode.type === 'action' ? 240 : (nextNode.type === 'condition' ? 180 : 130);

                  const startX = posA.x + cardWidth;
                  const startY = posA.y + (cardHeightA / 2);
                  const endX = posB.x;
                  const endY = posB.y + (cardHeightB / 2);
                  const deltaX = Math.max(40, endX - startX);

                  const pathData = `M ${startX} ${startY} C ${startX + deltaX * 0.45} ${startY}, ${endX - deltaX * 0.45} ${endY}, ${endX} ${endY}`;

                  return (
                    <g key={`wire_${node.id}_${nextNode.id}`}>
                      <path d={pathData} stroke="#e2e8f0" strokeWidth="4" fill="none" />
                      <path d={pathData} stroke="url(#wireGradFlow)" strokeWidth="2.5" fill="none" markerEnd="url(#arrowHeadFlow)" />
                    </g>
                  );
                })}

                {/* Wire to End Completion Badge */}
                {selectedJourney.nodes && selectedJourney.nodes.length > 0 && (() => {
                  const lastIdx = selectedJourney.nodes.length - 1;
                  const lastNode = selectedJourney.nodes[lastIdx];
                  const posLast = nodePositions[lastNode.id] || { x: 60 + lastIdx * 460, y: 140 };
                  const cardHeight = lastNode.type === 'action' ? 240 : (lastNode.type === 'condition' ? 180 : 130);
                  const startX = posLast.x + 360;
                  const startY = posLast.y + (cardHeight / 2);
                  const endX = startX + 70;
                  const endY = startY;

                  return (
                    <g key="wire_end_badge">
                      <path d={`M ${startX} ${startY} L ${endX} ${endY}`} stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
                    </g>
                  );
                })()}
              </svg>

              {/* Freeform Draggable Node Cards */}
              {(selectedJourney.nodes || []).map((node, index) => {
                const pos = nodePositions[node.id] || { x: 60 + index * 460, y: 140 };
                const tpl = templates.find(t => t._id === node.config?.masterTemplateId);
                const isFirst = index === 0;

                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: '360px',
                      background: '#ffffff',
                      borderRadius: '18px',
                      border: '1px solid #e2e8f0',
                      boxShadow: draggingNodeId === node.id ? '0 20px 50px rgba(239, 65, 35, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.05)',
                      overflow: 'hidden',
                      zIndex: draggingNodeId === node.id ? 30 : 10,
                      transition: draggingNodeId === node.id ? 'none' : 'box-shadow 0.15s ease'
                    }}
                  >
                    {/* Left Input Port Dot */}
                    {!isFirst && (
                      <div style={{
                        position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)',
                        width: '14px', height: '14px', borderRadius: '50%', background: '#ffffff',
                        border: '3px solid #0f172a', zIndex: 15
                      }} />
                    )}

                    {/* Card Header Handle */}
                    <div
                      onMouseDown={(e) => startDragNode(node.id, e)}
                      style={{
                        padding: '0.7rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                        background: node.type === 'trigger' 
                          ? 'rgba(245, 158, 11, 0.08)' 
                          : (node.type === 'condition' 
                              ? 'rgba(124, 58, 237, 0.08)' 
                              : (node.type === 'wait_event'
                                  ? 'rgba(217, 119, 6, 0.08)'
                                  : (node.type === 'action' && node.config?.channel === 'email' 
                                      ? 'rgba(234, 88, 12, 0.08)' 
                                      : (node.type === 'action' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(2, 132, 199, 0.08)'))))
                      }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '900',
                        color: node.type === 'trigger' 
                          ? '#b45309' 
                          : (node.type === 'condition' 
                              ? '#7c3aed' 
                              : (node.type === 'wait_event' 
                                  ? '#d97706'
                                  : (node.type === 'action' && node.config?.channel === 'email' ? '#c2410c' : (node.type === 'action' ? '#15803d' : '#0369a1')))),
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        <Move size={12} style={{ opacity: 0.6 }} />
                        {node.type === 'trigger' && <Zap size={13} />}
                        {node.type === 'wait_event' && <Clock size={13} />}
                        {node.type === 'delay' && <Clock size={13} />}
                        {node.type === 'condition' && <Split size={13} />}
                        {node.type === 'action' && node.config?.channel === 'email' && <Mail size={13} />}
                        {node.type === 'action' && node.config?.channel !== 'email' && <Smartphone size={13} />}
                        {node.type === 'webhook' && <Globe size={13} />}
                        {node.type === 'tag' && <Tag size={13} />}
                        Step #{index + 1} • {node.type === 'wait_event' ? 'LIVE EVENT' : node.type}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => setConfiguringNodeId(node.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff',
                            border: '1px solid #cbd5e1', borderRadius: '7px', padding: '2px 7px',
                            fontSize: '0.72rem', fontWeight: '800', color: '#0f172a', cursor: 'pointer'
                          }}
                        >
                          <Settings size={11} /> Configure
                        </button>

                        {!isFirst && (
                          <button
                            onClick={(e) => handleDeleteNode(node.id, e)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex' }}
                            title="Delete step"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.98rem', fontWeight: '900', color: '#0f172a' }}>
                        {node.label}
                      </h4>

                      {/* TRIGGER PREVIEW */}
                      {node.type === 'trigger' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                          <span>Trigger:</span>
                          <span style={{ fontWeight: '800', color: '#b45309', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                            {selectedJourney.triggerType}
                          </span>
                        </div>
                      )}

                      {/* WAIT EVENT PREVIEW */}
                      {node.type === 'wait_event' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 119, 6, 0.08)', color: '#d97706', padding: '4px 10px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800' }}>
                          <Clock size={13} />
                          Wait Event: {node.config?.eventType || 'Order Ready'} (Timeout: {node.config?.timeoutMinutes || 60}m)
                        </div>
                      )}

                      {/* DELAY PREVIEW */}
                      {node.type === 'delay' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(2, 132, 199, 0.08)', color: '#0369a1', padding: '4px 10px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800' }}>
                          <Clock size={13} />
                          Wait: {node.config?.delayDays ? `${node.config.delayDays}d ` : ''}{node.config?.delayHours || 0}h {node.config?.delayMinutes || 0}m
                        </div>
                      )}

                      {/* WHATSAPP ACTION PREVIEW */}
                      {node.type === 'action' && node.config?.channel === 'whatsapp' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                            <span style={{ color: '#16a34a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Smartphone size={12} /> WhatsApp Card
                            </span>
                            {tpl && (
                              <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '5px', fontWeight: '800', fontSize: '0.7rem' }}>
                                📄 {tpl.name}
                              </span>
                            )}
                          </div>

                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.78rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.4, maxHeight: '70px', overflowY: 'auto' }}>
                              {node.config?.customBody || tpl?.body || '⚠️ Click Configure to customize WhatsApp message and interactive buttons.'}
                            </div>

                            {(node.config?.btn1Text || node.config?.btn2Text) ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #bbf7d0' }}>
                                {node.config?.btn1Text && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ffffff', border: '1px solid #86efac', color: '#16a34a', padding: '2px 7px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: '800' }}>
                                    <Star size={10} fill="#16a34a" /> {node.config?.btn1Text}
                                  </span>
                                )}
                                {node.config?.btn2Text && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ffffff', border: '1px solid #86efac', color: '#16a34a', padding: '2px 7px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: '800' }}>
                                    <MessageSquare size={10} /> {node.config?.btn2Text}
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* EMAIL ACTION PREVIEW */}
                      {node.type === 'action' && node.config?.channel === 'email' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                            <span style={{ color: '#ea580c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} /> HTML Email Campaign
                            </span>
                            {tpl && (
                              <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '5px', fontWeight: '800', fontSize: '0.7rem' }}>
                                📄 {tpl.name}
                              </span>
                            )}
                          </div>

                          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#c2410c', marginBottom: '3px', borderBottom: '1px dashed #fed7aa', paddingBottom: '3px' }}>
                              Subject: {node.config?.subject || tpl?.subject || 'UniVerse Campus Order Details'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.4, maxHeight: '60px', overflowY: 'auto' }}>
                              {node.config?.customBody || tpl?.body || 'Rich HTML email content with student order details.'}
                            </div>
                            <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', background: '#ea580c', color: '#ffffff', padding: '3px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: '800' }}>
                                {node.config?.ctaText || 'View Order in App →'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CONDITION PREVIEW */}
                      {node.type === 'condition' && (
                        <div style={{ marginTop: '0.3rem' }}>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.4rem' }}>
                            Decision: <strong style={{ color: '#7c3aed' }}>{node.config?.conditionLabel || 'Vendor Decision (Accepted / Rejected)'}</strong>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div style={{ background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.25)', borderRadius: '7px', padding: '0.35rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <Check size={11} /> ACCEPTED
                              </div>
                            </div>

                            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '7px', padding: '0.35rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <XCircle size={11} /> REJECTED
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* WEBHOOK PREVIEW */}
                      {node.type === 'webhook' && (
                        <div style={{ background: 'rgba(8, 145, 178, 0.08)', border: '1px solid rgba(8, 145, 178, 0.25)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.76rem', color: '#0e7490' }}>
                          <div><strong>Method:</strong> {node.config?.method || 'POST'}</div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            <strong>URL:</strong> {node.config?.webhookUrl || 'https://api.external.com'}
                          </div>
                        </div>
                      )}

                      {/* TAG PREVIEW */}
                      {node.type === 'tag' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(219, 39, 119, 0.1)', color: '#db2777', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800' }}>
                          <Tag size={12} /> {node.config?.action === 'remove_tag' ? 'Remove Tag' : 'Add Tag'}: {node.config?.tagName || 'VIP'}
                        </div>
                      )}
                    </div>

                    {/* Right Output Port Dot & "+" Step Inserter Button */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpotlightModal({ open: true, afterNodeId: node.id });
                      }}
                      style={{
                        position: 'absolute', right: '-11px', top: '50%', transform: 'translateY(-50%)',
                        width: '22px', height: '22px', borderRadius: '50%', background: '#ef4123',
                        border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 20, boxShadow: '0 4px 10px rgba(239, 65, 35, 0.4)',
                        transition: 'transform 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                      title="Add next step"
                    >
                      <Plus size={13} color="#ffffff" />
                    </div>
                  </div>
                );
              })}

              {/* End of Journey Badge */}
              {selectedJourney.nodes && selectedJourney.nodes.length > 0 && (() => {
                const lastIdx = selectedJourney.nodes.length - 1;
                const lastNode = selectedJourney.nodes[lastIdx];
                const posLast = nodePositions[lastNode.id] || { x: 60 + lastIdx * 460, y: 140 };
                const cardHeight = lastNode.type === 'action' ? 240 : (lastNode.type === 'condition' ? 180 : 130);
                const endX = posLast.x + 360 + 75;
                const endY = posLast.y + (cardHeight / 2) - 16;

                return (
                  <div style={{
                    position: 'absolute',
                    left: `${endX}px`,
                    top: `${endY}px`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                  }}>
                    <CheckCircle size={14} /> Journey Completed
                  </div>
                );
              })()}

            </div>

          </div>

          {/* Truly Fixed Floating Interactive Zoom & Pan Controls HUD Dock */}
          <div style={{
            position: 'absolute',
            bottom: '1.25rem',
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 60
          }}>
            <button
              onClick={handleZoomOut}
              title="Zoom Out (Ctrl + Scroll Down or Pinch In)"
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '900', color: '#334155' }}
            >
              -
            </button>

            <button
              onClick={handleZoomReset}
              title="Reset Zoom to 100%"
              style={{ background: 'transparent', border: 'none', padding: '0 4px', fontSize: '0.78rem', fontWeight: '900', color: '#0f172a', cursor: 'pointer', minWidth: '44px', textAlign: 'center' }}
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              title="Zoom In (Ctrl + Scroll Up or Pinch Out)"
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '900', color: '#334155' }}
            >
              +
            </button>

            <div style={{ width: '1px', height: '18px', background: '#cbd5e1', margin: '0 2px' }} />

            <button
              onClick={autoAlignWorkflow}
              title="Auto-align cards into horizontal flow"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: '800', color: '#0284c7', cursor: 'pointer' }}
            >
              <LayoutGrid size={13} /> Align
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle Fullscreen"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      ) : null}

      {/* COMPREHENSIVE STEP CONFIGURATION INSPECTOR MODAL */}
      {activeConfigNode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '640px', width: '100%', padding: '1.75rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setConfiguringNodeId(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.4rem' }}>
              <Settings size={12} /> Step Inspector & Customizer
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '0 0 0.3rem', color: '#0f172a' }}>
              Configure {activeConfigNode.type.toUpperCase()} Step
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.15rem' }}>
              Fine-tune messaging, create master templates inline, and configure event triggers.
            </p>

            {quickSaveFeedback && (
              <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.9rem' }}>
                {quickSaveFeedback}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '5px' }}>Step Headline / Name</label>
                <input 
                  type="text" 
                  value={activeConfigNode.label}
                  onChange={e => updateConfiguringNode('label', e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* TRIGGER CONFIGURATION */}
              {activeConfigNode.type === 'trigger' && (
                <div style={{ background: '#fffbeb', padding: '1.15rem', borderRadius: '14px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#92400e' }}>
                    ⚡ Platform Event Trigger
                  </h4>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#78350f', display: 'block', marginBottom: '4px' }}>Trigger Event Type</label>
                    <select
                      value={selectedJourney.triggerType}
                      onChange={e => setSelectedJourney({ ...selectedJourney, triggerType: e.target.value })}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      {TRIGGER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '4px' }}>
                      {TRIGGER_OPTIONS.find(o => o.value === selectedJourney.triggerType)?.desc}
                    </p>
                  </div>
                </div>
              )}

              {/* LIVE EVENT WAITER CONFIGURATION */}
              {activeConfigNode.type === 'wait_event' && (
                <div style={{ background: '#fffbeb', padding: '1.15rem', borderRadius: '14px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#b45309' }}>
                    ⏳ Wait for Live Kitchen / Order Event
                  </h4>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>Wait for Live Event</label>
                    <select
                      value={activeConfigNode.config?.eventType || 'Order Ready'}
                      onChange={e => updateConfiguringNode('config.eventType', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="Order Accepted">Vendor Confirms & Accepts Order (Cooking)</option>
                      <option value="Order Ready">Kitchen Marks Order Ready for Pickup</option>
                      <option value="Order Completed">Student Scans Handover QR Code (Completed)</option>
                      <option value="Order Cancelled">Order Cancelled or Rejected by Kitchen</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>Timeout Fallback (Minutes)</label>
                    <input 
                      type="number" min="1" max="1440"
                      value={activeConfigNode.config?.timeoutMinutes || 60}
                      onChange={e => updateConfiguringNode('config.timeoutMinutes', parseInt(e.target.value) || 60)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* DELAY CONTROLS */}
              {activeConfigNode.type === 'delay' && (
                <div style={{ background: '#f0f9ff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#0369a1' }}>
                    ⏳ Timer & Wait Duration
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', display: 'block', marginBottom: '3px' }}>Days</label>
                      <input 
                        type="number" min="0"
                        value={activeConfigNode.config?.delayDays || 0}
                        onChange={e => updateConfiguringNode('config.delayDays', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', display: 'block', marginBottom: '3px' }}>Hours</label>
                      <input 
                        type="number" min="0" max="23"
                        value={activeConfigNode.config?.delayHours || 0}
                        onChange={e => updateConfiguringNode('config.delayHours', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', display: 'block', marginBottom: '3px' }}>Minutes</label>
                      <input 
                        type="number" min="0" max="59"
                        value={activeConfigNode.config?.delayMinutes || 0}
                        onChange={e => updateConfiguringNode('config.delayMinutes', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WHATSAPP ACTION CONTROLS */}
              {activeConfigNode.type === 'action' && activeConfigNode.config?.channel === 'whatsapp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.15rem', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#166534' }}>
                      📱 WhatsApp Message & Buttons
                    </h4>

                    {/* Inline Master Template Creator Button */}
                    <button
                      type="button"
                      onClick={() => setNewTemplateModal({
                        open: true,
                        channel: 'whatsapp',
                        name: '',
                        category: 'MARKETING',
                        body: activeConfigNode.config?.customBody || '',
                        btn1Text: activeConfigNode.config?.btn1Text || '⭐ 5 Stars - Loved It!',
                        btn2Text: activeConfigNode.config?.btn2Text || '💬 Share Feedback',
                        emailSubject: '',
                        emailCtaText: 'View in App →',
                        emailCtaLink: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in',
                        saving: false
                      })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ffffff',
                        color: '#16a34a',
                        border: '1.5px solid #16a34a',
                        borderRadius: '7px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} /> Create New Template
                    </button>
                  </div>

                  {/* ⚡ WHATSAPP SENDING SLOT SELECTOR */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '4px' }}>
                      ⚡ Select Sending WhatsApp Device / Slot
                    </label>
                    <select
                      value={activeConfigNode.config?.channelAccountId || ''}
                      onChange={e => updateConfiguringNode('config.channelAccountId', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box', fontWeight: '700', color: '#0f172a' }}
                    >
                      <option value="">-- Auto-select active connected slot (Default) --</option>
                      {(channelData.whatsapp?.slots || []).map(s => (
                        <option key={s.slotIndex} value={s._id || s.slotIndex}>
                          Slot #{s.slotIndex}: {s.nickname || s.phoneNumber || `WhatsApp Slot ${s.slotIndex}`} {s.status === 'connected' ? '🟢 (Connected)' : '⚪ (Empty)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '4px' }}>
                      Master Template from Database (Optional base)
                    </label>
                    <select
                      value={activeConfigNode.config?.masterTemplateId || ''}
                      onChange={e => {
                        const selId = e.target.value;
                        updateConfiguringNode('config.masterTemplateId', selId);
                        const selTpl = templates.find(t => t._id === selId);
                        if (selTpl) {
                          updateConfiguringNode('config.customBody', selTpl.body || '');
                          if (selTpl.buttons?.[0]?.text) updateConfiguringNode('config.btn1Text', selTpl.buttons[0].text);
                          if (selTpl.buttons?.[1]?.text) updateConfiguringNode('config.btn2Text', selTpl.buttons[1].text);
                        }
                      }}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Choose Template or Write Custom Below --</option>
                      {templates.filter(t => t.channel === 'whatsapp').map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#166534' }}>
                        Message Content (Live Editable)
                      </label>
                      
                      {/* Save Current as Master Template Button */}
                      <button
                        type="button"
                        onClick={handleSaveCurrentAsMasterTemplate}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        <Save size={11} /> Save as Master Template
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={activeConfigNode.config?.customBody !== undefined ? activeConfigNode.config.customBody : (templates.find(t => t._id === activeConfigNode.config?.masterTemplateId)?.body || '')}
                      onChange={e => updateConfiguringNode('config.customBody', e.target.value)}
                      placeholder="Hi {{name}}, your order from {{storeName}} is ready!..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Dynamic Tags Pill Insertion Bar */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Quick Insert Tags:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {DYNAMIC_TAGS.map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => insertTagToField('customBody', t.tag)}
                          title={t.desc}
                          style={{ fontSize: '0.68rem', background: '#ffffff', color: '#166534', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontFamily: 'monospace', fontWeight: '800', cursor: 'pointer' }}
                        >
                          + {t.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '2px' }}>Button #1 Label</label>
                      <input
                        type="text"
                        value={activeConfigNode.config?.btn1Text || '⭐ 5 Stars - Loved It!'}
                        onChange={e => updateConfiguringNode('config.btn1Text', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #bbf7d0', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '2px' }}>Button #2 Label</label>
                      <input
                        type="text"
                        value={activeConfigNode.config?.btn2Text || '💬 Feedback'}
                        onChange={e => updateConfiguringNode('config.btn2Text', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #bbf7d0', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* EMAIL ACTION CONTROLS */}
              {activeConfigNode.type === 'action' && activeConfigNode.config?.channel === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff7ed', border: '1px solid #fed7aa', padding: '1.15rem', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#9a3412' }}>
                      ✉️ HTML Email Campaign Customizer
                    </h4>

                    {/* Inline Master Template Creator Button */}
                    <button
                      type="button"
                      onClick={() => setNewTemplateModal({
                        open: true,
                        channel: 'email',
                        name: '',
                        category: 'MARKETING',
                        body: activeConfigNode.config?.customBody || '',
                        btn1Text: '',
                        btn2Text: '',
                        emailSubject: activeConfigNode.config?.subject || '',
                        emailCtaText: activeConfigNode.config?.ctaText || 'View in App →',
                        emailCtaLink: activeConfigNode.config?.ctaLink || (typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'),
                        saving: false
                      })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ffffff',
                        color: '#ea580c',
                        border: '1.5px solid #ea580c',
                        borderRadius: '7px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} /> Create New Template
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#9a3412', display: 'block', marginBottom: '4px' }}>Email Subject Line</label>
                    <input
                      type="text"
                      value={activeConfigNode.config?.subject || 'Your UniVerse Order Details & Receipt'}
                      onChange={e => updateConfiguringNode('config.subject', e.target.value)}
                      placeholder="e.g. {{name}}, your meal from {{storeName}} is ready!"
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#9a3412', display: 'block', marginBottom: '4px' }}>Master Email Template (Optional Base)</label>
                    <select
                      value={activeConfigNode.config?.masterTemplateId || ''}
                      onChange={e => updateConfiguringNode('config.masterTemplateId', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Choose Email Template --</option>
                      {templates.filter(t => t.channel === 'email').map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#9a3412' }}>Email Body Message</label>
                      <button
                        type="button"
                        onClick={handleSaveCurrentAsMasterTemplate}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        <Save size={11} /> Save as Master Template
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={activeConfigNode.config?.customBody || ''}
                      onChange={e => updateConfiguringNode('config.customBody', e.target.value)}
                      placeholder="Hi {{name}},\n\nThank you for ordering on UniVerse Campus..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9a3412', display: 'block', marginBottom: '2px' }}>CTA Button Text</label>
                      <input
                        type="text"
                        value={activeConfigNode.config?.ctaText || 'View Order in App →'}
                        onChange={e => updateConfiguringNode('config.ctaText', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #fed7aa', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9a3412', display: 'block', marginBottom: '2px' }}>CTA Target Link URL</label>
                      <input
                        type="text"
                        value={activeConfigNode.config?.ctaLink || (typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in')}
                        onChange={e => updateConfiguringNode('config.ctaLink', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #fed7aa', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONDITION CONTROLS */}
              {activeConfigNode.type === 'condition' && (
                <div style={{ background: '#f5f3ff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #ddd6fe', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#5b21b6' }}>
                    🔀 Decision Filter & Branching Rules
                  </h4>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#5b21b6', display: 'block', marginBottom: '4px' }}>Condition Rule</label>
                    <select
                      value={activeConfigNode.config?.conditionType || 'order_status_accepted'}
                      onChange={e => updateConfiguringNode('config.conditionType', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="order_status_accepted">Vendor Decision: Accepted vs Rejected</option>
                      <option value="order_amount_gt">Order Amount Greater Than (₹)</option>
                      <option value="has_ordered_in_last_24h">Has Ordered in last 24 Hours</option>
                      <option value="has_completed_orders">Has at least 1 Completed Order</option>
                      <option value="is_active">User is Active Student</option>
                    </select>
                  </div>

                  {activeConfigNode.config?.conditionType === 'order_amount_gt' && (
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#5b21b6', display: 'block', marginBottom: '4px' }}>Amount Threshold (₹)</label>
                      <input 
                        type="number"
                        value={activeConfigNode.config?.conditionValue || 200}
                        onChange={e => updateConfiguringNode('config.conditionValue', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* WEBHOOK CONTROLS */}
              {activeConfigNode.type === 'webhook' && (
                <div style={{ background: 'rgba(8, 145, 178, 0.08)', padding: '1.15rem', borderRadius: '14px', border: '1px solid rgba(8, 145, 178, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#0e7490' }}>
                    🌐 Outgoing Webhook Configuration
                  </h4>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#0e7490', display: 'block', marginBottom: '4px' }}>Target Webhook URL</label>
                    <input 
                      type="url"
                      value={activeConfigNode.config?.webhookUrl || 'https://api.external.com/event'}
                      onChange={e => updateConfiguringNode('config.webhookUrl', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #a5f3fc', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0e7490', display: 'block', marginBottom: '2px' }}>Method</label>
                      <select
                        value={activeConfigNode.config?.method || 'POST'}
                        onChange={e => updateConfiguringNode('config.method', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #a5f3fc', fontSize: '0.78rem', boxSizing: 'border-box', background: '#fff' }}
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0e7490', display: 'block', marginBottom: '2px' }}>Payload Template (JSON)</label>
                      <input 
                        type="text"
                        value={activeConfigNode.config?.payload || '{"phone":"{{phone}}"}'}
                        onChange={e => updateConfiguringNode('config.payload', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #a5f3fc', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAG CONTROLS */}
              {activeConfigNode.type === 'tag' && (
                <div style={{ background: 'rgba(219, 39, 119, 0.08)', padding: '1.15rem', borderRadius: '14px', border: '1px solid rgba(219, 39, 119, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#9d174d' }}>
                    🏷️ Customer Profile Tagging
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9d174d', display: 'block', marginBottom: '2px' }}>Action</label>
                      <select
                        value={activeConfigNode.config?.action || 'add_tag'}
                        onChange={e => updateConfiguringNode('config.action', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #fbcfe8', fontSize: '0.78rem', boxSizing: 'border-box', background: '#fff' }}
                      >
                        <option value="add_tag">Add Tag</option>
                        <option value="remove_tag">Remove Tag</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9d174d', display: 'block', marginBottom: '2px' }}>Tag Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. VIP, Biryani-Lover"
                        value={activeConfigNode.config?.tagName || 'VIP'}
                        onChange={e => updateConfiguringNode('config.tagName', e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #fbcfe8', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setConfiguringNodeId(null)}
                style={{
                  marginTop: '0.3rem', padding: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 65, 35, 0.25)'
                }}
              >
                Apply Changes to Flow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE MASTER TEMPLATE CREATOR MODAL */}
      {newTemplateModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000000,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', maxWidth: '520px', width: '100%', padding: '1.6rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setNewTemplateModal(prev => ({ ...prev, open: false }))}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '3px 9px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', marginBottom: '0.4rem' }}>
              <FilePlus size={12} /> Master Template
            </div>

            <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>
              Create New Master Template
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1.1rem' }}>
              Directly saves to AWS RDS and auto-assigns to this step without leaving Journey Studio.
            </p>

            <form onSubmit={handleCreateNewTemplateModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '3px' }}>Template Name *</label>
                <input 
                  type="text" required placeholder="e.g. Order Placed WhatsApp Card"
                  value={newTemplateModal.name} onChange={e => setNewTemplateModal({ ...newTemplateModal, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '3px' }}>Channel</label>
                  <select
                    value={newTemplateModal.channel} onChange={e => setNewTemplateModal({ ...newTemplateModal, channel: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '3px' }}>Category</label>
                  <select
                    value={newTemplateModal.category} onChange={e => setNewTemplateModal({ ...newTemplateModal, category: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <option value="MARKETING">Marketing & Engagement</option>
                    <option value="UTILITY">Utility & Receipts</option>
                  </select>
                </div>
              </div>

              {newTemplateModal.channel === 'email' && (
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '3px' }}>Email Subject Line</label>
                  <input 
                    type="text" placeholder="e.g. {{name}}, your meal from {{storeName}} is ready!"
                    value={newTemplateModal.emailSubject} onChange={e => setNewTemplateModal({ ...newTemplateModal, emailSubject: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '3px' }}>Message Body *</label>
                <textarea 
                  rows={4} required placeholder="Hi {{name}}, your order #{{orderId}} is placed!..."
                  value={newTemplateModal.body} onChange={e => setNewTemplateModal({ ...newTemplateModal, body: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {newTemplateModal.channel === 'whatsapp' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '2px' }}>Button 1 Label</label>
                    <input 
                      type="text" value={newTemplateModal.btn1Text} onChange={e => setNewTemplateModal({ ...newTemplateModal, btn1Text: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '2px' }}>Button 2 Label</label>
                    <input 
                      type="text" value={newTemplateModal.btn2Text} onChange={e => setNewTemplateModal({ ...newTemplateModal, btn2Text: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={newTemplateModal.saving}
                style={{ marginTop: '0.3rem', padding: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer', opacity: newTemplateModal.saving ? 0.7 : 1 }}
              >
                {newTemplateModal.saving ? 'Saving to Database...' : 'Save & Select Template'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SPOTLIGHT QUICK NODE INSERTION PALETTE */}
      {spotlightModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', maxWidth: '480px', width: '100%', padding: '1.6rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
                Insert Automation Step
              </h3>
              <button
                onClick={() => setSpotlightModal({ open: false, afterNodeId: null })}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {NODE_PALETTE.map(item => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.type}
                    onClick={() => handleInsertNodeFromPalette(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 1rem',
                      background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComponent size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>{item.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE JOURNEY MODAL */}
      {createModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', maxWidth: '460px', width: '100%', padding: '1.6rem', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <button
              onClick={() => setCreateModal({ ...createModal, open: false })}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 0.3rem', color: '#0f172a' }}>
              Create Lifecycle Journey
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.15rem' }}>
              Select a trigger event to initialize your visual automation flow.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!createModal.name.trim()) return;
              try {
                const res = await axios.post(`${apiUrl}/api/super-admin/broadcasting/journeys`, {
                  name: createModal.name,
                  description: createModal.description,
                  triggerType: createModal.triggerType,
                  nodes: [{ id: 'node_' + Date.now(), type: 'trigger', label: createModal.triggerType, nextNodeId: null, config: {}, position: { x: 60, y: 140 } }],
                  status: 'Active'
                }, { headers });
                setCreateModal({ open: false, name: '', description: '', triggerType: 'Order Placed' });
                await fetchData(res.data._id);
              } catch (err) {
                alert('Error creating journey: ' + err.message);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Automation Name *</label>
                <input 
                  type="text" required placeholder="e.g. Real-Time Order Lifecycle"
                  value={createModal.name} onChange={e => setCreateModal({ ...createModal, name: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Trigger Event *</label>
                <select
                  value={createModal.triggerType} onChange={e => setCreateModal({ ...createModal, triggerType: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {TRIGGER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={{ marginTop: '0.3rem', padding: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Create & Open Studio Canvas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmModal.open && deleteConfirmModal.journey && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', maxWidth: '380px', width: '100%', padding: '1.8rem', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', margin: '0 0 0.3rem', color: '#0f172a' }}>
              Delete Automation?
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.3rem', lineHeight: 1.4 }}>
              Are you sure you want to delete <strong>"{deleteConfirmModal.journey?.name}"</strong> from AWS RDS PostgreSQL Database?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirmModal({ open: false, journey: null })}
                style={{ flex: 1, padding: '0.65rem', background: '#f1f5f9', border: 'none', borderRadius: '9px', fontWeight: '800', color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJourney}
                style={{ flex: 1, padding: '0.65rem', background: '#ef4444', border: 'none', borderRadius: '9px', fontWeight: '800', color: 'white', cursor: 'pointer' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TRIGGER SIMULATOR & TEST AUDIT MODAL */}
      {testModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '560px', width: '100%', padding: '1.8rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => setTestModal({ ...testModal, open: false, result: '', executionTrace: [] })}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={13} /> LIVE SIMULATOR
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>AWS EC2 Background Engine</span>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', margin: '0 0 0.35rem', color: '#0f172a' }}>
              Test Live Automation Trigger
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.2rem', lineHeight: 1.45 }}>
              ⚡ <strong>How Journeys Run:</strong> Active automations listen <strong>24/7 in the background</strong> on real customer orders. Use this simulator to test-fire notifications directly to your WhatsApp to verify delivery and templates instantly.
            </p>

            {/* Form */}
            <form onSubmit={handleTestEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>Recipient Name</label>
                  <input 
                    type="text" required placeholder="Parth Sharma"
                    value={testModal.name} onChange={e => setTestModal({ ...testModal, name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>WhatsApp Number</label>
                  <input 
                    type="text" required placeholder="917985397373"
                    value={testModal.phone} onChange={e => setTestModal({ ...testModal, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={testModal.enrolling}
                style={{
                  marginTop: '0.2rem', padding: '0.8rem',
                  background: 'linear-gradient(135deg, #ef4123, #ea580c)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer',
                  opacity: testModal.enrolling ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(239, 65, 35, 0.25)'
                }}
              >
                {testModal.enrolling ? (
                  <>Simulating Trigger & Dispathing...</>
                ) : (
                  <><Play size={15} /> Fire Test Trigger Event</>
                )}
              </button>
            </form>

            {/* LIVE EXECUTION AUDIT TRACE */}
            {testModal.result && (
              <div style={{ marginTop: '1.3rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.1rem' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: testModal.result.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: testModal.result.startsWith('✅') ? '#059669' : '#dc2626',
                  borderRadius: '10px', fontSize: '0.82rem', fontWeight: '800', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {testModal.result}
                </div>

                {testModal.executionTrace && testModal.executionTrace.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                      📋 Real-Time Execution Trace:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {testModal.executionTrace.map((trace, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem',
                          display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>
                                {idx + 1}
                              </span>
                              {trace.nodeLabel || trace.action}
                            </div>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: '800', padding: '2px 6px', borderRadius: '6px',
                              background: trace.status === 'Delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: trace.status === 'Delivered' ? '#059669' : '#2563eb'
                            }}>
                              {trace.status}
                            </span>
                          </div>

                          {trace.renderedBody && (
                            <div style={{
                              fontSize: '0.74rem', color: '#334155', background: '#ffffff', border: '1px solid #e2e8f0',
                              borderRadius: '7px', padding: '0.5rem 0.65rem', marginTop: '3px', lineHeight: 1.4,
                              fontFamily: 'monospace'
                            }}>
                              💬 {trace.renderedBody}
                            </div>
                          )}

                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span>Target: {trace.recipient || testModal.phone}</span>
                            {trace.slotIndex && <span>• WhatsApp Slot: {trace.slotIndex}</span>}
                            <span>• {new Date(trace.time).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: '0.9rem', padding: '0.65rem 0.8rem', background: 'rgba(16, 185, 129, 0.06)',
                      borderRadius: '8px', border: '1px dashed #10b981', fontSize: '0.72rem', color: '#065f46', lineHeight: 1.4
                    }}>
                      🟢 <strong>24/7 Autonomous Status:</strong> Journey is deployed on AWS RDS. When real students checkout on <code>food.universeorder.co.in</code>, this entire sequence executes automatically with zero human effort.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminJourneyBuilder;
