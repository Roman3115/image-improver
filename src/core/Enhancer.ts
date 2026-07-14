import { ModelRunner } from './ml';
import type { CorrectionCoefficients } from './ml';
import { WebGLRenderer } from './renderer';

export interface EnhanceResult {
  blob: Blob;
  width: number;
  height: number;
  coefficients: CorrectionCoefficients;
  processingTime: number;
}

export type ProgressCallback = (stage: string, percent: number) => void;

export interface EnhanceOptions {
  format?: 'jpeg' | 'png';
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}

export class ImageEnhancer {
  private modelRunner: ModelRunner;
  private renderer: WebGLRenderer;
  private isInitialized: boolean = false;

  constructor() {
    this.modelRunner = new ModelRunner();
    this.renderer = new WebGLRenderer();
  }

  async initialize(modelPath: string = '/models/model.onnx'): Promise<void> {
    if (this.isInitialized) return;
    await this.modelRunner.load(modelPath);
    this.isInitialized = true;
  }

  async enhance(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    options: EnhanceOptions = {}
  ): Promise<EnhanceResult> {
    if (!this.isInitialized) throw new Error('ImageEnhancer не инициализирован');

    const { format = 'jpeg', signal, onProgress } = options;
    const startTime = performance.now();

    try {
      onProgress?.('start', 0);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      onProgress?.('preprocessing', 20);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const coefficients = await this.modelRunner.predict(image);
      
      onProgress?.('inference', 60);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const renderResult = await this.renderer.apply(image, coefficients, format);
      
      onProgress?.('done', 100);

      return {
        blob: renderResult.blob,
        width: renderResult.width,
        height: renderResult.height,
        coefficients,
        processingTime: performance.now() - startTime,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Обработка прервана пользователем');
      }
      throw error;
    }
  }

  dispose(): void {
    this.modelRunner.dispose();
    this.renderer.dispose();
    this.isInitialized = false;
  }
}