/**
 * VALIDACIÓN DE SIGNOS VITALES
 * Rangos fisiológicos basados en literatura médica
 * 
 * Referencias:
 * - Guías de la American Heart Association
 * - Normas de cuidados intensivos
 * - Rangos pediátricos y adultos
 */

// ============================================================================
// RANGOS FISIOLÓGICOS
// ============================================================================

export const VITAL_SIGNS_RANGES = {
  temperature: {
    min: 32.0,        // Hipotermia severa (límite supervivencia)
    max: 42.0,        // Hipertermia severa (límite supervivencia)
    normalMin: 36.0,  // Rango normal bajo
    normalMax: 37.5,  // Rango normal alto
    warningMin: 35.0, // Hipotermia moderada
    warningMax: 39.0, // Fiebre alta
    criticalMin: 34.0, // Hipotermia grave
    criticalMax: 40.0, // Fiebre crítica
    unit: '°C'
  },
  bloodPressureSystolic: {
    min: 60,          // Hipotensión severa
    max: 250,         // Crisis hipertensiva extrema
    normalMin: 90,    // Rango normal bajo
    normalMax: 120,   // Rango normal alto
    warningMin: 80,   // Hipotensión leve
    warningMax: 140,  // Hipertensión leve
    criticalMin: 70,  // Hipotensión grave
    criticalMax: 180, // Crisis hipertensiva
    unit: 'mmHg'
  },
  bloodPressureDiastolic: {
    min: 40,          // Hipotensión severa
    max: 150,         // Crisis hipertensiva extrema
    normalMin: 60,    // Rango normal bajo
    normalMax: 80,    // Rango normal alto
    warningMin: 50,   // Hipotensión leve
    warningMax: 90,   // Hipertensión leve
    criticalMin: 45,  // Hipotensión grave
    criticalMax: 110, // Crisis hipertensiva
    unit: 'mmHg'
  },
  heartRate: {
    min: 30,          // Bradicardia severa
    max: 220,         // Taquicardia extrema
    normalMin: 60,    // Rango normal bajo
    normalMax: 100,   // Rango normal alto
    warningMin: 50,   // Bradicardia leve
    warningMax: 120,  // Taquicardia leve
    criticalMin: 40,  // Bradicardia grave
    criticalMax: 160, // Taquicardia grave
    unit: 'lpm'
  },
  respiratoryRate: {
    min: 6,           // Bradipnea severa
    max: 60,          // Taquipnea extrema
    normalMin: 12,    // Rango normal bajo
    normalMax: 20,    // Rango normal alto
    warningMin: 10,   // Bradipnea leve
    warningMax: 25,   // Taquipnea leve
    criticalMin: 8,   // Bradipnea grave
    criticalMax: 35,  // Taquipnea grave
    unit: 'rpm'
  },
  oxygenSaturation: {
    min: 70,          // Hipoxemia severa (límite compatible con vida)
    max: 100,         // Saturación normal
    normalMin: 95,    // Rango normal bajo
    normalMax: 100,   // Saturación óptima
    warningMin: 90,   // Hipoxemia leve
    warningMax: 100,
    criticalMin: 85,  // Hipoxemia grave
    criticalMax: 100,
    unit: '%'
  }
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Determina el estado de un signo vital
 * @param {number} value - Valor a evaluar
 * @param {string} vitalSign - Tipo de signo vital
 * @returns {Object} Estado del signo vital
 */
export function validateVitalSign(value, vitalSign) {
  const ranges = VITAL_SIGNS_RANGES[vitalSign];
  
  if (!ranges) {
    return {
      valid: false,
      status: 'error',
      message: 'Tipo de signo vital no reconocido'
    };
  }

  // Validar que sea un número
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return {
      valid: false,
      status: 'error',
      message: 'Debe ser un valor numérico'
    };
  }

  // Valores fuera de rango fisiológico posible
  if (numValue < ranges.min || numValue > ranges.max) {
    return {
      valid: false,
      status: 'error',
      message: `Valor fuera de rango posible (${ranges.min}-${ranges.max} ${ranges.unit})`
    };
  }

  // Valores críticos
  if (numValue < ranges.criticalMin || numValue > ranges.criticalMax) {
    return {
      valid: true,
      status: 'critical',
      message: `⚠️ VALOR CRÍTICO - Requiere atención inmediata`,
      severity: 'high'
    };
  }

  // Valores de advertencia
  if (numValue < ranges.warningMin || numValue > ranges.warningMax) {
    return {
      valid: true,
      status: 'warning',
      message: `⚠️ Valor anormal - Monitoreo recomendado`,
      severity: 'medium'
    };
  }

  // Valores normales
  if (numValue >= ranges.normalMin && numValue <= ranges.normalMax) {
    return {
      valid: true,
      status: 'normal',
      message: '✓ Valor normal',
      severity: 'low'
    };
  }

  // Valores ligeramente fuera de lo normal pero no críticos
  return {
    valid: true,
    status: 'warning',
    message: '⚠️ Valor fuera de rango normal',
    severity: 'medium'
  };
}

