'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Note: If react-shaders doesn't work, we'll need to use an alternative approach
// For now, using a canvas-based implementation
export const title = "React Aurora Shaders";

export interface AuroraShadersProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Aurora wave speed
   * @default 1.0
   */
  speed?: number;

  /**
   * Light intensity and brightness
   * @default 1.0
   */
  intensity?: number;

  /**
   * Color vibrancy and saturation
   * @default 1.0
   */
  vibrancy?: number;

  /**
   * Wave frequency and complexity
   * @default 1.0
   */
  frequency?: number;

  /**
   * Vertical stretch of aurora bands
   * @default 1.0
   */
  stretch?: number;
}

const auroraShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_vibrancy;
uniform float u_frequency;
uniform float u_stretch;

// Noise function for organic movement
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth noise for flowing effects
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal noise for complex aurora patterns
float fractalNoise(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for(int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

void main() {
    // Normalize coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Time with speed control
    float time = u_time * u_speed;

    // Create vertical gradient for aurora positioning
    float verticalGradient = 1.0 - abs(uv.y - 0.5) * 2.0;
    verticalGradient = pow(verticalGradient, u_stretch);

    // Create flowing horizontal movement
    vec2 flowUV = vec2(uv.x + time * 0.1, uv.y);

    // Generate multiple aurora layers with different characteristics
    float aurora1 = fractalNoise(flowUV * u_frequency * 3.0 + vec2(time * 0.2, 0.0));
    float aurora2 = fractalNoise(flowUV * u_frequency * 2.0 + vec2(time * 0.15, 1000.0));
    float aurora3 = fractalNoise(flowUV * u_frequency * 4.0 + vec2(time * 0.25, 2000.0));

    // Add wave distortion for organic movement
    float wave1 = sin(uv.x * 8.0 + time * 2.0) * 0.1;
    float wave2 = sin(uv.x * 12.0 + time * 1.5) * 0.05;

    float distortedY = uv.y + wave1 + wave2;

    // Apply vertical positioning to aurora layers
    aurora1 *= smoothstep(0.3, 0.7, distortedY) * smoothstep(0.8, 0.6, distortedY);
    aurora2 *= smoothstep(0.4, 0.6, distortedY) * smoothstep(0.7, 0.5, distortedY);
    aurora3 *= smoothstep(0.35, 0.65, distortedY) * smoothstep(0.75, 0.55, distortedY);

    // Combine aurora layers
    float combinedAurora = (aurora1 * 0.6 + aurora2 * 0.8 + aurora3 * 0.4) * verticalGradient;

    // Apply intensity scaling
    combinedAurora *= u_intensity;

    // Create aurora color palette
    vec3 color1 = vec3(0.0, 0.8, 0.4);  // Green
    vec3 color2 = vec3(0.2, 0.4, 1.0);  // Blue
    vec3 color3 = vec3(0.8, 0.2, 0.8);  // Purple
    vec3 color4 = vec3(0.0, 1.0, 0.8);  // Cyan

    // Create color zones based on vertical position
    float colorMix1 = smoothstep(0.2, 0.4, uv.y);
    float colorMix2 = smoothstep(0.4, 0.6, uv.y);
    float colorMix3 = smoothstep(0.6, 0.8, uv.y);

    // Mix colors for natural aurora appearance
    vec3 finalColor = mix(color1, color2, colorMix1);
    finalColor = mix(finalColor, color3, colorMix2);
    finalColor = mix(finalColor, color4, colorMix3);

    // Apply vibrancy control
    vec3 desaturated = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
    finalColor = mix(desaturated, finalColor, u_vibrancy);

    // Apply aurora intensity
    finalColor *= combinedAurora;

    // Add atmospheric glow at horizon
    float horizonGlow = exp(-abs(uv.y - 0.5) * 8.0) * 0.1;
    finalColor += finalColor * horizonGlow;

    // Ensure colors stay in valid range
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const AuroraBackground = forwardRef<HTMLCanvasElement, AuroraShadersProps>(({
  className,
  speed = 1.0,
  intensity = 1.0,
  vibrancy = 1.0,
  frequency = 1.0,
  stretch = 1.0,
  ...props
}, ref) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number>();
  const startTimeRef = React.useRef<number>(Date.now());

  // Combine refs
  React.useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Create shader
    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    // Create program
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, auroraShader);
    
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Error linking program:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Setup geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const vibrancyLocation = gl.getUniformLocation(program, 'u_vibrancy');
    const frequencyLocation = gl.getUniformLocation(program, 'u_frequency');
    const stretchLocation = gl.getUniformLocation(program, 'u_stretch');

    // Handle resize
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const animate = () => {
      const time = (Date.now() - startTimeRef.current) / 1000;

      gl.uniform1f(timeLocation, time);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(speedLocation, speed);
      gl.uniform1f(intensityLocation, intensity);
      gl.uniform1f(vibrancyLocation, vibrancy);
      gl.uniform1f(frequencyLocation, frequency);
      gl.uniform1f(stretchLocation, stretch);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speed, intensity, vibrancy, frequency, stretch]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 w-full h-full', className)}
      style={{ display: 'block' }}
      {...(props as any)}
    />
  );
});

AuroraBackground.displayName = 'AuroraBackground';

export default AuroraBackground;

