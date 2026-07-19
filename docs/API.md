# API Image Improver

Данный документ описывает программный интерфейс ядра системы улучшения изображений.

## Класс `ImageEnhancer`

Основной класс, объединяющий ML-модель и WebGL-рендерер в единый пайплайн обработки.

Класс наследует встроенный браузерный `EventTarget`, что позволяет подписываться на события обработки через стандартный API `addEventListener`.

### Конструктор

```typescript
const enhancer = new ImageEnhancer();
```

Параметры не требуются. Модель загружается отдельно через метод `initialize()`.

## Асинхронная модель

Все основные методы API работают **асинхронно** и возвращают `Promise`. Это значит следующее:

- Обработка изображений не блокирует главный поток браузера
- Пользовательский интерфейс не блокируется во время обработки
- Возможность прерывания задачи через `AbortController`
- Генерация событий `progress` во время выполнения

**Пример асинхронного вызова:**

```typescript
const result = await enhancer.enhance(img, options);
```

**Время выполнения:**

| Метод          | Время выполнения        | Описание                                |
|----------------|-------------------------|-----------------------------------------|
| `initialize()` | ~500-700 мс             | Загрузка ONNX-модели в память           |
| `enhance()`    | ~200-400 мс (6-12 Мп)   | Полный цикл обработки изображения       |
| `dispose()`    | < 10 мс                 | Освобождение ресурсов                   |

## Методы

### Метод `initialize`

```typescript
async initialize(modelPath: string = '/models/model.onnx'): Promise<void>
```

Загружает ONNX-модель в память браузера. Должен быть вызван один раз перед началом обработки изображений.

**Параметры:**

| Параметр  | Тип    | По умолчанию         | Описание                 |
|-----------|--------|----------------------|--------------------------|
| modelPath | string | '/models/model.onnx' | Путь к файлу ONNX-модели |

**Пример:**

```typescript
const enhancer = new ImageEnhancer();
await enhancer.initialize('/models/model.onnx');
```

### Метод `enhance`

```typescript
async enhance(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  options?: EnhanceOptions
): Promise<EnhanceResult>
```

Выполняет полный цикл обработки изображения:
1. Предобработка (resize до 224×224, нормализация)
2. ML-инференс (предсказание коэффициентов коррекции)
3. WebGL-рендеринг (применение коэффициентов к полноразмерному изображению)
4. Кодирование результата (JPEG/PNG)

**Параметры:**

| Параметр           | Тип                                                  | Обязательный | Описание                                                         |
|--------------------|------------------------------------------------------|--------------|------------------------------------------------------------------|
| image              | HTMLImageElement \| HTMLCanvasElement \| ImageBitmap | Да           | Исходное изображение для обработки                               |
| options.format     | 'jpeg' \| 'png'                                      | Нет          | Формат выходного файла. По умолчанию: `'jpeg'`                   |
| options.signal     | AbortSignal                                          | Нет          | Сигнал для прерывания задачи (через `AbortController`)           |
| options.onProgress | (stage: string, percent: number) => void             | Нет          | Колбэк для отслеживания прогресса (дублирует событие `progress`) |

**Возвращает:** `Promise<EnhanceResult>`

**Пример:**

```typescript
const img = new Image();
img.src = URL.createObjectURL(file);
await new Promise(resolve => { img.onload = resolve; });

const result = await enhancer.enhance(img, {
  format: 'jpeg',
  signal: abortController.signal,
  onProgress: (stage, percent) => {
    console.log(`Прогресс: ${stage} - ${percent}%`);
  }
});
```

### Метод `dispose`

```typescript
dispose(): void
```

Освобождает все занятые ресурсы: WebGL-контекст, текстуры и память ONNX-модели. Вызывается при уничтожении компонента или закрытии приложения.

**Пример:**

```typescript
enhancer.dispose();
```

## Типы данных

### `EnhanceOptions`

```typescript
interface EnhanceOptions {
  format?: 'jpeg' | 'png';
  signal?: AbortSignal;
  onProgress?: (stage: string, percent: number) => void;
}
```

**Поля:**

| Поле       | Тип                                        | Описание                                                 |
|------------|--------------------------------------------|----------------------------------------------------------|
| format     | 'jpeg' \| 'png'                            | Формат выходного файла                                   |
| signal     | AbortSignal                                | Сигнал для прерывания задачи                             |
| onProgress | (stage: string, percent: number) => void   | Колбэк для отслеживания прогресса                        |

### `EnhanceResult`

```typescript
interface EnhanceResult {
  blob: Blob;
  width: number;
  height: number;
  coefficients: CorrectionCoefficients;
  processingTime: number;
}
```

**Поля:**

| Поле           | Тип                      | Описание                                       |
|----------------|--------------------------|------------------------------------------------|
| blob           | Blob                     | Готовое изображение в виде Blob-объекта        |
| width          | number                   | Ширина изображения в пикселях                  |
| height         | number                   | Высота изображения в пикселях                  |
| coefficients   | CorrectionCoefficients   | Предсказанные моделью коэффициенты коррекции   |
| processingTime | number                   | Общее время обработки в миллисекундах          |

