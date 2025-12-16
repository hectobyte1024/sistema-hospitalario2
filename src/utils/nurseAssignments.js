/**
 * SISTEMA DE ASIGNACIÓN DE ENFERMEROS
 * Control de acceso basado en turno y piso
 * 
 * Características:
 * - Enfermeros asignados a pisos específicos
 * - Enfermeros asignados a turnos específicos
 * - Visibilidad limitada a pacientes del piso/turno asignado
 * - Sistema de rotación de turnos
 */

// ============================================================================
// DEFINICIONES DE TURNOS
// ============================================================================

export const SHIFTS = {
  MORNING: {
    id: 'morning',
    name: 'Mañana',
    code: 'M',
    startTime: '07:00',
    endTime: '15:00',
    color: 'amber',
    icon: '🌅'
  },
  AFTERNOON: {
    id: 'afternoon',
    name: 'Tarde',
    code: 'T',
    startTime: '15:00',
    endTime: '23:00',
    color: 'orange',
    icon: '🌇'
  },
  NIGHT: {
    id: 'night',
    name: 'Noche',
    code: 'N',
    startTime: '23:00',
    endTime: '07:00',
    color: 'indigo',
    icon: '🌙'
  }
};

// ============================================================================
// DEFINICIONES DE PISOS
// ============================================================================

export const FLOORS = {
  1: { id: 1, name: 'Piso 1 - Urgencias', areas: ['Urgencias', 'Observación'], color: 'red' },
  2: { id: 2, name: 'Piso 2 - Medicina Interna', areas: ['Cardiología', 'Neurología', 'General'], color: 'blue' },
  3: { id: 3, name: 'Piso 3 - Cirugía', areas: ['Post-operatorio', 'Cirugía General'], color: 'green' },
  4: { id: 4, name: 'Piso 4 - Pediatría', areas: ['Pediatría', 'UCIP'], color: 'purple' },
  5: { id: 5, name: 'Piso 5 - UCI', areas: ['UCI Adultos', 'UCI Coronaria'], color: 'amber' }
};

// ============================================================================
// FUNCIONES DE ASIGNACIÓN
// ============================================================================

/**
 * Determina el turno actual basándose en la hora
 * @returns {Object} Información del turno actual
 */
export function getCurrentShift() {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 7 && hour < 15) {
    return SHIFTS.MORNING;
  } else if (hour >= 15 && hour < 23) {
    return SHIFTS.AFTERNOON;
  } else {
    return SHIFTS.NIGHT;
  }
}

/**
 * Verifica si un enfermero tiene acceso a un paciente
 * @param {Object} nurse - Información del enfermero
 * @param {Object} patient - Información del paciente
 * @param {Object} patientLocation - Ubicación del paciente
 * @returns {boolean} true si tiene acceso
 */
export function hasAccessToPatient(nurse, patient, patientLocation) {
  // Administradores siempre tienen acceso completo
  if (nurse.role === 'admin' || nurse.role === 'doctor') {
    return true;
  }
  
  // Si no hay asignaciones, dar acceso completo (modo legacy)
  if (!nurse.assignedFloors || !nurse.assignedShifts) {
    return true;
  }
  
  // Verificar turno actual
  const currentShift = getCurrentShift();
  const hasShiftAccess = nurse.assignedShifts.includes(currentShift.id);
  
  // Verificar piso
  const hasFloorAccess = nurse.assignedFloors.includes(patientLocation.floor);
  
  return hasShiftAccess && hasFloorAccess;
}

/**
 * Filtra pacientes según las asignaciones del enfermero
 * @param {Array} patients - Lista de pacientes
 * @param {Object} nurse - Información del enfermero
 * @param {Object} patientLocations - Mapa de ubicaciones de pacientes
 * @returns {Array} Pacientes filtrados
 */
export function filterPatientsByAssignment(patients, nurse, patientLocations) {
  // Administradores y doctores ven todos los pacientes
  if (nurse.role === 'admin' || nurse.role === 'doctor') {
    return patients;
  }
  
  // Si no hay asignaciones, mostrar todos (modo legacy)
  if (!nurse.assignedFloors || !nurse.assignedShifts) {
    return patients;
  }
  
  const currentShift = getCurrentShift();
  
  // Filtrar pacientes del turno y piso asignado
  return patients.filter(patient => {
    const location = patientLocations[patient.id];
    if (!location) return false;
    
    const hasShiftAccess = nurse.assignedShifts.includes(currentShift.id);
    const hasFloorAccess = nurse.assignedFloors.includes(location.floor);
    
    return hasShiftAccess && hasFloorAccess;
  });
}

