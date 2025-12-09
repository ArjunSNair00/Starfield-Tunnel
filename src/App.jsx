import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  Glitch,
} from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";
import * as THREE from "three";
import { DevToolsProvider, useDevTools } from "./DevToolsProvider";

// ------------------------------------------------------------
// LYRICS
// ------------------------------------------------------------
const LYRICS = [
  ["", 0.1],
  ["To ........♥:", 0.1],
  ["", 0.5],
  ["I have to tell you something.", 0.08],
  ["I'll tell you this in person too, but…", 0.08],
  ["I....", 0.3],
  ["reallyyy", 0.2],
  ["Like", 0.25],
  ["You", 0.25],
  ["More than a friend.", 0.07],
  [
    "I wasn't sure if I should say it, but I didn't want to keep pretending I don't feel it.",
    0.07,
  ],
  [
    "Being around you feels different, in the best way. I just wanted you to know.",
    0.07,
  ],
  ["No pressure, and you don't have to say anything right now.", 0.07],
  ["I just wanted you to know before another day passes.", 0.07],
  ["This song is for you....", 0.07],
  ["", 1],
  ["--.....", 0.2],
];

// ------------------------------------------------------------
// ROOT APP
// ------------------------------------------------------------
export default function App() {
  return (
    <DevToolsProvider>
      <AppContent />
    </DevToolsProvider>
  );
}

