import Database from '@tauri-apps/plugin-sql';

let db = null;

// Initialize database connection
export async function initDatabase() {
  if (db) return db;
  
  try {
    // Create or connect to SQLite database
    console.log('Initializing SQLite database...');
    db = await Database.load('sqlite:hospital.db');
    console.log('Database loaded successfully');
    
    // Create tables if they don't exist
    await createTables();
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message || error}`);
  }
}

// Create all database tables
async function createTables() {
  try {
    console.log('Creating database tables...');
    
    // Patients table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT,
        room TEXT NOT NULL,
        floor TEXT DEFAULT '1',
        area TEXT DEFAULT 'General',
        bed TEXT DEFAULT 'A',
        condition TEXT NOT NULL,
        triage_level INTEGER DEFAULT 3,
        admission_date TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        allergies TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        address TEXT,
        city TEXT,
        insurance_provider TEXT,
        insurance_number TEXT,
        primary_doctor TEXT,
        discharge_date TEXT,
        status TEXT DEFAULT 'Active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Patients table created');

    // Patient transfers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS patient_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        from_floor TEXT,
        from_area TEXT,
        from_room TEXT,
        from_bed TEXT,
        to_floor TEXT NOT NULL,
        to_area TEXT NOT NULL,
        to_room TEXT NOT NULL,
        to_bed TEXT NOT NULL,
        transfer_date TEXT NOT NULL,
        transfer_time TEXT NOT NULL,
        reason TEXT,
        transferred_by TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);
    console.log('✓ Patient transfers table created');

    // Users table for authentication
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        profile_photo TEXT,
        bio TEXT,
        department TEXT,
        specialization TEXT,
        license_number TEXT,
        assigned_floors TEXT,
        assigned_shifts TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // Nurse assignments history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS nurse_assignment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nurse_id INTEGER NOT NULL,
        nurse_name TEXT NOT NULL,
        assigned_floors TEXT NOT NULL,
        assigned_shifts TEXT NOT NULL,
        assigned_by INTEGER,
        assigned_by_name TEXT,
        assignment_date TEXT NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nurse_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Nurse assignment history table created');

    // Beds (Camas) table - Sistema de Disponibilidad de Camas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS beds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bed_number TEXT NOT NULL,
        floor INTEGER NOT NULL,
        area TEXT NOT NULL,
        room TEXT NOT NULL,
        bed_label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disponible',
        patient_id INTEGER,
        assigned_date TEXT,
        assigned_by TEXT,
        notes TEXT,
        last_maintenance TEXT,
        equipment TEXT,
        bed_type TEXT DEFAULT 'estándar',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        UNIQUE(floor, area, room, bed_label)
      )
    `);
    console.log('✓ Beds table created');

    // Bed assignment history table - Historial de asignaciones
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bed_assignment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bed_id INTEGER NOT NULL,
        patient_id INTEGER,
        patient_name TEXT,
        action TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        assigned_date TEXT NOT NULL,
        released_date TEXT,
        reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bed_id) REFERENCES beds(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);
    console.log('✓ Bed assignment history table created');

    // Allergy alerts table - Sistema de Alertas de Alergias
    await db.execute(`
      CREATE TABLE IF NOT EXISTS allergy_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        medication_attempted TEXT NOT NULL,
        allergies TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        alert_message TEXT NOT NULL,
        attempted_by TEXT NOT NULL,
        attempted_by_role TEXT,
        was_overridden INTEGER DEFAULT 0,
        override_reason TEXT,
        alert_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);
    console.log('✓ Allergy alerts table created');

    // Appointments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        patient_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        doctor TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);
    console.log('✓ Appointments table created');

  // Treatments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      medication TEXT NOT NULL,
      dose TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      applied_by TEXT NOT NULL,
      last_application TEXT NOT NULL,
      responsible_doctor TEXT,
      administration_times TEXT,
      status TEXT DEFAULT 'Activo',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Vital signs table
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

  // Lab tests table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      test TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      results TEXT,
      ordered_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Medical history table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medical_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      treatment TEXT NOT NULL,
      notes TEXT,
      doctor TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Nurse notes table
  // NOM-004: Las notas médicas/de enfermería NO pueden ser eliminadas
  // para garantizar la trazabilidad legal del expediente clínico
  await db.execute(`
    CREATE TABLE IF NOT EXISTS nurse_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL,
      original_note TEXT,
      note_type TEXT DEFAULT 'evolutiva',
      nurse_name TEXT NOT NULL,
      was_edited INTEGER DEFAULT 0,
      edit_count INTEGER DEFAULT 0,
      last_edit_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Note edit history table - Auditoría de ediciones
  await db.execute(`
    CREATE TABLE IF NOT EXISTS note_edit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      previous_content TEXT NOT NULL,
      new_content TEXT NOT NULL,
      edited_by TEXT NOT NULL,
      edited_by_role TEXT,
      edit_date TEXT NOT NULL,
      note_age_hours REAL,
      edit_reason TEXT,
      was_within_window INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES nurse_notes(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);
  console.log('✓ Note edit history table created');

  // Note edit attempts table - Intentos bloqueados
  await db.execute(`
    CREATE TABLE IF NOT EXISTS note_edit_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      attempted_by TEXT NOT NULL,
      attempted_by_role TEXT,
      attempt_date TEXT NOT NULL,
      note_age_hours REAL,
      was_allowed INTEGER NOT NULL,
      denial_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES nurse_notes(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);
  console.log('✓ Note edit attempts table created');

  // Non-pharmacological treatments table (curaciones, nebulizaciones, fluidoterapia, etc.)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS non_pharmacological_treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      treatment_type TEXT NOT NULL,
      description TEXT NOT NULL,
      application_date TEXT NOT NULL,
      application_time TEXT,
      duration TEXT,
      performed_by TEXT NOT NULL,
      materials_used TEXT,
      observations TEXT,
      outcome TEXT,
      next_application TEXT,
      status TEXT DEFAULT 'Completado',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);
  console.log('✓ Non-pharmacological treatments table created');

  // Nursing shift reports table (hoja de enfermería digital)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS nursing_shift_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      shift_type TEXT NOT NULL,
      nurse_id INTEGER NOT NULL,
      nurse_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      patients_assigned TEXT NOT NULL,
      general_observations TEXT,
      incidents TEXT,
      pending_tasks TEXT,
      handover_notes TEXT,
      supervisor_name TEXT,
      status TEXT DEFAULT 'En Curso',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    )
  `);
  console.log('✓ Nursing shift reports table created');

  // Notifications table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Rooms table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      floor INTEGER NOT NULL,
      department TEXT NOT NULL,
      room_type TEXT NOT NULL,
      bed_count INTEGER NOT NULL,
      occupied_beds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Available',
      equipment TEXT,
      daily_rate REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Prescriptions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT,
      prescribed_date TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // Billing/Invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      payment_method TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Invoice line items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      item_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  // Pharmacy inventory table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pharmacy_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      reorder_level INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      supplier TEXT,
      batch_number TEXT,
      manufacture_date TEXT,
      expiry_date TEXT NOT NULL,
      storage_location TEXT,
      status TEXT DEFAULT 'Available',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Emergency cases table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS emergency_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      arrival_time TEXT NOT NULL,
      triage_level INTEGER NOT NULL,
      chief_complaint TEXT NOT NULL,
      vital_signs TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'Waiting',
      emergency_contact TEXT,
      ambulance_arrival INTEGER DEFAULT 0,
      outcome TEXT,
      discharge_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Surgery scheduling table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS surgeries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      procedure_name TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      operating_room TEXT NOT NULL,
      surgeon_id INTEGER NOT NULL,
      anesthesiologist_id INTEGER,
      nurses TEXT,
      status TEXT DEFAULT 'Scheduled',
      pre_op_notes TEXT,
      post_op_notes TEXT,
      complications TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (surgeon_id) REFERENCES users(id)
    )
  `);

  // Imaging/Radiology table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS imaging_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      test_type TEXT NOT NULL,
      body_part TEXT NOT NULL,
      ordered_by INTEGER NOT NULL,
      ordered_date TEXT NOT NULL,
      scheduled_date TEXT,
      performed_date TEXT,
      radiologist_id INTEGER,
      priority TEXT DEFAULT 'Routine',
      status TEXT DEFAULT 'Ordered',
      findings TEXT,
      impression TEXT,
      images_path TEXT,
      report_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (ordered_by) REFERENCES users(id)
    )
  `);

  // Staff shifts table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      shift_type TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT DEFAULT 'Scheduled',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Audit log table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Audit trail table (NOM-004 compliance)
  // Registro de auditoría para cumplimiento de NOM-004-SSA3-2012
  // Todas las acciones sobre expedientes clínicos deben ser rastreables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action_description TEXT NOT NULL,
      ip_address TEXT,
      timestamp TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✓ Audit trail table created (NOM-004 compliance)');

  // Password reset tokens table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Vaccinations table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      vaccine_name TEXT NOT NULL,
      dose_number INTEGER NOT NULL,
      date_administered TEXT NOT NULL,
      next_due_date TEXT,
      administered_by INTEGER NOT NULL,
      batch_number TEXT,
      site TEXT,
      reaction_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (administered_by) REFERENCES users(id)
    )
  `);

  // Referrals table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      from_doctor_id INTEGER NOT NULL,
      to_doctor_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      reason TEXT NOT NULL,
      urgency TEXT NOT NULL,
      referral_date TEXT NOT NULL,
      appointment_date TEXT,
      status TEXT DEFAULT 'Pending',
      notes TEXT,
      outcome TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (from_doctor_id) REFERENCES users(id)
    )
  `);

  // Consent forms table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS consent_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,
      description TEXT NOT NULL,
      consent_date TEXT NOT NULL,
      patient_signature TEXT,
      witness_id INTEGER,
      witness_signature TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'Active',
      pdf_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (witness_id) REFERENCES users(id)
    )
  `);

  // Incident reports table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS incident_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      location TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      incident_time TEXT NOT NULL,
      description TEXT NOT NULL,
      persons_involved TEXT,
      witness_names TEXT,
      immediate_action TEXT,
      corrective_actions TEXT,
      reported_by INTEGER NOT NULL,
      status TEXT DEFAULT 'Under Investigation',
      follow_up TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reported_by) REFERENCES users(id)
    )
  `);

  // Blood bank inventory table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS blood_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blood_type TEXT NOT NULL,
      rh_factor TEXT NOT NULL,
      donation_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      donor_id TEXT,
      volume_ml INTEGER NOT NULL,
      status TEXT DEFAULT 'Available',
      tests_completed INTEGER DEFAULT 0,
      reserved_for INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reserved_for) REFERENCES patients(id)
    )
  `);

  // Equipment tracking table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medical_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_name TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      manufacturer TEXT,
      model TEXT,
      purchase_date TEXT,
      warranty_expiry TEXT,
      location TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT DEFAULT 'Available',
      last_maintenance TEXT,
      next_maintenance TEXT,
      assigned_to INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // Dietary management table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meal_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      meal_date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      diet_type TEXT NOT NULL,
      restrictions TEXT,
      allergies TEXT,
      special_instructions TEXT,
      meal_delivered INTEGER DEFAULT 0,
      delivery_time TEXT,
      status TEXT DEFAULT 'Ordered',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Nurse patient assignments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS nurse_patient_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nurse_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      shift_id INTEGER,
      assigned_date TEXT NOT NULL,
      assignment_start TEXT NOT NULL,
      assignment_end TEXT,
      status TEXT DEFAULT 'Active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nurse_id) REFERENCES users(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    )
  `);

  console.log('✓ Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw new Error(`Failed to create tables: ${error.message || error}`);
  }
}

// ========== PATIENT OPERATIONS ==========

export async function getAllPatients() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM patients ORDER BY id DESC');
}

export async function getPatientById(id) {
  const db = await initDatabase();
  const results = await db.select('SELECT * FROM patients WHERE id = ?', [id]);
  return results[0];
}

export async function createPatient(patient) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO patients (name, age, room, condition, admission_date, blood_type, allergies)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patient.name, patient.age, patient.room, patient.condition, patient.admissionDate, patient.bloodType, patient.allergies]
  );
  return result.lastInsertId;
}

export async function updatePatient(id, patient) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE patients 
     SET name = ?, age = ?, room = ?, condition = ?, blood_type = ?, allergies = ?
     WHERE id = ?`,
    [patient.name, patient.age, patient.room, patient.condition, patient.bloodType, patient.allergies, id]
  );
}

