import type { EnhanceResult } from '../core/Enhancer';

export class ImagePreview {
  private element: HTMLElement;
  private originalImage: HTMLImageElement;
  private resultImage: HTMLImageElement;
  private downloadBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;

  constructor() {
    this.element = document.createElement('div');
    this.originalImage = document.createElement('img');
    this.resultImage = document.createElement('img');
    this.downloadBtn = document.createElement('button');
    this.resetBtn = document.createElement('button');
    this.render();
  }

  private render(): void {
    this.element.className = 'result';
    this.element.innerHTML = `
      <div class="comparison">
        <div class="image-container"><h3>Оригинал</h3></div>
        <div class="image-container"><h3>Улучшенное</h3></div>
      </div>
      <div class="info">
        <div class="info-item"><span class="info-label">Время обработки:</span><span class="info-value" id="processing-time">-</span></div>
        <div class="info-item"><span class="info-label">Яркость:</span><span class="info-value" id="brightness">-</span></div>
        <div class="info-item"><span class="info-label">Контраст:</span><span class="info-value" id="contrast">-</span></div>
        <div class="info-item"><span class="info-label">Цветность:</span><span class="info-value" id="color">-</span></div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="download-btn">Скачать</button>
        <button class="btn btn-secondary" id="reset-btn">Новое изображение</button>
      </div>
    `;
    const comparison = this.element.querySelector('.comparison');
    if (comparison) {
      const containers = comparison.querySelectorAll('.image-container');
      containers[0].appendChild(this.originalImage);
      containers[1].appendChild(this.resultImage);
    }
    this.downloadBtn = this.element.querySelector('#download-btn')!;
    this.resetBtn = this.element.querySelector('#reset-btn')!;
  }

  show(originalUrl: string, result: EnhanceResult): void {
    this.originalImage.src = originalUrl;
    this.resultImage.src = URL.createObjectURL(result.blob);
    const pt = this.element.querySelector('#processing-time');
    const br = this.element.querySelector('#brightness');
    const ct = this.element.querySelector('#contrast');
    const cl = this.element.querySelector('#color');
    if (pt) pt.textContent = `${result.processingTime.toFixed(0)} мс`;
    if (br) br.textContent = result.coefficients.brightness.toFixed(3);
    if (ct) ct.textContent = result.coefficients.contrast.toFixed(3);
    if (cl) cl.textContent = result.coefficients.color.toFixed(3);
    this.element.classList.add('show');
  }

  hide(): void { this.element.classList.remove('show'); }
  onDownload(callback: () => void): void { this.downloadBtn.addEventListener('click', callback); }
  onReset(callback: () => void): void { this.resetBtn.addEventListener('click', callback); }
  getElement(): HTMLElement { return this.element; }
}