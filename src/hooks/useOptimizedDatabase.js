import { useState, useEffect, useCallback } from 'react';
import * as db from '../services/database';
import { dataCache } from '../utils/performanceOptimizations';

/**
 * Hook optimizado para pacientes con caché
 * Reduce llamadas innecesarias a la base de datos
 */
export function useOptimizedPatients() {
  const [patients, setPatients] = useState(() => dataCache.get('patients') || []);
  const [loading, setLoading] = useState(!dataCache.has('patients'));
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async (force = false) => {
    try {
      // Si hay datos en caché y no es forzado, úsalos
      if (!force && dataCache.has('patients')) {
        setPatients(dataCache.get('patients'));
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await db.getAllPatients();
      dataCache.set('patients', data);
      setPatients(data);
      setError(null);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const addPatient = useCallback(async (patient) => {
    try {
      await db.createPatient(patient);
      await loadPatients(true); // Forzar recarga
    } catch (err) {
      console.error('Error adding patient:', err);
      throw err;
    }
  }, [loadPatients]);

  const updatePatient = useCallback(async (id, patient) => {
    try {
      await db.updatePatient(id, patient);
      await loadPatients(true);
    } catch (err) {
      console.error('Error updating patient:', err);
      throw err;
    }
  }, [loadPatients]);

  const removePatient = useCallback(async (id) => {
    try {
      await db.deletePatient(id);
      await loadPatients(true);
    } catch (err) {
      console.error('Error removing patient:', err);
      throw err;
    }
  }, [loadPatients]);

  return {
    patients,
    loading,
    error,
    refresh: () => loadPatients(true),
    addPatient,
    updatePatient,
    removePatient
  };
}

/**
 * Hook optimizado para signos vitales con paginación
 */
export function useOptimizedVitalSigns(patientId = null, options = {}) {
  const { pageSize = 50, enableCache = true } = options;
  const cacheKey = patientId ? `vitals-patient-${patientId}` : 'vitals-all';
  
  const [vitalSigns, setVitalSigns] = useState(() => 
    enableCache ? dataCache.get(cacheKey) || [] : []
  );
  const [loading, setLoading] = useState(!enableCache || !dataCache.has(cacheKey));
  const [page, setPage] = useState(1);

  const loadVitalSigns = useCallback(async (force = false) => {
    try {
      if (!force && enableCache && dataCache.has(cacheKey)) {
        setVitalSigns(dataCache.get(cacheKey));
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = patientId
        ? await db.getVitalSignsByPatientId(patientId)
        : await db.getAllVitalSigns();
      
      if (enableCache) {
        dataCache.set(cacheKey, data);
      }
      setVitalSigns(data);
    } catch (err) {
      console.error('Error loading vital signs:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, cacheKey, enableCache]);

  useEffect(() => {
    loadVitalSigns();
  }, [loadVitalSigns]);

  const addVitalSigns = useCallback(async (vital) => {
    try {
      await db.createVitalSigns(vital);
      await loadVitalSigns(true);
    } catch (err) {
      console.error('Error adding vital signs:', err);
      throw err;
    }
  }, [loadVitalSigns]);

  // Datos paginados
  const paginatedVitals = vitalSigns.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(vitalSigns.length / pageSize);

  return {
    vitalSigns: paginatedVitals,
    allVitalSigns: vitalSigns,
    loading,
    page,
    totalPages,
    setPage,
    refresh: () => loadVitalSigns(true),
    addVitalSigns
  };
}

/**
 * Hook optimizado para tratamientos con filtrado
 */
export function useOptimizedTreatments(patientId = null) {
  const cacheKey = patientId ? `treatments-patient-${patientId}` : 'treatments-all';
  
  const [treatments, setTreatments] = useState(() => dataCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [filter, setFilter] = useState('all'); // all, active, completed

  const loadTreatments = useCallback(async (force = false) => {
    try {
      if (!force && dataCache.has(cacheKey)) {
        setTreatments(dataCache.get(cacheKey));
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = patientId
        ? await db.getTreatmentsByPatientId(patientId)
        : await db.getAllTreatments();
      
      dataCache.set(cacheKey, data);
      setTreatments(data);
    } catch (err) {
      console.error('Error loading treatments:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, cacheKey]);

  useEffect(() => {
    loadTreatments();
  }, [loadTreatments]);

  const addTreatment = useCallback(async (treatment) => {
    try {
      await db.createTreatment(treatment);
      await loadTreatments(true);
    } catch (err) {
      console.error('Error adding treatment:', err);
      throw err;
    }
  }, [loadTreatments]);

  // Filtrado optimizado con useMemo
  const filteredTreatments = React.useMemo(() => {
    if (filter === 'all') return treatments;
    if (filter === 'active') return treatments.filter(t => t.status === 'Activo');
    if (filter === 'completed') return treatments.filter(t => t.status === 'Completado');
    return treatments;
  }, [treatments, filter]);

  return {
    treatments: filteredTreatments,
    allTreatments: treatments,
    loading,
    filter,
    setFilter,
    refresh: () => loadTreatments(true),
    addTreatment
  };
}

/**
 * Hook para precarga de datos críticos
 * Carga datos en background para tenerlos listos
 */
export function usePrefetchData(userId, userRole) {
  useEffect(() => {
    if (!userId) return;

    const prefetch = async () => {
      try {
        // Precargar datos según el rol
        if (userRole === 'nurse' || userRole === 'doctor') {
          // Precargar pacientes
          if (!dataCache.has('patients')) {
            const patients = await db.getAllPatients();
            dataCache.set('patients', patients);
          }

          // Precargar signos vitales recientes
          if (!dataCache.has('vitals-recent')) {
            const vitals = await db.getAllVitalSigns();
            const today = new Date().toISOString().split('T')[0];
            const recent = vitals.filter(v => v.date.startsWith(today));
            dataCache.set('vitals-recent', recent);
          }
        }

        if (userRole === 'admin') {
          // Precargar usuarios
          if (!dataCache.has('users')) {
            const users = await db.getAllUsers();
            dataCache.set('users', users);
          }
        }
      } catch (err) {
        console.error('Error prefetching data:', err);
      }
    };

    // Ejecutar después de un delay para no bloquear carga inicial
    const timer = setTimeout(prefetch, 1000);
    return () => clearTimeout(timer);
  }, [userId, userRole]);
}

/**
 * Hook para limpiar caché cuando sea necesario
 */
export function useCacheManagement() {
  const clearAllCache = useCallback(() => {
    dataCache.clear();
  }, []);

  const clearCacheByKey = useCallback((key) => {
    dataCache.delete(key);
  }, []);

  const clearCacheByPattern = useCallback((pattern) => {
    // Limpiar todas las claves que coincidan con un patrón
    const keys = Array.from(dataCache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        dataCache.delete(key);
      }
    });
  }, []);

  return {
    clearAllCache,
    clearCacheByKey,
    clearCacheByPattern
  };
}

/**
 * Hook para monitorear el rendimiento de queries
 */
export function useQueryPerformance(queryName) {
  const [metrics, setMetrics] = useState({
    executionTime: 0,
    cacheHit: false,
    timestamp: null
  });

  const measureQuery = useCallback(async (queryFn) => {
    const startTime = performance.now();
    const cacheHit = dataCache.has(queryName);
    
    try {
      const result = await queryFn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      setMetrics({
        executionTime,
        cacheHit,
        timestamp: new Date()
      });

      // Log queries lentas
      if (executionTime > 500) {
        console.warn(`⚠️ Query lenta: ${queryName} tomó ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (err) {
      throw err;
    }
  }, [queryName]);

  return {
    metrics,
    measureQuery
  };
}

// Re-exportar React para usar en este archivo
import React from 'react';
