/**
 * Optimizaciones de base de datos para mejorar rendimiento
 * Incluye índices, consultas optimizadas y batch operations
 */

import Database from '@tauri-apps/plugin-sql';

/**
 * Crear índices para mejorar velocidad de consultas
 */
export async function createDatabaseIndexes() {
  const db = await Database.load('sqlite:hospital.db');
  
  try {
    // Índices para tabla patients
    await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_room ON patients(room)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_admission_date ON patients(admission_date)');
    
    // Índices para tabla vital_signs
    await db.execute('CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vital_signs(patient_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_vitals_date ON vital_signs(date)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_vitals_patient_date ON vital_signs(patient_id, date)');
    
    // Índices para tabla treatments
    await db.execute('CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id)');
    // await db.execute('CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status)'); // Commented until migration runs
    await db.execute('CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(start_date)');
    
    // Índices para tabla appointments
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor)');
    
    // Índices para tabla nurse_notes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_notes_patient ON nurse_notes(patient_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_notes_date ON nurse_notes(date)');
    // await db.execute('CREATE INDEX IF NOT EXISTS idx_notes_type ON nurse_notes(note_type)'); // Commented - column doesn't exist
    
    // Índices para tabla users
    await db.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_users_license ON users(license_number)');
    
    // Índices para tabla non_pharmacological_treatments
    await db.execute('CREATE INDEX IF NOT EXISTS idx_nonpharma_patient ON non_pharmacological_treatments(patient_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_nonpharma_date ON non_pharmacological_treatments(application_date)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_nonpharma_type ON non_pharmacological_treatments(treatment_type)');
    
    // Índices para tabla patient_assignments
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_nurse ON patient_assignments(nurse_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_patient ON patient_assignments(patient_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_date ON patient_assignments(assignment_date)');
    
    // Índices para tabla nurse_shift_reports
    await db.execute('CREATE INDEX IF NOT EXISTS idx_shifts_nurse ON nurse_shift_reports(nurse_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_shifts_date ON nurse_shift_reports(shift_date)');
    
    console.log('✅ Índices de base de datos creados exitosamente');
    return true;
  } catch (error) {
    console.error('Error creando índices:', error);
    return false;
  }
}

/**
 * Consultas optimizadas con límites y joins eficientes
 */

// Obtener signos vitales recientes (últimos 7 días) de forma optimizada
export async function getRecentVitalSigns(patientId = null, days = 7) {
  const db = await Database.load('sqlite:hospital.db');
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const dateLimitStr = dateLimit.toISOString().split('T')[0];
  
  if (patientId) {
    return await db.select(
      `SELECT * FROM vital_signs 
       WHERE patient_id = ? AND date >= ? 
       ORDER BY date DESC 
       LIMIT 100`,
      [patientId, dateLimitStr]
    );
  } else {
    return await db.select(
      `SELECT * FROM vital_signs 
       WHERE date >= ? 
       ORDER BY date DESC 
       LIMIT 500`,
      [dateLimitStr]
    );
  }
}

// Obtener tratamientos activos con información del paciente (JOIN optimizado)
export async function getActiveTreatmentsWithPatients() {
  const db = await Database.load('sqlite:hospital.db');
  return await db.select(`
    SELECT 
      t.*,
      p.name as patient_name,
      p.room as patient_room
    FROM treatments t
    INNER JOIN patients p ON t.patient_id = p.id
    WHERE t.status = 'Activo'
    ORDER BY t.last_application DESC
    LIMIT 200
  `);
}

// Batch insert para múltiples registros (más eficiente)
export async function batchInsertVitalSigns(vitalSignsArray) {
  const db = await Database.load('sqlite:hospital.db');
  
  try {
    // Usar transacción para mejor rendimiento
    await db.execute('BEGIN TRANSACTION');
    
    for (const vital of vitalSignsArray) {
      await db.execute(
        `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vital.patientId, vital.date, vital.temperature, vital.bloodPressure, vital.heartRate, vital.respiratoryRate, vital.registeredBy]
      );
    }
    
    await db.execute('COMMIT');
    console.log(`✅ Insertados ${vitalSignsArray.length} registros de signos vitales`);
    return true;
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('Error en batch insert:', error);
    throw error;
  }
}

// Obtener estadísticas agregadas (optimizado con COUNT/AVG)
export async function getPatientStatistics(patientId) {
  const db = await Database.load('sqlite:hospital.db');
  
  const stats = await db.select(`
    SELECT 
      COUNT(DISTINCT v.id) as total_vitals,
      COUNT(DISTINCT t.id) as total_treatments,
      COUNT(DISTINCT n.id) as total_notes,
      AVG(CAST(v.temperature AS REAL)) as avg_temperature,
      AVG(CAST(v.heart_rate AS REAL)) as avg_heart_rate
    FROM patients p
    LEFT JOIN vital_signs v ON p.id = v.patient_id
    LEFT JOIN treatments t ON p.id = t.patient_id
    LEFT JOIN nurse_notes n ON p.id = n.patient_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [patientId]);
  
  return stats[0] || {};
}

// Búsqueda optimizada de pacientes con LIKE e índices
export async function searchPatients(searchTerm, limit = 50) {
  const db = await Database.load('sqlite:hospital.db');
  const term = `%${searchTerm}%`;
  
  return await db.select(
    `SELECT * FROM patients 
     WHERE name LIKE ? OR room LIKE ? 
     ORDER BY name 
     LIMIT ?`,
    [term, term, limit]
  );
}

// Limpieza de registros antiguos (mantenimiento de BD)
export async function cleanupOldRecords(daysToKeep = 365) {
  const db = await Database.load('sqlite:hospital.db');
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - daysToKeep);
  const dateLimitStr = dateLimit.toISOString().split('T')[0];
  
  try {
    // Eliminar signos vitales muy antiguos
    const vitalsResult = await db.execute(
      'DELETE FROM vital_signs WHERE date < ?',
      [dateLimitStr]
    );
    
    // Eliminar tratamientos completados antiguos
    const treatmentsResult = await db.execute(
      `DELETE FROM treatments 
       WHERE status = 'Completado' AND end_date < ?`,
      [dateLimitStr]
    );
    
    console.log(`🧹 Limpieza completada: ${vitalsResult.rowsAffected} signos vitales eliminados`);
    console.log(`🧹 ${treatmentsResult.rowsAffected} tratamientos eliminados`);
    
    // Optimizar base de datos después de eliminar
    await db.execute('VACUUM');
    console.log('✅ Base de datos optimizada');
    
    return true;
  } catch (error) {
    console.error('Error en limpieza:', error);
    return false;
  }
}

// Análisis de rendimiento de la base de datos
export async function analyzeDatabasePerformance() {
  const db = await Database.load('sqlite:hospital.db');
  
  try {
    // Obtener estadísticas de tablas
    const tables = await db.select(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    
    const stats = [];
    for (const table of tables) {
      const count = await db.select(`SELECT COUNT(*) as count FROM ${table.name}`);
      stats.push({
        table: table.name,
        rows: count[0].count
      });
    }
    
    // Verificar índices existentes
    const indexes = await db.select(
      `SELECT name, tbl_name FROM sqlite_master WHERE type='index'`
    );
    
    return {
      tables: stats,
      indexes: indexes,
      totalTables: tables.length,
      totalIndexes: indexes.length
    };
  } catch (error) {
    console.error('Error analizando BD:', error);
    return null;
  }
}

// Optimizar consulta de dashboard (una sola query)
export async function getDashboardData(userRole, userId) {
  const db = await Database.load('sqlite:hospital.db');
  
  if (userRole === 'nurse') {
    // Una sola query compleja es más eficiente que múltiples queries
    const data = await db.select(`
      SELECT 
        (SELECT COUNT(*) FROM patients) as total_patients,
        (SELECT COUNT(*) FROM appointments WHERE date = date('now')) as appointments_today,
        (SELECT COUNT(*) FROM treatments WHERE status = 'Activo') as active_treatments,
        (SELECT COUNT(*) FROM vital_signs WHERE date >= date('now')) as vitals_today,
        (SELECT COUNT(*) FROM patient_assignments WHERE nurse_id = ? AND assignment_date = date('now')) as assigned_patients
    `, [userId]);
    
    return data[0];
  }
  
  return null;
}

/**
 * Pooling de conexiones (simulado) para reutilizar conexiones
 */
let dbInstance = null;

export async function getDbConnection() {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:hospital.db');
  }
  return dbInstance;
}

/**
 * Preparar queries compiladas para mejor rendimiento
 */
export class PreparedQueries {
  constructor() {
    this.queries = new Map();
  }

  async prepare(name, sql) {
    // En Tauri SQL no hay prepared statements nativos,
    // pero podemos cachear las queries
    this.queries.set(name, sql);
  }

  async execute(name, params = []) {
    const db = await getDbConnection();
    const sql = this.queries.get(name);
    if (!sql) throw new Error(`Query ${name} no encontrada`);
    return await db.select(sql, params);
  }
}

export const preparedQueries = new PreparedQueries();

// Inicializar queries preparadas comunes
export async function initPreparedQueries() {
  await preparedQueries.prepare('getPatientById', 
    'SELECT * FROM patients WHERE id = ?'
  );
  await preparedQueries.prepare('getVitalsByPatient',
    'SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY date DESC LIMIT 50'
  );
  await preparedQueries.prepare('getTreatmentsByPatient',
    'SELECT * FROM treatments WHERE patient_id = ? AND status = ? ORDER BY start_date DESC'
  );
}
