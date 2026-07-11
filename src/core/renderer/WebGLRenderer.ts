import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';
import type { CorrectionCoefficients, RenderResult } from './types';

/**
 * WebGL рендерер для применения коэффициентов коррекции к изображению
 */
export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture | null = null;
  
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  
  private uniformLocations: {
    brightness: WebGLUniformLocation | null;
    contrast: WebGLUniformLocation | null;
    color: WebGLUniformLocation | null;
    image: WebGLUniformLocation | null;
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    
    const gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
    });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl;
    this.program = this.createProgram();
    this.uniformLocations = this.cacheUniformLocations();
    
    this.setupGeometry();
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw new Error(`Vertex shader error: ${gl.getShaderInfoLog(vertexShader)}`);
    }
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw new Error(`Fragment shader error: ${gl.getShaderInfoLog(fragmentShader)}`);
    }
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    
    gl.useProgram(program);
    
    return program;
  }

  private cacheUniformLocations() {
    const gl = this.gl;
    return {
      brightness: gl.getUniformLocation(this.program, 'u_brightness'),
      contrast: gl.getUniformLocation(this.program, 'u_contrast'),
      color: gl.getUniformLocation(this.program, 'u_color'),
      image: gl.getUniformLocation(this.program, 'u_image'),
    };
  }

  private setupGeometry(): void {
    const gl = this.gl;
    
    // Позиции вершин
    const positions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]);
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const texCoords = new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0,
    ]);
    
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    
    const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private loadImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): void {
    const gl = this.gl;
    
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (image.width > maxSize || image.height > maxSize) {
      throw new Error(
        `Image too large: ${image.width}x${image.height}, max: ${maxSize}x${maxSize}`
      );
    }
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }
    
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    
    gl.viewport(0, 0, image.width, image.height);
  }

  async apply(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    coefficients: CorrectionCoefficients,
    format: 'jpeg' | 'png' = 'jpeg'
  ): Promise<RenderResult> {
    const gl = this.gl;
    
    this.loadImage(image);
    
    gl.uniform1f(this.uniformLocations.brightness, coefficients.brightness);
    gl.uniform1f(this.uniformLocations.contrast, coefficients.contrast);
    gl.uniform1f(this.uniformLocations.color, coefficients.color);
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.95 : undefined;
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
    
    return {
      blob,
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  dispose(): void {
    const gl = this.gl;
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    
    if (this.texCoordBuffer) {
      gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }
    
    gl.deleteProgram(this.program);
  }
}