/**
 * Valida la presión arterial completa
 * @param {string} bloodPressure - Formato "120/80"
 * @returns {Object} Resultado de validación
 */
export function validateBloodPressure(bloodPressure) {
  const parts = bloodPressure.split('/');
  
  if (parts.length !== 2) {
    return {
      valid: false,
      status: 'error',
      message: 'Formato incorrecto. Use formato: 120/80'
    };
  }

  const systolic = parseInt(parts[0]);
  const diastolic = parseInt(parts[1]);

  if (isNaN(systolic) || isNaN(diastolic)) {
    return {
      valid: false,
      status: 'error',
      message: 'Valores deben ser numéricos'
    };
  }

  // Validar que sistólica sea mayor que diastólica
  if (systolic <= diastolic) {
    return {
      valid: false,
      status: 'error',
      message: 'Presión sistólica debe ser mayor que diastólica'
    };
  }

  // Validar presión de pulso (diferencia entre sistólica y diastólica)
  const pulsePressure = systolic - diastolic;
  if (pulsePressure < 20) {
    return {
      valid: true,
      status: 'warning',
      message: '⚠️ Presión de pulso baja (<20 mmHg) - Evaluar'
    };
  }
  if (pulsePressure > 60) {
    return {
      valid: true,
      status: 'warning',
      message: '⚠️ Presión de pulso alta (>60 mmHg) - Evaluar'
    };
  }

  const systolicValidation = validateVitalSign(systolic, 'bloodPressureSystolic');
  const diastolicValidation = validateVitalSign(diastolic, 'bloodPressureDiastolic');

  // Retornar el peor estado
  if (!systolicValidation.valid || !diastolicValidation.valid) {
    return {
      valid: false,
      status: 'error',
      message: systolicValidation.message || diastolicValidation.message
    };
  }

  if (systolicValidation.status === 'critical' || diastolicValidation.status === 'critical') {
    return {
      valid: true,
      status: 'critical',
      message: '⚠️ PRESIÓN ARTERIAL CRÍTICA - Requiere atención inmediata'
    };
  }

  if (systolicValidation.status === 'warning' || diastolicValidation.status === 'warning') {
    return {
      valid: true,
      status: 'warning',
      message: '⚠️ Presión arterial anormal - Monitoreo recomendado'
    };
  }

  return {
    valid: true,
    status: 'normal',
    message: '✓ Presión arterial normal'
  };
}

/**
 * Valida todos los signos vitales de una vez
 * @param {Object} vitalSigns - Objeto con todos los signos vitales
 * @returns {Object} Resultado de validación completa
 */
