import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";

// Default speed keyframes (t in seconds, v as speed)
const DEFAULT_KEYFRAMES = [
  { t: 0, v: 0, mode: "linear" },
  { t: 2, v: 10, mode: "linear" },
  { t: 5, v: 3, mode: "easeOut" },
  { t: 8, v: 15, mode: "easeIn" },
  { t: 12, v: 6, mode: "linear" },
];

const DevToolsContext = createContext(null);

export function DevToolsProvider({ children }) {
  const [keyframes, setKeyframes] = useState(DEFAULT_KEYFRAMES);
  const [exportText, setExportText] = useState("");
  const timeRef = useRef(0); // optional: used if you want to show current time

  // Sort keyframes by time whenever they change
  const sortedKeyframes = useMemo(() => {
    return [...keyframes].sort((a, b) => a.t - b.t);
  }, [keyframes]);

  const getSpeedAt = useCallback(
    (t) => {
      if (!sortedKeyframes.length) return 0;
      if (t <= sortedKeyframes[0].t) return sortedKeyframes[0].v;
      if (t >= sortedKeyframes[sortedKeyframes.length - 1].t)
        return sortedKeyframes[sortedKeyframes.length - 1].v;

      // find segment
      for (let i = 0; i < sortedKeyframes.length - 1; i++) {
        const k1 = sortedKeyframes[i];
        const k2 = sortedKeyframes[i + 1];
        if (t >= k1.t && t <= k2.t) {
          const p = (t - k1.t) / (k2.t - k1.t);
          let shaped = p;
          if (k1.mode === "easeIn") shaped = p * p;
          else if (k1.mode === "easeOut") shaped = 1 - (1 - p) * (1 - p);
          return k1.v + (k2.v - k1.v) * shaped;
        }
      }

      return sortedKeyframes[sortedKeyframes.length - 1].v;
    },
    [sortedKeyframes]
  );

  const exportTimeline = useCallback(() => {
    const json = JSON.stringify(sortedKeyframes, null, 2);
    setExportText(json);
    console.log("Timeline JSON:", json);
  }, [sortedKeyframes]);

  const importTimeline = useCallback((jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        alert("Imported JSON must be an array of keyframes.");
        return;
      }
      const cleaned = parsed
        .map((k) => ({
          t: Number(k.t),
          v: Number(k.v),
          mode: k.mode === "easeIn" || k.mode === "easeOut" ? k.mode : "linear",
        }))
        .filter((k) => !Number.isNaN(k.t) && !Number.isNaN(k.v));

      if (!cleaned.length) {
        alert("No valid keyframes found in JSON.");
        return;
      }

      setKeyframes(cleaned);
    } catch (err) {
      console.error(err);
      alert("Failed to parse JSON. Check the console for details.");
    }
  }, []);

  const value = {
    keyframes,
    setKeyframes,
    sortedKeyframes,
    getSpeedAt,
    timeRef,
    exportTimeline,
    importTimeline,
    exportText,
    setExportText,
  };

  return (
    <DevToolsContext.Provider value={value}>
      {children}
    </DevToolsContext.Provider>
  );
}

export function useDevTools() {
  const ctx = useContext(DevToolsContext);
  if (!ctx) {
    throw new Error("useDevTools must be used inside DevToolsProvider");
  }
  return ctx;
}

// =========================================================================================
// DevToolsUI – floating speed timeline editor
// =========================================================================================

