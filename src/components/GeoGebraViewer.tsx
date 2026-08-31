"use client";
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Download, FileCode, FileImage, Check, RotateCcw } from "lucide-react";

export interface GeoGebraViewerRef {
  exportSVG: () => string | null;
  exportPNG: () => Promise<string | null>;
  exportTikZ: () => string | null;
  resetView: () => void;
  getApplet: () => any;
}

interface GeoGebraViewerProps {
  commands: string[] | string;
  width?: number;
  height?: number;
  showExportToolbar?: boolean;
  onAppletReady?: (api: any) => void;
  onSVGExported?: (svgString: string) => void;
}

declare global {
  interface Window {
    GGBApplet: any;
    ggbApplet: any;
  }
}

export const GeoGebraViewer = forwardRef<GeoGebraViewerRef, GeoGebraViewerProps>(({
  commands,
  width = 800,
  height = 500,
  showExportToolbar = true,
  onAppletReady,
  onSVGExported,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [appletApi, setAppletApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [appletId] = useState(() => `ggb_${Math.random().toString(36).slice(2, 9)}`);

  // Expose export methods via Ref
  useImperativeHandle(ref, () => ({
    exportSVG: () => {
      if (!appletApi) return null;
      try {
        if (typeof appletApi.exportSVG === "function") {
          return appletApi.exportSVG();
        }
      } catch (e) {
        console.warn("GeoGebra SVG export fallback:", e);
      }
      return null;
    },
    exportPNG: async () => {
      if (!appletApi) return null;
      try {
        if (typeof appletApi.getPNGBase64 === "function") {
          const base64 = appletApi.getPNGBase64(1, true);
          return `data:image/png;base64,${base64}`;
        }
      } catch (e) {
        console.warn("GeoGebra PNG export fallback:", e);
      }
      return null;
    },
    exportTikZ: () => {
      if (!appletApi) return null;
      try {
        if (typeof appletApi.exportTikZ === "function") {
          return appletApi.exportTikZ();
        }
      } catch (e) {
        console.warn("GeoGebra TikZ export fallback:", e);
      }
      return null;
    },
    resetView: () => {
      if (appletApi) {
        appletApi.evalCommand("ZoomIn()");
      }
    },
    getApplet: () => appletApi,
  }));

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const cmdList = Array.isArray(commands)
      ? commands
      : commands.split("\n").map((c) => c.trim()).filter(Boolean);

    const initApplet = () => {
      if (!window.GGBApplet || !containerRef.current) return;

      try {
        containerRef.current.innerHTML = "";
        const params = {
          id: appletId,
          appName: "geometry",
          width: width,
          height: height,
          showToolBar: false,
          showAlgebraInput: false,
          showMenuBar: false,
          showResetIcon: false,
          enableLabelDrags: true,
          enableShiftDragZoom: true,
          enableRightClick: false,
          showToolBarHelp: false,
          errorDialogsActive: false,
          useBrowserForJS: false,
          appletOnLoad: (api: any) => {
            if (!isMounted) return;
            try {
              api.reset();
              cmdList.forEach((cmd) => {
                const cleanCmd = cmd.trim();
                if (cleanCmd && !cleanCmd.startsWith("//") && !cleanCmd.startsWith("#")) {
                  api.evalCommand(cleanCmd);
                }
              });
              api.evalCommand("ZoomIn()");
              setAppletApi(api);
              if (onAppletReady) onAppletReady(api);
              if (onSVGExported && typeof api.exportSVG === "function") {
                try {
                  const svg = api.exportSVG();
                  if (svg) onSVGExported(svg);
                } catch (e) {}
              }
            } catch (e) {
              console.error("Lỗi thực thi lệnh GeoGebra:", e);
            } finally {
              if (isMounted) setLoading(false);
            }
          },
        };

        const applet = new window.GGBApplet(params, true);
        applet.inject(containerRef.current);
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Không thể khởi tạo GeoGebra");
          setLoading(false);
        }
      }
    };

    // Tự động tải script nếu chưa có
    if (typeof window !== "undefined") {
      if (!window.GGBApplet) {
        const existingScript = document.querySelector('script[src*="deployggb.js"]');
        if (!existingScript) {
          const script = document.createElement("script");
          script.src = "https://www.geogebra.org/apps/deployggb.js";
          script.async = true;
          script.onload = () => {
            if (isMounted) initApplet();
          };
          script.onerror = () => {
            if (isMounted) {
              setError("Không thể tải thư viện GeoGebra từ CDN");
              setLoading(false);
            }
          };
          document.body.appendChild(script);
        } else {
          const checkTimer = setInterval(() => {
            if (window.GGBApplet) {
              clearInterval(checkTimer);
              if (isMounted) initApplet();
            }
          }, 200);
        }
      } else {
        initApplet();
      }
    }

    // Timeout bảo vệ 10s
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [commands, width, height, appletId, onAppletReady, onSVGExported]);

  const handleDownloadSVG = () => {
    if (!appletApi) return;
    try {
      let svg = "";
      if (typeof appletApi.exportSVG === "function") {
        svg = appletApi.exportSVG();
      }
      if (!svg) return;

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mathviz-geogebra-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download SVG error:", e);
    }
  };

  const handleDownloadPNG = () => {
    if (!appletApi) return;
    try {
      if (typeof appletApi.getPNGBase64 === "function") {
        const base64 = appletApi.getPNGBase64(1, true);
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${base64}`;
        link.download = `mathviz-geogebra-${Date.now()}.png`;
        link.click();
      }
    } catch (e) {
      console.error("Download PNG error:", e);
    }
  };

  const handleExportTikZ = () => {
    if (!appletApi) return;
    try {
      let tikz = "";
      if (typeof appletApi.exportTikZ === "function") {
        tikz = appletApi.exportTikZ();
      }
      if (tikz) {
        navigator.clipboard.writeText(tikz);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error("Export TikZ error:", e);
    }
  };

  return (
    <div className="relative w-full flex flex-col justify-center items-center rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[500px]">
      {/* Top Embedded Controls */}
      {showExportToolbar && !loading && (
        <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs z-20">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>GeoGebra Geometry Interactive</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => appletApi?.evalCommand("ZoomIn()")}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Căn vừa khung nhìn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDownloadSVG}
              className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 transition flex items-center gap-1"
              title="Tải ảnh vector SVG từ GeoGebra"
            >
              <Download className="w-3 h-3" />
              <span>Tải SVG</span>
            </button>
            <button
              onClick={handleDownloadPNG}
              className="px-2 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-medium border border-cyan-200 dark:border-cyan-800 transition flex items-center gap-1"
              title="Tải ảnh PNG độ nét cao"
            >
              <FileImage className="w-3 h-3" />
              <span>Tải PNG</span>
            </button>
            <button
              onClick={handleExportTikZ}
              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
              title="Sao chép mã TikZ LaTeX"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <FileCode className="w-3 h-3" />}
              <span>{copied ? "Đã chép TikZ" : "Xuất TikZ"}</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 gap-3 text-slate-600 dark:text-slate-300">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Đang khởi tạo GeoGebra Engine & dựng hình...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-red-500 font-medium">
          {error}
        </div>
      )}

      {/* Applet Viewport */}
      <div className="w-full flex-1 flex justify-center items-center p-2 overflow-auto relative">
        <div ref={containerRef} id={appletId} className="max-w-full flex justify-center items-center" />
      </div>
    </div>
  );
});

GeoGebraViewer.displayName = "GeoGebraViewer";
export default GeoGebraViewer;
