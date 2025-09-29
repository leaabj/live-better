import { useEffect, useRef, useState } from "react";

interface WebGLBackgroundProps {
  className?: string;
}

export function WebGLBackground({ className = "" }: WebGLBackgroundProps) {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const mountRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // GLSL Shaders
  const vertexShaderSource = `#ifdef GL_ES
precision mediump float;
#endif

// Uniforms
uniform vec2 u_resolution;

// Attributes
attribute vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0, 1);
}
`;

  const fragmentShaderSource = `#ifdef GL_ES
precision mediump float;
#endif

uniform bool u_scanlines;
uniform vec2 u_resolution;

uniform float u_brightness;
uniform float u_blobiness;
uniform float u_particles;
uniform float u_millis;
uniform float u_energy;

// http://goo.gl/LrCde
float noise(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    vec2 position = (gl_FragCoord.xy / u_resolution.x);
    float t = u_millis * 0.001 * u_energy;
    
    float a = 0.0;
    float b = 0.0;
    float c = 0.0;

    vec2 pos, center = vec2(0.5, 0.5 * (u_resolution.y / u_resolution.x));
    
    float na, nb, nc, nd, d;
    float limit = u_particles / 40.0;
    float step = 1.0 / u_particles;
    float n = 0.0;
    
    for (float i = 0.0; i <= 1.0; i += 0.025) {
        if (i <= limit) {
            vec2 np = vec2(n, 1-1);
            
            na = noise(np * 1.1);
            nb = noise(np * 2.8);
            nc = noise(np * 0.7);
            nd = noise(np * 3.2);

            pos = center;
            pos.x += sin(t*na) * cos(t*nb) * tan(t*na*0.15) * 0.3;
            pos.y += tan(t*nc) * sin(t*nd) * 0.1;
            
            d = pow(1.6*na / length(pos - position), u_blobiness);
            
            if (i < limit * 0.3333) a += d;
            else if (i < limit * 0.6666) b += d;
            else c += d;

            n += step;
        }
    }
    
    vec3 col = vec3(a*c, b*c, a*b) * 0.0001 * u_brightness;
    
    if (u_scanlines) {
        col -= mod(gl_FragCoord.y, 2.0) < 1.0 ? 0.5 : 0.0;
    }
    
    gl_FragColor = vec4(col, 1.0);
}
`;

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch (error) {
      setWebGLSupported(false);
      return;
    }

    const canvas = document.createElement("canvas");
    const webglContext = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
    if (!webglContext) {
      setWebGLSupported(false);
      return;
    }

    glRef.current = webglContext;
    startTimeRef.current = performance.now();

    // Create and compile shaders
    const vertexShader = webglContext.createShader(webglContext.VERTEX_SHADER)!;
    webglContext.shaderSource(vertexShader, vertexShaderSource);
    webglContext.compileShader(vertexShader);

    const fragmentShader = webglContext.createShader(webglContext.FRAGMENT_SHADER)!;
    webglContext.shaderSource(fragmentShader, fragmentShaderSource);
    webglContext.compileShader(fragmentShader);

    // Check shader compilation
    if (!webglContext.getShaderParameter(vertexShader, webglContext.COMPILE_STATUS)) {
      console.error("Vertex shader compilation error:", webglContext.getShaderInfoLog(vertexShader));
      setWebGLSupported(false);
      return;
    }

    if (!webglContext.getShaderParameter(fragmentShader, webglContext.COMPILE_STATUS)) {
      console.error("Fragment shader compilation error:", webglContext.getShaderInfoLog(fragmentShader));
      setWebGLSupported(false);
      return;
    }

    // Create program
    const program = webglContext.createProgram()!;
    webglContext.attachShader(program, vertexShader);
    webglContext.attachShader(program, fragmentShader);
    webglContext.linkProgram(program);

    if (!webglContext.getProgramParameter(program, webglContext.LINK_STATUS)) {
      console.error("Program linking error:", webglContext.getProgramInfoLog(program));
      setWebGLSupported(false);
      return;
    }

    webglContext.useProgram(program);
    programRef.current = program;

    // Get attribute and uniform locations
    const positionAttributeLocation = webglContext.getAttribLocation(program, "a_position");
    const resolutionUniformLocation = webglContext.getUniformLocation(program, "u_resolution");
    const brightnessUniformLocation = webglContext.getUniformLocation(program, "u_brightness");
    const blobinessUniformLocation = webglContext.getUniformLocation(program, "u_blobiness");
    const particlesUniformLocation = webglContext.getUniformLocation(program, "u_particles");
    const scanlinesUniformLocation = webglContext.getUniformLocation(program, "u_scanlines");
    const energyUniformLocation = webglContext.getUniformLocation(program, "u_energy");
    const millisUniformLocation = webglContext.getUniformLocation(program, "u_millis");

    // Create buffer for full-screen quad
    const positionBuffer = webglContext.createBuffer();
    webglContext.bindBuffer(webglContext.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      1.0, 1.0,
    ]);
    webglContext.bufferData(webglContext.ARRAY_BUFFER, positions, webglContext.STATIC_DRAW);

    // Enable attribute
    webglContext.enableVertexAttribArray(positionAttributeLocation);
    webglContext.vertexAttribPointer(positionAttributeLocation, 2, webglContext.FLOAT, false, 0, 0);

    // Set up canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";

    // Set viewport before adding to DOM
    webglContext.viewport(0, 0, canvas.width, canvas.height);

    mountRef.current.appendChild(canvas);

    // Set initial uniform values
    webglContext.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    webglContext.uniform1f(brightnessUniformLocation, 0.8);
    webglContext.uniform1f(blobinessUniformLocation, 1.5);
    webglContext.uniform1f(particlesUniformLocation, 40);
    webglContext.uniform1i(scanlinesUniformLocation, 1);
    webglContext.uniform1f(energyUniformLocation, 1.01);

    // Initial render to ensure canvas is visible
    webglContext.clearColor(0.0, 0.0, 0.0, 1.0);
    webglContext.clear(webglContext.COLOR_BUFFER_BIT | webglContext.DEPTH_BUFFER_BIT);
    webglContext.drawArrays(webglContext.TRIANGLES, 0, 6);

    // Animation loop
    const animate = (currentTime: number) => {
      if (!glRef.current || !programRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      glRef.current.useProgram(programRef.current);
      glRef.current.uniform1f(millisUniformLocation, elapsed);

      glRef.current.clearColor(0.0, 0.0, 0.0, 1.0);
      glRef.current.clear(glRef.current.COLOR_BUFFER_BIT | glRef.current.DEPTH_BUFFER_BIT);

      glRef.current.drawArrays(glRef.current.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      if (!canvas || !glRef.current || !programRef.current) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      glRef.current.viewport(0, 0, canvas.width, canvas.height);
      glRef.current.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    };

    window.addEventListener("resize", handleResize);
    
    // Also trigger resize immediately to ensure proper sizing
    handleResize();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      window.removeEventListener("resize", handleResize);

      if (mountRef.current && canvas.parentNode === mountRef.current) {
        mountRef.current.removeChild(canvas);
      }

      if (glRef.current && programRef.current) {
        glRef.current.deleteProgram(programRef.current);
        glRef.current.deleteShader(vertexShader);
        glRef.current.deleteShader(fragmentShader);
        if (positionBuffer) {
          glRef.current.deleteBuffer(positionBuffer);
        }
      }
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
