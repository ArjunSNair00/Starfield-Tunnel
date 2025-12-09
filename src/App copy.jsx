import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text3D, Center, Float, Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  Glitch,
} from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";

import Starfield from "./Starfield";
import fontUrl from "/fonts/helvetiker_regular.typeface.json?url";

const LYRICS = [
  "This started as code,",
  "but I meant every word,",
  "you’re my favourite bug 💗",
];

function LyricText() {
  const groupRef = useRef();

  // typewriter: count visible characters across all lines
  const [charIndex, setCharIndex] = useState(0);

  // precompute lengths / boundaries per line
  const lineMeta = LYRICS.map((line, idx) => {
    const priorChars =
      LYRICS.slice(0, idx).reduce((sum, l) => sum + l.length + 1, 0); // +1 for newline
    const start = priorChars;
    const end = start + line.length;
    return { start, end };
  });

  const totalChars =
    LYRICS.reduce((sum, l) => sum + l.length + 1, 0); // rough total incl. newlines

  // typewriter effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCharIndex((i) => {
        if (i >= totalChars) return i;
        return i + 1;
      });
    }, 60); // speed of typing (ms per char)
    return () => clearInterval(interval);
  }, [totalChars]);

  // orbiting + beat + flag/wave motion
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat = (Math.sin(t * 2.0) + 1) / 2; // 0..1 “beat”

    if (groupRef.current) {
      // orbit-style motion
      const radius = 0.4;
      groupRef.current.position.x = Math.sin(t * 0.5) * radius;
      groupRef.current.position.z = Math.cos(t * 0.5) * radius;

      // slow rotation
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.4;
      groupRef.current.rotation.z = Math.sin(t * 0.15) * 0.15;

      // subtle beat pulse
      const s = 1 + beat * 0.12;
      groupRef.current.scale.set(s, s, s);
    }
  });

  // helper: visible substring per line given global charIndex
  const getVisibleTextForLine = (lineIdx) => {
    const { start, end } = lineMeta[lineIdx];
    if (charIndex <= start) return "";
    const visibleChars = Math.min(charIndex - start, LYRICS[lineIdx].length);
    return LYRICS[lineIdx].slice(0, visibleChars);
  };

  // helper: opacity per line (line-by-line fade-in)
  const getOpacityForLine = (lineIdx) => {
    const { start, end } = lineMeta[lineIdx];
    if (charIndex <= start) return 0;
    if (charIndex >= end) return 1;
    const t = (charIndex - start) / (end - start); // 0..1 across that line
    return t;
  };

  return (
    <Float
      speed={1.2} // overall float speed
      rotationIntensity={0.3}
      floatIntensity={0.7}
    >
      <group ref={groupRef}>
        <Center>
          {LYRICS.map((line, idx) => {
            const visible = getVisibleTextForLine(idx);
            const opacity = getOpacityForLine(idx);

            // wave / flag-like vertical motion per line
            const tOffset = idx * 0.8;
            const waveY = Math.sin((charIndex + tOffset) * 0.1) * 0.15;

            return (
              <Text3D
                key={idx}
                font={fontUrl}
                size={0.4}
                height={0.18}
                bevelEnabled
                bevelSize={0.02}
                bevelThickness={0.06}
                curveSegments={16}
                position={[0, (LYRICS.length - 1 - idx) * 0.7 + waveY, 0]}
              >
                {visible}
                <meshStandardMaterial
                  color="#ff4ecb"
                  emissive="#ff4ecb"
                  emissiveIntensity={0.9}
                  transparent
                  opacity={opacity}
                  roughness={0.3}
                  metalness={0.4}
                />
              </Text3D>
            );
          })}
        </Center>

        {/* extra particles local to lyrics (on top of Starfield) */}
        <Stars
          radius={6}
          depth={2}
          count={400}
          factor={0.3}
          saturation={0}
          fade
          speed={0.5}
        />
      </group>
    </Float>
  );
}

function App() {
  const [count, setCount] = useState(0); // unused but keeping your state

  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{
          position: [0, 0, 7],
          fov: 45,
          near: 0.01,
          far: 10000,
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
          gl.physicallyCorrectLights = true;
        }}
        style={{ width: "100%", height: "100%" }}
      >
        {/* lights */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[-200, 50, 0]}
          intensity={2.0}
          color="#ffffff"
          castShadow
        />

        {/* global background particles */}
        <Starfield />

        {/* lyric system */}
        <LyricText />

        {/* controls */}
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          minDistance={2}
          maxDistance={20}
          enableDamping={false}
          rotateSpeed={0.5}
        />

        {/* CRT / glitch / glow */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0}
            luminanceSmoothing={0.9}
            intensity={1.4}
          />
          <Noise opacity={0.12} />
          <Vignette eskil={false} offset={0.2} darkness={0.8} />
          <Glitch
            delay={[1, 3]}       // time between glitches
            duration={[0.2, 0.6]} // glitch length
            strength={[0.2, 0.6]}
            mode={GlitchMode.SPORADIC}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default App;