export async function deletePatient(id) {
  const db = await initDatabase();
  await db.execute('DELETE FROM patients WHERE id = ?', [id]);
}

// ========== APPOINTMENT OPERATIONS ==========

export async function getAllAppointments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM appointments ORDER BY date, time');
}

export async function getAppointmentsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date, time', [patientId]);
}

export async function createAppointment(appointment) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [appointment.patientId, appointment.patientName, appointment.date, appointment.time, appointment.type, appointment.status, appointment.doctor]
  );
  return result.lastInsertId;
}

export async function updateAppointment(id, appointment) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE appointments 
     SET patient_name = ?, date = ?, time = ?, type = ?, status = ?, doctor = ?
     WHERE id = ?`,
    [appointment.patientName, appointment.date, appointment.time, appointment.type, appointment.status, appointment.doctor, id]
  );
}

export async function deleteAppointment(id) {
  const db = await initDatabase();
  await db.execute('DELETE FROM appointments WHERE id = ?', [id]);
}

// ========== TREATMENT OPERATIONS ==========

export async function getAllTreatments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM treatments ORDER BY id DESC');
}

export async function getTreatmentsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM treatments WHERE patient_id = ? ORDER BY id DESC', [patientId]);
}

export async function createTreatment(treatment) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, end_date, applied_by, last_application, 
     responsible_doctor, administration_times, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      treatment.patientId, 
      treatment.medication, 
      treatment.dose, 
      treatment.frequency, 
      treatment.startDate, 
      treatment.endDate || null,
      treatment.appliedBy, 
      treatment.lastApplication, 
      treatment.responsibleDoctor || null,
      treatment.administrationTimes || null,
      treatment.status || 'Activo',
      treatment.notes || null
    ]
  );
  return result.lastInsertId;
}

// ========== VITAL SIGNS OPERATIONS ==========

export async function getAllVitalSigns() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM vital_signs ORDER BY date DESC');
}

export async function getVitalSignsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY date DESC', [patientId]);
}

export async function createVitalSigns(vitalSigns) {
  // Validación de signos vitales (backend)
  const validateVitalSign = (value, min, max, name) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error(`${name} debe ser un valor numérico válido`);
    }
    if (num < min || num > max) {
      throw new Error(`${name} fuera de rango posible (${min}-${max})`);
    }
  };
  
  // Validar rangos fisiológicos
  if (vitalSigns.temperature) {
    validateVitalSign(vitalSigns.temperature, 32, 42, 'Temperatura');
  }
  
  if (vitalSigns.heartRate) {
    validateVitalSign(vitalSigns.heartRate, 30, 220, 'Frecuencia cardíaca');
  }
  
  if (vitalSigns.respiratoryRate) {
    validateVitalSign(vitalSigns.respiratoryRate, 6, 60, 'Frecuencia respiratoria');
  }
  
  // Validar presión arterial
  if (vitalSigns.bloodPressure) {
    const parts = vitalSigns.bloodPressure.split('/');
    if (parts.length !== 2) {
      throw new Error('Presión arterial debe estar en formato 120/80');
    }
    const systolic = parseInt(parts[0]);
    const diastolic = parseInt(parts[1]);
    
    if (isNaN(systolic) || isNaN(diastolic)) {
      throw new Error('Presión arterial debe contener valores numéricos');
    }
    
    if (systolic < 60 || systolic > 250) {
      throw new Error('Presión sistólica fuera de rango (60-250 mmHg)');
    }
    
    if (diastolic < 40 || diastolic > 150) {
      throw new Error('Presión diastólica fuera de rango (40-150 mmHg)');
    }
    
    if (systolic <= diastolic) {
      throw new Error('Presión sistólica debe ser mayor que diastólica');
    }
  }
  
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [vitalSigns.patientId, vitalSigns.date, vitalSigns.temperature, vitalSigns.bloodPressure, vitalSigns.heartRate, vitalSigns.respiratoryRate, vitalSigns.registeredBy]
  );
  
  // NOM-004: Registrar en auditoría
  await createAuditLog({
    userId: vitalSigns.userId || 0,
    userName: vitalSigns.registeredBy,
    actionType: 'CREATE',
    entityType: 'vital_signs',
    entityId: result.lastInsertId,
    actionDescription: `Signos vitales registrados para paciente ID: ${vitalSigns.patientId}`,
    timestamp: vitalSigns.date,
    details: JSON.stringify({ 
      patientId: vitalSigns.patientId,
      temperature: vitalSigns.temperature,
      bloodPressure: vitalSigns.bloodPressure,
      heartRate: vitalSigns.heartRate,
      respiratoryRate: vitalSigns.respiratoryRate
    })
  });
  
  return result.lastInsertId;
}

// ========== LAB TEST OPERATIONS ==========

export async function getAllLabTests() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM lab_tests ORDER BY date DESC');
}

export async function getLabTestsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM lab_tests WHERE patient_id = ? ORDER BY date DESC', [patientId]);
}

export async function createLabTest(labTest) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO lab_tests (patient_id, test, date, status, results, ordered_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [labTest.patientId, labTest.test, labTest.date, labTest.status, labTest.results, labTest.orderedBy]
  );
  return result.lastInsertId;
}

// ========== MEDICAL HISTORY OPERATIONS ==========

export async function getAllMedicalHistory() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM medical_history ORDER BY date DESC');
}

export async function getMedicalHistoryByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM medical_history WHERE patient_id = ? ORDER BY date DESC', [patientId]);
}

export async function createMedicalHistory(record) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO medical_history (patient_id, date, diagnosis, treatment, notes, doctor)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [record.patientId, record.date, record.diagnosis, record.treatment, record.notes, record.doctor]
  );
  return result.lastInsertId;
}

// ========== NURSE NOTES OPERATIONS ==========

export async function getAllNurseNotes() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM nurse_notes ORDER BY date DESC');
}

export async function getNurseNotesByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM nurse_notes WHERE patient_id = ? ORDER BY date DESC', [patientId]);
}

export async function createNurseNote(note) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, original_note, note_type, nurse_name, was_edited, edit_count)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    [note.patientId, note.date, note.note, note.note, note.noteType || 'evolutiva', note.nurseName]
  );
  
  // NOM-004: Registrar en auditoría (trazabilidad legal)
  await createAuditLog({
    userId: note.userId || 0,
    userName: note.nurseName,
    actionType: 'CREATE',
    entityType: 'nurse_note',
    entityId: result.lastInsertId,
    actionDescription: `Nota de enfermería registrada para paciente ID: ${note.patientId}`,
    timestamp: note.date,
    details: JSON.stringify({ noteType: note.noteType, patientId: note.patientId })
  });
  
  return result.lastInsertId;
}

/**
 * Edit an existing nurse note (with 24h time restriction)
 */
export async function editNurseNote(noteId, newContent, editedBy, editedByRole, editReason = '') {
  try {
    const db = await initDatabase();
    
    // Get current note
    const notes = await db.select('SELECT * FROM nurse_notes WHERE id = ?', [noteId]);
    if (notes.length === 0) {
      throw new Error('Nota no encontrada');
    }
    
    const currentNote = notes[0];
    
    // Calculate note age
    const noteDate = new Date(currentNote.date);
    const now = new Date();
    const ageHours = (now - noteDate) / (1000 * 60 * 60);
    const isWithinWindow = ageHours <= 24;
    
    // Log edit attempt
    await db.execute(
      `INSERT INTO note_edit_attempts 
       (note_id, patient_id, attempted_by, attempted_by_role, attempt_date, note_age_hours, was_allowed, denial_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        currentNote.patient_id,
        editedBy,
        editedByRole,
        now.toISOString(),
        ageHours,
        isWithinWindow ? 1 : 0,
        isWithinWindow ? null : 'Período de edición de 24h expirado'
      ]
    );
    
    // Block if outside time window
    if (!isWithinWindow) {
      return {
        success: false,
        error: 'La nota no puede ser editada después de 24 horas de su creación (NOM-004)',
        ageHours: ageHours
      };
    }
    
    // Preserve original note if first edit
    const originalNote = currentNote.was_edited ? currentNote.original_note : currentNote.note;
    const newEditCount = (currentNote.edit_count || 0) + 1;
    
    // Update note
    await db.execute(
      `UPDATE nurse_notes 
       SET note = ?, 
           original_note = ?,
           was_edited = 1, 
           edit_count = ?,
           last_edit_date = ?
       WHERE id = ?`,
      [newContent, originalNote, newEditCount, now.toISOString(), noteId]
    );
    
    // Record edit in history
    await db.execute(
      `INSERT INTO note_edit_history 
       (note_id, patient_id, previous_content, new_content, edited_by, edited_by_role, edit_date, note_age_hours, edit_reason, was_within_window)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        currentNote.patient_id,
        currentNote.note,
        newContent,
        editedBy,
        editedByRole,
        now.toISOString(),
        ageHours,
        editReason,
        1
      ]
    );
    
    // NOM-004 audit log
    await createAuditLog({
      userId: 0,
      userName: editedBy,
      actionType: 'EDIT',
      entityType: 'nurse_note',
      entityId: noteId,
      actionDescription: `Nota editada (${newEditCount}° edición) para paciente ID: ${currentNote.patient_id}`,
      timestamp: now.toISOString(),
      details: JSON.stringify({ 
        editReason, 
        ageHours: ageHours.toFixed(2),
        previousLength: currentNote.note.length,
        newLength: newContent.length
      })
    });
    
    console.log(`✓ Note ${noteId} edited successfully by ${editedBy}`);
    return {
      success: true,
      noteId,
      editCount: newEditCount,
      ageHours: ageHours
    };
  } catch (error) {
    console.error('Error editing nurse note:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get edit history for a note
 */
export async function getNoteEditHistory(noteId) {
  try {
    const db = await initDatabase();
    const history = await db.select(
      'SELECT * FROM note_edit_history WHERE note_id = ? ORDER BY edit_date DESC',
      [noteId]
    );
    return history;
  } catch (error) {
    console.error('Error fetching note edit history:', error);
    throw error;
  }
}

/**
 * Get all edit attempts (for admin audit)
 */
export async function getAllNoteEditAttempts(filters = {}) {
  try {
    const db = await initDatabase();
    let query = 'SELECT * FROM note_edit_attempts WHERE 1=1';
    const params = [];
    
    if (filters.wasAllowed !== undefined) {
      query += ' AND was_allowed = ?';
      params.push(filters.wasAllowed ? 1 : 0);
    }
    
    if (filters.startDate) {
      query += ' AND attempt_date >= ?';
      params.push(filters.startDate);
    }
    
    query += ' ORDER BY attempt_date DESC LIMIT ?';
    params.push(filters.limit || 100);
    
    const attempts = await db.select(query, params);
    return attempts;
  } catch (error) {
    console.error('Error fetching note edit attempts:', error);
    throw error;
  }
}

/**
 * Get edit statistics
 */
export async function getNoteEditStats() {
  try {
    const db = await initDatabase();
    
    const stats = await db.select(`
      SELECT 
        COUNT(*) as total_notes,
        SUM(CASE WHEN was_edited = 1 THEN 1 ELSE 0 END) as edited_notes,
        (SELECT COUNT(*) FROM note_edit_attempts WHERE was_allowed = 0) as blocked_attempts,
        (SELECT COUNT(*) FROM note_edit_history) as total_edits
      FROM nurse_notes
    `);
    
    return stats[0] || {
      total_notes: 0,
      edited_notes: 0,
      blocked_attempts: 0,
      total_edits: 0
    };
  } catch (error) {
    console.error('Error fetching note edit stats:', error);
    throw error;
  }
}

// ========== AUDIT TRAIL OPERATIONS (NOM-004 COMPLIANCE) ==========

export async function createAuditLog(auditData) {
  try {
    const db = await initDatabase();
    await db.execute(
      `INSERT INTO audit_trail (user_id, user_name, action_type, entity_type, entity_id, action_description, ip_address, timestamp, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditData.userId,
        auditData.userName,
        auditData.actionType,
        auditData.entityType,
        auditData.entityId,
        auditData.actionDescription,
        auditData.ipAddress || 'localhost',
        auditData.timestamp,
        auditData.details || null
      ]
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

export async function getAuditTrail(filters = {}) {
  const db = await initDatabase();
  let query = 'SELECT * FROM audit_trail';
  const conditions = [];
  const params = [];
  
  if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(filters.userId);
  }
  
  if (filters.entityType) {
    conditions.push('entity_type = ?');
    params.push(filters.entityType);
  }
  
  if (filters.entityId) {
    conditions.push('entity_id = ?');
    params.push(filters.entityId);
  }
  
  if (filters.dateFrom) {
    conditions.push('timestamp >= ?');
    params.push(filters.dateFrom);
  }
  
  if (filters.dateTo) {
    conditions.push('timestamp <= ?');
    params.push(filters.dateTo);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY timestamp DESC';
  
  return await db.select(query, params);
}

export async function getAuditTrailByPatient(patientId) {
  const db = await initDatabase();
  return await db.select(
    `SELECT * FROM audit_trail 
     WHERE entity_type IN ('nurse_note', 'vital_signs', 'treatment', 'medication') 
     AND details LIKE ?
     ORDER BY timestamp DESC`,
    [`%"patientId":${patientId}%`]
  );
}

// ========== NON-PHARMACOLOGICAL TREATMENTS OPERATIONS ==========

export async function getAllNonPharmaTreatments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM non_pharmacological_treatments ORDER BY application_date DESC');
}

export async function getNonPharmaTreatmentsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM non_pharmacological_treatments WHERE patient_id = ? ORDER BY application_date DESC', [patientId]);
}

export async function createNonPharmaTreatment(treatment) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO non_pharmacological_treatments 
     (patient_id, treatment_type, description, application_date, application_time, duration, performed_by, materials_used, observations, outcome, next_application, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      treatment.patientId,
      treatment.treatmentType,
      treatment.description,
      treatment.applicationDate,
      treatment.applicationTime || null,
      treatment.duration || null,
      treatment.performedBy,
      treatment.materialsUsed || null,
      treatment.observations || null,
      treatment.outcome || null,
      treatment.nextApplication || null,
      treatment.status || 'Completado'
    ]
  );
  return result.lastInsertId;
}

// ========== NURSING SHIFT REPORT OPERATIONS ==========

export async function createNursingShiftReport(report) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO nursing_shift_reports 
     (shift_date, shift_type, nurse_id, nurse_name, start_time, end_time, 
      patients_assigned, general_observations, incidents, pending_tasks, 
      handover_notes, supervisor_name, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.shiftDate,
      report.shiftType,
      report.nurseId,
      report.nurseName,
      report.startTime,
      report.endTime || null,
      report.patientsAssigned,
      report.generalObservations || null,
      report.incidents || null,
      report.pendingTasks || null,
      report.handoverNotes || null,
      report.supervisorName || null,
      report.status || 'En Curso'
    ]
  );
  return result.lastInsertId;
}