### `CorrectionCoefficients`

```typescript
interface CorrectionCoefficients {
  brightness: number;
  contrast: number;
  color: number;
}
```

**Поля:**

| Поле       | Тип    | Описание                                                    |
|------------|--------|-------------------------------------------------------------|
| brightness | number | Коэффициент яркости (1.0 = без изменений, >1 = более ярко, <1 = более блекло) |
| contrast   | number | Коэффициент контраста (1.0 = без изменений, >1 = с большей контрастностью, <1 = с меньшей контрастностью) |
| color      | number | Коэффициент цветности (1.0 = без изменений, >1 = более насыщенно, <1 = менее насыщенно) |

### `ProgressEventDetail`

```typescript
interface ProgressEventDetail {
  stage: 'start' | 'preprocessing' | 'inference' | 'rendering' | 'done' | 'aborted' | 'error';
  progress: number;
  error?: any;
}
```

**Поля:**

| Поле     | Тип    | Описание                                                                |
|----------|--------|-------------------------------------------------------------------------|
| stage    | string | Текущий этап обработки                                                  |
| progress | number | Процент выполнения (0-100)                                              |
| error    | any    | Объект ошибки (только если `stage === 'error'`)                         |

**Возможные значения `stage`:**

| Значение       | Описание                                       | Прогресс |
|----------------|------------------------------------------------|----------|
| 'start'        | Начало обработки                               | 0%       |
| 'preprocessing'| Предобработка изображения                      | 20%      |
| 'inference'    | ML-инференс (предсказание коэффициентов)       | 60%      |
| 'rendering'    | WebGL-рендеринг                                | 80%      |
| 'done'         | Обработка успешно завершена                    | 100%     |
| 'aborted'      | Обработка прервана пользователем               | —        |
| 'error'        | Произошла ошибка                               | —        |

---

## События

Класс `ImageEnhancer` наследует `EventTarget`, поэтому поддерживает стандартный API `addEventListener`.

### Событие `progress`

Генерируется при изменении этапа обработки.

**Данные события (`event.detail`):**

| Поле     | Тип    | Описание                                                                |
|----------|--------|-------------------------------------------------------------------------|
| stage    | string | Текущий этап обработки                                                  |
| progress | number | Процент выполнения (0-100)                                              |
| error    | any    | Объект ошибки (только если `stage === 'error'`)                         |

**Пример подписки:**

```typescript
enhancer.addEventListener('progress', (event: CustomEvent) => {
  const { stage, progress } = event.detail;
  console.log(`Этап: ${stage}, Прогресс: ${progress}%`);
  
  if (stage === 'error') {
    console.error('Ошибка:', event.detail.error);
  }
  
  if (stage === 'aborted') {
    console.log('Обработка прервана пользователем');
  }
});
```

---

## Полный пример использования

```typescript
import { ImageEnhancer } from './core/Enhancer';

// 1. Создание экземпляра
const enhancer = new ImageEnhancer();

// 2. Инициализация (загрузка модели)
await enhancer.initialize('/models/model.onnx');

// 3. Подготовка изображения
const file = input.files[0];
const img = new Image();
img.src = URL.createObjectURL(file);
await new Promise(resolve => { img.onload = resolve; });

// 4. Настройка прерывания
const abortController = new AbortController();

// 5. Подписка на события прогресса
enhancer.addEventListener('progress', (e: CustomEvent) => {
  const { stage, progress } = e.detail;
  console.log(`[${stage}] ${progress}%`);
  
  // Обновление UI
  progressBar.value = progress;
  statusText.textContent = stage;
});

// 6. Запуск обработки
try {
  const result = await enhancer.enhance(img, {
    format: file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg',
    signal: abortController.signal,
  });

  // 7. Скачивание результата
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `improved_${Date.now()}.${result.blob.type === 'image/png' ? 'png' : 'jpg'}`;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`Обработано за ${result.processingTime} мс`);
  console.log('Коэффициенты:', result.coefficients);

} catch (error: any) {
  if (error.name === 'AbortError') {
    console.log('Обработка прервана пользователем');
  } else {
    console.error('Ошибка обработки:', error);
  }
}

// 8. Очистка ресурсов (при закрытии приложения)
// enhancer.dispose();
```

---

## Обработка ошибок

Метод `enhance` использует стандартные механизмы JavaScript:

| Тип ошибки                          | Причина возникновения                                  |
|-------------------------------------|--------------------------------------------------------|
| `Error`                             | ImageEnhancer не был инициализирован (`initialize`)    |
| `Error`                             | Ошибка декодирования HEIC (через heic2any)             |
| `DOMException` (name: 'AbortError') | Задача прервана через `AbortController.abort()`        |
| `Error`                             | Сбой WebGL-контекста или нехватка памяти браузера      |

**Пример обработки:**

```typescript
try {
  const result = await enhancer.enhance(img);
} catch (error: any) {
  if (error.name === 'AbortError') {
    console.log('Обработка прервана');
  } else {
    console.error('Ошибка:', error.message);
  }
}
```