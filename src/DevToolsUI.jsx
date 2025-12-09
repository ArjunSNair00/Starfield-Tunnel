// DevToolsUI.jsx
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useDevTools } from "./DevToolsProvider";

const PX_PER_SECOND = 40;         // fixed horizontal scale
const PANEL_HEIGHT = 260;         // slightly taller than before

export function DevToolsUI() {
  const {
    speedPoints,
    setSpeedPoints,
    songDuration,
    timeRef,
    getSpeedAt,
    exportJSON,
    importJSON,
    lastSave,
  } = useDevTools();

  const [localTime, setLocalTime] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const trackRef = useRef(null);
  const draggingIdRef = useRef(null);

  // Playhead updater
  useEffect(() => {
    let frame;
    const loop = () => {
      setLocalTime(timeRef.current || 0);
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [timeRef]);

  const timelineWidth = useMemo(
    () => songDuration * PX_PER_SECOND,
    [songDuration]
  );

  // Slightly increased vertical range
  const { minV, maxV } = useMemo(() => {
    if (!speedPoints.length) return { minV: 0, maxV: 12 };

    let min = speedPoints[0].v;
    let max = speedPoints[0].v;

    for (const p of speedPoints) {
      if (p.v < min) min = p.v;
      if (p.v > max) max = p.v;
    }

    // Very small padding (NOT huge)
    min -= 0.5;
    max += 1.5;

    return { minV: min, maxV: max };
  }, [speedPoints]);

  const valueToY = useCallback(
    (v) => {
      const h = PANEL_HEIGHT - 40;
      const range = maxV - minV || 1;
      const norm = (v - minV) / range;
      return (PANEL_HEIGHT - 30) - norm * h;
    },
    [minV, maxV]
  );

  const timeToX = useCallback(
    (t) => t * PX_PER_SECOND,
    []
  );

  const xToTime = useCallback(
    (x) => {
      const t = x / PX_PER_SECOND;
      return Math.max(0, Math.min(songDuration, t));
    },
    [songDuration]
  );

  const yToValue = useCallback(
    (y) => {
      const rectTop = 20;
      const h = PANEL_HEIGHT - 40;
      const clampedY = Math.min(PANEL_HEIGHT - 20, Math.max(rectTop, y));
      const norm = 1 - (clampedY - rectTop) / h;
      const range = maxV - minV || 1;
      return minV + norm * range;
    },
    [minV, maxV]
  );

  // Add point on double click
  const handleTrackDoubleClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = xToTime(x);
    const v = getSpeedAt(t);

    const newPoint = {
      id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      t,
      v,
    };

    setSpeedPoints((prev) => {
      const list = [...prev, newPoint];
      list.sort((a, b) => a.t - b.t);
      return list;
    });
  };

  // Dragging logic
  useEffect(() => {
    function onMove(e) {
      const id = draggingIdRef.current;
      if (!id || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const t = xToTime(x);
      const v = yToValue(y);

      setSpeedPoints((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, t, v } : p
        );
        updated.sort((a, b) => a.t - b.t);
        return updated;
      });
    }

    function onUp() {
      draggingIdRef.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setSpeedPoints, xToTime, yToValue]);

  const handlePointMouseDown = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    draggingIdRef.current = id;
  };

  const handlePointContextMenu = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSpeedPoints((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCopyJSON = async () => {
    const data = exportJSON();
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert("Timeline JSON copied!");
    } catch {
      alert("Clipboard failed — JSON printed in console.");
      console.log(text);
    }
  };

  const handleDownloadJSON = () => {
    const data = exportJSON();
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "timeline.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result);
          if (importJSON(data)) {
            alert("Timeline imported successfully!");
          } else {
            alert("Invalid timeline JSON format");
          }
        } catch (err) {
          alert("Failed to parse JSON: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const savedRecently = Date.now() - lastSave < 1500;

  const pathD = useMemo(() => {
    if (!speedPoints.length) return "";
    return speedPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${timeToX(p.t)} ${valueToY(p.v)}`)
      .join(" ");
  }, [speedPoints, timeToX, valueToY]);

  const playheadX = timeToX(localTime);

  if (isCollapsed) {
    return (
      <div
        style={{
          position: "fixed",
          left: 10,
          bottom: 10,
          zIndex: 10000,
          background: "rgba(10,10,20,0.9)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
        }}
        onClick={() => setIsCollapsed(false)}
      >
        ⬆ Timeline (t = {localTime.toFixed(1)}s)
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: PANEL_HEIGHT + 40,
        background: "rgba(5, 5, 15, 0.95)",
        backdropFilter: "blur(10px)",
        color: "#ffffff",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "4px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
        }}
      >
        <strong>Camera Speed Timeline</strong>
        <span style={{ opacity: 0.7 }}>
          (dbl-click to add · drag to move · right-click to delete)
        </span>

        <span style={{ marginLeft: "auto", opacity: 0.8 }}>
          t = {localTime.toFixed(2)}s
        </span>

        <span
          style={{
            opacity: savedRecently ? 1 : 0.4,
            fontSize: 10,
            transition: "opacity 0.3s",
          }}
        >
          {savedRecently ? "✓ Saved" : ""}
        </span>

        <button
          onClick={handleCopyJSON}
          style={{
            padding: "2px 6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Copy
        </button>

        <button
          onClick={handleDownloadJSON}
          style={{
            padding: "2px 6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Export
        </button>

        <button
          onClick={handleImportJSON}
          style={{
            padding: "2px 6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Import
        </button>

        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            padding: "2px 6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          ⬇
        </button>
      </div>

      {/* Scrollable area */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",   // ENABLED vertical scrolling
          paddingBottom: 8,
        }}
      >
        <div
          ref={trackRef}
          onDoubleClick={handleTrackDoubleClick}
          style={{
            position: "relative",
            width: timelineWidth,
            height: PANEL_HEIGHT,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(0,0,0,0.8))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
          }}
        >
          <svg
            width={timelineWidth}
            height={PANEL_HEIGHT}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {/* 5 second grid */}
            {Array.from({ length: Math.floor(songDuration / 5) + 2 }).map(
              (_, i) => {
                const t = i * 5;
                const x = timeToX(t);
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      x2={x}
                      y1={0}
                      y2={PANEL_HEIGHT}
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <text
                      x={x + 2}
                      y={12}
                      fill="rgba(255,255,255,0.5)"
                      fontSize="10"
                    >
                      {t}s
                    </text>
                  </g>
                );
              }
            )}

            {/* midline */}
            <line
              x1={0}
              x2={timelineWidth}
              y1={valueToY((minV + maxV) / 2)}
              y2={valueToY((minV + maxV) / 2)}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
            />

            {/* curve */}
            <path d={pathD} fill="none" stroke="#ff4ecb" strokeWidth={2} />

            {/* playhead */}
            <line
              x1={playheadX}
              x2={playheadX}
              y1={0}
              y2={PANEL_HEIGHT}
              stroke="#00e5ff"
              strokeWidth={1.5}
            />
          </svg>

          {/* points */}
          {speedPoints.map((p) => {
            const x = timeToX(p.t);
            const y = valueToY(p.v);
            return (
              <div
                key={p.id}
                onMouseDown={(e) => handlePointMouseDown(e, p.id)}
                onContextMenu={(e) => handlePointContextMenu(e, p.id)}
                style={{
                  position: "absolute",
                  left: x - 6,
                  top: y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#ff4ecb",
                  border: "1px solid #fff",
                  cursor: "grab",
                  boxShadow: "0 0 10px rgba(255,78,203,0.8)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DevToolsUI;