export async function updateNursingShiftReport(reportId, updates) {
  const db = await initDatabase();
  const fields = [];
  const values = [];
  
  if (updates.endTime !== undefined) {
    fields.push('end_time = ?');
    values.push(updates.endTime);
  }
  if (updates.generalObservations !== undefined) {
    fields.push('general_observations = ?');
    values.push(updates.generalObservations);
  }
  if (updates.incidents !== undefined) {
    fields.push('incidents = ?');
    values.push(updates.incidents);
  }
  if (updates.pendingTasks !== undefined) {
    fields.push('pending_tasks = ?');
    values.push(updates.pendingTasks);
  }
  if (updates.handoverNotes !== undefined) {
    fields.push('handover_notes = ?');
    values.push(updates.handoverNotes);
  }
  if (updates.supervisorName !== undefined) {
    fields.push('supervisor_name = ?');
    values.push(updates.supervisorName);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(reportId);
  
  await db.execute(
    `UPDATE nursing_shift_reports SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getNursingShiftReportsByNurseId(nurseId) {
  const db = await initDatabase();
  return await db.select(
    'SELECT * FROM nursing_shift_reports WHERE nurse_id = ? ORDER BY shift_date DESC, created_at DESC',
    [nurseId]
  );
}

export async function getNursingShiftReportByDateAndNurse(shiftDate, nurseId) {
  const db = await initDatabase();
  const reports = await db.select(
    'SELECT * FROM nursing_shift_reports WHERE shift_date = ? AND nurse_id = ? ORDER BY created_at DESC LIMIT 1',
    [shiftDate, nurseId]
  );
  return reports.length > 0 ? reports[0] : null;
}

export async function getAllNursingShiftReports() {
  const db = await initDatabase();
  return await db.select(
    'SELECT * FROM nursing_shift_reports ORDER BY shift_date DESC, created_at DESC'
  );
}

// ========== DATA SEEDING (for initial demo data) ==========

export async function seedInitialData() {
  const db = await initDatabase();
  
  // Check if data already exists
  const existingPatients = await db.select('SELECT COUNT(*) as count FROM patients');
  if (existingPatients[0].count >= 30) {
    console.log('✓ Database already has 30+ patients, skipping seed');
    return;
  }

  console.log('Seeding initial realistic hospital data...');

  // Seed realistic patients with diverse conditions (30 patients)
  const patientsData = [
    {
      name: 'Ana María Torres',
      age: 67,
      gender: 'Femenino',
      room: '301',
      floor: '3',
      area: 'Cardiología',
      bed: 'A',
      condition: 'Crítico',
      admissionDate: '2025-12-10',
      bloodType: 'O+',
      allergies: 'Penicilina, Látex',
      emergencyContactName: 'Roberto Torres',
      emergencyContactPhone: '+52-555-1234',
      address: 'Calle Juárez 123',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '12345678901',
      primaryDoctor: 'Dr. García Hernández',
      triageLevel: 1
    },
    {
      name: 'Carlos Eduardo Ramírez',
      age: 45,
      gender: 'Masculino',
      room: '205',
      floor: '2',
      area: 'Medicina Interna',
      bed: 'B',
      condition: 'Estable',
      admissionDate: '2025-12-08',
      bloodType: 'A+',
      allergies: null,
      emergencyContactName: 'Laura Ramírez',
      emergencyContactPhone: '+52-555-5678',
      address: 'Av. Reforma 456',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Popular',
      insuranceNumber: '98765432109',
      primaryDoctor: 'Dra. Martínez López',
      triageLevel: 3
    },
    {
      name: 'María Guadalupe Sánchez',
      age: 58,
      gender: 'Femenino',
      room: '410',
      floor: '4',
      area: 'Oncología',
      bed: 'A',
      condition: 'Regular',
      admissionDate: '2025-12-05',
      bloodType: 'B+',
      allergies: 'Aspirina, Ibuprofeno',
      emergencyContactName: 'José Sánchez',
      emergencyContactPhone: '+52-555-9012',
      address: 'Colonia del Valle 789',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '45678901234',
      primaryDoctor: 'Dr. Rodríguez Pérez',
      triageLevel: 2
    },
    {
      name: 'Roberto González Méndez',
      age: 72,
      gender: 'Masculino',
      room: '302',
      floor: '3',
      area: 'Cardiología',
      bed: 'C',
      condition: 'Crítico',
      admissionDate: '2025-12-12',
      bloodType: 'AB+',
      allergies: 'Sulfamidas',
      emergencyContactName: 'Carmen González',
      emergencyContactPhone: '+52-555-3456',
      address: 'Polanco 234',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '78901234567',
      primaryDoctor: 'Dr. García Hernández',
      triageLevel: 1
    },
    {
      name: 'Lupita Fernández Castro',
      age: 34,
      gender: 'Femenino',
      room: '108',
      floor: '1',
      area: 'Maternidad',
      bed: 'A',
      condition: 'Estable',
      admissionDate: '2025-12-14',
      bloodType: 'O-',
      allergies: null,
      emergencyContactName: 'Miguel Fernández',
      emergencyContactPhone: '+52-555-7890',
      address: 'Coyoacán 567',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '23456789012',
      primaryDoctor: 'Dra. López Ruiz',
      triageLevel: 3
    },
    {
      name: 'José Luis Morales',
      age: 81,
      gender: 'Masculino',
      room: '503',
      floor: '5',
      area: 'Geriatría',
      bed: 'B',
      condition: 'Recuperación',
      admissionDate: '2025-12-01',
      bloodType: 'A-',
      allergies: 'Penicilina',
      emergencyContactName: 'Ana Morales',
      emergencyContactPhone: '+52-555-2345',
      address: 'Roma Norte 890',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '34567890123',
      primaryDoctor: 'Dr. Hernández Silva',
      triageLevel: 2
    },
    {
      name: 'Patricia Jiménez Vargas',
      age: 29,
      gender: 'Femenino',
      room: '207',
      floor: '2',
      area: 'Traumatología',
      bed: 'A',
      condition: 'Recuperación',
      admissionDate: '2025-12-11',
      bloodType: 'B-',
      allergies: null,
      emergencyContactName: 'Fernando Jiménez',
      emergencyContactPhone: '+52-555-6789',
      address: 'Condesa 123',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '56789012345',
      primaryDoctor: 'Dr. Sánchez Torres',
      triageLevel: 3
    },
    {
      name: 'Fernando Díaz Rojas',
      age: 52,
      gender: 'Masculino',
      room: '315',
      floor: '3',
      area: 'Neurología',
      bed: 'D',
      condition: 'Regular',
      admissionDate: '2025-12-09',
      bloodType: 'O+',
      allergies: 'Contraste Yodado',
      emergencyContactName: 'Sofía Díaz',
      emergencyContactPhone: '+52-555-4567',
      address: 'Narvarte 456',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '67890123456',
      primaryDoctor: 'Dra. Ramírez Cruz',
      triageLevel: 2
    },
    {
      name: 'Isabel Reyes Mendoza',
      age: 41,
      gender: 'Femenino',
      room: '412',
      floor: '4',
      area: 'Oncología',
      bed: 'C',
      condition: 'Estable',
      admissionDate: '2025-12-07',
      bloodType: 'AB-',
      allergies: 'Sulfa',
      emergencyContactName: 'Pedro Reyes',
      emergencyContactPhone: '+52-555-8901',
      address: 'San Ángel 789',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Popular',
      insuranceNumber: '89012345678',
      primaryDoctor: 'Dr. Rodríguez Pérez',
      triageLevel: 3
    },
    {
      name: 'Miguel Ángel Castro',
      age: 63,
      gender: 'Masculino',
      room: '509',
      floor: '5',
      area: 'Neumología',
      bed: 'A',
      condition: 'Crítico',
      admissionDate: '2025-12-13',
      bloodType: 'A+',
      allergies: 'Penicilina, Morfina',
      emergencyContactName: 'Rosa Castro',
      emergencyContactPhone: '+52-555-0123',
      address: 'Chapultepec 012',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '90123456789',
      primaryDoctor: 'Dr. Flores Vega',
      triageLevel: 1
    },
    {
      name: 'Rosa Elena Ortiz',
      age: 76,
      gender: 'Femenino',
      room: '504',
      floor: '5',
      area: 'Geriatría',
      bed: 'C',
      condition: 'Recuperación',
      admissionDate: '2025-12-03',
      bloodType: 'O-',
      allergies: null,
      emergencyContactName: 'Carlos Ortiz',
      emergencyContactPhone: '+52-555-3456',
      address: 'Tlalpan 345',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '01234567890',
      primaryDoctor: 'Dr. Hernández Silva',
      triageLevel: 2
    },
    {
      name: 'Javier Herrera Núñez',
      age: 48,
      gender: 'Masculino',
      room: '210',
      floor: '2',
      area: 'Gastroenterología',
      bed: 'D',
      condition: 'Estable',
      admissionDate: '2025-12-06',
      bloodType: 'B+',
      allergies: 'Morfina',
      emergencyContactName: 'Mónica Herrera',
      emergencyContactPhone: '+52-555-6789',
      address: 'Azcapotzalco 678',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '12340987654',
      primaryDoctor: 'Dra. Velázquez Soto',
      triageLevel: 3
    },
    {
      name: 'Sandra Martínez Delgado',
      age: 39,
      gender: 'Femenino',
      room: '215',
      floor: '2',
      area: 'Endocrinología',
      bed: 'C',
      condition: 'Estable',
      admissionDate: '2025-12-09',
      bloodType: 'A+',
      allergies: null,
      emergencyContactName: 'Ricardo Martínez',
      emergencyContactPhone: '+52-555-4321',
      address: 'Santa Fe 901',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '11122233344',
      primaryDoctor: 'Dr. López García',
      triageLevel: 3
    },
    {
      name: 'Alejandro Vega Moreno',
      age: 55,
      gender: 'Masculino',
      room: '318',
      floor: '3',
      area: 'Nefrología',
      bed: 'B',
      condition: 'Regular',
      admissionDate: '2025-12-11',
      bloodType: 'O+',
      allergies: 'Sulfamidas',
      emergencyContactName: 'Teresa Vega',
      emergencyContactPhone: '+52-555-8765',
      address: 'Insurgentes 234',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '22233344455',
      primaryDoctor: 'Dra. Ruiz Fernández',
      triageLevel: 2
    },
    {
      name: 'Claudia Rojas Sánchez',
      age: 42,
      gender: 'Femenino',
      room: '415',
      floor: '4',
      area: 'Ginecología',
      bed: 'B',
      condition: 'Recuperación',
      admissionDate: '2025-12-12',
      bloodType: 'B+',
      allergies: null,
      emergencyContactName: 'Jorge Rojas',
      emergencyContactPhone: '+52-555-5432',
      address: 'Del Valle 567',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '33344455566',
      primaryDoctor: 'Dra. Méndez Castro',
      triageLevel: 3
    },
    {
      name: 'Eduardo Silva Ramírez',
      age: 68,
      gender: 'Masculino',
      room: '303',
      floor: '3',
      area: 'Cardiología',
      bed: 'D',
      condition: 'Crítico',
      admissionDate: '2025-12-14',
      bloodType: 'AB+',
      allergies: 'Aspirina',
      emergencyContactName: 'María Silva',
      emergencyContactPhone: '+52-555-9876',
      address: 'Lomas 890',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '44455566677',
      primaryDoctor: 'Dr. García Hernández',
      triageLevel: 1
    },
    {
      name: 'Gabriela Torres Vázquez',
      age: 31,
      gender: 'Femenino',
      room: '109',
      floor: '1',
      area: 'Maternidad',
      bed: 'C',
      condition: 'Estable',
      admissionDate: '2025-12-13',
      bloodType: 'A-',
      allergies: null,
      emergencyContactName: 'Luis Torres',
      emergencyContactPhone: '+52-555-6543',
      address: 'Xochimilco 123',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Popular',
      insuranceNumber: '55566677788',
      primaryDoctor: 'Dra. López Ruiz',
      triageLevel: 3
    },
    {
      name: 'Héctor Mendoza Flores',
      age: 59,
      gender: 'Masculino',
      room: '416',
      floor: '4',
      area: 'Urología',
      bed: 'D',
      condition: 'Regular',
      admissionDate: '2025-12-07',
      bloodType: 'O-',
      allergies: 'Penicilina',
      emergencyContactName: 'Diana Mendoza',
      emergencyContactPhone: '+52-555-3210',
      address: 'Cuauhtémoc 456',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '66677788899',
      primaryDoctor: 'Dr. Vargas Pinto',
      triageLevel: 2
    },
    {
      name: 'Diana Castillo Herrera',
      age: 36,
      gender: 'Femenino',
      room: '212',
      floor: '2',
      area: 'Dermatología',
      bed: 'A',
      condition: 'Estable',
      admissionDate: '2025-12-10',
      bloodType: 'B-',
      allergies: 'Látex',
      emergencyContactName: 'Alberto Castillo',
      emergencyContactPhone: '+52-555-7654',
      address: 'Benito Juárez 789',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '77788899900',
      primaryDoctor: 'Dra. Campos Ortiz',
      triageLevel: 3
    },
    {
      name: 'Francisco Gutiérrez Lara',
      age: 70,
      gender: 'Masculino',
      room: '510',
      floor: '5',
      area: 'Neumología',
      bed: 'C',
      condition: 'Crítico',
      admissionDate: '2025-12-15',
      bloodType: 'A+',
      allergies: 'Contraste, Morfina',
      emergencyContactName: 'Elena Gutiérrez',
      emergencyContactPhone: '+52-555-4567',
      address: 'Miguel Hidalgo 012',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '88899900011',
      primaryDoctor: 'Dr. Flores Vega',
      triageLevel: 1
    },
    {
      name: 'Verónica López Jiménez',
      age: 44,
      gender: 'Femenino',
      room: '320',
      floor: '3',
      area: 'Neurología',
      bed: 'A',
      condition: 'Recuperación',
      admissionDate: '2025-12-08',
      bloodType: 'O+',
      allergies: null,
      emergencyContactName: 'Raúl López',
      emergencyContactPhone: '+52-555-1098',
      address: 'Iztapalapa 345',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Popular',
      insuranceNumber: '99900011122',
      primaryDoctor: 'Dra. Ramírez Cruz',
      triageLevel: 2
    },
    {
      name: 'Ricardo Pérez Alvarado',
      age: 53,
      gender: 'Masculino',
      room: '218',
      floor: '2',
      area: 'Gastroenterología',
      bed: 'B',
      condition: 'Regular',
      admissionDate: '2025-12-09',
      bloodType: 'AB-',
      allergies: 'Sulfa',
      emergencyContactName: 'Patricia Pérez',
      emergencyContactPhone: '+52-555-2109',
      address: 'Tlalpan 678',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '00011122233',
      primaryDoctor: 'Dra. Velázquez Soto',
      triageLevel: 2
    },
    {
      name: 'Mariana Soto Ramírez',
      age: 27,
      gender: 'Femenino',
      room: '110',
      floor: '1',
      area: 'Pediatría',
      bed: 'B',
      condition: 'Estable',
      admissionDate: '2025-12-14',
      bloodType: 'A+',
      allergies: null,
      emergencyContactName: 'Carlos Soto',
      emergencyContactPhone: '+52-555-8901',
      address: 'Gustavo A. Madero 901',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '11122233345',
      primaryDoctor: 'Dr. Ortega Ruiz',
      triageLevel: 3
    },
    {
      name: 'Antonio Vargas Sánchez',
      age: 64,
      gender: 'Masculino',
      room: '505',
      floor: '5',
      area: 'Geriatría',
      bed: 'D',
      condition: 'Regular',
      admissionDate: '2025-12-04',
      bloodType: 'B+',
      allergies: 'Penicilina, Aspirina',
      emergencyContactName: 'Beatriz Vargas',
      emergencyContactPhone: '+52-555-3456',
      address: 'Venustiano Carranza 234',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '22233344456',
      primaryDoctor: 'Dr. Hernández Silva',
      triageLevel: 2
    },
    {
      name: 'Laura Núñez Castro',
      age: 38,
      gender: 'Femenino',
      room: '420',
      floor: '4',
      area: 'Oncología',
      bed: 'B',
      condition: 'Crítico',
      admissionDate: '2025-12-11',
      bloodType: 'O-',
      allergies: 'Látex, Morfina',
      emergencyContactName: 'Sergio Núñez',
      emergencyContactPhone: '+52-555-7890',
      address: 'Álvaro Obregón 567',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '33344455567',
      primaryDoctor: 'Dr. Rodríguez Pérez',
      triageLevel: 1
    },
    {
      name: 'Sergio Moreno Díaz',
      age: 49,
      gender: 'Masculino',
      room: '308',
      floor: '3',
      area: 'Cardiología',
      bed: 'B',
      condition: 'Estable',
      admissionDate: '2025-12-06',
      bloodType: 'A-',
      allergies: null,
      emergencyContactName: 'Lucía Moreno',
      emergencyContactPhone: '+52-555-6543',
      address: 'Magdalena Contreras 890',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Popular',
      insuranceNumber: '44455566678',
      primaryDoctor: 'Dr. García Hernández',
      triageLevel: 3
    },
    {
      name: 'Carmen Fernández Ruiz',
      age: 73,
      gender: 'Femenino',
      room: '506',
      floor: '5',
      area: 'Geriatría',
      bed: 'A',
      condition: 'Recuperación',
      admissionDate: '2025-12-02',
      bloodType: 'AB+',
      allergies: 'Sulfamidas',
      emergencyContactName: 'Manuel Fernández',
      emergencyContactPhone: '+52-555-9012',
      address: 'Milpa Alta 123',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '55566677789',
      primaryDoctor: 'Dr. Hernández Silva',
      triageLevel: 2
    },
    {
      name: 'Pablo Ramos González',
      age: 56,
      gender: 'Masculino',
      room: '220',
      floor: '2',
      area: 'Endocrinología',
      bed: 'C',
      condition: 'Regular',
      admissionDate: '2025-12-10',
      bloodType: 'O+',
      allergies: 'Contraste Yodado',
      emergencyContactName: 'Adriana Ramos',
      emergencyContactPhone: '+52-555-2345',
      address: 'Tláhuac 456',
      city: 'Ciudad de México',
      insuranceProvider: 'IMSS',
      insuranceNumber: '66677788890',
      primaryDoctor: 'Dr. López García',
      triageLevel: 2
    },
    {
      name: 'Norma Aguilar Pérez',
      age: 33,
      gender: 'Femenino',
      room: '111',
      floor: '1',
      area: 'Maternidad',
      bed: 'D',
      condition: 'Estable',
      admissionDate: '2025-12-15',
      bloodType: 'B+',
      allergies: null,
      emergencyContactName: 'Gustavo Aguilar',
      emergencyContactPhone: '+52-555-5678',
      address: 'Cuajimalpa 789',
      city: 'Ciudad de México',
      insuranceProvider: 'Seguro Privado',
      insuranceNumber: '77788899901',
      primaryDoctor: 'Dra. López Ruiz',
      triageLevel: 3
    },
    {
      name: 'Rodrigo Salazar Torres',
      age: 61,
      gender: 'Masculino',
      room: '511',
      floor: '5',
      area: 'Neumología',
      bed: 'B',
      condition: 'Crítico',
      admissionDate: '2025-12-14',
      bloodType: 'A+',
      allergies: 'Penicilina',
      emergencyContactName: 'Gloria Salazar',
      emergencyContactPhone: '+52-555-8765',
      address: 'La Magdalena 012',
      city: 'Ciudad de México',
      insuranceProvider: 'ISSSTE',
      insuranceNumber: '88899900012',
      primaryDoctor: 'Dr. Flores Vega',
      triageLevel: 1
    }
  ];

  // Insert all patients
  for (const patient of patientsData) {
    await createPatient(patient);
  }

  console.log('✓ Initial realistic hospital data seeded successfully');
  console.log(`✓ Created ${patientsData.length} patients with diverse conditions`);

  // Add realistic vital signs for some patients
  const today = new Date();
  const formatDate = (date) => date.toLocaleString('es-MX');
  
  // Critical patients get recent vital signs
  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, formatDate(new Date(today - 2 * 60 * 60 * 1000)), '38.5', '160/95', '110', '24', '92', 'Enfermera María López']
  );
  
  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, formatDate(new Date(today - 6 * 60 * 60 * 1000)), '38.2', '155/92', '105', '22', '94', 'Enfermero Carlos Ruiz']
  );

  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [4, formatDate(new Date(today - 1 * 60 * 60 * 1000)), '37.8', '145/88', '98', '20', '93', 'Enfermera Patricia González']
  );

  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [10, formatDate(new Date(today - 3 * 60 * 60 * 1000)), '37.2', '142/85', '95', '22', '91', 'Enfermera Ana Martínez']
  );

  // Stable patients
  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [2, formatDate(new Date(today - 8 * 60 * 60 * 1000)), '36.5', '120/80', '72', '16', '98', 'Enfermero José Pérez']
  );

  await db.execute(
    `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [5, formatDate(new Date(today - 4 * 60 * 60 * 1000)), '36.8', '115/75', '68', '15', '99', 'Enfermera Laura Sánchez']
  );

  // Add realistic treatments
  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 'Enalapril', '10mg', 'Cada 12 horas', '2025-12-10', 'Enfermera María López', formatDate(today), 'Dr. García Hernández', 'Activo', 'Monitorear presión arterial']
  );

  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 'Aspirina', '100mg', 'Cada 24 horas', '2025-12-10', 'Enfermera María López', formatDate(today), 'Dr. García Hernández', 'Activo', 'Profilaxis cardiovascular']
  );

  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [3, 'Ondansetrón', '8mg', 'Cada 8 horas PRN', '2025-12-05', 'Enfermero Carlos Ruiz', formatDate(new Date(today - 6 * 60 * 60 * 1000)), 'Dr. Rodríguez Pérez', 'Activo', 'Antiemético post-quimioterapia']
  );

  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [4, 'Furosemida', '40mg', 'Cada 12 horas', '2025-12-12', 'Enfermera Patricia González', formatDate(today), 'Dr. García Hernández', 'Activo', 'Diurético para insuficiencia cardíaca']
  );

  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [6, 'Omeprazol', '20mg', 'Cada 24 horas', '2025-12-01', 'Enfermero José Pérez', formatDate(new Date(today - 12 * 60 * 60 * 1000)), 'Dr. Hernández Silva', 'Activo', 'Protección gástrica']
  );

  await db.execute(
    `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, responsible_doctor, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [10, 'Salbutamol nebulizado', '2.5mg', 'Cada 6 horas', '2025-12-13', 'Enfermera Ana Martínez', formatDate(today), 'Dr. Flores Vega', 'Activo', 'Broncodilatador para EPOC']
  );

  // Add realistic nurse notes
  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [1, formatDate(new Date(today - 2 * 60 * 60 * 1000)), 'Paciente refiere dolor torácico 6/10. Se administró nitroglicerina sublingual con mejoría parcial. TA elevada. Médico notificado.', 'Enfermera María López', 'Evolución']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [4, formatDate(new Date(today - 1 * 60 * 60 * 1000)), 'Paciente con disnea leve en reposo. Edema en miembros inferiores +2. Tolera decúbito a 45°. Se continúa monitoreo.', 'Enfermera Patricia González', 'Evolución']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [2, formatDate(new Date(today - 5 * 60 * 60 * 1000)), 'Paciente estable, sin cambios. Deambula sin dificultad. Tolera dieta general. Signos vitales dentro de parámetros normales.', 'Enfermero José Pérez', 'Observación']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [3, formatDate(new Date(today - 8 * 60 * 60 * 1000)), 'Post-quimioterapia. Paciente con náuseas controladas con ondansetrón. Sin vómitos. Aceptó líquidos claros. Familiar acompañante presente.', 'Enfermero Carlos Ruiz', 'Post-procedimiento']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [10, formatDate(new Date(today - 3 * 60 * 60 * 1000)), 'Paciente con dificultad respiratoria moderada. Se administró nebulización con salbutamol. Saturación mejoró a 93%. Posición semifowler.', 'Enfermera Ana Martínez', 'Evolución']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [5, formatDate(new Date(today - 10 * 60 * 60 * 1000)), 'Gestante de 38 semanas. Sin contracciones. Movimientos fetales presentes. FC fetal 140 lpm. Paciente confortable.', 'Enfermera Laura Sánchez', 'Observación']
  );

  await db.execute(
    `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
     VALUES (?, ?, ?, ?, ?)`,
    [7, formatDate(new Date(today - 12 * 60 * 60 * 1000)), 'Post-quirúrgico día 4. Herida limpia, sin signos de infección. Drena contenido seroso escaso. Paciente deambula con ayuda. Dolor controlado.', 'Enfermera Carmen Torres', 'Post-procedimiento']
  );

  console.log('✓ Added realistic vital signs, treatments, and nurse notes');

  // Add realistic appointments
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 'Ana María Torres', todayStr, '10:00', 'Cardiología', 'Confirmada', 'Dr. García Hernández']
  );

  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [3, 'María Guadalupe Sánchez', todayStr, '14:30', 'Oncología', 'Confirmada', 'Dr. Rodríguez Pérez']
  );

  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [5, 'Lupita Fernández Castro', todayStr, '09:00', 'Control Prenatal', 'Completada', 'Dra. López Ruiz']
  );

  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [8, 'Fernando Díaz Rojas', todayStr, '16:00', 'Neurología', 'Pendiente', 'Dra. Ramírez Cruz']
  );

  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [2, 'Carlos Eduardo Ramírez', tomorrowStr, '11:00', 'Medicina Interna', 'Confirmada', 'Dra. Martínez López']
  );

  await db.execute(
    `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [10, 'Miguel Ángel Castro', tomorrowStr, '08:30', 'Neumología', 'Confirmada', 'Dr. Flores Vega']
  );

  console.log('✓ Added realistic appointments for today and tomorrow');
}