export function DevToolsUI() {
  const {
    keyframes,
    setKeyframes,
    sortedKeyframes,
    exportTimeline,
    importTimeline,
    exportText,
    setExportText,
    timeRef,
  } = useDevTools();

  const [show, setShow] = useState(true);

  const handleChangeKF = (index, field, value) => {
    setKeyframes((prev) => {
      const copy = [...prev];
      const k = { ...copy[index] };
      if (field === "t" || field === "v") {
        k[field] = Number(value);
      } else if (field === "mode") {
        k.mode = value;
      }
      copy[index] = k;
      return copy;
    });
  };

  const handleAddKF = () => {
    const last = sortedKeyframes[sortedKeyframes.length - 1] || {
      t: 0,
      v: 0,
      mode: "linear",
    };
    setKeyframes((prev) => [
      ...prev,
      { t: last.t + 2, v: last.v, mode: last.mode },
    ]);
  };

  const handleDeleteKF = (index) => {
    setKeyframes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setKeyframes(DEFAULT_KEYFRAMES);
  };

  // Simple SVG graph (just a visual; editing is via inputs)
  const svgWidth = 260;
  const svgHeight = 120;

  const [minT, maxT, minV, maxV] = useMemo(() => {
    if (!sortedKeyframes.length) return [0, 1, 0, 1];
    const ts = sortedKeyframes.map((k) => k.t);
    const vs = sortedKeyframes.map((k) => k.v);
    const minT = Math.min(...ts);
    const maxT = Math.max(...ts);
    const minV = Math.min(...vs);
    const maxV = Math.max(...vs);
    const padT = (maxT - minT || 1) * 0.1;
    const padV = (maxV - minV || 1) * 0.1;
    return [minT - padT, maxT + padT, minV - padV, maxV + padV];
  }, [sortedKeyframes]);

  const mapX = (t) =>
    ((t - minT) / (maxT - minT || 1)) * (svgWidth - 40) + 20;
  const mapY = (v) =>
    svgHeight - (((v - minV) / (maxV - minV || 1)) * (svgHeight - 40) + 20);

  const polylinePoints = sortedKeyframes
    .map((k) => `${mapX(k.t)},${mapY(k.v)}`)
    .join(" ");

  return (
    <div
      style={{
        position: "fixed",
        right: 10,
        bottom: 10,
        width: show ? 320 : 120,
        maxHeight: show ? 320 : 40,
        background: "rgba(0,0,0,0.85)",
        border: "1px solid #444",
        borderRadius: 8,
        color: "#eee",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        zIndex: 99999,
        overflow: "hidden",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setShow((s) => !s)}
      >
        <span style={{ fontWeight: 600 }}>Timeline (Speed)</span>
        <span style={{ opacity: 0.7 }}>
          {show ? "▼" : "▲"}
        </span>
      </div>

      {show && (
        <div style={{ padding: 8, display: "flex", gap: 8, flexDirection: "column" }}>
          {/* Small SVG timeline preview */}
          <div>
            <svg
              width={svgWidth}
              height={svgHeight}
              style={{
                background: "#111",
                borderRadius: 4,
                border: "1px solid #333",
              }}
            >
              {/* axes */}
              <line
                x1={20}
                y1={svgHeight - 20}
                x2={svgWidth - 20}
                y2={svgHeight - 20}
                stroke="#444"
                strokeWidth={1}
              />
              <line
                x1={20}
                y1={20}
                x2={20}
                y2={svgHeight - 20}
                stroke="#444"
                strokeWidth={1}
              />

              {polylinePoints && (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#ff4ecb"
                  strokeWidth={2}
                />
              )}

              {sortedKeyframes.map((k, i) => (
                <circle
                  key={i}
                  cx={mapX(k.t)}
                  cy={mapY(k.v)}
                  r={3}
                  fill={
                    k.mode === "linear"
                      ? "#ff4ecb"
                      : k.mode === "easeIn"
                      ? "#4effcb"
                      : "#ffd24e"
                  }
                />
              ))}
            </svg>
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>
              Time vs Speed (preview only)
              {timeRef?.current != null && (
                <span style={{ float: "right" }}>
                  t ≈ {timeRef.current.toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          {/* Keyframe list */}
          <div
            style={{
              maxHeight: 120,
              overflowY: "auto",
              border: "1px solid #333",
              borderRadius: 4,
              padding: 4,
            }}
          >
            {keyframes.map((kf, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ width: 18, opacity: 0.6 }}>{i}</span>
                <input
                  type="number"
                  step="0.1"
                  value={kf.t}
                  onChange={(e) => handleChangeKF(i, "t", e.target.value)}
                  style={{
                    width: 60,
                    background: "#111",
                    color: "#eee",
                    border: "1px solid #333",
                    borderRadius: 3,
                    padding: "2px 4px",
                    fontSize: 11,
                  }}
                />
                <input
                  type="number"
                  step="0.1"
                  value={kf.v}
                  onChange={(e) => handleChangeKF(i, "v", e.target.value)}
                  style={{
                    width: 60,
                    background: "#111",
                    color: "#eee",
                    border: "1px solid #333",
                    borderRadius: 3,
                    padding: "2px 4px",
                    fontSize: 11,
                  }}
                />
                <select
                  value={kf.mode}
                  onChange={(e) => handleChangeKF(i, "mode", e.target.value)}
                  style={{
                    background: "#111",
                    color: "#eee",
                    border: "1px solid #333",
                    borderRadius: 3,
                    padding: "2px 4px",
                    fontSize: 11,
                  }}
                >
                  <option value="linear">linear</option>
                  <option value="easeIn">easeIn</option>
                  <option value="easeOut">easeOut</option>
                </select>
                <button
                  onClick={() => handleDeleteKF(i)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f66",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAddKF}
              style={{
                flex: 1,
                background: "#222",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: 4,
                padding: "4px 6px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              + Add keyframe
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                background: "#222",
                color: "#ff8b8b",
                border: "1px solid #444",
                borderRadius: 4,
                padding: "4px 6px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>

          {/* Export / Import JSON */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <button
                onClick={exportTimeline}
                style={{
                  flex: 1,
                  background: "#222",
                  color: "#ff4ecb",
                  border: "1px solid #444",
                  borderRadius: 4,
                  padding: "4px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Export JSON
              </button>
              <button
                onClick={() => importTimeline(exportText)}
                style={{
                  flex: 1,
                  background: "#222",
                  color: "#8bff8b",
                  border: "1px solid #444",
                  borderRadius: 4,
                  padding: "4px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Import JSON
              </button>
            </div>
            <textarea
              value={exportText}
              onChange={(e) => setExportText(e.target.value)}
              placeholder="// timeline JSON will appear here"
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                background: "#050505",
                color: "#ccc",
                borderRadius: 4,
                border: "1px solid #333",
                fontSize: 11,
                padding: 4,
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
