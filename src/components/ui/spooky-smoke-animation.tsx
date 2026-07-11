'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// --- FRAGMENT SHADER ---
// `u_color` tinges the brightest parts of the noise with a color we control
// from React, so the effect can follow the org's actual brand color.
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));

  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

const vertexShaderSource = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

interface ProgramUniforms {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  u_color: WebGLUniformLocation | null;
}

// --- RENDERER CLASS ---
class Renderer {
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  private gl: WebGL2RenderingContext | null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private uniforms: ProgramUniforms | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private color: [number, number, number] = [0.5, 0.5, 0.5];

  constructor(canvas: HTMLCanvasElement, fragmentSource: string) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) return;
    this.setup(fragmentSource);
    this.init();
  }

  updateColor(newColor: [number, number, number]) {
    this.color = newColor;
  }

  /** Dimensiona pelo elemento pai (não pela viewport) — o canvas vive
   * dentro de um card, não é um fundo full-screen. */
  updateScale() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const { clientWidth, clientHeight } = this.canvas.parentElement ?? this.canvas;
    const width = clientWidth || this.canvas.clientWidth || 1;
    const height = clientHeight || this.canvas.clientHeight || 1;
    const nextWidth = Math.round(width * dpr);
    const nextHeight = Math.round(height * dpr);
    // Realocar o drawing buffer é caro e desnecessário se o tamanho não mudou de verdade.
    if (nextWidth === this.canvas.width && nextHeight === this.canvas.height) return;
    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    if (!gl) return;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
    }
  }

  reset() {
    const { gl, program, vs, fs } = this;
    if (!gl || !program) return;
    if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs); }
    if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs); }
    gl.deleteProgram(program);
    this.program = null;
  }

  private setup(fragmentSource: string) {
    const gl = this.gl;
    if (!gl) return;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!this.vs || !this.fs || !program) return;
    this.compile(this.vs, vertexShaderSource);
    this.compile(this.fs, fragmentSource);
    this.program = program;
    gl.attachShader(program, this.vs);
    gl.attachShader(program, this.fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
    }
  }

  private init() {
    const { gl, program } = this;
    if (!gl || !program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      u_color: gl.getUniformLocation(program, 'u_color'),
    };
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, uniforms } = this;
    if (!gl || !program || !uniforms || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, now * 1e-3);
    gl.uniform3fv(uniforms.u_color, this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// --- UTILITY FUNCTION ---
const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : null;
};

// --- REACT COMPONENT ---
interface SmokeBackgroundProps {
  /** Cor (hex) usada para tingir os pontos mais claros do ruído. */
  smokeColor?: string;
  className?: string;
}

export function SmokeBackground({ smokeColor = '#808080', className }: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new Renderer(canvas, fragmentShaderSource);
    rendererRef.current = renderer;

    renderer.updateScale();

    // A transição de largura da sidebar (hover pra abrir) dispara o
    // ResizeObserver em praticamente todo frame da animação CSS (~250ms).
    // Reallocar o drawing buffer do WebGL a cada frame durante uma transição
    // é caro e trava a UI inteira (é a causa do travamento ao abrir a
    // sidebar). Em vez de reagir a cada evento, só aplicamos o resize depois
    // que os eventos "assentam" por um instante — enquanto a transição roda,
    // o canvas só fica escalado via CSS (imperceptível numa textura de
    // ruído), e o buffer real só é realocado uma vez, no final.
    let needsResize = false;
    let resizeDebounceId: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeDebounceId) clearTimeout(resizeDebounceId);
      resizeDebounceId = setTimeout(() => { needsResize = true; }, 140);
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    // Pausa o loop de render quando o card sai da viewport (scroll) — mesmo
    // resultado visual quando visível, zero custo de GPU/CPU quando não está.
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    let animationFrameId: number;
    const loop = (now: number) => {
      if (needsResize) {
        renderer.updateScale();
        needsResize = false;
      }
      if (isVisible) renderer.render(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    loop(0);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (resizeDebounceId) clearTimeout(resizeDebounceId);
      cancelAnimationFrame(animationFrameId);
      renderer.reset();
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const rgbColor = hexToRgb(smokeColor);
    if (rgbColor) renderer.updateColor(rgbColor);
  }, [smokeColor]);

  return <canvas ref={canvasRef} className={cn('block h-full w-full', className)} />;
}