// ========== NOTIFICATION OPERATIONS ==========

export async function getAllNotifications(userId = null) {
  const db = await initDatabase();
  if (userId) {
    return await db.select('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }
  return await db.select('SELECT * FROM notifications ORDER BY created_at DESC');
}

export async function getUnreadNotifications(userId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC', [userId]);
}

export async function createNotification(notification) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO notifications (user_id, title, message, type, priority, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [notification.userId, notification.title, notification.message, notification.type, notification.priority || 'normal', notification.link || null]
  );
  return result.lastInsertId;
}

export async function markNotificationAsRead(id) {
  const db = await initDatabase();
  await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
}

export async function markAllNotificationsAsRead(userId) {
  const db = await initDatabase();
  await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
}

export async function deleteNotification(id) {
  const db = await initDatabase();
  await db.execute('DELETE FROM notifications WHERE id = ?', [id]);
}

// ========== ROOM OPERATIONS ==========

export async function getAllRooms() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM rooms ORDER BY floor, room_number');
}

export async function getAvailableRooms() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM rooms WHERE occupied_beds < bed_count ORDER BY floor, room_number');
}

export async function getRoomById(id) {
  const db = await initDatabase();
  const results = await db.select('SELECT * FROM rooms WHERE id = ?', [id]);
  return results[0];
}

export async function createRoom(room) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO rooms (room_number, floor, department, room_type, bed_count, equipment, daily_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [room.roomNumber, room.floor, room.department, room.roomType, room.bedCount, room.equipment, room.dailyRate]
  );
  return result.lastInsertId;
}

export async function updateRoom(id, room) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE rooms 
     SET room_number = ?, floor = ?, department = ?, room_type = ?, bed_count = ?, occupied_beds = ?, status = ?, equipment = ?, daily_rate = ?
     WHERE id = ?`,
    [room.roomNumber, room.floor, room.department, room.roomType, room.bedCount, room.occupiedBeds, room.status, room.equipment, room.dailyRate, id]
  );
}

export async function deleteRoom(id) {
  const db = await initDatabase();
  await db.execute('DELETE FROM rooms WHERE id = ?', [id]);
}

// ========== PRESCRIPTION OPERATIONS ==========

export async function getAllPrescriptions() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM prescriptions ORDER BY prescribed_date DESC');
}

export async function getPrescriptionsByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescribed_date DESC', [patientId]);
}

export async function getActivePrescriptions(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM prescriptions WHERE patient_id = ? AND status = "Active" ORDER BY prescribed_date DESC', [patientId]);
}

export async function createPrescription(prescription) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions, prescribed_date, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [prescription.patientId, prescription.doctorId, prescription.medicationName, prescription.dosage, prescription.frequency, prescription.duration, prescription.instructions, prescription.prescribedDate, prescription.startDate, prescription.endDate, prescription.status || 'Active']
  );
  return result.lastInsertId;
}

export async function updatePrescription(id, prescription) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE prescriptions 
     SET medication_name = ?, dosage = ?, frequency = ?, duration = ?, instructions = ?, end_date = ?, status = ?
     WHERE id = ?`,
    [prescription.medicationName, prescription.dosage, prescription.frequency, prescription.duration, prescription.instructions, prescription.endDate, prescription.status, id]
  );
}

// ========== INVOICE OPERATIONS ==========

export async function getAllInvoices() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM invoices ORDER BY invoice_date DESC');
}

export async function getInvoicesByPatientId(patientId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC', [patientId]);
}

export async function getInvoiceById(id) {
  const db = await initDatabase();
  const results = await db.select('SELECT * FROM invoices WHERE id = ?', [id]);
  return results[0];
}

export async function createInvoice(invoice) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO invoices (patient_id, invoice_number, invoice_date, due_date, subtotal, tax, discount, total, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoice.patientId, invoice.invoiceNumber, invoice.invoiceDate, invoice.dueDate, invoice.subtotal, invoice.tax || 0, invoice.discount || 0, invoice.total, invoice.status || 'Pending', invoice.notes]
  );
  return result.lastInsertId;
}

export async function updateInvoice(id, invoice) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE invoices 
     SET due_date = ?, amount_paid = ?, status = ?, payment_method = ?, notes = ?
     WHERE id = ?`,
    [invoice.dueDate, invoice.amountPaid, invoice.status, invoice.paymentMethod, invoice.notes, id]
  );
}

export async function getInvoiceItems(invoiceId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
}

export async function addInvoiceItem(item) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, item_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.invoiceId, item.description, item.quantity, item.unitPrice, item.total, item.itemType]
  );
  return result.lastInsertId;
}

// ========== PHARMACY OPERATIONS ==========

export async function getAllPharmacyItems() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM pharmacy_inventory ORDER BY medication_name');
}

export async function getLowStockItems() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM pharmacy_inventory WHERE quantity <= reorder_level AND status = "Available"');
}

export async function getExpiringMedications(days = 30) {
  const db = await initDatabase();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return await db.select('SELECT * FROM pharmacy_inventory WHERE expiry_date <= ? AND status = "Available"', [futureDate.toISOString().split('T')[0]]);
}

export async function createPharmacyItem(item) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO pharmacy_inventory (medication_name, generic_name, category, quantity, unit, reorder_level, unit_price, supplier, batch_number, manufacture_date, expiry_date, storage_location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.medicationName, item.genericName, item.category, item.quantity, item.unit, item.reorderLevel, item.unitPrice, item.supplier, item.batchNumber, item.manufactureDate, item.expiryDate, item.storageLocation]
  );
  return result.lastInsertId;
}

export async function updatePharmacyItem(id, item) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE pharmacy_inventory 
     SET quantity = ?, unit_price = ?, supplier = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [item.quantity, item.unitPrice, item.supplier, item.status, id]
  );
}

// ========== EMERGENCY OPERATIONS ==========

export async function getAllEmergencyCases() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM emergency_cases ORDER BY arrival_time DESC');
}

export async function getActiveEmergencyCases() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM emergency_cases WHERE status != "Discharged" AND status != "Admitted" ORDER BY triage_level, arrival_time');
}

export async function createEmergencyCase(emergencyCase) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO emergency_cases (patient_name, age, gender, arrival_time, triage_level, chief_complaint, vital_signs, assigned_to, emergency_contact, ambulance_arrival)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [emergencyCase.patientName, emergencyCase.age, emergencyCase.gender, emergencyCase.arrivalTime, emergencyCase.triageLevel, emergencyCase.chiefComplaint, emergencyCase.vitalSigns, emergencyCase.assignedTo, emergencyCase.emergencyContact, emergencyCase.ambulanceArrival ? 1 : 0]
  );
  return result.lastInsertId;
}

export async function updateEmergencyCase(id, emergencyCase) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE emergency_cases 
     SET status = ?, assigned_to = ?, vital_signs = ?, outcome = ?, discharge_time = ?
     WHERE id = ?`,
    [emergencyCase.status, emergencyCase.assignedTo, emergencyCase.vitalSigns, emergencyCase.outcome, emergencyCase.dischargeTime, id]
  );
}

// ========== SURGERY OPERATIONS ==========

export async function getAllSurgeries() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM surgeries ORDER BY scheduled_date DESC, scheduled_time');
}

export async function getUpcomingSurgeries() {
  const db = await initDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await db.select('SELECT * FROM surgeries WHERE scheduled_date >= ? AND status = "Scheduled" ORDER BY scheduled_date, scheduled_time', [today]);
}

export async function createSurgery(surgery) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO surgeries (patient_id, procedure_name, scheduled_date, scheduled_time, duration, operating_room, surgeon_id, anesthesiologist_id, nurses, pre_op_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [surgery.patientId, surgery.procedureName, surgery.scheduledDate, surgery.scheduledTime, surgery.duration, surgery.operatingRoom, surgery.surgeonId, surgery.anesthesiologistId, surgery.nurses, surgery.preOpNotes]
  );
  return result.lastInsertId;
}

export async function updateSurgery(id, surgery) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE surgeries 
     SET status = ?, post_op_notes = ?, complications = ?, completed_at = ?
     WHERE id = ?`,
    [surgery.status, surgery.postOpNotes, surgery.complications, surgery.completedAt, id]
  );
}

// ========== IMAGING OPERATIONS ==========

export async function getAllImagingTests() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM imaging_tests ORDER BY ordered_date DESC');
}

export async function getPendingImagingTests() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM imaging_tests WHERE status != "Completed" ORDER BY priority DESC, ordered_date');
}

export async function createImagingTest(test) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO imaging_tests (patient_id, test_type, body_part, ordered_by, ordered_date, scheduled_date, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [test.patientId, test.testType, test.bodyPart, test.orderedBy, test.orderedDate, test.scheduledDate, test.priority || 'Routine']
  );
  return result.lastInsertId;
}

export async function updateImagingTest(id, test) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE imaging_tests 
     SET performed_date = ?, radiologist_id = ?, status = ?, findings = ?, impression = ?, images_path = ?, report_url = ?
     WHERE id = ?`,
    [test.performedDate, test.radiologistId, test.status, test.findings, test.impression, test.imagesPath, test.reportUrl, id]
  );
}

