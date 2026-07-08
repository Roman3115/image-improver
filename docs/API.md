# API Image Improver

## Класс `ImageEnhancer`

Основной класс библиотеки. Реализует паттерн `EventTarget` для подписки на события.

### Конструктор

```typescript
const enhancer = new ImageEnhancer(options?: EnhancerOptions);
```

Параметры EnhancerOptions:

| Параметр     | Тип      | По умолчанию         | Описание                          |
|--------------|----------|----------------------|-----------------------------------|
| modelUrl     | string   | '/models/model.onnx' | Путь к ONNX-модели                |
| wasmPaths    | string   | '/assets/wasm/'      | Путь к WASM-файлам ONNX Runtime   |
| maxConcurrency | number | 1                    | Макс. количество одновременных задач |

### Методы

#### Метод submit

submit(image, options?) → string
Постановка задачи на обработку.

Метод submit — Параметры:

| Параметр         | Тип                              | Обязательный | Описание                          |
|------------------|----------------------------------|--------------|-----------------------------------|
| image            | File \| Blob \| ImageBitmap      | Да           | Исходное изображение              |
| options.format   | 'jpeg' \| 'png' \| 'auto'        | Нет          | Формат результата (по умолчанию 'auto') |
| options.signal   | AbortSignal                      | Нет          | Сигнал для прерывания задачи      |

Возвращает: taskId (строка-идентификатор задачи).

Пример:

```typescript
const file = input.files[0];
const taskId = enhancer.submit(file);
```

#### Метод getStatus

getStatus(taskId) → TaskStatus
Получение текущего статуса задачи.

Метод getStatus — Возвращает объект:

| Поле     | Тип                                                                                              | Описание              |
|----------|--------------------------------------------------------------------------------------------------|-----------------------|
| taskId   | string                                                                                           | Идентификатор задачи  |
| status   | 'pending' \| 'decoding' \| 'analyzing' \| 'rendering' \| 'encoding' \| 'done' \| 'aborted' \| 'error' | Текущий статус        |
| progress | number                                                                                           | Прогресс от 0 до 100  |

Пример:

```typescript
const status = enhancer.getStatus(taskId);
console.log(status.progress); // 45
```

#### Метод abort

abort(taskId) → Promise<boolean>
Прерывание задачи. Освобождает все ресурсы (WebGL-текстуры, WASM-память, буферы).

Метод abort — Параметры:

| Параметр | Тип    | Описание              |
|----------|--------|-----------------------|
| taskId   | string | Идентификатор задачи  |

Возвращает: Promise<boolean>
true — задача успешно прервана
false — задача уже завершена (статус done, error или aborted)

Особенности:
— Метод можно вызывать даже после завершения задачи — это безопасно
— При прерывании генерируется событие progress со статусом aborted
— Все ресурсы освобождаются автоматически (нет утечек памяти)

Пример:

```typescript
const success = await enhancer.abort(taskId);
if (success) {
  console.log('Задача прервана');
} else {
  console.log('Задача уже завершена');
}
```

#### Метод getResult

getResult(taskId, format?) → Promise<Blob>
Получение готового изображения.

Метод getResult — Параметры:

| Параметр | Тип                        | Описание                                    |
|----------|----------------------------|---------------------------------------------|
| taskId   | string                     | Идентификатор задачи                        |
| format   | 'jpeg' \| 'png' \| 'auto'  | Формат результата (по умолчанию стратегия из ТЗ) |

Возвращает: Blob с готовым изображением.

Пример:

```typescript
const blob = await enhancer.getResult(taskId);
const url = URL.createObjectURL(blob);
a.href = url;
a.download = 'improved.jpg';
a.click();
```

### События

Класс ImageEnhancer наследует EventTarget, поэтому можно подписываться через addEventListener или метод on.

#### Событие progress

Возникает при изменении статуса или прогресса задачи.

Событие progress — Данные события:

| Поле     | Тип                      | Описание              |
|----------|--------------------------|-----------------------|
| taskId   | string                   | Идентификатор задачи  |
| status   | TaskStatus['status']     | Текущий статус        |
| progress | number                   | Прогресс от 0 до 100  |

Пример:

