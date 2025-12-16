/**
 * Note Edit Time Validation System
 * Sistema de Validación de Edición por Tiempo
 * 
 * Implements NOM-004 compliance for medical record integrity
 * by restricting note editing to within 24 hours of creation.
 */

// Edit window configuration (in hours)
export const EDIT_WINDOW_HOURS = 24;

/**
 * Check if a note is within the editable time window
 * @param {string} noteDate - ISO date string or locale date string
 * @returns {Object} Validation result
 */
export function isNoteEditable(noteDate) {
  if (!noteDate) {
    return {
      editable: false,
      reason: 'Fecha de nota no disponible',
      timeElapsed: null,
      timeRemaining: null
    };
  }

  try {
    const created = new Date(noteDate);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(created.getTime())) {
      return {
        editable: false,
        reason: 'Fecha de nota inválida',
        timeElapsed: null,
        timeRemaining: null
      };
    }

    const diffMs = now - created;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    
    const isWithinWindow = diffHours <= EDIT_WINDOW_HOURS;
    const hoursRemaining = Math.max(0, EDIT_WINDOW_HOURS - diffHours);
    const minutesRemaining = Math.max(0, (EDIT_WINDOW_HOURS * 60) - diffMinutes);

    return {
      editable: isWithinWindow,
      reason: isWithinWindow 
        ? `Editable por ${formatTimeRemaining(hoursRemaining)}`
        : `Período de edición expirado hace ${formatTimeElapsed(diffHours - EDIT_WINDOW_HOURS)}`,
      timeElapsed: diffHours,
      timeRemaining: hoursRemaining,
      minutesRemaining: minutesRemaining,
      expiresAt: new Date(created.getTime() + (EDIT_WINDOW_HOURS * 60 * 60 * 1000))
    };
  } catch (error) {
    console.error('Error validating note edit time:', error);
    return {
      editable: false,
      reason: 'Error al validar fecha',
      timeElapsed: null,
      timeRemaining: null
    };
  }
}

/**
 * Format time remaining for display
 * @param {number} hours - Hours remaining
 * @returns {string} Formatted string
 */
export function formatTimeRemaining(hours) {
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  }
  
  const minutes = Math.floor(hours * 60);
  if (minutes <= 0) {
    return 'menos de 1 minuto';
  }
  return `${minutes} minutos`;
}

/**
 * Format time elapsed for display
 * @param {number} hours - Hours elapsed
 * @returns {string} Formatted string
 */
export function formatTimeElapsed(hours) {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    if (h === 0) {
      return `${days} día${days > 1 ? 's' : ''}`;
    }
    return `${days} día${days > 1 ? 's' : ''} y ${h}h`;
  }
  
  if (hours >= 1) {
    const h = Math.floor(hours);
    return `${h}h`;
  }
  
  const minutes = Math.floor(hours * 60);
  return `${minutes} minutos`;
}

/**
 * Get visual indicator for note editability
 * @param {Object} validation - Validation result from isNoteEditable
 * @returns {Object} UI configuration
 */
export function getEditabilityIndicator(validation) {
  if (validation.editable) {
    // Calculate urgency level
    if (validation.hoursRemaining > 12) {
      return {
        color: 'green',
        bg: 'bg-green-50',
        border: 'border-green-300',
        text: 'text-green-800',
        icon: 'text-green-600',
        badge: 'bg-green-500',
        label: 'Editable',
        urgency: 'low'
      };
    } else if (validation.hoursRemaining > 2) {
      return {
        color: 'yellow',
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        badge: 'bg-yellow-500',
        label: 'Editable',
        urgency: 'medium'
      };
    } else {
      return {
        color: 'orange',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        badge: 'bg-orange-500',
        label: 'Editable',
        urgency: 'high'
      };
    }
  }
  
  return {
    color: 'red',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: 'text-red-600',
    badge: 'bg-red-500',
    label: 'No editable',
    urgency: 'blocked'
  };
}

/**
 * Generate user-friendly message for edit restriction
 * @param {Object} validation - Validation result
 * @returns {string} Message
 */
export function getEditRestrictionMessage(validation) {
  if (validation.editable) {
    if (validation.hoursRemaining < 2) {
      return `⚠️ ATENCIÓN: Esta nota será bloqueada en ${formatTimeRemaining(validation.hoursRemaining)}. Edite ahora si es necesario.`;
    }
    return `✓ Puede editar esta nota durante las próximas ${formatTimeRemaining(validation.hoursRemaining)}.`;
  }
  
  return `🔒 Esta nota fue bloqueada para edición ${validation.reason}. Según NOM-004, las notas solo pueden editarse dentro de las primeras 24 horas.`;
}

