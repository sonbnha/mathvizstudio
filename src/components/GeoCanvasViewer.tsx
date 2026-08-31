"use client";
import React, { useMemo } from "react";
import { GeoSolver } from "@/lib/geometrySolver";

interface GeoCanvasViewerProps {
  script?: string;
  svg?: string;
  isEditMode?: boolean;
  className?: string;
}

export const GeoCanvasViewer: React.FC<GeoCanvasViewerProps> = ({
  script,
  svg,
  isEditMode = false,
  className = "",
}) => {
  const renderedSvg = useMemo(() => {
    if (svg && svg.includes("<svg")) {
      return svg;
    }
    if (script && script.trim()) {
      return GeoSolver.execute(script);
    }
    return "";
  }, [script, svg]);

  if (!renderedSvg) {
    return null;
  }

  return (
    <div
      id="svgMount"
      className={`w-full h-full flex items-center justify-center min-h-[360px] max-h-[460px] [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-[420px] [&>svg]:object-contain ${
        isEditMode
          ? "[&_path]:pointer-events-none [&_line]:pointer-events-none [&_polyline]:pointer-events-none [&_polygon]:pointer-events-none [&_rect]:pointer-events-none [&_circle]:pointer-events-none [&_image]:pointer-events-none [&_text]:pointer-events-auto [&_text]:cursor-grab [&_text:active]:cursor-grabbing [&_text:hover]:outline [&_text:hover]:outline-2 [&_text:hover]:outline-dashed [&_text:hover]:outline-cyan-500 [&_text]:select-none"
          : ""
      } ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedSvg }}
    />
  );
};

export default GeoCanvasViewer;
