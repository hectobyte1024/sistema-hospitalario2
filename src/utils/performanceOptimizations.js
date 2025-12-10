import { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Hook para debounce de funciones
 * Retrasa la ejecución de una función hasta que pasen X ms sin que se llame
 */
export function useDebounce(callback, delay = 500) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook para throttle de funciones
 * Limita la frecuencia de ejecución de una función
 */
export function useThrottle(callback, limit = 1000) {
  const inThrottle = useRef(false);

  const throttledCallback = useCallback((...args) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);

  return throttledCallback;
}

/**
 * Sistema de caché simple para datos
 */
class CacheManager {
  constructor(maxAge = 5 * 60 * 1000) { // 5 minutos por defecto
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    const age = Date.now() - item.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }

  // Limpia entradas expiradas
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia global de caché
export const dataCache = new CacheManager();

// Limpieza periódica del caché cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Hook para usar caché con datos
 */
export function useCachedData(key, fetchFunction, dependencies = []) {
  const [data, setData] = React.useState(() => dataCache.get(key));
  const [loading, setLoading] = React.useState(!dataCache.has(key));
  const [error, setError] = React.useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      // Si tenemos datos en caché, úsalos
      if (dataCache.has(key)) {
        const cachedData = dataCache.get(key);
        if (!cancelled) {
          setData(cachedData);
          setLoading(false);
        }
        return;
      }

      // Si no, fetch nuevos datos
      try {
        setLoading(true);
        const result = await fetchFunction();
        if (!cancelled) {
          dataCache.set(key, result);
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          console.error(`Error loading data for key ${key}:`, err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [key, ...dependencies]);

  const refresh = useCallback(async () => {
    dataCache.delete(key);
    setLoading(true);
    try {
      const result = await fetchFunction();
      dataCache.set(key, result);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction]);

  return { data, loading, error, refresh };
}

/**
 * Paginación de datos para listas grandes
 */
export function usePagination(data = [], itemsPerPage = 20) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  return {
    paginatedData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

/**
 * Filtrado optimizado de datos con memoización
 */
export function useFilteredData(data = [], filterFn, dependencies = []) {
  return useMemo(() => {
    if (!filterFn || !data) return data;
    return data.filter(filterFn);
  }, [data, ...dependencies]);
}

/**
 * Ordenamiento optimizado de datos
 */
export function useSortedData(data = [], sortFn, dependencies = []) {
  return useMemo(() => {
    if (!sortFn || !data) return data;
    return [...data].sort(sortFn);
  }, [data, ...dependencies]);
}

/**
 * Hook para lazy loading de imágenes
 */
export function useLazyLoad(ref, options = {}) {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}

/**
 * Optimizador de re-renders con React.memo personalizado
 */
export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Batch updates para múltiples cambios de estado
 */
export function useBatchUpdate(initialState = {}) {
  const [state, setState] = React.useState(initialState);
  const batchRef = useRef({});
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updates) => {
    Object.assign(batchRef.current, updates);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...batchRef.current }));
      batchRef.current = {};
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate];
}

/**
 * Hook para detectar el tamaño de viewport y ajustar comportamiento
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const debouncedResize = debounce(handleResize, 150);
    window.addEventListener('resize', debouncedResize);

    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  return {
    ...windowSize,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024
  };
}

/**
 * Función auxiliar de debounce (no-hook)
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Monitoreo de rendimiento
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startMeasure(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  endMeasure(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        this.metrics.push({
          name,
          duration: measure.duration,
          timestamp: Date.now()
        });
        
        // Log si es lento (> 100ms)
        if (measure.duration > 100) {
          console.warn(`⚠️ Operación lenta detectada: ${name} tomó ${measure.duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // Ignorar errores de performance API
      }
    }
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = [];
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
