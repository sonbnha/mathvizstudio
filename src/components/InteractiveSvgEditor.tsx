'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SquareCode,
  Check,
  Undo2,
  Redo2,
  Trash2,
  Equal,
  X,
  RotateCw,
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

export const InteractiveSvgEditor: React.FC<InteractiveSvgEditorProps> = ({
  svgCode,
  isEditMode,
  onUpdateSvg,
  onCloseEditMode,
  mountContainerId = 'svgMount',
}) => {
  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  // Fixed top shape toolbar state for selected element
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'line' | 'polygon' | 'angle' | null>(null);
  const lastClickCoordsRef = useRef<{ x: number; y: number } | null>(null);

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
      setSelectedElementId(null);
      setSelectedElementType(null);
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

  // Deselect element
  const deselectElement = useCallback(() => {
    setSelectedElementId(null);
    setSelectedElementType(null);
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [svgCode, ...prev]);
    onUpdateSvg(previous);
    setSelectedElementId(null);
    setSelectedElementType(null);
    setEditingText(null);
  }, [history, svgCode, onUpdateSvg]);

  // Redo
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, svgCode]);
    onUpdateSvg(next);
    setSelectedElementId(null);
    setSelectedElementType(null);
    setEditingText(null);
  }, [future, svgCode, onUpdateSvg]);

  // DELETE SELECTED ELEMENT
  const deleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;

    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    const target = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (target) {
      target.remove();
    }
    setSelectedElementId(null);
    setSelectedElementType(null);

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  }, [selectedElementId, mountContainerId, commitSvgChange]);

  // Keyboard shortcut listener (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Esc, Delete)
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
        setSelectedElementId(null);
        setSelectedElementType(null);
        setEditingText(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && !editingText) {
        // Prevent deleting element if typing in an input
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          deleteSelectedElement();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo, selectedElementId, editingText, deleteSelectedElement]);

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

  // 1. POINTER DOWN - Handles Dragging and Element Selection for Top Toolbar
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!isEditMode) return;
      const target = e.target as SVGElement;
      if (!target) return;

      // Don't trigger element selection if clicking inside top toolbar or text input
      const targetEl = target as Element;
      if (targetEl.closest('.editor-toolbar-pill') || targetEl.closest('.editor-text-input-popover')) {
        return;
      }

      const mount = document.getElementById(mountContainerId);
      if (!mount) return;
      const svg = mount.querySelector('svg');
      if (!svg) return;

      // If clicking directly on SVG root or whitespace background, deselect active element
      if (target === svg || (target as Element) === mount || target.tagName.toLowerCase() === 'svg') {
        setSelectedElementId(null);
        setSelectedElementType(null);
        return;
      }

      // Check element types
      const textTarget = (target.tagName.toLowerCase() === 'text'
        ? target
        : target.closest('text')) as SVGTextElement | null;
      const circleTarget = (target.tagName.toLowerCase() === 'circle'
        ? target
        : target.closest('circle')) as SVGCircleElement | null;
      const angleTarget = (target.classList.contains('right-angle-marker')
        ? target
        : target.closest('.right-angle-marker')) as SVGElement | null;
      const lineTarget = (['line', 'path', 'polyline'].includes(target.tagName.toLowerCase())
        ? target
        : target.closest('line, path, polyline')) as SVGGeometryElement | null;
      const isClosedPath =
        target.tagName.toLowerCase() === 'path' &&
        /z\s*$/i.test(target.getAttribute('d') || '');
      const polygonTarget = (['polygon', 'rect'].includes(target.tagName.toLowerCase()) || isClosedPath
        ? target
        : target.closest('polygon, rect')) as SVGGeometryElement | null;

      // 1. Text elements -> initiate drag
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
        return;
      }

      // 2. Circle point vertices -> initiate drag
      if (circleTarget) {
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
        return;
      }

      // 3. Right angle marker -> select angle in top toolbar
      if (angleTarget) {
        e.preventDefault();
        const editId = getOrAssignEditId(angleTarget);
        setSelectedElementId(editId);
        setSelectedElementType('angle');
        return;
      }

      // 4. Closed polygon / area -> select polygon in top toolbar
      if (polygonTarget && target.tagName.toLowerCase() !== 'line') {
        e.preventDefault();
        const editId = getOrAssignEditId(polygonTarget);
        setSelectedElementId(editId);
        setSelectedElementType('polygon');
        return;
      }

      // 5. Line / path / polyline -> select line in top toolbar
      if (lineTarget) {
        e.preventDefault();
        const editId = getOrAssignEditId(lineTarget);
        setSelectedElementId(editId);
        setSelectedElementType('line');
        lastClickCoordsRef.current = getSvgCoordinates(svg, e.clientX, e.clientY);
        return;
      }

      // Clicking any other unrecognized element -> deselect
      setSelectedElementId(null);
      setSelectedElementType(null);
    },
    [isEditMode, mountContainerId]
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

  // Attach and detach DOM listeners on SVG & Container
  useEffect(() => {
    if (!isEditMode) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    const handleOutsideClick = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        !target.closest('.editor-toolbar-pill') &&
        !target.closest('.editor-text-input-popover') &&
        !target.closest('#' + mountContainerId)
      ) {
        setSelectedElementId(null);
        setSelectedElementType(null);
      }
    };

    svg.addEventListener('pointerdown', handlePointerDown);
    mount.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    svg.addEventListener('dblclick', handleDoubleClick);

    return () => {
      svg.removeEventListener('pointerdown', handlePointerDown);
      mount.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerdown', handleOutsideClick);
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
    if (!selectedElementId) return;

    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;

    // Luôn query tìm phần tử mới nhất đang tồn tại trong DOM hiện tại theo ID
    const target = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (!target) return;

    if (attribute === 'stroke-dasharray' && (value === '' || value === 'none')) {
      target.removeAttribute(attribute);
    } else {
      target.setAttribute(attribute, value);
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  // Read attributes of selected element from live DOM
  const getSelectedElementAttrs = () => {
    if (!selectedElementId) return null;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return null;
    const el = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (!el) return null;
    return {
      dasharray: el.getAttribute('stroke-dasharray') || '',
      strokeWidth: el.getAttribute('stroke-width') || '1.5',
      stroke: el.getAttribute('stroke') || '#0f172a',
      fill: el.getAttribute('fill') || 'none',
    };
  };

  // Toggle equal ticks on selected line
  const handleToggleTicksOnSelectedLine = () => {
    if (!selectedElementId) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;
    const target = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (target) {
      toggleEqualTicksOnLine(svg, target);
    }
  };

  // Add right angle marker to closest vertex of selected line
  const handleAddRightAngleToSelectedLine = () => {
    if (!selectedElementId) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;
    const target = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (!target) return;

    let x1 = parseFloat(target.getAttribute('x1') || '0');
    let y1 = parseFloat(target.getAttribute('y1') || '0');
    let x2 = parseFloat(target.getAttribute('x2') || '0');
    let y2 = parseFloat(target.getAttribute('y2') || '0');

    if (x1 === x2 && y1 === y2 && (target as SVGGraphicsElement).getBBox) {
      const bbox = (target as SVGGraphicsElement).getBBox();
      x1 = bbox.x;
      y1 = bbox.y;
      x2 = bbox.x + bbox.width;
      y2 = bbox.y + bbox.height;
    }

    const clickPos = lastClickCoordsRef.current;
    let anchorX = x1;
    let anchorY = y1;
    if (clickPos) {
      const d1 = Math.hypot(clickPos.x - x1, clickPos.y - y1);
      const d2 = Math.hypot(clickPos.x - x2, clickPos.y - y2);
      anchorX = d1 <= d2 ? x1 : x2;
      anchorY = d1 <= d2 ? y1 : y2;
    }

    addRightAngleMarker(svg, anchorX, anchorY);
  };

  // Rotate selected right-angle marker by 90 degrees
  const handleRotateSelectedAngle = () => {
    if (!selectedElementId) return;
    const mount = document.getElementById(mountContainerId);
    if (!mount) return;
    const svg = mount.querySelector('svg');
    if (!svg) return;
    const el = mount.querySelector(`[data-edit-id="${selectedElementId}"]`) as SVGElement | null;
    if (!el) return;
    const currentTransform = el.getAttribute('transform') || '';
    const match = currentTransform.match(/rotate\((-?\d+)/);
    const currentAngle = match ? parseInt(match[1], 10) : 0;
    const nextAngle = (currentAngle + 90) % 360;
    const bbox = (el as SVGGraphicsElement).getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    el.setAttribute('transform', `rotate(${nextAngle} ${cx} ${cy})`);
    const serialized = new XMLSerializer().serializeToString(svg);
    commitSvgChange(serialized);
  };

  if (!isEditMode) return null;

  const activeAttrs = getSelectedElementAttrs();
  const isDashed = Boolean(activeAttrs?.dasharray && activeAttrs.dasharray !== 'none');

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

      {/* 1. THANH ĐỊNH DẠNG CỐ ĐỊNH PHÍA TRÊN CANVAS (Word-Style Shape Toolbar) */}
      <div className="editor-toolbar-pill absolute top-2.5 left-1/2 -translate-x-1/2 pointer-events-auto max-w-[96%] overflow-x-auto scrollbar-none z-40">
        {!selectedElementId ? (
          // TRẠNG THÁI CHƯA CHỌN: Hướng dẫn ngắn gọn
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full px-3 py-1.5 shadow-md shadow-slate-900/5 dark:shadow-black/40 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 whitespace-nowrap">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 dark:border-slate-800">
              <span className="text-xs">✏️</span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 select-none">
                <span className="font-semibold text-slate-800 dark:text-slate-100">Chế độ chỉnh sửa</span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500 mx-1.5">•</span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px]">Click vào đường nét để chỉnh sửa hoặc kéo điểm để di chuyển</span>
              </span>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Hoàn tác (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={future.length === 0}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Làm lại (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hoàn tất */}
            <button
              type="button"
              onClick={onCloseEditMode}
              className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Lưu các thay đổi và thoát chế độ chỉnh sửa"
            >
              <Check className="w-3 h-3" />
              <span>Hoàn tất</span>
            </button>
          </div>
        ) : (
          // TRẠNG THÁI ĐÃ CHỌN ĐỐI TƯỢNG: Thanh định dạng nằm ngang (Shape Format Bar)
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 dark:border-cyan-500/40 rounded-full px-3 py-1.5 shadow-lg shadow-slate-900/10 dark:shadow-black/50 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
            {/* Controls cho ĐƯỜNG NÉT */}
            {selectedElementType === 'line' && (
              <>
                <div className="flex items-center gap-1 font-semibold text-[11px] text-cyan-600 dark:text-cyan-400 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <span>📐 Đường nét</span>
                </div>

                {/* 1. Kiểu nét: Liền / Đứt */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateElementStyle('stroke-dasharray', '')}
                    className={`py-0.5 px-2 rounded-full font-medium text-[11px] transition cursor-pointer ${
                      !isDashed
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Nét liền"
                  >
                    Nét liền
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElementStyle('stroke-dasharray', '5 5')}
                    className={`py-0.5 px-2 rounded-full font-medium text-[11px] transition cursor-pointer ${
                      isDashed
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Nét đứt"
                  >
                    Nét đứt
                  </button>
                </div>

                {/* 2. Độ dày nét: 1px, 1.5px, 2px, 3px */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  {['1', '1.5', '2', '3'].map((w) => {
                    const isActive = activeAttrs?.strokeWidth === w || (!activeAttrs?.strokeWidth && w === '1.5');
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateElementStyle('stroke-width', w)}
                        className={`py-0.5 px-1.5 rounded-md font-mono text-[10.5px] transition cursor-pointer ${
                          isActive
                            ? 'bg-cyan-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={`Độ dày ${w}px`}
                      >
                        {w}px
                      </button>
                    );
                  })}
                </div>

                {/* 3. Bảng màu nét vẽ (5 màu) */}
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  {[
                    { color: '#0f172a', title: 'Đen' },
                    { color: '#2563eb', title: 'Xanh dương' },
                    { color: '#dc2626', title: 'Đỏ' },
                    { color: '#ea580c', title: 'Cam' },
                    { color: '#16a34a', title: 'Xanh lá' },
                  ].map((c) => {
                    const isSelected = activeAttrs?.stroke.toLowerCase() === c.color.toLowerCase();
                    return (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => updateElementStyle('stroke', c.color)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          isSelected
                            ? 'scale-125 ring-2 ring-cyan-500 ring-offset-1 dark:ring-offset-slate-900'
                            : 'border border-white/60 dark:border-slate-800 hover:scale-115'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.title}
                      />
                    );
                  })}
                </div>

                {/* 4. Ký hiệu bằng nhau & Góc vuông */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleToggleTicksOnSelectedLine}
                    className="py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
                    title="Đánh dấu vạch bằng nhau (1 vạch / 2 vạch / Xóa)"
                  >
                    <Equal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>= Vạch //</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddRightAngleToSelectedLine}
                    className="py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
                    title="Chèn ký hiệu góc vuông tại đỉnh gần nhất của đường này"
                  >
                    <SquareCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>⟂ Góc vuông</span>
                  </button>
                </div>
              </>
            )}

            {/* Controls cho ĐA GIÁC / VÙNG DIỆN TÍCH */}
            {selectedElementType === 'polygon' && (
              <>
                <div className="flex items-center gap-1 font-semibold text-[11px] text-amber-600 dark:text-amber-400 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <span>🎨 Tô màu diện tích</span>
                </div>
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  {[
                    { color: 'none', label: 'Xóa màu' },
                    { color: 'rgba(59, 130, 246, 0.25)', label: 'Xanh' },
                    { color: 'rgba(234, 179, 8, 0.25)', label: 'Vàng' },
                    { color: 'rgba(16, 185, 129, 0.25)', label: 'Lá' },
                    { color: 'rgba(239, 68, 68, 0.25)', label: 'Đỏ' },
                  ].map((item) => {
                    const isSelected = (activeAttrs?.fill || 'none') === item.color;
                    return (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => updateElementStyle('fill', item.color)}
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 hover:border-cyan-500'
                        }`}
                        style={{
                          backgroundColor: item.color === 'none' ? 'transparent' : item.color,
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Controls cho KÝ HIỆU GÓC VUÔNG */}
            {selectedElementType === 'angle' && (
              <>
                <div className="flex items-center gap-1 font-semibold text-[11px] text-indigo-600 dark:text-indigo-400 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <span>📐 Ký hiệu góc</span>
                </div>
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleRotateSelectedAngle}
                    className="py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Xoay góc 90°</span>
                  </button>
                </div>
              </>
            )}

            {/* Xóa phần tử */}
            <button
              type="button"
              onClick={deleteSelectedElement}
              className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title="Xóa phần tử này (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Bỏ chọn */}
            <button
              type="button"
              onClick={deselectElement}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border-r border-slate-200 dark:border-slate-800 pr-1"
              title="Bỏ chọn (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Hoàn tác (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={future.length === 0}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Làm lại (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hoàn tất */}
            <button
              type="button"
              onClick={onCloseEditMode}
              className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Lưu các thay đổi và thoát chế độ chỉnh sửa"
            >
              <Check className="w-3 h-3" />
              <span>Hoàn tất</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. INLINE TEXT INPUT POPOVER KHI DOUBLE CLICK TEXT */}
      {editingText && (
        <div
          className="editor-text-input-popover fixed pointer-events-auto z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
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
    </div>
  );
};

export default InteractiveSvgEditor;
