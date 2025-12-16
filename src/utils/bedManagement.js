/**
 * Bed Management Utilities
 * Sistema de Disponibilidad de Camas
 * 
 * Provides utilities for managing hospital bed availability,
 * validation, and status tracking.
 */

// Bed statuses
export const BED_STATUS = {
  DISPONIBLE: 'disponible',
  OCUPADA: 'ocupada',
  MANTENIMIENTO: 'mantenimiento',
  LIMPIEZA: 'limpieza'
};

// Bed status colors for UI
export const BED_STATUS_COLORS = {
  disponible: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    badge: 'bg-green-500',
    label: 'Disponible'
  },
  ocupada: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    badge: 'bg-red-500',
    label: 'Ocupada'
  },
  mantenimiento: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    badge: 'bg-orange-500',
    label: 'Mantenimiento'
  },
  limpieza: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    badge: 'bg-blue-500',
    label: 'Limpieza'
  }
};

// Bed types
export const BED_TYPES = {
  ESTANDAR: 'estándar',
  UCI: 'UCI',
  PEDIATRICA: 'pediátrica',
  BARIATRICA: 'bariátrica',
  ELECTRICA: 'eléctrica'
};

/**
 * Validate if bed is available for assignment
 */
export function isBedAvailable(bed) {
  if (!bed) return false;
  return bed.status === BED_STATUS.DISPONIBLE && bed.is_active === 1;
}

/**
 * Validate if bed can be assigned to patient
 * Returns { valid: boolean, error: string }
 */
export function validateBedAssignment(bed, patientId) {
  const errors = [];

  if (!bed) {
    return { valid: false, error: 'Cama no encontrada' };
  }

  if (!patientId) {
    return { valid: false, error: 'ID de paciente requerido' };
  }

  if (bed.is_active !== 1) {
    errors.push('La cama está inactiva');
  }

  if (bed.status !== BED_STATUS.DISPONIBLE) {
    errors.push(`La cama está ${BED_STATUS_COLORS[bed.status]?.label.toLowerCase() || bed.status}`);
  }

  if (bed.patient_id && bed.patient_id !== patientId) {
    errors.push('La cama ya tiene un paciente asignado');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('. ')
    };
  }

  return { valid: true };
}

/**
 * Format bed number for display
 * Example: "3305-A" -> "Piso 3, Hab. 305, Cama A"
 */
export function formatBedDisplay(bed) {
  if (!bed) return 'Sin asignar';
  
  return `Piso ${bed.floor}, ${bed.area}, Hab. ${bed.room}, Cama ${bed.bed_label}`;
}

/**
 * Format bed number short
 * Example: "305-A"
 */
export function formatBedShort(bed) {
  if (!bed) return 'N/A';
  return `${bed.room}-${bed.bed_label}`;
}

/**
 * Calculate bed occupancy rate
 */
export function calculateOccupancyRate(availability) {
  if (!availability || availability.total_beds === 0) return 0;
  
  const occupiedBeds = availability.occupied_beds || 0;
  const totalBeds = availability.total_beds || 0;
  
  return Math.round((occupiedBeds / totalBeds) * 100);
}

/**
 * Get bed availability statistics
 */
export function getBedStats(beds) {
  const stats = {
    total: beds.length,
    available: 0,
    occupied: 0,
    maintenance: 0,
    cleaning: 0,
    occupancyRate: 0
  };

  beds.forEach(bed => {
    switch (bed.status) {
      case BED_STATUS.DISPONIBLE:
        stats.available++;
        break;
      case BED_STATUS.OCUPADA:
        stats.occupied++;
        break;
      case BED_STATUS.MANTENIMIENTO:
        stats.maintenance++;
        break;
      case BED_STATUS.LIMPIEZA:
        stats.cleaning++;
        break;
    }
  });

  if (stats.total > 0) {
    stats.occupancyRate = Math.round((stats.occupied / stats.total) * 100);
  }

  return stats;
}

/**
 * Group beds by floor and area
 */
export function groupBedsByFloorAndArea(beds) {
  const grouped = {};

  beds.forEach(bed => {
    const key = `${bed.floor}-${bed.area}`;
    if (!grouped[key]) {
      grouped[key] = {
        floor: bed.floor,
        area: bed.area,
        beds: []
      };
    }
    grouped[key].beds.push(bed);
  });

  return Object.values(grouped).sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.area.localeCompare(b.area);
  });
}

/**
 * Group beds by room
 */
export function groupBedsByRoom(beds) {
  const grouped = {};

  beds.forEach(bed => {
    const key = `${bed.floor}-${bed.area}-${bed.room}`;
    if (!grouped[key]) {
      grouped[key] = {
        floor: bed.floor,
        area: bed.area,
        room: bed.room,
        beds: []
      };
    }
    grouped[key].beds.push(bed);
  });

  return Object.values(grouped).sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.room.localeCompare(b.room);
  });
}

