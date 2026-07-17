import { useRef, Suspense, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "@/lib/webgl";

function FloatingOrnament({ 
  position, 
  scale, 
  color, 
  distort = 0.3,
  isMobile
}: { 
  position: [number, number, number]; 
  scale: number; 
  color: string;
  distort?: number;
  isMobile: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5} position={position}>
      <Sphere ref={ref} args={[1, isMobile ? 32 : 64, isMobile ? 32 : 64]} scale={scale}>
        <MeshDistortMaterial
          color={color}
          speed={2}
          distort={distort}
          radius={1}
          metalness={0.9}
          roughness={0.1}
        />
      </Sphere>
    </Float>
  );
}

function DecorScene({ mouseX, mouseY, isMobile }: { mouseX: number; mouseY: number; isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.002;
    groupRef.current.rotation.x += (mouseY * 0.1 - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (mouseX * 0.1 - groupRef.current.rotation.y) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.8} color="#f5e6d0" />
      <pointLight position={[10, 10, 10]} intensity={5} color="#fdf0e0" />
      <pointLight position={[-10, -5, 5]} intensity={3} color="#c9a96e" />
      <spotLight position={[0, 15, 0]} intensity={3} angle={0.4} penumbra={1} color="#ffffff" />

      <group ref={groupRef}>
        <FloatingOrnament position={[0, 0, 0]} scale={1.8} color="#c9a96e" distort={0.4} isMobile={isMobile} />
        <FloatingOrnament position={[3, 2, -2]} scale={0.8} color="#d4af37" distort={0.2} isMobile={isMobile} />
        <FloatingOrnament position={[-3, -1.5, -1]} scale={0.6} color="#f5e6d8" distort={0.5} isMobile={isMobile} />
        <FloatingOrnament position={[2, -2, -3]} scale={0.5} color="#c9a96e" distort={0.3} isMobile={isMobile} />
        <FloatingOrnament position={[-2, 2.5, -4]} scale={0.7} color="#b8936a" distort={0.25} isMobile={isMobile} />
      </group>
    </>
  );
}

interface DecorCanvasProps {
  mouseX?: number;
  mouseY?: number;
  isMobile?: boolean;
}

export default function DecorCanvas({
  mouseX = 0,
  mouseY = 0,
  isMobile = false,
}: DecorCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [canMount, setCanMount] = useState(false);

  useEffect(() => {
    setWebglOk(isWebGLAvailable());
  }, []);

  useEffect(() => {
    // Decor section is below-fold — delay even longer than hero so it never
    // competes with LCP or first interaction for main-thread time
    const id = setTimeout(() => setCanMount(true), 800);
    return () => clearTimeout(id);
  }, []);

  if (webglOk === null || !webglOk || !canMount) return null;

  return (
    <Suspense fallback={null}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={isMobile ? 1 : [1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <DecorScene mouseX={mouseX} mouseY={mouseY} isMobile={isMobile} />
      </Canvas>
    </Suspense>
  );
}
