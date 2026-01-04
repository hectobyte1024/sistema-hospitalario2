import Database from '@tauri-apps/plugin-sql';

let db = null;

// Initialize database connection
export async function initDatabase() {
  if (db) return db;
  
  try {
    console.log('Initializing SQLite database...');
    db = await Database.load('sqlite:hospital.db');
    console.log('Database loaded successfully');
    
    await createTables();
    // await migrateDatabase(); // Descomenta si necesitas migraciones futuras
    
    // IMPORTANTE: Ejecutamos el seed para asegurar que existan los datos del PDF
    await seedInitialData(); 
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message || error}`);
  }
}

// ... (MANTÉN TU FUNCIÓN createTables INTACTA AQUÍ, NO LA BORRES) ...
// ... Copia y pega tu función createTables original aquí ...
// ... Asegúrate de que la tabla 'users' tenga 'license_number' ...

// Aquí pongo una versión resumida de createTables solo para contexto, 
// pero TÚ DEBES USAR LA TUYA COMPLETA que ya tienes.
async function createTables() {
    // ... Tu código original de creación de tablas ...
    // Solo asegurate que esta tabla exista o se cree:
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        license_number TEXT, -- ESTO ES LA CÉDULA
        assigned_floors TEXT,
        assigned_shifts TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ... Resto de tus tablas (patients, vital_signs, etc) ...
    // Asegúrate de crear la tabla vital_signs si no existe en tu código original
    await db.execute(`
     CREATE TABLE IF NOT EXISTS vital_signs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       patient_id INTEGER NOT NULL,
       date TEXT NOT NULL,
       temperature TEXT NOT NULL,
       blood_pressure TEXT NOT NULL,
       heart_rate TEXT NOT NULL,
       respiratory_rate TEXT NOT NULL,
       registered_by TEXT NOT NULL,
       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (patient_id) REFERENCES patients(id)
     )
   `);
}


// ========== NUEVAS FUNCIONES PARA LOS REQUERIMIENTOS DEL PDF ==========

// ECU-01: Obtener usuario por Cédula (license_number)
export async function getUserByCedula(cedula) {
  const db = await initDatabase();
  // Buscamos por license_number (Cédula) O por username para compatibilidad
  const result = await db.select(
    'SELECT * FROM users WHERE license_number = ? OR username = ?', 
    [cedula, cedula]
  );
  return result.length > 0 ? result[0] : null;
}

// Getters necesarios para el Dashboard
export async function getPatients() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM patients');
}

export async function getVitalSigns() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM vital_signs ORDER BY date ASC'); // Ordenar por fecha para gráficas
}

export async function getTreatments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM treatments');
}

export async function getNurseNotes() {
  const db = await initDatabase();
  // Aseguramos compatibilidad con nombres de columnas
  try {
      return await db.select('SELECT *, nurse_name as nurseName FROM nurse_notes ORDER BY date DESC');
  } catch (e) {
      return []; // Manejo de error si la tabla no existe aún
  }
}

export async function getAppointments() {
    const db = await initDatabase();
    return await db.select('SELECT * FROM appointments');
}

// Setters (Escritura en BD)
export async function addVitalSignsDB(data) {
    const db = await initDatabase();
    // Insertamos en la BD real
    const res = await db.execute(
        `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.patient_id, data.date, data.temperature, data.blood_pressure, data.heart_rate, data.respiratory_rate, data.registered_by]
    );
    // Devolvemos todos para actualizar la vista (o podrías optimizar devolviendo solo el nuevo)
    return await getVitalSigns();
}

export async function addTreatmentDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.patientId, data.medication, data.dose, data.frequency, data.startDate, data.appliedBy, data.lastApplication, 'Activo', data.notes]
    );
    return await getTreatments();
}

export async function addNurseNoteDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
         VALUES (?, ?, ?, ?, ?)`,
        [data.patientId, data.date, data.note, data.nurseName, 'Evolución']
    );
    return await getNurseNotes();
}

export async function updatePatientDB(id, data) {
    const db = await initDatabase();
    await db.execute(
        `UPDATE patients SET condition = ? WHERE id = ?`,
        [data.condition, id]
    );
    return await getPatients();
}


// ========== DATA SEEDING ACTUALIZADO (CRÍTICO PARA LOGIN Y GRÁFICAS) ==========

export async function seedInitialData() {
  const db = await initDatabase();
  
  // 1. Verificar si existe el usuario ENFERMERO con Cédula
  const users = await db.select("SELECT count(*) as count FROM users WHERE license_number = 'ENF-12345'");
  
  if (users[0].count === 0) {
    console.log('Seeding default Nurse User...');
    await db.execute(`
      INSERT INTO users (username, password_hash, role, name, email, license_number, assigned_shifts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'enfermero', 
      'hash_enfermeros123', // Contraseña hasheada simple para demo
      'nurse', 
      'Enf. Laura Martínez', 
      'laura@hospital.com', 
      'ENF-12345', // CÉDULA PARA LOGIN (ECU-01)
      '{"start": "06:00", "end": "22:00", "area": "Piso 3"}' // Turno para ECU-14
    ]);
  }

  // 2. Verificar Pacientes
  const patients = await db.select("SELECT count(*) as count FROM patients");
  if (patients[0].count === 0) {
      console.log('Seeding Patients...');
      await db.execute(`INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies) VALUES ('Juan Pérez', 45, '301-A', 'Estable', '2025-10-20', 'O+', 'Penicilina')`);
      await db.execute(`INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies) VALUES ('María González', 62, '302-B', 'Crítico', '2025-10-21', 'A-', 'Ninguna')`);
  }

  // 3. Verificar Signos Vitales (Para gráficas ECU-11)
  const vitals = await db.select("SELECT count(*) as count FROM vital_signs");
  if (vitals[0].count === 0) {
      console.log('Seeding Vital Signs History...');
      // Insertamos datos históricos simulados para el paciente 1 (Juan)
      const pId = 1; 
      const dates = [
          { d: '24/10 08:00', t: '36.5', bp: '120/80', hr: '72' },
          { d: '24/10 12:00', t: '37.2', bp: '125/82', hr: '78' },
          { d: '24/10 16:00', t: '37.8', bp: '130/85', hr: '85' },
          { d: '24/10 20:00', t: '38.5', bp: '135/88', hr: '92' }, // Pico
          { d: '25/10 00:00', t: '37.5', bp: '128/82', hr: '80' },
          { d: '25/10 04:00', t: '36.8', bp: '122/80', hr: '74' }
      ];

      for (const v of dates) {
          await db.execute(
              `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [pId, v.d, v.t, v.bp, v.hr, '18', 'Sistema']
          );
      }
  }
}
