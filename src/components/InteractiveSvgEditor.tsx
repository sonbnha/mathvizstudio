'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  SquareCode,
  Check,
  Undo2,
  Redo2,
  Trash2,
  Equal,
  X,
  RotateCw,
  Layers,
  ChevronDown,
} from 'lucide-react';

export type EditorTool =
  | 'select' // Kéo nhãn, điểm
  | 'line' // Tinh chỉnh đường nét (đổi nét đứt/liền, độ dày, màu)
  | 'dash' // Đổi nhanh nét đứt/liền khi click vào nét vẽ
  | 'angle' // Đánh dấu góc vuông
  | 'tick' // Ký hiệu bằng nhau (1 vạch, 2 vạch)
  | 'highlight' // Tô màu diện tích
  | 'text'; // Sửa nội dung text

export interface SvgLayerItem {
  id: string;
  name: string;
  type: 'line' | 'polygon' | 'angle' | 'text';
  category: 'lines' | 'labels' | 'areas';
}

export interface SegmentCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface InteractiveSvgEditorProps {
  svgCode: string;
  isEditMode: boolean;
  onUpdateSvg: (newSvg: string) => void;
  onCloseEditMode: () => void;
  mountContainerId?: string;
}

// ----------------------------------------------------
// THUẬT TOÁN HÌNH HỌC: SNAP-TO-NEAREST & PHÂN TÍCH SVG
// ----------------------------------------------------

// Trích xuất các đoạn thẳng hình học từ phần tử SVG
export function getSegmentsFromElement(el: SVGElement): SegmentCoords[] {
  const tag = el.tagName.toLowerCase();
  if (tag === 'line') {
    const x1 = parseFloat(el.getAttribute('x1') || '0');
    const y1 = parseFloat(el.getAttribute('y1') || '0');
    const x2 = parseFloat(el.getAttribute('x2') || '0');
    const y2 = parseFloat(el.getAttribute('y2') || '0');
    return [{ x1, y1, x2, y2 }];
  }

  if (tag === 'path') {
    const d = el.getAttribute('d') || '';
    const segments: SegmentCoords[] = [];
    const commands = d.match(/[a-df-z][^a-df-z]*/gi) || [];
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;

    for (const cmdStr of commands) {
      const type = cmdStr[0];
      const nums = cmdStr
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat)
        .filter((n) => !isNaN(n));

      if (type === 'M' || type === 'm') {
        curX = type === 'M' ? nums[0] : curX + nums[0];
        curY = type === 'M' ? nums[1] : curY + nums[1];
        startX = curX;
        startY = curY;
        for (let i = 2; i < nums.length; i += 2) {
          const nextX = type === 'M' ? nums[i] : curX + nums[i];
          const nextY = type === 'M' ? nums[i + 1] : curY + nums[i + 1];
          segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
          curX = nextX;
          curY = nextY;
        }
      } else if (type === 'L' || type === 'l') {
        for (let i = 0; i < nums.length; i += 2) {
          const nextX = type === 'L' ? nums[i] : curX + nums[i];
          const nextY = type === 'L' ? nums[i + 1] : curY + nums[i + 1];
          segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
          curX = nextX;
          curY = nextY;
        }
      } else if (type === 'H' || type === 'h') {
        for (const num of nums) {
          const nextX = type === 'H' ? num : curX + num;
          segments.push({ x1: curX, y1: curY, x2: nextX, y2: curY });
          curX = nextX;
        }
      } else if (type === 'V' || type === 'v') {
        for (const num of nums) {
          const nextY = type === 'V' ? num : curY + num;
          segments.push({ x1: curX, y1: curY, x2: curX, y2: nextY });
          curY = nextY;
        }
      } else if (type === 'Z' || type === 'z') {
        if (curX !== startX || curY !== startY) {
          segments.push({ x1: curX, y1: curY, x2: startX, y2: startY });
        }
      }
    }
    return segments;
  }

  if (tag === 'polyline') {
    const raw = el.getAttribute('points') || '';
    const nums = raw
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
      .filter((n) => !isNaN(n));
    const segments: SegmentCoords[] = [];
    for (let i = 0; i < nums.length - 2; i += 2) {
      segments.push({ x1: nums[i], y1: nums[i + 1], x2: nums[i + 2], y2: nums[i + 3] });
    }
    return segments;
  }

  return [];
}