export function validateAllVitalSigns(vitalSigns) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    criticals: [],
    details: {}
  };

  // Validar temperatura
  if (vitalSigns.temperature) {
    const tempResult = validateVitalSign(vitalSigns.temperature, 'temperature');
    results.details.temperature = tempResult;
    
    if (!tempResult.valid) {
      results.valid = false;
      results.errors.push(`Temperatura: ${tempResult.message}`);
    } else if (tempResult.status === 'critical') {
      results.criticals.push(`Temperatura: ${tempResult.message}`);
    } else if (tempResult.status === 'warning') {
      results.warnings.push(`Temperatura: ${tempResult.message}`);
    }
  }

  // Validar presión arterial
  if (vitalSigns.bloodPressure) {
    const bpResult = validateBloodPressure(vitalSigns.bloodPressure);
    results.details.bloodPressure = bpResult;
    
    if (!bpResult.valid) {
      results.valid = false;
      results.errors.push(`Presión arterial: ${bpResult.message}`);
    } else if (bpResult.status === 'critical') {
      results.criticals.push(`Presión arterial: ${bpResult.message}`);
    } else if (bpResult.status === 'warning') {
      results.warnings.push(`Presión arterial: ${bpResult.message}`);
    }
  }

  // Validar frecuencia cardíaca
  if (vitalSigns.heartRate) {
    const hrResult = validateVitalSign(vitalSigns.heartRate, 'heartRate');
    results.details.heartRate = hrResult;
    
    if (!hrResult.valid) {
      results.valid = false;
      results.errors.push(`Frecuencia cardíaca: ${hrResult.message}`);
    } else if (hrResult.status === 'critical') {
      results.criticals.push(`Frecuencia cardíaca: ${hrResult.message}`);
    } else if (hrResult.status === 'warning') {
      results.warnings.push(`Frecuencia cardíaca: ${hrResult.message}`);
    }
  }

  // Validar frecuencia respiratoria
  if (vitalSigns.respiratoryRate) {
    const rrResult = validateVitalSign(vitalSigns.respiratoryRate, 'respiratoryRate');
    results.details.respiratoryRate = rrResult;
    
    if (!rrResult.valid) {
      results.valid = false;
      results.errors.push(`Frecuencia respiratoria: ${rrResult.message}`);
    } else if (rrResult.status === 'critical') {
      results.criticals.push(`Frecuencia respiratoria: ${rrResult.message}`);
    } else if (rrResult.status === 'warning') {
      results.warnings.push(`Frecuencia respiratoria: ${rrResult.message}`);
    }
  }

  // Validar saturación de oxígeno
  if (vitalSigns.oxygenSaturation) {
    const o2Result = validateVitalSign(vitalSigns.oxygenSaturation, 'oxygenSaturation');
    results.details.oxygenSaturation = o2Result;
    
    if (!o2Result.valid) {
      results.valid = false;
      results.errors.push(`Saturación de oxígeno: ${o2Result.message}`);
    } else if (o2Result.status === 'critical') {
      results.criticals.push(`Saturación de oxígeno: ${o2Result.message}`);
    } else if (o2Result.status === 'warning') {
      results.warnings.push(`Saturación de oxígeno: ${o2Result.message}`);
    }
  }

  return results;
}

/**
 * Obtiene la clase de color según el estado
 * @param {string} status - Estado del signo vital
 * @returns {string} Clases de Tailwind CSS
 */
export function getStatusColor(status) {
  switch (status) {
    case 'normal':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Obtiene el icono según el estado
 * @param {string} status - Estado del signo vital
 * @returns {string} Emoji o símbolo
 */
export function getStatusIcon(status) {
  switch (status) {
    case 'normal':
      return '✓';
    case 'warning':
      return '⚠️';
    case 'critical':
      return '🚨';
    case 'error':
      return '❌';
    default:
      return 'ℹ️';
  }
}

export default {
  VITAL_SIGNS_RANGES,
  validateVitalSign,
  validateBloodPressure,
  validateAllVitalSigns,
  getStatusColor,
  getStatusIcon
};