/**
 * Obtiene estadísticas de asignación del enfermero
 * @param {Object} nurse - Información del enfermero
 * @param {Array} allPatients - Todos los pacientes
 * @param {Object} patientLocations - Ubicaciones de pacientes
 * @returns {Object} Estadísticas
 */
export function getNurseAssignmentStats(nurse, allPatients, patientLocations) {
  if (nurse.role !== 'nurse') {
    return {
      totalPatients: allPatients.length,
      assignedPatients: allPatients.length,
      floors: Object.keys(FLOORS),
      shifts: Object.keys(SHIFTS),
      isRestricted: false
    };
  }
  
  const hasAssignments = nurse.assignedFloors && nurse.assignedShifts;
  
  if (!hasAssignments) {
    return {
      totalPatients: allPatients.length,
      assignedPatients: allPatients.length,
      floors: [],
      shifts: [],
      isRestricted: false
    };
  }
  
  const assignedPatients = filterPatientsByAssignment(allPatients, nurse, patientLocations);
  const currentShift = getCurrentShift();
  
  return {
    totalPatients: allPatients.length,
    assignedPatients: assignedPatients.length,
    floors: nurse.assignedFloors,
    shifts: nurse.assignedShifts,
    currentShift: currentShift.name,
    isRestricted: true
  };
}

/**
 * Genera mensaje de restricción de acceso
 * @param {Object} nurse - Información del enfermero
 * @returns {string} Mensaje informativo
 */
export function getAccessRestrictionMessage(nurse) {
  if (!nurse.assignedFloors || !nurse.assignedShifts) {
    return null;
  }
  
  const currentShift = getCurrentShift();
  const floorNames = nurse.assignedFloors.map(f => FLOORS[f]?.name || `Piso ${f}`);
  const shiftNames = nurse.assignedShifts.map(s => {
    const shift = Object.values(SHIFTS).find(sh => sh.id === s);
    return shift ? shift.name : s;
  });
  
  return {
    title: 'Vista Restringida por Asignación',
    currentShift: currentShift.name,
    assignedShifts: shiftNames.join(', '),
    assignedFloors: floorNames.join(', '),
    message: `Mostrando solo pacientes de su turno (${currentShift.name}) en: ${floorNames.join(', ')}`
  };
}

/**
 * Verifica si el enfermero está en su turno asignado
 * @param {Object} nurse - Información del enfermero
 * @returns {Object} Estado del turno
 */
export function checkShiftStatus(nurse) {
  if (!nurse.assignedShifts || nurse.role !== 'nurse') {
    return { inShift: true, canWork: true };
  }
  
  const currentShift = getCurrentShift();
  const inAssignedShift = nurse.assignedShifts.includes(currentShift.id);
  
  return {
    inShift: inAssignedShift,
    canWork: inAssignedShift,
    currentShift: currentShift.name,
    assignedShifts: nurse.assignedShifts.map(s => {
      const shift = Object.values(SHIFTS).find(sh => sh.id === s);
      return shift ? shift.name : s;
    }),
    message: inAssignedShift 
      ? `Turno activo: ${currentShift.name}`
      : `Fuera de turno asignado. Turno actual: ${currentShift.name}`
  };
}

/**
 * Valida una asignación de enfermero
 * @param {Object} assignment - Asignación a validar
 * @returns {Object} Resultado de validación
 */
export function validateNurseAssignment(assignment) {
  const errors = [];
  
  if (!assignment.userId) {
    errors.push('ID de usuario requerido');
  }
  
  if (!assignment.assignedFloors || assignment.assignedFloors.length === 0) {
    errors.push('Debe asignar al menos un piso');
  }
  
  if (!assignment.assignedShifts || assignment.assignedShifts.length === 0) {
    errors.push('Debe asignar al menos un turno');
  }
  
  // Validar que los pisos existen
  if (assignment.assignedFloors) {
    const invalidFloors = assignment.assignedFloors.filter(f => !FLOORS[f]);
    if (invalidFloors.length > 0) {
      errors.push(`Pisos inválidos: ${invalidFloors.join(', ')}`);
    }
  }
  
  // Validar que los turnos existen
  if (assignment.assignedShifts) {
    const validShiftIds = Object.values(SHIFTS).map(s => s.id);
    const invalidShifts = assignment.assignedShifts.filter(s => !validShiftIds.includes(s));
    if (invalidShifts.length > 0) {
      errors.push(`Turnos inválidos: ${invalidShifts.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  SHIFTS,
  FLOORS,
  getCurrentShift,
  hasAccessToPatient,
  filterPatientsByAssignment,
  getNurseAssignmentStats,
  getAccessRestrictionMessage,
  checkShiftStatus,
  validateNurseAssignment
};