// Tính khoảng cách hình học ngắn nhất từ 1 điểm đến đoạn thẳng P1-P2
export function getPointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; projX: number; projY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      distance: Math.hypot(px - x1, py - y1),
      projX: x1,
      projY: y1,
    };
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const distance = Math.hypot(px - projX, py - projY);

  return { distance, projX, projY };
}

// Thuật toán Snap-to-Nearest: Tìm đoạn thẳng gần nhất trong bán kính quy đổi (25px màn hình)
export function findNearestLine(
  svg: SVGSVGElement,
  clickX: number,
  clickY: number,
  snapScreenRadius: number = 25
): { element: SVGGeometryElement; distance: number; clickPos: { x: number; y: number } } | null {
  const candidates = Array.from(
    svg.querySelectorAll('line, path, polyline')
  ) as SVGGeometryElement[];

  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const scale =
    viewBox && viewBox.width > 0 && svgRect.width > 0
      ? viewBox.width / svgRect.width
      : 1;

  // Quy đổi 25px màn hình thực sang đơn vị viewBox của SVG
  const thresholdSvg = snapScreenRadius * scale;

  let bestMatch: {
    element: SVGGeometryElement;
    distance: number;
    clickPos: { x: number; y: number };
  } | null = null;
  let minDistance = thresholdSvg;

  for (const el of candidates) {
    // Bỏ qua defs, ký hiệu góc vuông và vạch bằng nhau
    if (
      el.closest('defs') ||
      el.closest('.right-angle-marker') ||
      el.closest('.math-equal-mark')
    ) {
      continue;
    }

    // Bỏ qua vùng diện tích path khép kín có màu nền mà không có nét viền
    if (el.tagName.toLowerCase() === 'path') {
      const d = el.getAttribute('d') || '';
      const isClosed = /z\s*$/i.test(d);
      const stroke = el.getAttribute('stroke');
      const hasStroke = stroke && stroke !== 'none' && stroke !== 'transparent';
      if (isClosed && !hasStroke) continue;
    }

    const segments = getSegmentsFromElement(el);
    for (const seg of segments) {
      const res = getPointToSegmentDistance(clickX, clickY, seg.x1, seg.y1, seg.x2, seg.y2);
      if (res.distance <= minDistance) {
        minDistance = res.distance;
        bestMatch = {
          element: el,
          distance: res.distance,
          clickPos: { x: res.projX, y: res.projY },
        };
      }
    }
  }

  return bestMatch;
}

