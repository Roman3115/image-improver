import { ImageEnhancer } from './core/Enhancer';

interface BenchmarkResult {
  fileName: string;
  width: number;
  height: number;
  megapixels: number;
  processingTime: number;
  blobSize: number;
}

async function runBenchmark() {
  console.log('🚀 Запуск бенчмарка...\n');

  const enhancer = new ImageEnhancer();
  await enhancer.initialize('/models/model.onnx');

  const testImages = [
    'a0003-NKIM_MG_8178.jpg',
    'a0131-050801_142414__I2E5524.jpg',
    'a0230-_DSC0126.jpg',
    'a0387-IMG_3388.jpg',
    'a0645-kme_581.jpg',
  ];

  const results: BenchmarkResult[] = [];

  for (const fileName of testImages) {
    try {
      const img = new Image();
      img.src = `/benchmark/${fileName}`;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const startTime = performance.now();
      const result = await enhancer.enhance(img, { format: 'jpeg' });
      const endTime = performance.now();

      const megapixels = (img.width * img.height) / 1_000_000;

      results.push({
        fileName,
        width: img.width,
        height: img.height,
        megapixels: Number(megapixels.toFixed(2)),
        processingTime: Number((endTime - startTime).toFixed(0)),
        blobSize: Number((result.blob.size / 1024).toFixed(0)),
      });

      console.log(`${fileName}: ${megapixels.toFixed(2)} Мп, ${endTime - startTime} мс`);
    } catch (error) {
      console.error(`${fileName}: ошибка`, error);
    }
  }

  console.log('\nРезультаты бенчмарка:\n');
  console.table(results);

  const times = results.map(r => r.processingTime);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const min = Math.min(...times);

  console.log('Статистика:');
  console.log(`Среднее время: ${avg.toFixed(0)} мс`);
  console.log(`Минимальное: ${min} мс`);
  console.log(`Максимальное: ${max} мс`);
  console.log(`Всего изображений: ${results.length}`);

  enhancer.dispose();
}

window.addEventListener('DOMContentLoaded', runBenchmark);