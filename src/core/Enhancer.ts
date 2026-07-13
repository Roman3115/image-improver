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
    console.log('ImageEnhancer готов к работе');
  }

  async enhance(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    format: 'jpeg' | 'png' = 'jpeg'
  ): Promise<EnhanceResult> {
    if (!this.isInitialized) {
      throw new Error('ImageEnhancer не инициализирован. Вызовите initialize() сначала.');
    }

    const startTime = performance.now();

    try {
      const coefficients = await this.modelRunner.predict(image);
      console.log('Предсказанные коэффициенты:', coefficients);

      const renderResult = await this.renderer.apply(image, coefficients, format);
      const endTime = performance.now();

      return {
        blob: renderResult.blob,
        width: renderResult.width,
        height: renderResult.height,
        coefficients,
        processingTime: endTime - startTime,
      };
    } catch (error) {
      console.error('Ошибка при улучшении изображения:', error);
      throw error;
    }
  }

  dispose(): void {
    this.modelRunner.dispose();
    this.renderer.dispose();
    this.isInitialized = false;
  }
}