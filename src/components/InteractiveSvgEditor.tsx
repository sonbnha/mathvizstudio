'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MousePointer,
  Spline,
  Type,
  Palette,
  SquareCode,
  Check,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  Move,
  Maximize2,
  X,
  Equal,
} from 'lucide-react';

export type EditorTool =
  | 'select' // Kéo nhãn, điểm
  | 'line' // Tinh chỉnh đường nét (đổi nét đứt/liền, độ dày, màu)
  | 'dash' // Đổi nhanh nét đứt/liền khi click vào nét vẽ
  | 'angle' // Đánh dấu góc vuông
  | 'tick' // Ký hiệu bằng nhau (1 vạch, 2 vạch)
  | 'highlight' // Tô màu diện tích
  | 'text'; // Sửa nội dung text

interface InteractiveSvgEditorProps {
  svgCode: string;
  isEditMode: boolean;
  onUpdateSvg: (newSvg: string) => void;
  onCloseEditMode: () => void;
  mountContainerId?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  elementId: string;
  type: 'line' | 'text' | 'polygon' | 'angle';
}

export const InteractiveSvgEditor: React.FC<InteractiveSvgEditorProps> = ({
  svgCode,
  isEditMode,
  onUpdateSvg,
  onCloseEditMode,
  mountContainerId = 'svgMount',
}) => {
  // Active Tool
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  // Contextual popup state for selected element
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Inline text editing state
  const [editingText, setEditingText] = useState<{
    element: SVGTextElement;
    screenX: number;
    screenY: number;
    initialValue: string;
  } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Dragging state
  const draggingRef = useRef<{
    element: SVGElement;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    type: 'text' | 'circle' | 'right-angle';
  } | null>(null);

  // Ref to container for position calculations
  const editorRootRef = useRef<HTMLDivElement>(null);

  // Helper to get or assign data-edit-id on an SVGElement
  const getOrAssignEditId = (element: SVGElement): string => {
    let editId = element.getAttribute('data-edit-id');
    if (!editId) {
      editId = 'elem_' + Math.random().toString(36).substring(2, 9);
      element.setAttribute('data-edit-id', editId);
    }
    return editId;
  };

  // Reset history on entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setHistory([svgCode]);
      setFuture([]);
      setContextMenu(null);
      setSelectedElementId(null);
      setEditingText(null);
    }
  }, [isEditMode]);

  // Helper to commit new SVG and push previous to history
  const commitSvgChange = useCallback(
    (newSvg: string) => {
      setHistory((prev) => [...prev, svgCode]);
      setFuture([]);
      onUpdateSvg(newSvg);
    },
    [svgCode, onUpdateSvg]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [svgCode, ...prev]);
    onUpdateSvg(previous);
    setContextMenu(null);
    setSelectedElementId(null);
    setEditingText(null);
  }, [history, svgCode, onUpdateSvg]);

  // Redo
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, svgCode]);
    onUpdateSvg(next);
    setContextMenu(null);
    setSelectedElementId(null);
    setEditingText(null);
  }, [future, svgCode, onUpdateSvg]);

  // Keyboard shortcut listener (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Esc)
  useEffect(() => {
    if (!isEditMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        setSelectedElementId(null);
        setEditingText(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo]);

  // Transform screen coordinates to SVG coordinates
  const getSvgCoordinates = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: clientX, y: clientY };
  };

  // 1. POINTER DOWN - Handles Dragging and Tool Clicks
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!isEditMode) return;
      const target = e.target as SVGElement;
      if (!target) return;

      const mount = document.getElementById(mountContainerId);
      if (!mount) return;
      const svg = mount.querySelector('svg');
      if (!svg) return;

      // Close open context menu if clicking elsewhere
      const currentTargetEditId = target.getAttribute('data-edit-id');
      if (
        contextMenu &&
        contextMenu.elementId !== currentTargetEditId &&
        !target.closest('.editor-context-menu')
      ) {
        setContextMenu(null);
        setSelectedElementId(null);
      }

      // Check element types
      const textTarget = (target.tagName.toLowerCase() === 'text'
        ? target
        : target.closest('text')) as SVGTextElement | null;
      const circleTarget = (target.tagName.toLowerCase() === 'circle'
        ? target
        : target.closest('circle')) as SVGCircleElement | null;
      const lineTarget = (['line', 'path', 'polyline'].includes(target.tagName.toLowerCase())
        ? target
        : target.closest('line, path, polyline')) as SVGGeometryElement | null;
      const isClosedPath =
        target.tagName.toLowerCase() === 'path' &&
        /z\s*$/i.test(target.getAttribute('d') || '');
      const polygonTarget = (['polygon', 'rect'].includes(target.tagName.toLowerCase()) || isClosedPath
        ? target
        : target.closest('polygon, rect')) as SVGGeometryElement | null;
      const angleTarget = (target.classList.contains('right-angle-marker')
        ? target
        : target.closest('.right-angle-marker')) as SVGElement | null;

      // Tool-specific action handlers
      if (activeTool === 'angle') {
        // Stamp right-angle symbol at point/click location or snapped to circle vertex
        e.preventDefault();
        let clickX: number, clickY: number;
        if (circleTarget) {
          clickX = parseFloat(circleTarget.getAttribute('cx') || '0');
          clickY = parseFloat(circleTarget.getAttribute('cy') || '0');
        } else {
          const coords = getSvgCoordinates(svg, e.clientX, e.clientY);
          clickX = coords.x;
          clickY = coords.y;
        }
        addRightAngleMarker(svg, clickX, clickY);
        return;
      }

      if (activeTool === 'tick' && lineTarget) {
        // Stamp equal tick marks on line
        e.preventDefault();
        toggleEqualTicksOnLine(svg, lineTarget);
        return;
      }

      if (activeTool === 'dash' && lineTarget) {
        // Toggle solid / dashed line
        e.preventDefault();
        toggleLineDash(svg, lineTarget);
        return;
      }

      if (activeTool === 'highlight' && (polygonTarget || lineTarget)) {
        // Open highlight menu directly
        e.preventDefault();
        const targetEl = polygonTarget || lineTarget;
        if (!targetEl) return;
        const editId = getOrAssignEditId(targetEl);
        setSelectedElementId(editId);
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          elementId: editId,
          type: 'polygon',
        });
        return;
      }

      // Default 'select' or contextual click
      if (textTarget) {
        e.preventDefault();
        const { x: startX, y: startY } = getSvgCoordinates(svg, e.clientX, e.clientY);
        const initX = parseFloat(textTarget.getAttribute('x') || '0');
        const initY = parseFloat(textTarget.getAttribute('y') || '0');

        draggingRef.current = {
          element: textTarget,
          startX,
          startY,
          initX,
          initY,
          type: 'text',
        };
        textTarget.classList.add('opacity-70');
      } else if (circleTarget) {
        e.preventDefault();
        const { x: startX, y: startY } = getSvgCoordinates(svg, e.clientX, e.clientY);
        const initX = parseFloat(circleTarget.getAttribute('cx') || '0');
        const initY = parseFloat(circleTarget.getAttribute('cy') || '0');

        draggingRef.current = {
          element: circleTarget,
          startX,
          startY,
          initX,
          initY,
          type: 'circle',
        };
        circleTarget.classList.add('opacity-70');
      } else if (angleTarget) {
        // Open angle contextual options menu (rotate 90, delete)
        const editId = getOrAssignEditId(angleTarget);
        setSelectedElementId(editId);
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          elementId: editId,
          type: 'angle',
        });
      } else if (polygonTarget) {
        // Open polygon area highlight menu
        const editId = getOrAssignEditId(polygonTarget);
        setSelectedElementId(editId);
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          elementId: editId,
          type: 'polygon',
        });
      } else if (lineTarget) {
        // Open line contextual options menu
        const editId = getOrAssignEditId(lineTarget);
        setSelectedElementId(editId);
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          elementId: editId,
          type: 'line',
        });
      }
    },
    [isEditMode, activeTool, mountContainerId, contextMenu]
  );

  // 2. POINTER MOVE - Live Drag Movement
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();

      const mount = document.getElementById(mountContainerId);
      if (!mount) return;
      const svg = mount.querySelector('svg');
      if (!svg) return;

      const { element, startX, startY, initX, initY, type } = draggingRef.current;
      const currentPos = getSvgCoordinates(svg, e.clientX, e.clientY);
      const dx = currentPos.x - startX;
      const dy = currentPos.y - startY;

      if (type === 'text') {
        const newX = Math.round((initX + dx) * 10) / 10;
        const newY = Math.round((initY + dy) * 10) / 10;
        element.setAttribute('x', String(newX));
        element.setAttribute('y', String(newY));

        const tspans = element.querySelectorAll('tspan');
        tspans.forEach((tspan) => {
          if (tspan.getAttribute('x')) {
            tspan.setAttribute('x', String(newX));
          }
        });
      } else if (type === 'circle') {
        const newCx = Math.round((initX + dx) * 10) / 10;
        const newCy = Math.round((initY + dy) * 10) / 10;
        element.setAttribute('cx', String(newCx));
        element.setAttribute('cy', String(newCy));
      }
    },
    [mountContainerId]
  );

  // 3. POINTER UP - Finalize Drag & Save to History
  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;

    draggingRef.current.element.classList.remove('opacity-70');
    draggingRef.current = null;

    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  }, [mountContainerId, commitSvgChange]);

  // 4. DOUBLE CLICK - Inline Text Editing
  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!isEditMode) return;
      const target = e.target as SVGElement;
      if (!target) return;

      const textTarget = (target.tagName.toLowerCase() === 'text'
        ? target
        : target.closest('text')) as SVGTextElement | null;

      if (textTarget) {
        e.preventDefault();
        e.stopPropagation();
        const rect = textTarget.getBoundingClientRect();
        const currentText = textTarget.textContent || '';
        setEditingText({
          element: textTarget,
          screenX: rect.left,
          screenY: rect.top - 8,
          initialValue: currentText,
        });
        setTextInputValue(currentText);
      }
    },
    [isEditMode]
  );

  // Attach and detach DOM listeners on SVG
  useEffect(() => {
    if (!isEditMode) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    svg.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    svg.addEventListener('dblclick', handleDoubleClick);

    return () => {
      svg.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      svg.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [isEditMode, mountContainerId, handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick]);

  // COMMIT INLINE TEXT EDIT
  const commitTextEdit = () => {
    if (!editingText) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    editingText.element.textContent = textInputValue;
    setEditingText(null);

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // TOGGLE SOLID / DASHED LINE
  const toggleLineDash = (svg: SVGSVGElement, lineElement: SVGElement) => {
    const currentDash = lineElement.getAttribute('stroke-dasharray');
    if (!currentDash || currentDash === 'none' || currentDash === '0') {
      lineElement.setAttribute('stroke-dasharray', '5 4');
    } else {
      lineElement.removeAttribute('stroke-dasharray');
    }
    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // TOGGLE EQUAL TICKS ON LINE (Ký hiệu bằng nhau)
  const toggleEqualTicksOnLine = (svg: SVGSVGElement, lineElement: SVGElement) => {
    // Check if line has coordinates
    let x1 = parseFloat(lineElement.getAttribute('x1') || '0');
    let y1 = parseFloat(lineElement.getAttribute('y1') || '0');
    let x2 = parseFloat(lineElement.getAttribute('x2') || '0');
    let y2 = parseFloat(lineElement.getAttribute('y2') || '0');

    if (x1 === x2 && y1 === y2 && lineElement.tagName.toLowerCase() === 'path') {
      // Approximate from path bounding box if <path>
      const bbox = (lineElement as SVGGraphicsElement).getBBox();
      x1 = bbox.x;
      y1 = bbox.y;
      x2 = bbox.x + bbox.width;
      y2 = bbox.y + bbox.height;
    }

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    const nx = -dy / len;
    const ny = dx / len;
    const tickLen = 8;
    const strokeColor = lineElement.getAttribute('stroke') || '#0f172a';

    const markerId = `tick-${Math.round(mx)}-${Math.round(my)}`;
    const existing = svg.getElementById(markerId);

    if (existing) {
      const currentTicks = existing.getAttribute('data-ticks') || '1';
      if (currentTicks === '1') {
        // Upgrade to 2 ticks (//)
        existing.setAttribute('data-ticks', '2');
        existing.innerHTML = '';
        const offset = 2.5;

        // Line 1
        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const c1x = mx - tx * offset;
        const c1y = my - ty * offset;
        l1.setAttribute('x1', String(Math.round(c1x - (nx * tickLen) / 2)));
        l1.setAttribute('y1', String(Math.round(c1y - (ny * tickLen) / 2)));
        l1.setAttribute('x2', String(Math.round(c1x + (nx * tickLen) / 2)));
        l1.setAttribute('y2', String(Math.round(c1y + (ny * tickLen) / 2)));
        l1.setAttribute('stroke', strokeColor);
        l1.setAttribute('stroke-width', '1.5');
        existing.appendChild(l1);

        // Line 2
        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const c2x = mx + tx * offset;
        const c2y = my + ty * offset;
        l2.setAttribute('x1', String(Math.round(c2x - (nx * tickLen) / 2)));
        l2.setAttribute('y1', String(Math.round(c2y - (ny * tickLen) / 2)));
        l2.setAttribute('x2', String(Math.round(c2x + (nx * tickLen) / 2)));
        l2.setAttribute('y2', String(Math.round(c2y + (ny * tickLen) / 2)));
        l2.setAttribute('stroke', strokeColor);
        l2.setAttribute('stroke-width', '1.5');
        existing.appendChild(l2);
      } else {
        // Remove ticks
        existing.remove();
      }
    } else {
      // Create 1 tick (/)
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', markerId);
      g.setAttribute('data-ticks', '1');
      g.setAttribute('class', 'math-equal-mark cursor-pointer');

      const tick1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick1.setAttribute('x1', String(Math.round(mx - (nx * tickLen) / 2)));
      tick1.setAttribute('y1', String(Math.round(my - (ny * tickLen) / 2)));
      tick1.setAttribute('x2', String(Math.round(mx + (nx * tickLen) / 2)));
      tick1.setAttribute('y2', String(Math.round(my + (ny * tickLen) / 2)));
      tick1.setAttribute('stroke', strokeColor);
      tick1.setAttribute('stroke-width', '1.5');

      g.appendChild(tick1);
      svg.appendChild(g);
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // ADD RIGHT ANGLE MARKER (Ký hiệu góc vuông)
  const addRightAngleMarker = (svg: SVGSVGElement, x: number, y: number) => {
    const size = 10;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      `M ${Math.round(x)} ${Math.round(y - size)} L ${Math.round(x + size)} ${Math.round(
        y - size
      )} L ${Math.round(x + size)} ${Math.round(y)}`
    );
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#0f172a');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('class', 'right-angle-marker cursor-move');

    svg.appendChild(path);
    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // MODIFY ELEMENT STYLE (Stroke, Fill, Width)
  const updateElementStyle = (attribute: string, value: string) => {
    const editId = selectedElementId || contextMenu?.elementId;
    if (!editId) return;

    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    // Luôn query tìm phần tử mới nhất đang tồn tại trong DOM hiện tại theo ID
    const target = mount.querySelector(`[data-edit-id="${editId}"]`) as SVGElement | null;
    if (!target) return;

    if (attribute === 'stroke-dasharray' && (value === '' || value === 'none')) {
      target.removeAttribute(attribute);
    } else {
      target.setAttribute(attribute, value);
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // DELETE SELECTED ELEMENT
  const deleteSelectedElement = () => {
    const editId = selectedElementId || contextMenu?.elementId;
    if (!editId) return;

    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    const target = mount.querySelector(`[data-edit-id="${editId}"]`) as SVGElement | null;
    if (target) {
      target.remove();
    }
    setContextMenu(null);
    setSelectedElementId(null);

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  if (!isEditMode) return null;

  return (
    <div ref={editorRootRef} className="absolute inset-0 pointer-events-none z-30">
      {/* Hiệu ứng viền phát sáng nhẹ cho phần tử đang được chọn tinh chỉnh */}
      {selectedElementId && (
        <style>{`
          [data-edit-id="${selectedElementId}"] {
            filter: drop-shadow(0 0 3.5px #06b6d4) !important;
          }
        `}</style>
      )}

      {/* 1. THANH CÔNG CỤ NỔI CỐ ĐỊNH Ở MÉP TRÊN CANVAS (Floating Editor Toolbar) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-2xl px-2.5 py-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/50 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-1 pr-1 border-r border-slate-200 dark:border-slate-800">
          <span className="text-xs">✏️</span>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hidden md:inline">
            Chỉnh sửa trực tiếp
          </span>
        </div>

        {/* Tool Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Kéo thả nhãn điểm, số đo hoặc tên điểm"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kéo nhãn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('dash')}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer ${
              activeTool === 'dash'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Bấm vào đường để đổi Nét đứt / Nét liền"
          >
            <Spline className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nét đứt/liền</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('angle')}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer ${
              activeTool === 'angle'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Bấm vào đỉnh góc để chèn ký hiệu góc vuông"
          >
            <SquareCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Góc vuông</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('tick')}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer ${
              activeTool === 'tick'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Bấm vào cạnh để thêm vạch bằng nhau (1 vạch / 2 vạch)"
          >
            <Equal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ký hiệu //</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('highlight')}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer ${
              activeTool === 'highlight'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Tô màu nền diện tích tam giác/đa giác"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tô diện tích</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 px-1 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Làm lại (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nút Hoàn tất */}
        <div className="pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCloseEditMode}
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer"
            title="Lưu các thay đổi và thoát chế độ chỉnh sửa"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>

      {/* 2. INLINE TEXT INPUT MODAL/POPOVER KHI DOUBLE CLICK TEXT */}
      {editingText && (
        <div
          className="fixed pointer-events-auto z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${editingText.screenX}px`,
            top: `${editingText.screenY}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTextEdit();
              if (e.key === 'Escape') setEditingText(null);
            }}
            className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500 font-semibold"
            placeholder="Nhập chữ/số..."
          />
          <button
            type="button"
            onClick={commitTextEdit}
            className="p-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs cursor-pointer"
            title="Lưu"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingText(null)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Hủy"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. CONTEXTUAL POPUP CHO ĐOẠN THẲNG HOẶC ĐA GIÁC (Line & Style Toolbar) */}
      {contextMenu && (
        <div
          className="editor-context-menu fixed pointer-events-auto z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2 min-w-[200px]"
          style={{
            left: `${Math.min(window.innerWidth - 220, Math.max(10, contextMenu.x - 100))}px`,
            top: `${Math.min(window.innerHeight - 200, Math.max(70, contextMenu.y - 120))}px`,
          }}
        >
          {/* Header mini */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span>
              {contextMenu.type === 'line'
                ? '📐 Tinh chỉnh đường nét'
                : contextMenu.type === 'angle'
                ? '📐 Ký hiệu góc vuông'
                : '🎨 Tô màu diện tích'}
            </span>
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                setSelectedElementId(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          {contextMenu.type === 'line' && (
            <>
              {/* Kiểu nét: Liền / Đứt */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-14">
                  Kiểu nét:
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => updateElementStyle('stroke-dasharray', '')}
                    className="flex-1 py-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center font-medium text-[10px] cursor-pointer"
                  >
                    Nét liền
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElementStyle('stroke-dasharray', '5 5')}
                    className="flex-1 py-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center font-medium text-[10px] cursor-pointer"
                  >
                    Nét đứt
                  </button>
                </div>
              </div>

              {/* Độ dày nét: 1px, 1.5px, 2px, 3px */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-14">
                  Độ dày:
                </span>
                <div className="flex items-center gap-1 flex-1">
                  {['1', '1.5', '2', '3'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateElementStyle('stroke-width', w)}
                      className="flex-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center font-mono text-[10px] cursor-pointer"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Màu nét vẽ */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-14">
                  Màu sắc:
                </span>
                <div className="flex items-center gap-1.5 flex-1">
                  {[
                    { color: '#0f172a', title: 'Đen' },
                    { color: '#2563eb', title: 'Xanh dương' },
                    { color: '#dc2626', title: 'Đỏ' },
                    { color: '#ea580c', title: 'Cam' },
                    { color: '#16a34a', title: 'Xanh lá' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => updateElementStyle('stroke', c.color)}
                      className="w-4 h-4 rounded-full border border-white/60 dark:border-slate-800 shadow-xs hover:scale-115 transition-transform cursor-pointer"
                      style={{ backgroundColor: c.color }}
                      title={c.title}
                    />
                  ))}
                </div>
              </div>

              {/* Đánh dấu vạch bằng nhau */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-14">
                  Đánh dấu:
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      const editId = selectedElementId || contextMenu?.elementId;
                      if (!editId) return;
                      const mount = document.getElementById(mountContainerId);
                      if (!mount) return;
                      const svg = mount.querySelector('svg');
                      if (!svg) return;
                      const target = mount.querySelector(`[data-edit-id="${editId}"]`) as SVGElement | null;
                      if (target) {
                        toggleEqualTicksOnLine(svg, target);
                      }
                    }}
                    className="flex-1 py-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center font-medium text-[10px] cursor-pointer flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
                  >
                    <Equal className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>Vạch bằng nhau (/) (//)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tùy chỉnh góc vuông: Xoay góc 90 độ */}
          {contextMenu.type === 'angle' && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Thao tác góc vuông:
              </span>
              <button
                type="button"
                onClick={() => {
                  const editId = selectedElementId || contextMenu?.elementId;
                  if (!editId) return;
                  const mount = document.getElementById(mountContainerId);
                  if (!mount) return;
                  const svg = mount.querySelector('svg');
                  if (!svg) return;
                  const el = mount.querySelector(`[data-edit-id="${editId}"]`) as SVGElement | null;
                  if (!el) return;
                  const currentTransform = el.getAttribute('transform') || '';
                  const match = currentTransform.match(/rotate\((\d+)/);
                  const currentAngle = match ? parseInt(match[1], 10) : 0;
                  const nextAngle = (currentAngle + 90) % 360;
                  const bbox = (el as SVGGraphicsElement).getBBox();
                  const cx = bbox.x + bbox.width / 2;
                  const cy = bbox.y + bbox.height / 2;
                  el.setAttribute('transform', `rotate(${nextAngle} ${cx} ${cy})`);
                  const serialized = new XMLSerializer().serializeToString(svg);
                  commitSvgChange(serialized);
                }}
                className="py-1 px-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center font-medium text-[10px] cursor-pointer flex items-center justify-center gap-1"
              >
                <span>🔄 Xoay góc 90°</span>
              </button>
            </div>
          )}

          {/* Tô màu diện tích highlight */}
          {contextMenu.type === 'polygon' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Chọn màu phủ nổi bật:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { color: 'none', label: 'Xóa màu' },
                  { color: 'rgba(59, 130, 246, 0.25)', label: 'Xanh' },
                  { color: 'rgba(234, 179, 8, 0.25)', label: 'Vàng' },
                  { color: 'rgba(16, 185, 129, 0.25)', label: 'Lá' },
                  { color: 'rgba(239, 68, 68, 0.25)', label: 'Đỏ' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => updateElementStyle('fill', item.color)}
                    className="px-2 py-1 rounded-md text-[10px] border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition cursor-pointer"
                    style={{
                      backgroundColor: item.color === 'none' ? 'transparent' : item.color,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nút xóa phần tử */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={deleteSelectedElement}
              className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa phần tử này</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveSvgEditor;
