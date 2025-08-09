// Оптимизированный сервис для управления Web Workers
class OptimizedService {
  constructor() {
    this.workers = new Map();
    this.callbacks = new Map();
    this.isInitialized = false;
  }

  // Инициализация всех Web Workers
  init() {
    if (this.isInitialized) return;
    
    try {
      // Инициализируем только необходимые Web Workers
      this.initWorker('background', '/background-updater.js');
      this.initWorker('cache', '/cache-processor.js');
      this.initWorker('defi', '/defi-data-processor.js');
      
      this.isInitialized = true;
      console.log('✅ Optimized service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize optimized service:', error);
    }
  }

  // Инициализация отдельного Web Worker
  initWorker(name, workerPath) {
    try {
      const worker = new Worker(workerPath);
      
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        this.handleWorkerMessage(name, type, data);
      };
      
      worker.onerror = (error) => {
        console.error(`Worker ${name} error:`, error);
      };
      
      this.workers.set(name, worker);
      console.log(`✅ Worker ${name} initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize worker ${name}:`, error);
    }
  }

  // Обработка сообщений от Web Workers
  handleWorkerMessage(workerName, type, data) {
    const callbackKey = `${workerName}_${type}`;
    
    if (this.callbacks.has(callbackKey)) {
      this.callbacks.get(callbackKey)(data);
    }
  }

  // Регистрация callback'ов
  on(workerName, eventType, callback) {
    const key = `${workerName}_${eventType}`;
    this.callbacks.set(key, callback);
  }

  // Отправка сообщения в Web Worker
  postMessage(workerName, type, data) {
    const worker = this.workers.get(workerName);
    if (worker) {
      worker.postMessage({ type, data });
    }
  }

  // Фоновые обновления
  startBackgroundUpdates(interval = 15 * 60 * 1000) {
    this.postMessage('background', 'START_UPDATES', { interval });
  }

  stopBackgroundUpdates() {
    this.postMessage('background', 'STOP_UPDATES');
  }

  // Кэширование
  cacheData(key, data, ttl) {
    this.postMessage('cache', 'CACHE_SET', { key, data, ttl });
  }

  getCachedData(key) {
    this.postMessage('cache', 'CACHE_GET', { key });
  }

  // DeFi данные
  processDefiData(pools) {
    this.postMessage('defi', 'FILTER_POOLS', { pools });
  }

  selectBestPools(pools, currentIds, needCount) {
    this.postMessage('defi', 'SELECT_BEST_POOLS', { 
      pools, currentIds, needCount 
    });
  }

  // Очистка ресурсов
  destroy() {
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers.clear();
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Создаем глобальный экземпляр
const optimizedService = new OptimizedService();

export default optimizedService; 