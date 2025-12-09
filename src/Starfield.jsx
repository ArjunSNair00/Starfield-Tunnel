import React, { useMemo } from "react";
import { Points, PointMaterial } from "@react-three/drei";

const Starfield = ({
  count = 50000, // Significantly reduced for performance
  spread = 1500,
  minSize = 0.1,
  maxSize = 1,
  color = "#aaaaaa",
}) => {
  // Generate star positions
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * spread;
    }
    return pos;
  }, [count, spread]);

  const size = useMemo(() => Math.random() * (maxSize - minSize) + minSize, [minSize, maxSize]);

  return (
    <group>
      <Points positions={positions}>
        <PointMaterial
          transparent
          color={color}
          size={size}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

export default Starfield;