// ========== SHIFT OPERATIONS ==========

export async function getAllShifts() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM shifts ORDER BY date DESC, start_time');
}

export async function getShiftsByUserId(userId) {
  const db = await initDatabase();
  return await db.select('SELECT * FROM shifts WHERE user_id = ? ORDER BY date DESC', [userId]);
}

export async function getTodayShifts() {
  const db = await initDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await db.select('SELECT * FROM shifts WHERE date = ? ORDER BY start_time', [today]);
}

export async function createShift(shift) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO shifts (user_id, date, start_time, end_time, shift_type, department, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [shift.userId, shift.date, shift.startTime, shift.endTime, shift.shiftType, shift.department, shift.notes]
  );
  return result.lastInsertId;
}

export async function updateShift(id, shift) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE shifts 
     SET date = ?, start_time = ?, end_time = ?, shift_type = ?, department = ?, status = ?, notes = ?
     WHERE id = ?`,
    [shift.date, shift.startTime, shift.endTime, shift.shiftType, shift.department, shift.status, shift.notes, id]
  );
}

export async function deleteShift(id) {
  const db = await initDatabase();
  await db.execute('DELETE FROM shifts WHERE id = ?', [id]);
}

// ========== NURSE PATIENT ASSIGNMENT OPERATIONS ==========

export async function getAssignedPatients(nurseId, date = null) {
  const db = await initDatabase();
  const today = date || new Date().toISOString().split('T')[0];
  
  // Get patients assigned to this nurse for today or active assignments
  const query = `
    SELECT 
      p.*,
      npa.id as assignment_id,
      npa.assigned_date,
      npa.assignment_start,
      npa.assignment_end,
      npa.notes as assignment_notes,
      npa.status as assignment_status
    FROM nurse_patient_assignments npa
    JOIN patients p ON npa.patient_id = p.id
    WHERE npa.nurse_id = ? 
    AND npa.status = 'Active'
    AND (npa.assigned_date = ? OR npa.assignment_end IS NULL OR npa.assignment_end >= ?)
    ORDER BY p.condition DESC, p.room
  `;
  
  return await db.select(query, [nurseId, today, today]);
}

export async function assignPatientToNurse(assignment) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO nurse_patient_assignments (nurse_id, patient_id, shift_id, assigned_date, assignment_start, assignment_end, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [assignment.nurseId, assignment.patientId, assignment.shiftId, assignment.assignedDate, assignment.assignmentStart, assignment.assignmentEnd, assignment.notes]
  );
  return result.lastInsertId;
}

export async function updatePatientAssignment(id, assignment) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE nurse_patient_assignments 
     SET assignment_end = ?, status = ?, notes = ?
     WHERE id = ?`,
    [assignment.assignmentEnd, assignment.status, assignment.notes, id]
  );
}

export async function getNurseShiftsWithDetails(nurseId, startDate = null, endDate = null) {
  const db = await initDatabase();
  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;
  
  const query = `
    SELECT 
      s.*,
      u.name as nurse_name,
      COUNT(npa.id) as assigned_patients_count
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN nurse_patient_assignments npa ON s.id = npa.shift_id AND npa.status = 'Active'
    WHERE s.user_id = ? 
    AND s.date BETWEEN ? AND ?
    GROUP BY s.id
    ORDER BY s.date DESC, s.start_time
  `;
  
  return await db.select(query, [nurseId, start, end]);
}

export async function getActiveNurseShift(nurseId) {
  const db = await initDatabase();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
  
  const query = `
    SELECT * FROM shifts 
    WHERE user_id = ? 
    AND date = ?
    AND start_time <= ?
    AND end_time >= ?
    AND status = 'Scheduled'
    LIMIT 1
  `;
  
  const results = await db.select(query, [nurseId, today, now, now]);
  return results[0] || null;
}

// ========== OTHER MODULE OPERATIONS ==========

export async function getAllVaccinations(patientId = null) {
  const db = await initDatabase();
  if (patientId) {
    return await db.select('SELECT * FROM vaccinations WHERE patient_id = ? ORDER BY date_administered DESC', [patientId]);
  }
  return await db.select('SELECT * FROM vaccinations ORDER BY date_administered DESC');
}

export async function createVaccination(vaccination) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO vaccinations (patient_id, vaccine_name, dose_number, date_administered, next_due_date, administered_by, batch_number, site, reaction_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [vaccination.patientId, vaccination.vaccineName, vaccination.doseNumber, vaccination.dateAdministered, vaccination.nextDueDate, vaccination.administeredBy, vaccination.batchNumber, vaccination.site, vaccination.reactionNotes]
  );
  return result.lastInsertId;
}

export async function getAllReferrals(patientId = null) {
  const db = await initDatabase();
  if (patientId) {
    return await db.select('SELECT * FROM referrals WHERE patient_id = ? ORDER BY referral_date DESC', [patientId]);
  }
  return await db.select('SELECT * FROM referrals ORDER BY referral_date DESC');
}

export async function createReferral(referral) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO referrals (patient_id, from_doctor_id, to_doctor_name, specialty, reason, urgency, referral_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [referral.patientId, referral.fromDoctorId, referral.toDoctorName, referral.specialty, referral.reason, referral.urgency, referral.referralDate, referral.notes]
  );
  return result.lastInsertId;
}

export async function updateReferral(id, referral) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE referrals 
     SET appointment_date = ?, status = ?, outcome = ?
     WHERE id = ?`,
    [referral.appointmentDate, referral.status, referral.outcome, id]
  );
}

export async function getAllIncidentReports() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM incident_reports ORDER BY incident_date DESC, incident_time DESC');
}

export async function createIncidentReport(report) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO incident_reports (incident_type, severity, location, incident_date, incident_time, description, persons_involved, witness_names, immediate_action, reported_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [report.incidentType, report.severity, report.location, report.incidentDate, report.incidentTime, report.description, report.personsInvolved, report.witnessNames, report.immediateAction, report.reportedBy]
  );
  return result.lastInsertId;
}

export async function updateIncidentReport(id, report) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE incident_reports 
     SET corrective_actions = ?, status = ?, follow_up = ?
     WHERE id = ?`,
    [report.correctiveActions, report.status, report.followUp, id]
  );
}

export async function getBloodInventory() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM blood_inventory WHERE status = "Available" ORDER BY blood_type, expiry_date');
}

export async function createBloodUnit(bloodUnit) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO blood_inventory (blood_type, rh_factor, donation_date, expiry_date, donor_id, volume_ml, tests_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [bloodUnit.bloodType, bloodUnit.rhFactor, bloodUnit.donationDate, bloodUnit.expiryDate, bloodUnit.donorId, bloodUnit.volumeMl, bloodUnit.testsCompleted ? 1 : 0]
  );
  return result.lastInsertId;
}

export async function getAllEquipment() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM medical_equipment ORDER BY department, equipment_name');
}

export async function createEquipment(equipment) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO medical_equipment (equipment_name, equipment_type, serial_number, manufacturer, model, purchase_date, warranty_expiry, location, department, last_maintenance, next_maintenance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [equipment.equipmentName, equipment.equipmentType, equipment.serialNumber, equipment.manufacturer, equipment.model, equipment.purchaseDate, equipment.warrantyExpiry, equipment.location, equipment.department, equipment.lastMaintenance, equipment.nextMaintenance]
  );
  return result.lastInsertId;
}

export async function updateEquipment(id, equipment) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE medical_equipment 
     SET location = ?, status = ?, last_maintenance = ?, next_maintenance = ?, assigned_to = ?, notes = ?
     WHERE id = ?`,
    [equipment.location, equipment.status, equipment.lastMaintenance, equipment.nextMaintenance, equipment.assignedTo, equipment.notes, id]
  );
}

export async function getAllMealOrders(patientId = null) {
  const db = await initDatabase();
  if (patientId) {
    return await db.select('SELECT * FROM meal_orders WHERE patient_id = ? ORDER BY meal_date DESC, meal_type', [patientId]);
  }
  return await db.select('SELECT * FROM meal_orders ORDER BY meal_date DESC');
}

export async function getTodayMealOrders() {
  const db = await initDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await db.select('SELECT * FROM meal_orders WHERE meal_date = ? ORDER BY meal_type', [today]);
}

export async function createMealOrder(order) {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO meal_orders (patient_id, meal_date, meal_type, diet_type, restrictions, allergies, special_instructions)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [order.patientId, order.mealDate, order.mealType, order.dietType, order.restrictions, order.allergies, order.specialInstructions]
  );
  return result.lastInsertId;
}

export async function updateMealOrder(id, order) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE meal_orders 
     SET meal_delivered = ?, delivery_time = ?, status = ?
     WHERE id = ?`,
    [order.mealDelivered ? 1 : 0, order.deliveryTime, order.status, id]
  );
}

// ==================== USER AUTHENTICATION ====================

