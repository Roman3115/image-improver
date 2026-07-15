import { ImageEnhancer } from '../core/Enhancer';
import { DropZone } from './DropZone';
import { ImagePreview } from './ImagePreview';
import heic2any from 'heic2any';
import './styles.css';

export class App {
  private container: HTMLElement;
  private enhancer: ImageEnhancer;
  private dropZone: DropZone;
  private imagePreview: ImagePreview;
  private loadingElement: HTMLElement;
  private errorElement: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private abortBtn: HTMLButtonElement;
  
  private currentOriginalUrl: string | null = null;
  private currentResult: Blob | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.enhancer = new ImageEnhancer();
    this.dropZone = new DropZone(this.handleFileSelected.bind(this));
    this.imagePreview = new ImagePreview();
    
    this.loadingElement = this.createLoadingElement();
    this.progressBar = this.loadingElement.querySelector('.progress-bar-fill')!;
    this.progressText = this.loadingElement.querySelector('.progress-text')!;
    this.abortBtn = this.loadingElement.querySelector('#abort-btn')!;
    
    this.errorElement = this.createErrorElement();
    
    this.render();
    this.attachEvents();
    this.initialize();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="container">
        <h1>Image Improver</h1>
        <p class="subtitle">Улучшение изображений с помощью ИИ</p>
        <div id="content"></div>
      </div>
    `;
    const content = this.container.querySelector('#content')!;
    content.appendChild(this.dropZone.getElement());
    content.appendChild(this.loadingElement);
    content.appendChild(this.imagePreview.getElement());
    content.appendChild(this.errorElement);
  }

  private attachEvents(): void {
    this.imagePreview.onDownload(() => this.downloadResult());
    this.imagePreview.onReset(() => this.reset());
    this.abortBtn.addEventListener('click', () => this.abortProcessing());
  }

  private async initialize(): Promise<void> {
    try {
      this.updateProgress('Загрузка модели...', 10);
      await this.enhancer.initialize('/models/model.onnx');
      this.updateProgress('Готово', 100);
      setTimeout(() => this.hideLoading(), 500);
    } catch (error) {
      this.showError('Не удалось загрузить модель. Обновите страницу.');
    }
  }

  private async handleFileSelected(file: File): Promise<void> {
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/x-ms-bmp'];
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (!validTypes.includes(file.type) && !isHeic) {
      this.showError('Неподдерживаемый формат. Используйте JPG, PNG, BMP или HEIC.');
      return;
    }

    this.showLoading();
    this.abortController = new AbortController();

    try {
      if (this.currentOriginalUrl) {
        URL.revokeObjectURL(this.currentOriginalUrl);
      }

      let processedFile = file;

      if (isHeic) {
        this.updateProgress('Декодирование HEIC...', 15);
        try {
          const result = await heic2any({ blob: file, toType: 'image/jpeg' });
          const blob = Array.isArray(result) ? result[0] : result;
          processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (heicError: any) {
          if (heicError.message?.includes('already browser readable')) {
            processedFile = new File([file], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
          } else {
            throw new Error('Не удалось декодировать HEIC файл');
          }
        }
      }

      const imageUrl = URL.createObjectURL(processedFile);
      this.currentOriginalUrl = imageUrl;

      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const outputFormat = this.determineOutputFormat(file.name);

      const result = await this.enhancer.enhance(img, {
        format: outputFormat,
        signal: this.abortController.signal,
        onProgress: (stage, percent) => this.updateProgress(stage, percent),
      });

      this.currentResult = result.blob;
      this.hideLoading();
      this.dropZone.hide();
      this.imagePreview.show(imageUrl, result);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.hideLoading();
        this.dropZone.show();
        this.hideError();
        return;
      }
      this.hideLoading();
      this.showError('Ошибка при обработке. Попробуйте другое изображение.');
    }
  }

  private abortProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private downloadResult(): void {
    if (!this.currentResult) return;
    const url = URL.createObjectURL(this.currentResult);
    const a = document.createElement('a');
    a.href = url;
    const extension = this.currentResult.type === 'image/png' ? 'png' : 'jpg';
    a.download = `improved_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private reset(): void {
    if (this.currentOriginalUrl) {
      URL.revokeObjectURL(this.currentOriginalUrl);
      this.currentOriginalUrl = null;
    }
    this.currentResult = null;
    this.abortProcessing();
    
    this.imagePreview.hide();
    this.dropZone.show();
    this.hideError();
  }

  private determineOutputFormat(fileName: string): 'jpeg' | 'png' {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'png') {
      return 'png';
    }
    return 'jpeg';
  }

  private updateProgress(stage: string, percent: number): void {
    this.progressBar.style.width = `${percent}%`;
    this.progressText.textContent = `${stage} (${percent}%)`;
  }

  private createLoadingElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'loading';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="spinner"></div>
      <div class="progress-container">
        <div class="progress-bar"><div class="progress-bar-fill"></div></div>
        <div class="progress-text">Подготовка...</div>
      </div>
      <button class="btn btn-danger" id="abort-btn" style="margin-top: 15px;">Отмена</button>
    `;
    return el;
  }

  private createErrorElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'error';
    el.innerHTML = `<p id="error-message"></p>`;
    return el;
  }

  private showLoading(): void {
    this.loadingElement.style.display = 'block';
    this.dropZone.hide();
    this.imagePreview.hide();
    this.hideError();
    this.updateProgress('Загрузка изображения...', 5);
  }

  private hideLoading(): void { this.loadingElement.style.display = 'none'; }
  private showError(message: string): void {
    const msg = this.errorElement.querySelector('#error-message');
    if (msg) msg.textContent = message;
    this.errorElement.classList.add('show');
  }
  private hideError(): void { this.errorElement.classList.remove('show'); }
}