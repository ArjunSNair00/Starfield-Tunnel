// DevToolsProvider.jsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";

const DevToolsContext = createContext(null);

// Song length in seconds (5:30 = 330s)
const DEFAULT_SONG_DURATION = 330;

// -------------------------------------------
// Speed interpolation
// -------------------------------------------
function interpolateSpeed(points, t) {
  if (!points.length) return 0.1;

  if (t <= points[0].t) return Math.max(0.1, points[0].v);
  if (t >= points[points.length - 1].t)
    return Math.max(0.1, points[points.length - 1].v);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (t >= p1.t && t <= p2.t) {
      const span = p2.t - p1.t || 1;
      const alpha = (t - p1.t) / span;
      const v = p1.v + (p2.v - p1.v) * alpha;
      return Math.max(0.1, v);
    }
  }

  return 0.1;
}

// -------------------------------------------
// Provider
// -------------------------------------------
export function DevToolsProvider({ children }) {
  const [speedPoints, setSpeedPoints] = useState([]);
  const [speedLoaded, setSpeedLoaded] = useState(false);

  const [songDuration] = useState(DEFAULT_SONG_DURATION);

  // MIDI state
  const [midiEvents, setMidiEvents] = useState([]);
  const [midiLoaded, setMidiLoaded] = useState(false);
  const midiLoadedRef = useRef(false);

  // -------------------------------------------
  // Load speed_points.json
  // -------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadSpeed() {
      try {
        const res = await fetch("/speed_points.json");
        const data = await res.json();

        if (!cancelled && data?.speedPoints) {
          console.log("Loaded speed points:", data.speedPoints.length);
          setSpeedPoints(data.speedPoints);
          setSpeedLoaded(true);
        }
      } catch (err) {
        console.error("Speed points load error:", err);
        setSpeedLoaded(true); // avoid blocking the app
      }
    }

    loadSpeed();
    return () => (cancelled = true);
  }, []);

  // -------------------------------------------
  // Load MIDI events
  // -------------------------------------------
  useEffect(() => {
    if (midiLoadedRef.current) return;
    midiLoadedRef.current = true;

    async function loadMidi() {
      try {
        const res = await fetch("/midi_events.json");
        const data = await res.json();

        const times = data.notes.map(n => n.time);
        console.log("Loaded MIDI:", times);

        setMidiEvents(times);
        setMidiLoaded(true);
      } catch (err) {
        console.error("MIDI load error:", err);
        setMidiLoaded(true);
      }
    }

    loadMidi();
  }, []);

  // For timeline UI (debug)
  const timeRef = useRef(0);

  const getSpeedAt = useCallback(
    (t) => interpolateSpeed(speedPoints, t),
    [speedPoints]
  );

  const value = useMemo(
    () => ({
      speedPoints,
      songDuration,
      getSpeedAt,
      timeRef,
      midiEvents,
      midiLoaded,
      speedLoaded,
    }),
    [speedPoints, songDuration, getSpeedAt, midiEvents, midiLoaded, speedLoaded]
  );

  return (
    <DevToolsContext.Provider value={value}>
      {children}
    </DevToolsContext.Provider>
  );
}

export function useDevTools() {
  const ctx = useContext(DevToolsContext);
  if (!ctx) {
    throw new Error("useDevTools must be used inside <DevToolsProvider>");
  }
  return ctx;
}