// Trích xuất và đặt tên thông minh danh sách phần tử (Semantic Layers Extractor)
export function extractSvgLayers(svg: SVGSVGElement): SvgLayerItem[] {
  const lines: SvgLayerItem[] = [];
  const labels: SvgLayerItem[] = [];
  const areas: SvgLayerItem[] = [];

  // 1. Thu thập danh sách các đỉnh từ thẻ <text>
  const vertices: { letter: string; x: number; y: number }[] = [];
  const textElements = Array.from(svg.querySelectorAll('text')) as SVGTextElement[];

  for (const textEl of textElements) {
    if (textEl.closest('defs')) continue;
    const rawText = (textEl.textContent || '').trim();
    if (!rawText) continue;

    let editId = textEl.getAttribute('data-edit-id');
    if (!editId) {
      editId = 'elem_' + Math.random().toString(36).substring(2, 9);
      textEl.setAttribute('data-edit-id', editId);
    }

    let x = parseFloat(textEl.getAttribute('x') || '0');
    let y = parseFloat(textEl.getAttribute('y') || '0');
    if (x === 0 && y === 0 && (textEl as SVGGraphicsElement).getBBox) {
      try {
        const bbox = (textEl as SVGGraphicsElement).getBBox();
        x = bbox.x + bbox.width / 2;
        y = bbox.y + bbox.height / 2;
      } catch {}
    }

    if (/^[A-Z]['’_0-9]?$/i.test(rawText)) {
      const upper = rawText.toUpperCase();
      vertices.push({ letter: upper, x, y });
      labels.push({
        id: editId,
        name: `Nhãn điểm ${upper}`,
        type: 'text',
        category: 'labels',
      });
    } else if (rawText.includes('°')) {
      labels.push({
        id: editId,
        name: `Góc ${rawText}`,
        type: 'text',
        category: 'labels',
      });
    } else if (/^\d/.test(rawText)) {
      labels.push({
        id: editId,
        name: `Số đo ${rawText}`,
        type: 'text',
        category: 'labels',
      });
    } else {
      labels.push({
        id: editId,
        name: `Nhãn "${rawText}"`,
        type: 'text',
        category: 'labels',
      });
    }
  }

  // 2. Ký hiệu góc vuông
  const angleMarkers = Array.from(svg.querySelectorAll('.right-angle-marker')) as SVGElement[];
  for (const marker of angleMarkers) {
    let editId = marker.getAttribute('data-edit-id');
    if (!editId) {
      editId = 'elem_' + Math.random().toString(36).substring(2, 9);
      marker.setAttribute('data-edit-id', editId);
    }

    let closestVertex = '';
    try {
      const bbox = (marker as SVGGraphicsElement).getBBox();
      let minVdist = 45;
      for (const v of vertices) {
        const d = Math.hypot(bbox.x - v.x, bbox.y - v.y);
        if (d < minVdist) {
          minVdist = d;
          closestVertex = v.letter;
        }
      }
    } catch {}

    labels.push({
      id: editId,
      name: closestVertex ? `Góc vuông (đỉnh ${closestVertex})` : 'Ký hiệu góc vuông',
      type: 'angle',
      category: 'labels',
    });
  }

  // 3. Đường thẳng & Cạnh
  const lineElements = Array.from(
    svg.querySelectorAll('line, path, polyline')
  ) as SVGGeometryElement[];
  let lineIdx = 1;

  for (const lineEl of lineElements) {
    if (
      lineEl.closest('defs') ||
      lineEl.closest('.right-angle-marker') ||
      lineEl.closest('.math-equal-mark')
    ) {
      continue;
    }

    const tag = lineEl.tagName.toLowerCase();
    let editId = lineEl.getAttribute('data-edit-id');
    if (!editId) {
      editId = 'elem_' + Math.random().toString(36).substring(2, 9);
      lineEl.setAttribute('data-edit-id', editId);
    }

    // Nhận diện vùng diện tích khép kín có tô màu
    if (tag === 'path') {
      const d = lineEl.getAttribute('d') || '';
      const isClosed = /z\s*$/i.test(d);
      const fill = lineEl.getAttribute('fill');
      const hasFill = fill && fill !== 'none' && fill !== 'transparent';
      if (isClosed && hasFill) {
        areas.push({
          id: editId,
          name: `Vùng diện tích #${areas.length + 1}`,
          type: 'polygon',
          category: 'areas',
        });
        continue;
      }
    }

    const segments = getSegmentsFromElement(lineEl);
    if (segments.length === 0) continue;

    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const x1 = firstSeg.x1;
    const y1 = firstSeg.y1;
    const x2 = lastSeg.x2;
    const y2 = lastSeg.y2;

    if (Math.hypot(x2 - x1, y2 - y1) < 3 && segments.length === 1) continue;

    // So khớp hai đầu mút với danh sách đỉnh
    let v1: { letter: string; dist: number } | null = null;
    let v2: { letter: string; dist: number } | null = null;

    for (const v of vertices) {
      const d1 = Math.hypot(x1 - v.x, y1 - v.y);
      const d2 = Math.hypot(x2 - v.x, y2 - v.y);
      if (d1 <= 60 && (!v1 || d1 < v1.dist)) {
        v1 = { letter: v.letter, dist: d1 };
      }
      if (d2 <= 60 && (!v2 || d2 < v2.dist)) {
        v2 = { letter: v.letter, dist: d2 };
      }
    }

    let lineName = '';
    if (v1 && v2 && v1.letter !== v2.letter) {
      lineName = `Cạnh ${[v1.letter, v2.letter].sort().join('')}`;
    } else if (v1) {
      const isH = Math.abs(y2 - y1) < 8;
      const isV = Math.abs(x2 - x1) < 8;
      if (isH) lineName = `Đường ngang qua ${v1.letter}`;
      else if (isV) lineName = `Đường dọc qua ${v1.letter}`;
      else lineName = `Đoạn thẳng qua ${v1.letter}`;
    } else if (v2) {
      const isH = Math.abs(y2 - y1) < 8;
      const isV = Math.abs(x2 - x1) < 8;
      if (isH) lineName = `Đường ngang qua ${v2.letter}`;
      else if (isV) lineName = `Đường dọc qua ${v2.letter}`;
      else lineName = `Đoạn thẳng qua ${v2.letter}`;
    } else {
      const isH = Math.abs(y2 - y1) < 8;
      const isV = Math.abs(x2 - x1) < 8;
      if (isH) lineName = `Đường gióng ngang #${lineIdx++}`;
      else if (isV) lineName = `Đường gióng đứng #${lineIdx++}`;
      else lineName = `Đoạn thẳng #${lineIdx++}`;
    }

    lines.push({
      id: editId,
      name: lineName,
      type: 'line',
      category: 'lines',
    });
  }

  // Khử trùng tên cho các đoạn thẳng
  const nameCounts = new Map<string, number>();
  for (const item of lines) {
    const count = (nameCounts.get(item.name) || 0) + 1;
    nameCounts.set(item.name, count);
  }
  const seenCounts = new Map<string, number>();
  for (const item of lines) {
    if ((nameCounts.get(item.name) || 0) > 1) {
      const c = (seenCounts.get(item.name) || 0) + 1;
      seenCounts.set(item.name, c);
      item.name = `${item.name} (${c})`;
    }
  }

  // 4. Vùng đa giác (<polygon>, <rect>)
  const polyElements = Array.from(svg.querySelectorAll('polygon, rect')) as SVGGeometryElement[];
  for (const polyEl of polyElements) {
    if (polyEl.closest('defs')) continue;
    let editId = polyEl.getAttribute('data-edit-id');
    if (!editId) {
      editId = 'elem_' + Math.random().toString(36).substring(2, 9);
      polyEl.setAttribute('data-edit-id', editId);
    }
    areas.push({
      id: editId,
      name: polyEl.tagName.toLowerCase() === 'rect' ? 'Hình chữ nhật' : `Vùng đa giác #${areas.length + 1}`,
      type: 'polygon',
      category: 'areas',
    });
  }

  return [...lines, ...labels, ...areas];
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
  const [selectedElementType, setSelectedElementType] = useState<'line' | 'polygon' | 'angle' | 'text' | null>(null);
  const lastClickCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Layers dropdown open state
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const layersDropdownRef = useRef<HTMLDivElement>(null);

  // Canvas Header Edit Slot Portal target
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      setPortalNode(null);
      return;
    }
    const node = document.getElementById('canvasHeaderEditSlot');
    if (node) {
      setPortalNode(node);
    } else {
      const id = requestAnimationFrame(() => {
        setPortalNode(document.getElementById('canvasHeaderEditSlot'));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isEditMode]);

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
        setIsLayersOpen(false);
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

  // 1. POINTER DOWN - Handles Dragging, Direct Selection & Snap-To-Nearest
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!isEditMode) return;
      const target = e.target as SVGElement;
      if (!target) return;

      // Don't trigger element selection if clicking inside toolbar, dropdown, or text popover
      const targetEl = target as Element;
      if (
        targetEl.closest('.editor-header-toolbar') ||
        targetEl.closest('#canvasHeaderEditSlot') ||
        targetEl.closest('.editor-layers-dropdown') ||
        targetEl.closest('.editor-text-input-popover')
      ) {
        return;
      }

      const mount = document.getElementById(mountContainerId);
      if (!mount) return;
      const svg = mount.querySelector('svg');
      if (!svg) return;

      // Lấy tọa độ click theo SVG viewBox
      const clickCoords = getSvgCoordinates(svg, e.clientX, e.clientY);

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

      // 1. Click vào Text -> kéo nhãn
      if (textTarget) {
        e.preventDefault();
        const initX = parseFloat(textTarget.getAttribute('x') || '0');
        const initY = parseFloat(textTarget.getAttribute('y') || '0');

        draggingRef.current = {
          element: textTarget,
          startX: clickCoords.x,
          startY: clickCoords.y,
          initX,
          initY,
          type: 'text',
        };
        textTarget.classList.add('opacity-70');
        return;
      }

      // 2. Click vào Circle đỉnh điểm -> kéo điểm
      if (circleTarget) {
        e.preventDefault();
        const initX = parseFloat(circleTarget.getAttribute('cx') || '0');
        const initY = parseFloat(circleTarget.getAttribute('cy') || '0');

        draggingRef.current = {
          element: circleTarget,
          startX: clickCoords.x,
          startY: clickCoords.y,
          initX,
          initY,
          type: 'circle',
        };
        circleTarget.classList.add('opacity-70');
        return;
      }

      // 3. Click vào Ký hiệu góc vuông -> chọn góc
      if (angleTarget) {
        e.preventDefault();
        const editId = getOrAssignEditId(angleTarget);
        setSelectedElementId(editId);
        setSelectedElementType('angle');
        return;
      }

      // 4. Click vào Vùng diện tích có tô màu -> chọn đa giác
      if (polygonTarget && target.tagName.toLowerCase() !== 'line') {
        const fill = polygonTarget.getAttribute('fill');
        if (fill && fill !== 'none' && fill !== 'transparent') {
          e.preventDefault();
          const editId = getOrAssignEditId(polygonTarget);
          setSelectedElementId(editId);
          setSelectedElementType('polygon');
          return;
        }
      }

      // 5. Click trực tiếp vào Đoạn thẳng / Đường nét
      if (lineTarget) {
        e.preventDefault();
        const editId = getOrAssignEditId(lineTarget);
        setSelectedElementId(editId);
        setSelectedElementType('line');
        lastClickCoordsRef.current = clickCoords;
        return;
      }

      // 6. THUẬT TOÁN SNAP-TO-NEAREST:
      // Khi click vào nền Canvas, khoảng trắng hoặc lân cận các đường nét:
      // Quét tìm đoạn thẳng gần nhất trong bán kính 25px màn hình
      const nearest = findNearestLine(svg, clickCoords.x, clickCoords.y, 25);
      if (nearest) {
        e.preventDefault();
        const editId = getOrAssignEditId(nearest.element);
        setSelectedElementId(editId);
        setSelectedElementType('line');
        lastClickCoordsRef.current = nearest.clickPos;
        return;
      }

      // Nếu click vượt quá bán kính 25px tới mọi đối tượng -> Hủy chọn
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
      if (target && !target.closest('.editor-layers-dropdown')) {
        setIsLayersOpen(false);
      }
      if (
        target &&
        !target.closest('#canvasHeaderEditSlot') &&
        !target.closest('.editor-header-toolbar') &&
        !target.closest('.editor-layers-dropdown') &&
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

  // Query live DOM for latest elements and layer items
  const mount = typeof document !== 'undefined' ? document.getElementById(mountContainerId) : null;
  const svg = mount?.querySelector('svg');
  const allLayers = svg ? extractSvgLayers(svg) : [];
  const lineLayers = allLayers.filter((l) => l.category === 'lines');
  const labelLayers = allLayers.filter((l) => l.category === 'labels');
  const areaLayers = allLayers.filter((l) => l.category === 'areas');
  const currentSelectedLayer = allLayers.find((l) => l.id === selectedElementId);
  const currentSelectedName = currentSelectedLayer?.name || null;

  const handleSelectLayer = (item: SvgLayerItem) => {
    setIsLayersOpen(false);
    setSelectedElementId(item.id);
    setSelectedElementType(item.type);
    if (item.type === 'line' && svg) {
      const el = svg.querySelector(`[data-edit-id="${item.id}"]`) as SVGElement | null;
      if (el) {
        const segments = getSegmentsFromElement(el);
        if (segments.length > 0) {
          lastClickCoordsRef.current = {
            x: (segments[0].x1 + segments[0].x2) / 2,
            y: (segments[0].y1 + segments[0].y2) / 2,
          };
        }
      }
    }
  };

  const renderLayersDropdown = () => (
    <div className="relative editor-layers-dropdown shrink-0" ref={layersDropdownRef}>
      <button
        type="button"
        onClick={() => setIsLayersOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none border ${
          selectedElementId
            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}
        title="Danh sách đối tượng (Cạnh, điểm, nhãn...)"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span className="max-w-[130px] truncate font-semibold">
          {currentSelectedName ? currentSelectedName : 'Chọn đối tượng'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isLayersOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isLayersOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-64 max-h-72 overflow-y-auto bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Tự động / Bỏ chọn */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsLayersOpen(false);
                deselectElement();
              }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition cursor-pointer ${
                !selectedElementId
                  ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="truncate">Tự động / Bỏ chọn</span>
              {!selectedElementId && <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />}
            </button>
          </div>

          {/* 1. Đoạn thẳng & Cạnh */}
          {lineLayers.length > 0 && (
            <div className="py-1">
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                📐 Đoạn thẳng & Cạnh ({lineLayers.length})
              </div>
              {lineLayers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectLayer(item)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition cursor-pointer ${
                    selectedElementId === item.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  {selectedElementId === item.id && (
                    <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 2. Nhãn & Ký hiệu */}
          {labelLayers.length > 0 && (
            <div className="py-1">
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                🏷️ Nhãn & Ký hiệu ({labelLayers.length})
              </div>
              {labelLayers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectLayer(item)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition cursor-pointer ${
                    selectedElementId === item.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  {selectedElementId === item.id && (
                    <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 3. Vùng diện tích */}
          {areaLayers.length > 0 && (
            <div className="py-1">
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                🎨 Vùng diện tích ({areaLayers.length})
              </div>
              {areaLayers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectLayer(item)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition cursor-pointer ${
                    selectedElementId === item.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  {selectedElementId === item.id && (
                    <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {lineLayers.length === 0 && labelLayers.length === 0 && areaLayers.length === 0 && (
            <div className="px-3 py-3 text-center text-[11px] text-slate-400">
              Chưa tìm thấy phần tử nào
            </div>
          )}
        </div>
      )}
    </div>
  );

  // THANH ĐỊNH DẠNG HOÁN ĐỔI VÀO HEADER NGOÀI CANVAS (Word-Style Shape Format Bar)
  const renderHeaderToolbar = () => (
    <div className="editor-header-toolbar w-full flex items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-200 min-h-[36px]">
      {/* Cụm chức năng bên trái: Dropdown chọn đối tượng & Các công cụ định dạng */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-visible">
        {/* Dropdown Bộ chọn đối tượng (Layers selector) */}
        {renderLayersDropdown()}

        {/* Chưa chọn đối tượng: Hướng dẫn ngắn */}
        {!selectedElementId ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium select-none truncate">
            <span className="hidden md:inline">✏️ Click vào đường nét để chỉnh sửa hoặc kéo điểm để di chuyển</span>
            <span className="md:hidden">✏️ Click đối tượng để sửa</span>
          </div>
        ) : (
          /* Đã chọn đối tượng: Thanh công cụ định dạng Shape Format */
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            {/* Controls cho ĐƯỜNG NÉT */}
            {selectedElementType === 'line' && (
              <>
                {/* 1. Kiểu nét: Liền / Đứt */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateElementStyle('stroke-dasharray', '')}
                    className={`py-1 px-2.5 rounded-lg font-medium text-xs transition cursor-pointer ${
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
                    className={`py-1 px-2.5 rounded-lg font-medium text-xs transition cursor-pointer ${
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
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  {['1', '1.5', '2', '3'].map((w) => {
                    const isActive = activeAttrs?.strokeWidth === w || (!activeAttrs?.strokeWidth && w === '1.5');
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateElementStyle('stroke-width', w)}
                        className={`py-1 px-2 rounded-lg font-mono text-xs transition cursor-pointer ${
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
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
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
                <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleTicksOnSelectedLine}
                    className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Đánh dấu vạch bằng nhau (1 vạch / 2 vạch / Xóa)"
                  >
                    <Equal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="hidden sm:inline">= Vạch //</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddRightAngleToSelectedLine}
                    className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Chèn ký hiệu góc vuông tại đỉnh gần nhất của đường này"
                  >
                    <SquareCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="hidden sm:inline">⟂ Góc vuông</span>
                  </button>
                </div>
              </>
            )}

            {/* Controls cho ĐA GIÁC / VÙNG DIỆN TÍCH */}
            {selectedElementType === 'polygon' && (
              <>
                <div className="flex items-center gap-1 font-semibold text-xs text-amber-600 dark:text-amber-400 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <span>🎨 Vùng:</span>
                </div>
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
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
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition cursor-pointer ${
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
                <div className="flex items-center gap-1 font-semibold text-xs text-indigo-600 dark:text-indigo-400 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <span>📐 Ký hiệu góc</span>
                </div>
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={handleRotateSelectedAngle}
                    className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Xoay góc 90°</span>
                  </button>
                </div>
              </>
            )}

            {/* Controls cho NHÃN CHỮ */}
            {selectedElementType === 'text' && (
              <>
                <div className="flex items-center gap-1 font-semibold text-xs text-emerald-600 dark:text-emerald-400 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  <span>🏷️ Chữ:</span>
                </div>
                <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                  {[
                    { color: '#0f172a', title: 'Đen' },
                    { color: '#2563eb', title: 'Xanh dương' },
                    { color: '#dc2626', title: 'Đỏ' },
                    { color: '#ea580c', title: 'Cam' },
                    { color: '#16a34a', title: 'Xanh lá' },
                  ].map((c) => {
                    const isSelected = activeAttrs?.fill.toLowerCase() === c.color.toLowerCase();
                    return (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => updateElementStyle('fill', c.color)}
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
              </>
            )}

            {/* Xóa phần tử */}
            <button
              type="button"
              onClick={deleteSelectedElement}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
              title="Xóa phần tử này (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Bỏ chọn */}
            <button
              type="button"
              onClick={deselectElement}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="Bỏ chọn (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Cụm bên phải: Undo / Redo & Hoàn tất */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-800">
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

        <button
          type="button"
          onClick={onCloseEditMode}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          title="Lưu các thay đổi và thoát chế độ chỉnh sửa"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Hoàn tất</span>
        </button>
      </div>
    </div>
  );

  const targetSlot =
    portalNode || (typeof document !== 'undefined' ? document.getElementById('canvasHeaderEditSlot') : null);

  return (
    <>
      {/* 1. THANH ĐỊNH DẠNG HOÁN ĐỔI VÀO HEADER NGOÀI CANVAS QUA REACT PORTAL */}
      {targetSlot && createPortal(renderHeaderToolbar(), targetSlot)}

      {/* 2. HIỆU ỨNG VÀ OVERLAY TRÊN CANVAS (HOÀN TOÀN KHÔNG CÓ THANH CÔNG CỤ NỔI NÀO CHE HÌNH) */}
      <div ref={editorRootRef} className="absolute inset-0 pointer-events-none z-30">
        {/* Hiệu ứng viền phát sáng nhẹ cho phần tử đang được chọn tinh chỉnh */}
        {selectedElementId && (
          <style>{`
            [data-edit-id="${selectedElementId}"] {
              filter: drop-shadow(0 0 3.5px #06b6d4) !important;
            }
          `}</style>
        )}

        {/* INLINE TEXT INPUT POPOVER KHI DOUBLE CLICK TEXT */}
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
    </>
  );
};

export default InteractiveSvgEditor;