```typescript
enhancer.addEventListener('progress', (event) => {
  console.log(`${event.detail.status}: ${event.detail.progress}%`);
});

// Или через метод on:
enhancer.on('progress', ({ taskId, status, progress }) => {
  progressBar.value = progress;
});
```

#### Полный пример использования:

```typescript
import { ImageEnhancer } from './api/ImageEnhancer';

const enhancer = new ImageEnhancer();

// Подписка на прогресс
enhancer.on('progress', ({ status, progress }) => {
  console.log(`[${status}] ${progress}%`);
});

// Загрузка файла
const file = document.querySelector('input[type=file]').files[0];

// Постановка задачи
const taskId = enhancer.submit(file);

// Ожидание результата
const blob = await new Promise((resolve) => {
  const checkStatus = () => {
    const status = enhancer.getStatus(taskId);
    if (status.status === 'done') {
      resolve(enhancer.getResult(taskId));
    } else if (status.status === 'error' || status.status === 'aborted') {
      reject(new Error(status.status));
    } else {
      setTimeout(checkStatus, 100);
    }
  };
  checkStatus();
});

// Скачивание результата
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'improved.jpg';
a.click();
URL.revokeObjectURL(url);
```

### Обработка ошибок

Обработка ошибок — Типы ошибок:

| Ошибка                    | Причина                                              | Как обрабатывается                                              |
|---------------------------|------------------------------------------------------|-----------------------------------------------------------------|
| UnsupportedFormatError    | Файл не является изображением (не JPG/PNG/HEIC/BMP)  | submit() выбрасывает исключение, задача не создаётся            |
| SizeLimitExceededError    | Изображение превышает 15 Мп                          | submit() выбрасывает исключение                                 |
| ModelLoadError            | Не удалось загрузить ONNX-модель                     | Статус задачи → error, событие progress с error                 |
| DecodingError             | Ошибка декодирования (повреждённый HEIC и т.д.)      | Статус задачи → error                                           |
| RenderingError            | Сбой WebGL-контекста (неподдерживаемый браузер)      | Статус задачи → error                                           |
| EncodingError             | Ошибка кодирования результата                        | Статус задачи → error                                           |
| AbortedError              | Задача прервана пользователем                        | Статус задачи → aborted                                         |

#### Пример обработки ошибок:

```typescript
try {
  const taskId = enhancer.submit(file);
  
  enhancer.on('progress', ({ status, progress, error }) => {
    if (status === 'error') {
      console.error('Ошибка обработки:', error);
      return;
    }
    if (status === 'aborted') {
      console.log('Задача прервана');
      return;
    }
    console.log(`[${status}] ${progress}%`);
  });
  
  const blob = await enhancer.getResult(taskId);
  // ... скачивание
} catch (err) {
  if (err instanceof UnsupportedFormatError) {
    alert('Неподдерживаемый формат файла');
  } else if (err instanceof SizeLimitExceededError) {
    alert('Изображение слишком большое (макс. 15 Мп)');
  } else {
    console.error('Неизвестная ошибка:', err);
  }
}
```

#### Rejected Promise

Метод getResult() возвращает Promise<Blob>, который может быть отклонён:
Если задача прервана → Promise отклоняется с AbortedError
Если произошла ошибка → Promise отклоняется с соответствующей ошибкой

```typescript
try {
  const blob = await enhancer.getResult(taskId);
} catch (err) {
  if (err.name === 'AbortedError') {
    console.log('Задача была прервана');
  } else {
    console.error('Ошибка получения результата:', err);
  }
}
```

### Статусы задачи

| Статус    | Описание                                  | Прогресс |
|-----------|-------------------------------------------|----------|
| pending   | Задача поставлена в очередь               | 0%       |
| decoding  | Декодирование изображения (включая HEIC)  | 10-30%   |
| analyzing | ML-инференс (предсказание параметров)     | 30-60%   |
| rendering | Применение параметров через WebGL         | 60-85%   |
| encoding  | Кодирование результата в JPEG/PNG         | 85-95%   |
| done      | Задача завершена успешно                  | 100%     |
| aborted   | Задача прервана пользователем             | —        |
| error     | Произошла ошибка                          | —        |