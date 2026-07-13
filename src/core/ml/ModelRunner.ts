import * as ort from 'onnxruntime-web';
import { Preprocessor } from './Preprocessor';

export interface CorrectionCoefficients {
  brightness: number;
  contrast: number;
  color: number;
}

export class ModelRunner {
  private session: ort.InferenceSession | null = null;
  private preprocessor: Preprocessor;

  constructor() {
    this.preprocessor = new Preprocessor();
  }

  async load(modelPath: string): Promise<void> {
    if (this.session) {
      console.log('Модель уже загружена');
      return;
    }

    console.log(`Загрузка модели: ${modelPath}`);
    const startTime = performance.now();

    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['webgl', 'wasm'],
    });

    const endTime = performance.now();
    console.log(`Модель загружена за ${(endTime - startTime).toFixed(2)} мс`);
  }

  async predict(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): Promise<CorrectionCoefficients> {
    if (!this.session) {
      throw new Error('Модель не загружена. Вызовите load() сначала.');
    }

    const inputTensor = this.preprocessor.preprocess(image);
    const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224]);
    
    const feeds: ort.InferenceSession.OnnxValueMapType = { input: tensor };
    const results = await this.session.run(feeds);
    
    const output = results.output.data as Float32Array;
    
    return {
      brightness: output[0],
      contrast: output[1],
      color: output[2],
    };
  }

  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
  }
}