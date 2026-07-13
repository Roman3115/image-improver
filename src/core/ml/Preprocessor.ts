import preprocessConfig from './preprocess_config.json';

export class Preprocessor {
  private readonly targetSize: number;
  private readonly mean: number[];
  private readonly std: number[];

  constructor() {
    this.targetSize = preprocessConfig.thumbnail_size[0];
    this.mean = preprocessConfig.normalize_mean;
    this.std = preprocessConfig.normalize_std;
  }

  preprocess(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = this.targetSize;
    canvas.height = this.targetSize;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, this.targetSize, this.targetSize);
    
    const imageData = ctx.getImageData(0, 0, this.targetSize, this.targetSize);
    const pixels = imageData.data;
    
    const size = this.targetSize;
    const area = size * size;
    const output = new Float32Array(3 * area);
    
    const mean = this.mean;
    const std = this.std;

    let idx = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelIdx = (y * size + x) * 4;
        
        // R
        output[idx] = (pixels[pixelIdx] / 255 - mean[0]) / std[0];
        // G
        output[idx + area] = (pixels[pixelIdx + 1] / 255 - mean[1]) / std[1];
        // B
        output[idx + 2 * area] = (pixels[pixelIdx + 2] / 255 - mean[2]) / std[2];
        
        idx++;
      }
    }
    
    return output;
  }
}