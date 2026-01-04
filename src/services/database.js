import Database from '@tauri-apps/plugin-sql';

let db = null;

// Inicializar conexión
export async function initDatabase() {
  if (db) return db;
  
  try {
    console.log('Initializing SQLite database...');
    db = await Database.load('sqlite:hospital.db');
    console.log('Database loaded successfully');
    
    // Crear tablas
    await createTables();
    
    // Inyectar datos de prueba para la Demo (ECU-01, ECU-11, ECU-14)
    await seedInitialData();
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message || error}`);
  }
}

// TU ESQUEMA ORIGINAL DE TABLAS (COMPLETO)
async function createTables() {
  try {
    // Tabla Usuarios (Aseguramos license_number para la Cédula)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        license_number TEXT, 
        assigned_shifts TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla Pacientes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        room TEXT NOT NULL,
        condition TEXT NOT NULL,
        admission_date TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        allergies TEXT,
        diagnosis TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla Signos Vitales (Para ECU-11 Gráficas)
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

    // Tabla Tratamientos/Medicamentos (Para ECU-09B Kardex)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        medication TEXT NOT NULL,
        dose TEXT NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        last_application TEXT,
        applied_by TEXT,
        route TEXT,
        status TEXT DEFAULT 'Activo',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla Notas de Enfermería (Para ECU-06B Historial)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS nurse_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        note_type TEXT DEFAULT 'Evolución',
        nurse_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);
    
    // Appointments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        doctor TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Tablas verificadas/creadas correctamente');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// ================= FUNCIONES DE ACCESO (MODULOS) =================

// ECU-01: Autenticación por Cédula
export async function getUserByCedula(cedula) {
  const db = await initDatabase();
  const result = await db.select(
    'SELECT * FROM users WHERE license_number = ? OR username = ?', 
    [cedula, cedula]
  );
  return result.length > 0 ? result[0] : null;
}

// ECU-03: Visualizar Pacientes
export async function getPatients() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM patients');
}

// ECU-11: Visualizar Historial Signos (Ordenado por fecha para gráficas)
export async function getVitalSigns() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM vital_signs ORDER BY date ASC');
}

// ECU-09B: Historial Medicamentos
export async function getTreatments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM treatments');
}

// ECU-06B: Historial Notas
export async function getNurseNotes() {
  const db = await initDatabase();
  // Mapeamos nurse_name a nurseName para consistencia en el frontend
  return await db.select('SELECT *, nurse_name as nurseName FROM nurse_notes ORDER BY date DESC');
}

export async function getAppointments() {
    const db = await initDatabase();
    return await db.select('SELECT * FROM appointments ORDER BY date DESC');
}

// Operaciones de Escritura (Registros)
export async function addVitalSignsDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.patient_id, data.date, data.temperature, data.blood_pressure, data.heart_rate, data.respiratory_rate, data.registered_by]
    );
    return await getVitalSigns(); // Devuelve lista actualizada
}

export async function addTreatmentDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, route, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.patientId, data.medication, data.dose, data.frequency, data.startDate, data.appliedBy, data.lastApplication, 'Oral', 'Activo', data.notes]
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
    await db.execute(`UPDATE patients SET condition = ? WHERE id = ?`, [data.condition, id]);
}

// ================= DATOS SEMILLA (SEEDING) =================
// Esto asegura que al iniciar tengas el usuario y datos para gráficas

export async function seedInitialData() {
  const db = await initDatabase();
  
  // 1. Usuario Enfermero con Cédula (ECU-01 y ECU-14)
  const users = await db.select("SELECT count(*) as count FROM users WHERE license_number = 'ENF-12345'");
  if (users[0].count === 0) {
    console.log('Creando usuario enfermero por defecto...');
    await db.execute(`
      INSERT INTO users (username, password_hash, role, name, email, license_number, assigned_shifts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'enfermero', 
      'hash_enfermeros123', 
      'nurse', 
      'Enf. Laura Martínez', 
      'laura@hospital.com', 
      'ENF-12345', 
      '{"start": "06:00", "end": "22:00", "area": "Piso 3 - Ala Norte"}' // JSON de turno
    ]);
  }

  // 2. Pacientes (ECU-03)
  const patients = await db.select("SELECT count(*) as count FROM patients");
  if (patients[0].count === 0) {
      await db.execute(`INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies, diagnosis) VALUES ('Juan Pérez', 45, '301-A', 'Estable', '2025-10-20', 'O+', 'Penicilina', 'Neumonía')`);
      await db.execute(`INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies, diagnosis) VALUES ('María González', 62, '302-B', 'Crítico', '2025-10-21', 'A-', 'Ninguna', 'Post-operatorio')`);
      await db.execute(`INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies, diagnosis) VALUES ('Carlos Ruiz', 28, '303-A', 'Recuperación', '2025-10-23', 'B+', 'Polen', 'Apendicectomía')`);
  }

  // 3. Historial Signos Vitales (Para Módulo 6.1 - Gráficas)
  const vitals = await db.select("SELECT count(*) as count FROM vital_signs");
  if (vitals[0].count === 0) {
      console.log('Generando historial de signos vitales...');
      const pId = 1; // Juan Pérez
      // Datos simulados en diferentes horas para ver la línea de tiempo en la gráfica
      const history = [
          { d: '24/10 08:00', t: '36.5', bp: '120/80', hr: '72' },
          { d: '24/10 12:00', t: '37.2', bp: '125/82', hr: '78' },
          { d: '24/10 16:00', t: '37.8', bp: '130/85', hr: '85' },
          { d: '24/10 20:00', t: '38.5', bp: '135/88', hr: '92' }, // Pico de fiebre
          { d: '25/10 00:00', t: '37.5', bp: '128/82', hr: '80' },
          { d: '25/10 04:00', t: '36.8', bp: '122/80', hr: '74' }
      ];

      for (const v of history) {
          await db.execute(
              `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [pId, v.d, v.t, v.bp, v.hr, '18', 'Sistema']
          );
      }
  }
}
