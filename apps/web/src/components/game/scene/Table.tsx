'use client';

export function Table() {
  return (
    <group position={[0, 0, 0]}>
      {/* Table top */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3.4, 3.6, 0.3, 48]} />
        <meshStandardMaterial color="#0d1226" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Inlaid glowing ring — doubles as the "time" motif of the game */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.75, 64]} />
        <meshBasicMaterial color="#38f2ff" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 1.68, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.35} />
      </mesh>

      {/* Center emblem */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#111a33" emissive="#38f2ff" emissiveIntensity={0.25} />
      </mesh>

      {/* Pedestal */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.9, 1.3, 1.8, 24]} />
        <meshStandardMaterial color="#070a14" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Floor disc the seats sit around, subtly reflective */}
      <mesh position={[0, -1.98, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7.5, 48]} />
        <meshStandardMaterial color="#04060c" metalness={0.2} roughness={0.9} />
      </mesh>
    </group>
  );
}
