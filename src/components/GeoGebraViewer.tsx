"use client";
import React, { useEffect, useRef, useState } from "react";

interface GeoGebraViewerProps {
  commands: string[] | string;
  width?: number;
  height?: number;
  onAppletReady?: (api: any) => void;
}

declare global {
  interface Window {
    GGBApplet: any;
    ggbApplet: any;
  }
}

export const GeoGebraViewer: React.FC<GeoGebraViewerProps> = ({
  commands,
  width = 800,
  height = 500,
  onAppletReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [appletId] = useState(() => `ggb_${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const initGgb = () => {
      if (typeof window === "undefined" || !window.GGBApplet || !containerRef.current) {
        timer = setTimeout(initGgb, 300);
        return;
      }

      const cmdList = Array.isArray(commands)
        ? commands
        : commands.split("\n").map((c) => c.trim()).filter(Boolean);

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
          try {
            api.reset();
            // Thực thi từng lệnh GeoGebra
            cmdList.forEach((cmd) => {
              const cleanCmd = cmd.trim();
              if (cleanCmd && !cleanCmd.startsWith("//") && !cleanCmd.startsWith("#")) {
                api.evalCommand(cleanCmd);
              }
            });

            // Căn chỉnh khung nhìn tự động
            api.evalCommand("ZoomIn()");
            setIsLoaded(true);
            if (onAppletReady) {
              onAppletReady(api);
            }
          } catch (err) {
            console.warn("[GeoGebra Applet Load Error]:", err);
          }
        },
      };

      try {
        const applet = new window.GGBApplet(params, true);
        applet.inject(containerRef.current);
      } catch (err) {
        console.error("[GeoGebra Injection Error]:", err);
      }
    };

    initGgb();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [commands, width, height, appletId, onAppletReady]);

  return (
    <div className="w-full flex flex-col justify-center items-center rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner relative min-h-[400px]">
      <div ref={containerRef} id={appletId} className="max-w-full flex justify-center items-center overflow-auto" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-xs text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            Đang khởi tạo GeoGebra Applet...
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoGebraViewer;
