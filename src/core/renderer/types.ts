/**
 * Коэффициенты коррекции изображения
 */
export interface CorrectionCoefficients {
  brightness: number;
  contrast: number;
  color: number;
}

/**
 * Результат рендеринга
 */
export interface RenderResult {
  blob: Blob;
  width: number;
  height: number;
}