// ------------------------------------------------------------
// MAIN APP CONTENT
// ------------------------------------------------------------
function AppContent() {
  const controlsRef = useRef();
  const audioRef = useRef(null);

  const { midiLoaded, speedLoaded } = useDevTools();

  const [started, setStarted] = useState(false);
  const [threeReady, setThreeReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // ------------------------------------------------------------
  // PRELOAD FROM /public
  // ------------------------------------------------------------
  useEffect(() => {
    async function preloadAll() {
      try {
        // preload audio
        const audio = new Audio("/music.wav");
        await new Promise((res) => {
          audio.addEventListener("canplaythrough", res, { once: true });
          audio.addEventListener("error", res, { once: true });
        });

        // preload midi
        await fetch("/glow.mid").then((r) => r.arrayBuffer());

        // preload font json
        await fetch("/fonts/helvetiker_regular.typeface.json").then((r) =>
          r.json()
        );

        setAssetsReady(true);

        // cinematic fade-in
        setTimeout(() => setFadeIn(true), 300);
      } catch (err) {
        console.warn("Preload error:", err);
        setAssetsReady(true);
        setTimeout(() => setFadeIn(true), 300);
      }
    }

    preloadAll();
  }, []);

  // actual audio
  useEffect(() => {
    audioRef.current = new Audio("/music.wav");
    audioRef.current.loop = false;

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------
  // DEBUG PRINT
  // ------------------------------------------------------------
  const ALL_READY = threeReady && midiLoaded && speedLoaded && assetsReady;

  useEffect(() => {
    console.log("---- LOAD STATUS ----");
    console.log("threeReady:", threeReady);
    console.log("midiLoaded:", midiLoaded);
    console.log("speedLoaded:", speedLoaded);
    console.log("assetsReady:", assetsReady);
    console.log("ALL_READY:", ALL_READY);
    console.log("---------------------");
  }, [threeReady, midiLoaded, speedLoaded, assetsReady]);

  // ------------------------------------------------------------
  // START / EXIT
  // ------------------------------------------------------------
  const handleStart = () => {
    if (!ALL_READY) return alert("Still loading…");

    document.documentElement.requestFullscreen?.().catch(() => {});
    window.__R3F_START_TIME = performance.now();

    setStarted(true);

    setTimeout(() => {
      audioRef.current?.play().catch((e) => console.error(e));
    }, 40);
  };

  const handleExit = () => {
    document.exitFullscreen?.().catch(() => {});
    setStarted(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "black",
      }}
    >
      {/* ------------------------------------------------------
          BLACK FADE-IN LAYER
      ------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          zIndex: 2000,
          opacity: fadeIn ? 0 : 1,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }}
      />

      {/* ------------------------------------------------------
          LOADING PANEL (STARFIELD BEHIND)
      ------------------------------------------------------- */}
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1500,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              minWidth: "260px",
              maxWidth: "90vw",
              padding: "24px 32px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(15,15,30,0.8), rgba(50,10,40,0.7))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 45px rgba(255,78,203,0.45)",
              backdropFilter: "blur(14px)",
              textAlign: "center",
              color: "white",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "18px", letterSpacing: "0.06em" }}>
              🌌 Preparing Your Galaxy…
            </div>

            {/* Spinner */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.2)",
                borderTopColor: "#ff4ecb",
                animation: "spin 1s linear infinite",
                margin: "4px auto",
              }}
            />

            {/* DETAILED LOAD STATUS */}
            <div
              style={{
                fontSize: 14,
                opacity: 0.85,
                minHeight: 60,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {!threeReady && <div>🔧 Renderer not ready</div>}
              {!midiLoaded && <div>🎵 MIDI not loaded</div>}
              {!speedLoaded && <div>🚀 Speed map not loaded</div>}
              {!assetsReady && <div>📦 Assets not loaded</div>}

              {ALL_READY && (
                <div style={{ color: "#8aff8a" }}>✓ Everything is ready</div>
              )}
            </div>

            {/* START BUTTON */}
            <button
              disabled={!ALL_READY}
              onClick={handleStart}
              style={{
                padding: "14px 48px",
                fontSize: 20,
                borderRadius: "999px",
                border: "none",
                fontWeight: "bold",
                background: "#ff4ecb",
                color: "white",
                opacity: ALL_READY ? 1 : 0.35,
                cursor: ALL_READY ? "pointer" : "not-allowed",
                boxShadow: "0 0 25px rgba(255,78,203,0.6)",
                animation: ALL_READY
                  ? "pulse 1.8s ease-in-out infinite"
                  : "none",
              }}
            >
              {ALL_READY ? "Start" : "Loading…"}
            </button>

            <style>
              {`
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.06); }
                  100% { transform: scale(1); }
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------
          EXIT BUTTON (visible only after Start)
      ------------------------------------------------------- */}
      {started && (
        <button
          onClick={handleExit}
          style={{
            position: "fixed",
            top: "10px",
            left: "10px",
            zIndex: 9999,
            width: "44px",
            height: "44px",
            background: "rgba(255, 78, 203, 0.3)",
            color: "#ff4ecb",
            border: "2px solid #ff4ecb",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "28px",
            fontWeight: "bold",
            backdropFilter: "blur(6px)",
          }}
        >
          ×
        </button>
      )}

      {/* ------------------------------------------------------
          CANVAS (starfield behind loading screen)
      ------------------------------------------------------- */}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 10], fov: 60, far: 2000 }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
        }}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
          setThreeReady(true);
        }}
      >
        {/* Smooth music-synced camera */}
        <CameraController controlsRef={controlsRef} started={started} />

        {/* User cannot rotate until animation starts */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.5}
          enableDamping={true}
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={-Math.PI / 2}
        />

        {/* Lights */}
        <ambientLight intensity={0.3} />
        <directionalLight intensity={0.6} position={[50, 30, 20]} />

        {/* Starfield (actual star movement in Part 3) */}
        <Starfield />

        {/* Lyrics (Part 3) */}
        
        {/* <LyricText started={started} /> */}

        {/* Effects */}
        <EffectComposer multisampling={0} disableNormalPass={true}>
          <Bloom intensity={2.0} luminanceThreshold={0.1} mipmapBlur />
          <Noise opacity={0.1} />
          <Vignette eskil={false} offset={0.25} darkness={0.7} />
          <TimeControlledGlitch />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

// ------------------------------------------------------------
// CAMERA CONTROLLER — moves camera with music
// ------------------------------------------------------------
function CameraController({ controlsRef, started }) {
  const { camera, clock } = useThree();
  const { getSpeedAt, timeRef } = useDevTools();

  // Reset camera when animation starts
  useEffect(() => {
    if (started) {
      camera.position.set(0, 0, 200);
      clock.start();
      clock.elapsedTime = 0;
    }
  }, [started, camera, clock]);

  useFrame((state, delta) => {
    if (!started) return;

    const t = clock.getElapsedTime();
    if (timeRef) timeRef.current = t;

    // Keep camera always facing forward for tunnel effect
    if (controlsRef.current) {
      const forward = new THREE.Vector3(0, 0, -10).applyQuaternion(
        camera.quaternion
      );
      controlsRef.current.target.copy(camera.position.clone().add(forward));
    }
  });

  return null;
}
// ------------------------------------------------------------
// STARFIELD — MIDI-reactive deep-space tunnel
// ------------------------------------------------------------
function Starfield() {
  const { camera } = useThree();
  const { getSpeedAt, midiEvents = [] } = useDevTools();

  // Generate 2500 stars
  const [stars] = useState(() => {
    const COUNT = 2500;
    const data = [];
    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#ffe9a3"),
      new THREE.Color("#a3d8ff"),
      new THREE.Color("#ffb3f6"),
      new THREE.Color("#c6ffdd"),
    ];

    for (let i = 0; i < COUNT; i++) {
      const r = 20 + Math.sqrt(Math.random()) * 120;
      const angle = Math.random() * Math.PI * 2;

      data.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        z: -1000 - Math.random() * 1000,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
    return data;
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meshRef = useRef();

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const speed = getSpeedAt(t);

    // MIDI pulse visual boost
    let pulse = 0;
    for (let ev of midiEvents) {
      const diff = t - ev;
      if (diff >= 0 && diff < 0.15) {
        pulse = 1 - diff / 0.15;
        break;
      }
    }

    // Move stars forward
    stars.forEach((star, i) => {
      star.z += speed * delta * 20;

      // Recycle stars once they pass by the camera
      if (star.z > camera.position.z + 12) {
        star.z = camera.position.z - (1000 + Math.random() * 200);
      }

      dummy.position.set(star.x, star.y, star.z);
      dummy.scale.set(1 + pulse * 2, 1 + pulse * 2, 1 + speed * 0.5);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Initial star colors
  useEffect(() => {
    if (meshRef.current) {
      stars.forEach((star, i) => meshRef.current.setColorAt(i, star.color));
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[null, null, stars.length]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#fff" toneMapped={false} />
    </instancedMesh>
  );
}

// ------------------------------------------------------------
// LYRICS — Full typewriter reveal + smooth fade + floating motion
// ------------------------------------------------------------
function LyricText({ started }) {
  const { camera } = useThree();
  const groupRef = useRef();

  const [activeText, setActiveText] = useState("");
  const [opacity, setOpacity] = useState(0);
  const [index, setIndex] = useState(0);
  const [charPos, setCharPos] = useState(0);
  const [stage, setStage] = useState("waiting");

  // Reset system when animation stops
  useEffect(() => {
    if (!started) {
      setActiveText("");
      setOpacity(0);
      setIndex(0);
      setCharPos(0);
      setStage("waiting");
    }
  }, [started]);

  // Typewriter + fade system
  useEffect(() => {
    if (!started) return;
    if (index >= LYRICS.length) {
      setStage("done");
      return;
    }

    const [line, delay] = LYRICS[index];
    let timerId;

    if (stage === "waiting") {
      if (line.length === 0) {
        // blank line delay
        timerId = setTimeout(() => {
          setIndex((i) => i + 1);
          setCharPos(0);
          setActiveText("");
          setOpacity(0);
          setStage("waiting");
        }, delay * 1000);
      } else {
        setStage("typing");
      }
    }

    // Typing characters one by one
    else if (stage === "typing") {
      if (charPos < line.length) {
        timerId = setTimeout(() => {
          setActiveText((prev) => prev + line[charPos]);
          setCharPos((prev) => prev + 1);
          setOpacity(1);
        }, delay * 1000);
      } else {
        // Finished line → fade
        timerId = setTimeout(() => {
          setStage("fading");
        }, 500);
      }
    }

    // Fade-out
    else if (stage === "fading") {
      if (opacity <= 0) {
        setActiveText("");
        setCharPos(0);
        setOpacity(0);
        setIndex((i) => i + 1);

        const next = index + 1;
        if (next < LYRICS.length && LYRICS[next][0].length === 0) {
          setStage("waiting");
        } else {
          setStage("typing");
        }
      } else {
        timerId = setTimeout(() => {
          setOpacity((o) => Math.max(0, o - 0.05));
        }, 30);
      }
    }

    return () => clearTimeout(timerId);
  }, [started, index, charPos, stage, opacity]);

  // Floating text motion (soft drift in 3D)
  useFrame(({ clock }) => {
    if (!started) return;

    const t = clock.getElapsedTime();
    if (!groupRef.current) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );
    const base = camera.position.clone().add(forward.multiplyScalar(40));

    const bobY = Math.sin(t * 0.8) * 0.4;
    const bobX = Math.sin(t * 0.5) * 0.3;

    groupRef.current.position.set(base.x + bobX, base.y + bobY, base.z);
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.15;
  });

  return (
    <group ref={groupRef}>
      <Text
        fontSize={4}
        anchorX="center"
        anchorY="middle"
        maxWidth={30}
        whiteSpace="normal"
      >
        {activeText}
        <meshStandardMaterial
          color="#ff4ecb"
          emissive="#ff2aa1"
          emissiveIntensity={2}
          transparent
          toneMapped={false}
          opacity={opacity}
        />
      </Text>
    </group>
  );
}

// ------------------------------------------------------------
// TIME-SYNCED GLITCH EFFECT (music climax segments)
// ------------------------------------------------------------
function TimeControlledGlitch() {
  const { clock } = useThree();
  const [isActive, setIsActive] = useState(false);

  useFrame(() => {
    const t = clock.getElapsedTime();
    setIsActive(t >= 58 && t <= 250);
  });

  if (!isActive) return null;

  return (
    <Glitch
      delay={[2.0, 4.0]}
      duration={[0.4, 0.6]}
      strength={[0.05, 0.1]}
      mode={GlitchMode.SPORADIC}
      ratio={0.1}
    />
  );
}