/**
 * Validate edit attempt and generate audit log entry
 * @param {Object} note - Note object
 * @param {Object} user - User attempting edit
 * @returns {Object} Validation and audit data
 */
export function validateEditAttempt(note, user) {
  const validation = isNoteEditable(note.date);
  
  return {
    allowed: validation.editable,
    validation,
    auditEntry: {
      noteId: note.id,
      patientId: note.patientId,
      attemptedBy: user.name,
      attemptedByRole: user.role,
      attemptDate: new Date().toISOString(),
      wasAllowed: validation.editable,
      reason: validation.reason,
      noteAge: validation.timeElapsed
    }
  };
}

/**
 * Calculate countdown timer data
 * @param {string} noteDate - Note creation date
 * @returns {Object} Timer data
 */
export function getEditCountdown(noteDate) {
  const validation = isNoteEditable(noteDate);
  
  if (!validation.editable) {
    return {
      expired: true,
      timeRemaining: 0,
      percentage: 0
    };
  }
  
  const totalMinutes = EDIT_WINDOW_HOURS * 60;
  const remainingMinutes = validation.minutesRemaining;
  const percentage = (remainingMinutes / totalMinutes) * 100;
  
  return {
    expired: false,
    timeRemaining: remainingMinutes,
    hoursRemaining: validation.hoursRemaining,
    percentage: Math.max(0, Math.min(100, percentage)),
    expiresAt: validation.expiresAt
  };
}

/**
 * Check if user can bypass edit restrictions
 * @param {Object} user - User object
 * @returns {boolean} Whether user can bypass
 */
export function canBypassEditRestrictions(user) {
  if (!user) return false;
  
  // Only admins can bypass (for emergency corrections)
  // Doctors and nurses cannot bypass
  const allowedRoles = ['admin'];
  return allowedRoles.includes(user.role?.toLowerCase());
}

/**
 * Get list of notes grouped by editability
 * @param {Array} notes - Array of note objects
 * @returns {Object} Grouped notes
 */
export function groupNotesByEditability(notes) {
  const editable = [];
  const expiringSoon = []; // < 2 hours remaining
  const expired = [];
  
  notes.forEach(note => {
    const validation = isNoteEditable(note.date);
    
    if (validation.editable) {
      if (validation.hoursRemaining < 2) {
        expiringSoon.push({ ...note, validation });
      } else {
        editable.push({ ...note, validation });
      }
    } else {
      expired.push({ ...note, validation });
    }
  });
  
  return {
    editable,
    expiringSoon,
    expired,
    counts: {
      editable: editable.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      total: notes.length
    }
  };
}

/**
 * Format note date for display with edit status
 * @param {string} noteDate - Note date
 * @returns {string} Formatted date with status
 */
export function formatNoteDateWithStatus(noteDate) {
  const validation = isNoteEditable(noteDate);
  const date = new Date(noteDate);
  
  const formattedDate = new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
  
  if (validation.editable) {
    return `${formattedDate} • ${validation.reason}`;
  }
  
  return `${formattedDate} • 🔒 Bloqueada`;
}

/**
 * Generate warning for notes expiring soon
 * @param {Array} notes - Array of notes
 * @returns {Object} Warning data
 */
export function getExpiringNotesWarning(notes) {
  const expiringSoon = notes.filter(note => {
    const validation = isNoteEditable(note.date);
    return validation.editable && validation.hoursRemaining < 2;
  });
  
  if (expiringSoon.length === 0) {
    return null;
  }
  
  return {
    count: expiringSoon.length,
    notes: expiringSoon,
    message: expiringSoon.length === 1
      ? `1 nota se bloqueará pronto. Revise si requiere edición.`
      : `${expiringSoon.length} notas se bloquearán pronto. Revise si requieren edición.`
  };
}

/**
 * Check if note was edited (has edit history)
 * @param {Object} note - Note object with editHistory
 * @returns {boolean} Whether note was edited
 */
export function wasNoteEdited(note) {
  return note.editHistory && note.editHistory.length > 0;
}

/**
 * Get edit summary for note
 * @param {Object} note - Note object
 * @returns {Object} Edit summary
 */
export function getNoteEditSummary(note) {
  if (!wasNoteEdited(note)) {
    return {
      edited: false,
      editCount: 0,
      lastEditDate: null,
      lastEditBy: null
    };
  }
  
  const lastEdit = note.editHistory[note.editHistory.length - 1];
  
  return {
    edited: true,
    editCount: note.editHistory.length,
    lastEditDate: lastEdit.editDate,
    lastEditBy: lastEdit.editedBy,
    firstEditDate: note.editHistory[0].editDate
  };
}