/**
 * Filter beds by status
 */
export function filterBedsByStatus(beds, status) {
  if (!status) return beds;
  return beds.filter(bed => bed.status === status);
}

/**
 * Search beds by multiple criteria
 */
export function searchBeds(beds, searchTerm) {
  if (!searchTerm) return beds;
  
  const term = searchTerm.toLowerCase();
  
  return beds.filter(bed => {
    return (
      bed.bed_number.toLowerCase().includes(term) ||
      bed.room.toLowerCase().includes(term) ||
      bed.area.toLowerCase().includes(term) ||
      bed.bed_label.toLowerCase().includes(term) ||
      bed.floor.toString().includes(term)
    );
  });
}

/**
 * Get beds available for specific floor
 */
export function getAvailableBedsForFloor(beds, floor) {
  return beds.filter(bed => 
    bed.floor === floor && 
    bed.status === BED_STATUS.DISPONIBLE &&
    bed.is_active === 1
  );
}

/**
 * Get beds available for specific area
 */
export function getAvailableBedsForArea(beds, area) {
  return beds.filter(bed => 
    bed.area === area && 
    bed.status === BED_STATUS.DISPONIBLE &&
    bed.is_active === 1
  );
}

/**
 * Validate bed transfer
 * Check if transfer is valid (from bed to bed)
 */
export function validateBedTransfer(fromBed, toBed, patientId) {
  const errors = [];

  if (!fromBed) {
    errors.push('Cama de origen no encontrada');
  } else if (fromBed.patient_id !== patientId) {
    errors.push('El paciente no está en la cama de origen');
  } else if (fromBed.status !== BED_STATUS.OCUPADA) {
    errors.push('La cama de origen no está ocupada');
  }

  if (!toBed) {
    errors.push('Cama de destino no encontrada');
  } else if (toBed.status !== BED_STATUS.DISPONIBLE) {
    errors.push(`La cama de destino está ${BED_STATUS_COLORS[toBed.status]?.label.toLowerCase() || toBed.status}`);
  } else if (toBed.is_active !== 1) {
    errors.push('La cama de destino está inactiva');
  }

  if (fromBed && toBed && fromBed.id === toBed.id) {
    errors.push('La cama de origen y destino son la misma');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return { valid: true };
}

/**
 * Generate bed availability summary
 */
export function generateAvailabilitySummary(availabilityData) {
  const summary = {
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    maintenanceBeds: 0,
    cleaningBeds: 0,
    byFloor: {},
    byArea: {}
  };

  availabilityData.forEach(item => {
    // Overall totals
    summary.totalBeds += item.total_beds || 0;
    summary.availableBeds += item.available_beds || 0;
    summary.occupiedBeds += item.occupied_beds || 0;
    summary.maintenanceBeds += item.maintenance_beds || 0;
    summary.cleaningBeds += item.cleaning_beds || 0;

    // By floor
    if (!summary.byFloor[item.floor]) {
      summary.byFloor[item.floor] = {
        total: 0,
        available: 0,
        occupied: 0
      };
    }
    summary.byFloor[item.floor].total += item.total_beds || 0;
    summary.byFloor[item.floor].available += item.available_beds || 0;
    summary.byFloor[item.floor].occupied += item.occupied_beds || 0;

    // By area
    if (!summary.byArea[item.area]) {
      summary.byArea[item.area] = {
        total: 0,
        available: 0,
        occupied: 0
      };
    }
    summary.byArea[item.area].total += item.total_beds || 0;
    summary.byArea[item.area].available += item.available_beds || 0;
    summary.byArea[item.area].occupied += item.occupied_beds || 0;
  });

  // Calculate overall occupancy rate
  if (summary.totalBeds > 0) {
    summary.occupancyRate = Math.round((summary.occupiedBeds / summary.totalBeds) * 100);
  } else {
    summary.occupancyRate = 0;
  }

  return summary;
}

/**
 * Get alert level based on bed availability
 * Returns: 'success', 'warning', 'danger'
 */
export function getBedAvailabilityAlert(availableCount, totalCount) {
  if (totalCount === 0) return 'danger';
  
  const percentage = (availableCount / totalCount) * 100;
  
  if (percentage >= 30) return 'success';
  if (percentage >= 15) return 'warning';
  return 'danger';
}

/**
 * Format bed assignment date
 */
export function formatAssignmentDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

/**
 * Calculate duration of bed occupation
 */
export function calculateOccupationDuration(assignedDate) {
  if (!assignedDate) return null;
  
  try {
    const assigned = new Date(assignedDate);
    const now = new Date();
    const diffMs = now - assigned;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  } catch (error) {
    return null;
  }
}
