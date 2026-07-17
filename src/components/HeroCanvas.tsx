import { useRef, useMemo, Suspense, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Float } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "@/lib/webgl";

function FallingPetal({ 
  position, 
  scale, 
  speed, 
  rotationSpeed 
}: { 
  position: [number, number, number]; 
  scale: number; 
  speed: number;
  rotationSpeed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialY = position[1];
  
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y -= speed;
    ref.current.position.x += Math.sin(state.clock.elapsedTime * 0.5 + initialY) * 0.005;
    ref.current.rotation.x += rotationSpeed;
    ref.current.rotation.y += rotationSpeed * 0.5;
    
    // Reset position when it goes out of view
    if (ref.current.position.y < -12) {
      ref.current.position.y = 12;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 0.05]} />
      <meshStandardMaterial 
        color="#c9a96e" 
        metalness={0.9} 
        roughness={0.1} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
}

function LightOrb({ 
  position, 
  scale, 
  color 
}: { 
  position: [number, number, number]; 
  scale: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4 + position[0]) * 0.5;
    ref.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * 0.3 + position[1]) * 0.3;
  });

  return (
    <Sphere ref={ref} position={position} args={[1, 16, 16]} scale={scale}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.3}
      />
    </Sphere>
  );
}

function GoldDust({ isMobile }: { isMobile: boolean }) {
  // Mobile: 200 particles — enough for the gold-dust effect without GPU overload
  // Desktop: 800 particles — cinematic density
  const count = isMobile ? 200 : 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.008;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial 
        color="#f5e6d8" 
        size={isMobile ? 0.03 : 0.015} 
        transparent 
        opacity={0.3} 
        sizeAttenuation 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function MouseLight({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!lightRef.current) return;
    lightRef.current.position.x += (mouseX * 8 - lightRef.current.position.x) * 0.05;
    lightRef.current.position.y += (-mouseY * 6 - lightRef.current.position.y) * 0.05;
  });
  return (
    <pointLight ref={lightRef} color="#f5e0c0" intensity={5} distance={20} />
  );
}

function Scene({ mouseX, mouseY, isMobile }: { mouseX: number; mouseY: number; isMobile: boolean }) {
  const petals = useMemo(() => {
    const count = isMobile ? 12 : 30;
    return Array.from({ length: count }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 30,
        Math.random() * 20 - 10,
        (Math.random() - 0.5) * 10
      ] as [number, number, number],
      scale: 0.05 + Math.random() * 0.1,
      speed: 0.01 + Math.random() * 0.02,
      rotationSpeed: 0.01 + Math.random() * 0.03
    }));
  }, [isMobile]);

  return (
    <>
      <ambientLight intensity={0.5} color="#f5e6d8" />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#fdf0e0" />
      <MouseLight mouseX={mouseX} mouseY={mouseY} />
      
      <group>
        {petals.map((p, i) => (
          <FallingPetal key={i} {...p} />
        ))}
        <LightOrb position={[-5, 3, -5]} scale={0.4} color="#f5e6d8" />
        <LightOrb position={[6, -4, -8]} scale={0.6} color="#c9a96e" />
        <LightOrb position={[2, 5, -12]} scale={0.8} color="#fdf0e0" />
      </group>

      <GoldDust isMobile={isMobile} />
    </>
  );
}

interface HeroCanvasProps {
  mouseX: number;
  mouseY: number;
  isMobile?: boolean;
}

export default function HeroCanvas({ mouseX, mouseY, isMobile = false }: HeroCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  // Defer 3D init until browser is idle → reduces TBT dramatically
  const [canMount, setCanMount] = useState(false);

  useEffect(() => {
    setWebglOk(isWebGLAvailable());
  }, []);

  useEffect(() => {
    // requestIdleCallback fires when the main thread has finished its urgent work
    // (React hydration, LCP image decode, first paint). Falls back to 200ms timeout.
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 1500 })
        : (cb: () => void) => setTimeout(cb, 200);
    const id = schedule(() => setCanMount(true));
    return () => {
      if (typeof requestIdleCallback !== "undefined") cancelIdleCallback(id as number);
      else clearTimeout(id as number);
    };
  }, []);

  if (webglOk === null || !webglOk || !canMount) return null;

  return (
    <Suspense fallback={null}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={isMobile ? 1 : [1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <Scene mouseX={mouseX} mouseY={mouseY} isMobile={isMobile} />
      </Canvas>
    </Suspense>
  );
}
