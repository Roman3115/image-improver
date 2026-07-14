export class DropZone {
  private element: HTMLElement;
  private fileInput: HTMLInputElement;
  private onFileSelected: (file: File) => void;

  constructor(onFileSelected: (file: File) => void) {
    this.onFileSelected = onFileSelected;
    this.element = document.createElement('div');
    this.fileInput = document.createElement('input');
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.element.className = 'drop-zone';
    this.element.innerHTML = `
      <div class="drop-zone-icon">📸</div>
      <div class="drop-zone-text">Перетащите изображение сюда</div>
      <div class="drop-zone-hint">или нажмите для выбора файла</div>
      <div class="drop-zone-hint">Поддерживаются: JPG, PNG, BMP, HEIC</div>
    `;
    this.fileInput.type = 'file';
    this.fileInput.className = 'file-input';
    this.fileInput.accept = 'image/jpeg,image/png,image/bmp,image/x-ms-bmp,image/heic,.heic,.heif';
    this.element.appendChild(this.fileInput);
  }

  private attachEvents(): void {
    this.element.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) this.onFileSelected(target.files[0]);
    });
    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.element.classList.add('drag-over');
    });
    this.element.addEventListener('dragleave', () => this.element.classList.remove('drag-over'));
    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.element.classList.remove('drag-over');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        this.onFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  getElement(): HTMLElement { return this.element; }
  show(): void { this.element.style.display = 'block'; }
  hide(): void { this.element.style.display = 'none'; }
}