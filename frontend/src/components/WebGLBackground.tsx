import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface WebGLBackgroundProps {
  className?: string;
}

export function WebGLBackground({ className = "" }: WebGLBackgroundProps) {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.InstancedMesh | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch (error) {
      setWebGLSupported(false);
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Create simple square stars like the Hook prototype
    const isMobile = window.innerWidth < 768;
    const starCount = isMobile ? 800 : 2000;

    // Create a single plane geometry for all stars
    const starGeometry = new THREE.PlaneGeometry(1, 1);

    // Create instanced mesh for performance
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.InstancedMesh(
      starGeometry,
      starMaterial,
      starCount,
    );
    particlesRef.current = particles;
    scene.add(particles);

    // Position each star
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      // Random position in a sphere - starting further away
      const radius = Math.random() * 30 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Random scale for variety
      const scale = Math.random() * 0.3 + 0.1;

      // Random star colors
      const starType = Math.random();
      if (starType < 0.3) {
        color.setRGB(0.6 + Math.random() * 0.4, 0.7 + Math.random() * 0.3, 1.0); // Blue
      } else if (starType < 0.7) {
        color.setRGB(1.0, 1.0, 0.8 + Math.random() * 0.2); // White/Yellow
      } else {
        color.setRGB(1.0, 0.5 + Math.random() * 0.3, 0.3 + Math.random() * 0.3); // Red
      }

      matrix.makeTranslation(x, y, z);
      matrix.scale(new THREE.Vector3(scale, scale, scale));

      particles.setMatrixAt(i, matrix);
      particles.setColorAt(i, color);
    }

    // Simple render loop - no animation
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      
      window.removeEventListener("resize", handleResize);

      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      // Dispose of Three.js objects
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webGLSupported) {
    // Fallback: CSS gradient background
    return (
      <div
        className={`fixed inset-0 -z-10 ${className}`}
        style={{
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #667eea 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 15s ease infinite",
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 ${className}`}
      style={{
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