// Get user by username
export async function getUserByUsername(username) {
  try {
    const result = await db.select(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Get user by email
export async function getUserByEmail(email) {
  try {
    const result = await db.select(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

// Get nurse by license number (cédula profesional)
export async function getUserByLicenseNumber(licenseNumber) {
  try {
    const result = await db.select(
      "SELECT * FROM users WHERE license_number = ? AND role = 'nurse'",
      [licenseNumber]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user by license number:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id) {
  try {
    const result = await db.select(
      'SELECT id, username, role, name, email, phone, department, specialization, license_number, is_active, last_login, created_at FROM users WHERE id = ?',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

// Initialize sample nurse shifts and patient assignments
export async function initializeSampleNurseData() {
  try {
    const db = await initDatabase();
    
    // Check if sample data already exists
    const existingShifts = await db.select('SELECT COUNT(*) as count FROM shifts');
    if (existingShifts[0].count > 0) {
      console.log('Sample shifts already exist');
      return;
    }
    
    // Get nurse user (assuming enfermero user exists with ID from login)
    const nurses = await db.select('SELECT id FROM users WHERE role = "nurse" OR username = "enfermero"');
    if (nurses.length === 0) {
      console.log('No nurse users found');
      return;
    }
    
    const nurseId = nurses[0].id;
    const today = new Date();
    
    // Create shifts for this week
    const shifts = [
      // Yesterday
      {
        userId: nurseId,
        date: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
        startTime: '07:00',
        endTime: '15:00',
        shiftType: 'Mañana',
        department: 'Medicina General',
        status: 'Completed',
        notes: 'Turno completado sin incidentes'
      },
      // Today
      {
        userId: nurseId,
        date: today.toISOString().split('T')[0],
        startTime: '07:00',
        endTime: '15:00',
        shiftType: 'Mañana',
        department: 'Medicina General',
        status: 'Scheduled',
        notes: 'Turno actual'
      },
      // Tomorrow
      {
        userId: nurseId,
        date: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
        startTime: '15:00',
        endTime: '23:00',
        shiftType: 'Tarde',
        department: 'Medicina General',
        status: 'Scheduled',
        notes: null
      },
      // Day after tomorrow
      {
        userId: nurseId,
        date: new Date(today.getTime() + 172800000).toISOString().split('T')[0],
        startTime: '23:00',
        endTime: '07:00',
        shiftType: 'Noche',
        department: 'Medicina General',
        status: 'Scheduled',
        notes: 'Turno nocturno'
      }
    ];
    
    // Insert shifts
    const shiftIds = [];
    for (const shift of shifts) {
      const result = await db.execute(
        `INSERT INTO shifts (user_id, date, start_time, end_time, shift_type, department, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [shift.userId, shift.date, shift.startTime, shift.endTime, shift.shiftType, shift.department, shift.status, shift.notes]
      );
      shiftIds.push(result.lastInsertId);
    }
    
    console.log(`✓ Created ${shifts.length} sample shifts`);
    
    // Get patients for assignments
    const patients = await db.select('SELECT id FROM patients LIMIT 4');
    if (patients.length === 0) {
      console.log('No patients found for assignments');
      return;
    }
    
    // Update patients with triage levels (simulate different urgency levels)
    const triageLevels = [1, 2, 3, 4]; // Mix of urgency levels
    for (let i = 0; i < patients.length && i < triageLevels.length; i++) {
      await db.execute(
        'UPDATE patients SET triage_level = ? WHERE id = ?',
        [triageLevels[i], patients[i].id]
      );
    }
    console.log(`✓ Updated triage levels for ${patients.length} patients`);
    
    // Assign patients to nurse for today's shift (index 1 = today)
    const todayShiftId = shiftIds[1];
    const todayDate = today.toISOString().split('T')[0];
    
    for (const patient of patients) {
      await db.execute(
        `INSERT INTO nurse_patient_assignments (nurse_id, patient_id, shift_id, assigned_date, assignment_start, assignment_end, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nurseId, patient.id, todayShiftId, todayDate, '07:00', '15:00', 'Active', 'Paciente asignado para cuidados generales']
      );
    }
    
    console.log(`✓ Assigned ${patients.length} patients to nurse for today's shift`);
    
    // Add sample treatments with schedules and responsible doctors
    const sampleTreatments = [
      {
        patientId: patients[0].id,
        medication: 'Paracetamol',
        dose: '500mg',
        frequency: 'Cada 8 horas',
        startDate: todayDate,
        appliedBy: 'Enfermero Juan Pérez',
        lastApplication: todayDate + ' 08:00',
        responsibleDoctor: 'Dr. Carlos Ramírez',
        administrationTimes: '08:00,16:00,00:00',
        status: 'Activo',
        notes: 'Para control de fiebre y dolor'
      },
      {
        patientId: patients[0].id,
        medication: 'Omeprazol',
        dose: '20mg',
        frequency: 'Cada 24 horas',
        startDate: todayDate,
        appliedBy: 'Enfermero Juan Pérez',
        lastApplication: todayDate + ' 08:00',
        responsibleDoctor: 'Dr. Carlos Ramírez',
        administrationTimes: '08:00',
        status: 'Activo',
        notes: 'Protector gástrico, tomar en ayunas'
      }
    ];
    
    if (patients.length > 1) {
      sampleTreatments.push({
        patientId: patients[1].id,
        medication: 'Losartán',
        dose: '50mg',
        frequency: 'Cada 12 horas',
        startDate: todayDate,
        appliedBy: 'Enfermero Juan Pérez',
        lastApplication: todayDate + ' 08:00',
        responsibleDoctor: 'Dra. María Torres',
        administrationTimes: '08:00,20:00',
        status: 'Activo',
        notes: 'Para control de presión arterial'
      });
      
      sampleTreatments.push({
        patientId: patients[1].id,
        medication: 'Atorvastatina',
        dose: '10mg',
        frequency: 'Cada 24 horas',
        startDate: todayDate,
        appliedBy: 'Enfermero Juan Pérez',
        lastApplication: todayDate + ' 20:00',
        responsibleDoctor: 'Dra. María Torres',
        administrationTimes: '20:00',
        status: 'Activo',
        notes: 'Para control de colesterol, tomar por la noche'
      });
    }
    
    // Insert treatments
    for (const treatment of sampleTreatments) {
      await db.execute(
        `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, 
         responsible_doctor, administration_times, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          treatment.patientId,
          treatment.medication,
          treatment.dose,
          treatment.frequency,
          treatment.startDate,
          treatment.appliedBy,
          treatment.lastApplication,
          treatment.responsibleDoctor,
          treatment.administrationTimes,
          treatment.status,
          treatment.notes
        ]
      );
    }
    
    console.log(`✓ Created ${sampleTreatments.length} sample treatments with schedules`);
    
  } catch (error) {
    console.error('Error initializing sample nurse data:', error);
  }
}

// Create new user
export async function createUser(userData) {
  try {
    await db.execute(
      'INSERT INTO users (username, password_hash, role, name, email, phone, department, specialization) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userData.username, userData.password_hash, userData.role, userData.name, userData.email || null, userData.phone || null, userData.department || null, userData.specialization || null]
    );
    console.log('User created successfully');
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Get all users (admin only)
export async function getAllUsers() {
  try {
    return await db.select('SELECT id, username, role, name, email, phone, department, specialization, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

// Get users by role
export async function getUsersByRole(role) {
  try {
    return await db.select('SELECT id, username, role, name, email, phone, department, specialization FROM users WHERE role = ? AND is_active = 1', [role]);
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
}

// Update user
export async function updateUser(id, userData) {
  try {
    await db.execute(
      'UPDATE users SET name = ?, email = ?, phone = ?, department = ?, specialization = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userData.name, userData.email || null, userData.phone || null, userData.department || null, userData.specialization || null, id]
    );
    console.log('User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(id, profileData) {
  try {
    await db.execute(
      'UPDATE users SET name = ?, email = ?, phone = ?, bio = ?, profile_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [profileData.name, profileData.email || null, profileData.phone || null, profileData.bio || null, profileData.profilePhoto || null, id]
    );
    console.log('User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Update user password
export async function updateUserPassword(id, newPasswordHash) {
  try {
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, id]
    );
    console.log('User password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

// Update last login
export async function updateLastLogin(id) {
  try {
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE users SET last_login = ? WHERE id = ?',
      [now, id]
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// Deactivate user (soft delete)
export async function deactivateUser(id) {
  try {
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    console.log('User deactivated successfully');
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(id) {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// ========== NURSE ASSIGNMENT OPERATIONS ==========

// Update nurse assignments
export async function updateNurseAssignments(nurseId, assignments, assignedBy = null) {
  try {
    const db = await initDatabase();
    
    // Convertir arrays a JSON strings
    const floorsJson = JSON.stringify(assignments.assignedFloors || []);
    const shiftsJson = JSON.stringify(assignments.assignedShifts || []);
    
    // Actualizar usuario
    await db.execute(
      'UPDATE users SET assigned_floors = ?, assigned_shifts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [floorsJson, shiftsJson, nurseId]
    );
    
    // Obtener nombre del enfermero
    const nurse = await db.select('SELECT name FROM users WHERE id = ?', [nurseId]);
    const nurseName = nurse[0]?.name || 'Desconocido';
    
    // Registrar en historial
    const assignedByName = assignedBy ? 
      (await db.select('SELECT name FROM users WHERE id = ?', [assignedBy]))[0]?.name : null;
    
    await db.execute(
      `INSERT INTO nurse_assignment_history (nurse_id, nurse_name, assigned_floors, assigned_shifts, assigned_by, assigned_by_name, assignment_date, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nurseId,
        nurseName,
        floorsJson,
        shiftsJson,
        assignedBy,
        assignedByName,
        new Date().toISOString(),
        assignments.reason || 'Asignación actualizada'
      ]
    );
    
    console.log('Nurse assignments updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating nurse assignments:', error);
    throw error;
  }
}

// Get nurse assignments
export async function getNurseAssignments(nurseId) {
  try {
    const db = await initDatabase();
    const result = await db.select(
      'SELECT assigned_floors, assigned_shifts FROM users WHERE id = ? AND role = ?',
      [nurseId, 'nurse']
    );
    
    if (result.length === 0) {
      return null;
    }
    
    const assignments = result[0];
    
    return {
      assignedFloors: assignments.assigned_floors ? JSON.parse(assignments.assigned_floors) : [],
      assignedShifts: assignments.assigned_shifts ? JSON.parse(assignments.assigned_shifts) : []
    };
  } catch (error) {
    console.error('Error getting nurse assignments:', error);
    throw error;
  }
}

// Get all nurses with assignments
export async function getAllNursesWithAssignments() {
  try {
    const db = await initDatabase();
    const nurses = await db.select(
      'SELECT id, name, username, email, phone, department, assigned_floors, assigned_shifts, is_active, last_login FROM users WHERE role = ? ORDER BY name',
      ['nurse']
    );
    
    return nurses.map(nurse => ({
      ...nurse,
      assignedFloors: nurse.assigned_floors ? JSON.parse(nurse.assigned_floors) : [],
      assignedShifts: nurse.assigned_shifts ? JSON.parse(nurse.assigned_shifts) : []
    }));
  } catch (error) {
    console.error('Error getting nurses with assignments:', error);
    throw error;
  }
}

// Get assignment history for a nurse
export async function getNurseAssignmentHistory(nurseId, limit = 10) {
  try {
    const db = await initDatabase();
    const history = await db.select(
      'SELECT * FROM nurse_assignment_history WHERE nurse_id = ? ORDER BY assignment_date DESC LIMIT ?',
      [nurseId, limit]
    );
    
    return history.map(record => ({
      ...record,
      assignedFloors: JSON.parse(record.assigned_floors),
      assignedShifts: JSON.parse(record.assigned_shifts)
    }));
  } catch (error) {
    console.error('Error getting assignment history:', error);
    throw error;
  }
}

// Remove nurse assignments
export async function removeNurseAssignments(nurseId, removedBy = null) {
  try {
    const db = await initDatabase();
    
    // Actualizar usuario (vaciar asignaciones)
    await db.execute(
      'UPDATE users SET assigned_floors = NULL, assigned_shifts = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nurseId]
    );
    
    // Registrar en historial
    const nurse = await db.select('SELECT name FROM users WHERE id = ?', [nurseId]);
    const nurseName = nurse[0]?.name || 'Desconocido';
    const removedByName = removedBy ?
      (await db.select('SELECT name FROM users WHERE id = ?', [removedBy]))[0]?.name : null;
    
    await db.execute(
      `INSERT INTO nurse_assignment_history (nurse_id, nurse_name, assigned_floors, assigned_shifts, assigned_by, assigned_by_name, assignment_date, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nurseId,
        nurseName,
        '[]',
        '[]',
        removedBy,
        removedByName,
        new Date().toISOString(),
        'Asignaciones removidas'
      ]
    );
    
    console.log('Nurse assignments removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing nurse assignments:', error);
    throw error;
  }
}

// ============================================
// BEDS (CAMAS) MANAGEMENT FUNCTIONS
// ============================================

/**
 * Initialize hospital beds in database
 * Creates predefined beds for all floors and areas
 */
export async function initializeHospitalBeds() {
  try {
    const db = await initDatabase();
    
    // Check if beds already exist
    const existingBeds = await db.select('SELECT COUNT(*) as count FROM beds');
    if (existingBeds[0].count > 0) {
      console.log('Beds already initialized');
      return;
    }

    // Define hospital structure (same as nurse assignment system)
    const hospitalStructure = [
      { floor: 1, area: 'Urgencias', rooms: ['101', '102', '103', '104', '105', '106', '107', '108'], beds: ['A', 'B'] },
      { floor: 2, area: 'Medicina Interna', rooms: ['201', '202', '203', '204', '205', '210', '215', '220'], beds: ['A', 'B'] },
      { floor: 3, area: 'Cirugía', rooms: ['301', '302', '303', '305', '308', '310', '315'], beds: ['A', 'B', 'C'] },
      { floor: 3, area: 'Cardiología', rooms: ['305', '308', '312', '315'], beds: ['A', 'B', 'C', 'D'] },
      { floor: 4, area: 'Pediatría', rooms: ['401', '402', '403', '404', '405'], beds: ['A', 'B', 'C'] },
      { floor: 4, area: 'Geriatría', rooms: ['405', '410', '415'], beds: ['A', 'B'] },
      { floor: 5, area: 'UCI', rooms: ['501', '502', '503', '504'], beds: ['A'] }
    ];

    let bedsCreated = 0;
    for (const structure of hospitalStructure) {
      for (const room of structure.rooms) {
        for (const bedLabel of structure.beds) {
          const bedNumber = `${structure.floor}${room}-${bedLabel}`;
          await db.execute(
            `INSERT INTO beds (bed_number, floor, area, room, bed_label, status, bed_type, is_active)
             VALUES (?, ?, ?, ?, ?, 'disponible', 'estándar', 1)`,
            [bedNumber, structure.floor, structure.area, room, bedLabel]
          );
          bedsCreated++;
        }
      }
    }

    console.log(`✓ ${bedsCreated} beds initialized successfully`);
    return bedsCreated;
  } catch (error) {
    console.error('Error initializing beds:', error);
    throw error;
  }
}

/**
 * Get all beds with optional filters
 */
export async function getAllBeds(filters = {}) {
  try {
    const db = await initDatabase();
    let query = 'SELECT * FROM beds WHERE is_active = 1';
    const params = [];

    if (filters.floor) {
      query += ' AND floor = ?';
      params.push(filters.floor);
    }

    if (filters.area) {
      query += ' AND area = ?';
      params.push(filters.area);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY floor, area, room, bed_label';

    const beds = await db.select(query, params);
    return beds;
  } catch (error) {
    console.error('Error fetching beds:', error);
    throw error;
  }
}

/**
 * Get available beds count by floor/area
 */
export async function getBedsAvailability() {
  try {
    const db = await initDatabase();
    const availability = await db.select(`
      SELECT 
        floor,
        area,
        COUNT(*) as total_beds,
        SUM(CASE WHEN status = 'disponible' THEN 1 ELSE 0 END) as available_beds,
        SUM(CASE WHEN status = 'ocupada' THEN 1 ELSE 0 END) as occupied_beds,
        SUM(CASE WHEN status = 'mantenimiento' THEN 1 ELSE 0 END) as maintenance_beds,
        SUM(CASE WHEN status = 'limpieza' THEN 1 ELSE 0 END) as cleaning_beds
      FROM beds
      WHERE is_active = 1
      GROUP BY floor, area
      ORDER BY floor, area
    `);
    
    return availability;
  } catch (error) {
    console.error('Error fetching bed availability:', error);
    throw error;
  }
}

/**
 * Assign patient to bed with validation
 * Returns error if bed is already occupied
 */
export async function assignPatientToBed(bedId, patientId, assignedBy, notes = '') {
  try {
    const db = await initDatabase();
    
    // Check if bed exists and is available
    const bed = await db.select('SELECT * FROM beds WHERE id = ?', [bedId]);
    if (bed.length === 0) {
      throw new Error('Cama no encontrada');
    }

    if (bed[0].status !== 'disponible') {
      throw new Error(`No se puede asignar paciente. La cama está ${bed[0].status}.`);
    }

    // Check if patient exists
    const patient = await db.select('SELECT name FROM patients WHERE id = ?', [patientId]);
    if (patient.length === 0) {
      throw new Error('Paciente no encontrado');
    }

    const assignedDate = new Date().toISOString();

    // Update bed status
    await db.execute(
      `UPDATE beds 
       SET status = 'ocupada', 
           patient_id = ?, 
           assigned_date = ?, 
           assigned_by = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [patientId, assignedDate, assignedBy, notes, bedId]
    );

    // Record in history
    await db.execute(
      `INSERT INTO bed_assignment_history 
       (bed_id, patient_id, patient_name, action, previous_status, new_status, assigned_by, assigned_date, notes)
       VALUES (?, ?, ?, 'asignar', 'disponible', 'ocupada', ?, ?, ?)`,
      [bedId, patientId, patient[0].name, assignedBy, assignedDate, notes]
    );

    console.log(`Patient ${patientId} assigned to bed ${bedId} successfully`);
    return {
      success: true,
      bedId,
      bedNumber: bed[0].bed_number,
      patientId,
      patientName: patient[0].name
    };
  } catch (error) {
    console.error('Error assigning patient to bed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Release bed (patient discharge or transfer)
 */
export async function releaseBed(bedId, releasedBy, reason = 'Alta', notes = '') {
  try {
    const db = await initDatabase();
    
    const bed = await db.select('SELECT * FROM beds WHERE id = ?', [bedId]);
    if (bed.length === 0) {
      throw new Error('Cama no encontrada');
    }

    const bedData = bed[0];
    const previousStatus = bedData.status;
    const patientId = bedData.patient_id;
    const releasedDate = new Date().toISOString();

    // Get patient name before releasing
    let patientName = null;
    if (patientId) {
      const patient = await db.select('SELECT name FROM patients WHERE id = ?', [patientId]);
      patientName = patient[0]?.name;
    }

    // Update bed status to "limpieza" (cleaning) after release
    await db.execute(
      `UPDATE beds 
       SET status = 'limpieza', 
           patient_id = NULL, 
           assigned_date = NULL,
           notes = 'Pendiente limpieza',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [bedId]
    );

    // Record in history
    await db.execute(
      `INSERT INTO bed_assignment_history 
       (bed_id, patient_id, patient_name, action, previous_status, new_status, assigned_by, assigned_date, released_date, reason, notes)
       VALUES (?, ?, ?, 'liberar', ?, 'limpieza', ?, ?, ?, ?, ?)`,
      [bedId, patientId, patientName, previousStatus, releasedBy, releasedDate, releasedDate, reason, notes]
    );

    console.log(`Bed ${bedId} released successfully`);
    return { success: true, bedId, bedNumber: bedData.bed_number };
  } catch (error) {
    console.error('Error releasing bed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Change bed status (mantenimiento, limpieza, disponible)
 */
export async function updateBedStatus(bedId, newStatus, updatedBy, notes = '') {
  try {
    const db = await initDatabase();
    
    const validStatuses = ['disponible', 'ocupada', 'mantenimiento', 'limpieza'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Estado de cama inválido');
    }

    const bed = await db.select('SELECT * FROM beds WHERE id = ?', [bedId]);
    if (bed.length === 0) {
      throw new Error('Cama no encontrada');
    }

    const previousStatus = bed[0].status;

    // If changing to occupied, must use assignPatientToBed instead
    if (newStatus === 'ocupada' && !bed[0].patient_id) {
      throw new Error('Use assignPatientToBed para ocupar una cama');
    }

    await db.execute(
      `UPDATE beds 
       SET status = ?, 
           notes = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStatus, notes, bedId]
    );

    // Record in history
    await db.execute(
      `INSERT INTO bed_assignment_history 
       (bed_id, action, previous_status, new_status, assigned_by, assigned_date, notes)
       VALUES (?, 'cambiar_estado', ?, ?, ?, ?, ?)`,
      [bedId, previousStatus, newStatus, updatedBy, new Date().toISOString(), notes]
    );

    console.log(`Bed ${bedId} status updated to ${newStatus}`);
    return { success: true, bedId, previousStatus, newStatus };
  } catch (error) {
    console.error('Error updating bed status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get bed assignment history
 */
export async function getBedHistory(bedId, limit = 20) {
  try {
    const db = await initDatabase();
    const history = await db.select(
      `SELECT * FROM bed_assignment_history 
       WHERE bed_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [bedId, limit]
    );
    return history;
  } catch (error) {
    console.error('Error fetching bed history:', error);
    throw error;
  }
}

/**
 * Get patient's current bed
 */
export async function getPatientBed(patientId) {
  try {
    const db = await initDatabase();
    const bed = await db.select(
      'SELECT * FROM beds WHERE patient_id = ? AND status = "ocupada"',
      [patientId]
    );
    return bed.length > 0 ? bed[0] : null;
  } catch (error) {
    console.error('Error fetching patient bed:', error);
    throw error;
  }
}

// ============================================
// ALLERGY ALERT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Log an allergy alert when medication conflicts with patient allergies
 */
export async function logAllergyAlert(alertData) {
  try {
    const db = await initDatabase();
    
    await db.execute(
      `INSERT INTO allergy_alerts 
       (patient_id, patient_name, medication_attempted, allergies, alert_type, severity, 
        alert_message, attempted_by, attempted_by_role, was_overridden, override_reason, alert_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alertData.patientId,
        alertData.patientName,
        alertData.medication,
        alertData.allergies,
        alertData.alertType || 'direct_match',
        alertData.severity || 'high',
        alertData.message,
        alertData.attemptedBy,
        alertData.attemptedByRole || '',
        alertData.wasOverridden ? 1 : 0,
        alertData.overrideReason || null,
        alertData.alertDate || new Date().toISOString()
      ]
    );
    
    console.log('✓ Allergy alert logged successfully');
    return { success: true };
  } catch (error) {
    console.error('Error logging allergy alert:', error);
    throw error;
  }
}

/**
 * Get all allergy alerts for a patient
 */
export async function getPatientAllergyAlerts(patientId, limit = 50) {
  try {
    const db = await initDatabase();
    const alerts = await db.select(
      `SELECT * FROM allergy_alerts 
       WHERE patient_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [patientId, limit]
    );
    return alerts;
  } catch (error) {
    console.error('Error fetching patient allergy alerts:', error);
    throw error;
  }
}

/**
 * Get all allergy alerts (for admin/audit purposes)
 */
export async function getAllAllergyAlerts(filters = {}) {
  try {
    const db = await initDatabase();
    let query = 'SELECT * FROM allergy_alerts WHERE 1=1';
    const params = [];
    
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    
    if (filters.wasOverridden !== undefined) {
      query += ' AND was_overridden = ?';
      params.push(filters.wasOverridden ? 1 : 0);
    }
    
    if (filters.startDate) {
      query += ' AND alert_date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND alert_date <= ?';
      params.push(filters.endDate);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 100);
    
    const alerts = await db.select(query, params);
    return alerts;
  } catch (error) {
    console.error('Error fetching allergy alerts:', error);
    throw error;
  }
}

/**
 * Get allergy alert statistics
 */
export async function getAllergyAlertStats() {
  try {
    const db = await initDatabase();
    
    const stats = await db.select(`
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as warning_alerts,
        SUM(CASE WHEN was_overridden = 1 THEN 1 ELSE 0 END) as overridden_alerts,
        COUNT(DISTINCT patient_id) as affected_patients
      FROM allergy_alerts
    `);
    
    return stats[0] || {
      total_alerts: 0,
      critical_alerts: 0,
      warning_alerts: 0,
      overridden_alerts: 0,
      affected_patients: 0
    };
  } catch (error) {
    console.error('Error fetching allergy alert stats:', error);
    throw error;
  }
}

/**
 * Update alert when overridden by authorized user
 */
export async function markAlertAsOverridden(alertId, overrideReason, overriddenBy) {
  try {
    const db = await initDatabase();
    
    await db.execute(
      `UPDATE allergy_alerts 
       SET was_overridden = 1, 
           override_reason = ?
       WHERE id = ?`,
      [overrideReason, alertId]
    );
    
    console.log(`✓ Alert ${alertId} marked as overridden by ${overriddenBy}`);
    return { success: true };
  } catch (error) {
    console.error('Error marking alert as overridden:', error);
    throw error;
  }
}

// ========== PATIENT TRANSFER OPERATIONS ==========

// Get all transfers for a patient
export async function getPatientTransfers(patientId) {
  const db = await initDatabase();
  return await db.select(
    'SELECT * FROM patient_transfers WHERE patient_id = ? ORDER BY transfer_date DESC, transfer_time DESC',
    [patientId]
  );
}

// Get all recent transfers
export async function getAllRecentTransfers(limit = 50) {
  const db = await initDatabase();
  return await db.select(
    `SELECT pt.*, p.name as patient_name 
     FROM patient_transfers pt 
     JOIN patients p ON pt.patient_id = p.id 
     ORDER BY pt.transfer_date DESC, pt.transfer_time DESC 
     LIMIT ?`,
    [limit]
  );
}

// Create patient transfer
export async function createPatientTransfer(transfer) {
  const db = await initDatabase();
  
  // Get current patient location
  const patient = await db.select('SELECT floor, area, room, bed FROM patients WHERE id = ?', [transfer.patientId]);
  
  const fromLocation = patient[0] || {};
  
  // Insert transfer record
  const result = await db.execute(
    `INSERT INTO patient_transfers 
     (patient_id, from_floor, from_area, from_room, from_bed, to_floor, to_area, to_room, to_bed, 
      transfer_date, transfer_time, reason, transferred_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transfer.patientId,
      fromLocation.floor || null,
      fromLocation.area || null,
      fromLocation.room || null,
      fromLocation.bed || null,
      transfer.toFloor,
      transfer.toArea,
      transfer.toRoom,
      transfer.toBed,
      transfer.transferDate,
      transfer.transferTime,
      transfer.reason || null,
      transfer.transferredBy,
      transfer.notes || null
    ]
  );
  
  // Update patient location
  await db.execute(
    `UPDATE patients 
     SET floor = ?, area = ?, room = ?, bed = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [transfer.toFloor, transfer.toArea, transfer.toRoom, transfer.toBed, transfer.patientId]
  );
  
  return result.lastInsertId;
}

// Update patient location (without creating transfer record)
export async function updatePatientLocation(patientId, floor, area, room, bed) {
  const db = await initDatabase();
  await db.execute(
    `UPDATE patients 
     SET floor = ?, area = ?, room = ?, bed = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [floor, area, room, bed, patientId]
  );
}

// Password reset token operations
export async function createPasswordResetToken(userId, token, expiresAt) {
  try {
    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
  } catch (error) {
    console.error('Error creating password reset token:', error);
    throw error;
  }
}

export async function getPasswordResetToken(token) {
  try {
    const result = await db.select(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
      [token]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting password reset token:', error);
    throw error;
  }
}

export async function markTokenAsUsed(token) {
  try {
    await db.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
      [token]
    );
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
}
