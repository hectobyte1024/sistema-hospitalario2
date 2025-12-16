-- ============================================================
-- HOSPITAL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Sistema Hospitalario San Rafael
-- Version: 3.0
-- Database: SQLite
-- ============================================================
-- This file documents the complete database schema.
-- The actual database is created programmatically by Tauri
-- at runtime in: ~/.local/share/[app-name]/hospital.db
-- ============================================================

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users table for authentication and staff management
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'nurse', 'doctor', 'patient', etc.
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  profile_photo TEXT,
  bio TEXT,
  department TEXT,
  specialization TEXT,
  license_number TEXT,
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT,
  room TEXT NOT NULL,
  floor TEXT DEFAULT '1',
  area TEXT DEFAULT 'General',
  bed TEXT DEFAULT 'A',
  condition TEXT NOT NULL, -- 'Estable', 'Crítico', 'Recuperación', etc.
  triage_level INTEGER DEFAULT 3, -- 1-5, 1=más urgente
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
  status TEXT DEFAULT 'Active', -- 'Active', 'Discharged', 'Transferred'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Consulta', 'Cirugía', 'Laboratorio', etc.
  status TEXT NOT NULL, -- 'Programada', 'Completada', 'Cancelada'
  doctor TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ============================================================
-- CLINICAL RECORDS
-- ============================================================

-- Treatments/Medications table
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
  administration_times TEXT, -- JSON array of times
  status TEXT DEFAULT 'Activo',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Vital signs monitoring
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
);

-- Nurse notes and observations
CREATE TABLE IF NOT EXISTS nurse_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'evolutiva', -- 'evolutiva', 'incidente', 'observación'
  nurse_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Medical history
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
);

-- ============================================================
-- NURSING PROCEDURES
-- ============================================================

-- Non-pharmacological treatments (curaciones, nebulizaciones, etc.)
CREATE TABLE IF NOT EXISTS non_pharmacological_treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  treatment_type TEXT NOT NULL, -- 'Curación', 'Nebulización', 'Fluidoterapia', etc.
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
);

-- Nursing shift reports
CREATE TABLE IF NOT EXISTS nursing_shift_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_date TEXT NOT NULL,
  shift_type TEXT NOT NULL, -- 'Mañana', 'Tarde', 'Noche'
  nurse_id INTEGER NOT NULL,
  nurse_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  patients_assigned TEXT NOT NULL, -- JSON array of patient IDs
  general_observations TEXT,
  incidents TEXT,
  pending_tasks TEXT,
  handover_notes TEXT, -- Notas de relevo
  supervisor_name TEXT,
  status TEXT DEFAULT 'En Curso',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nurse_id) REFERENCES users(id)
);

-- ============================================================
-- LABORATORY & DIAGNOSTICS
-- ============================================================

-- Laboratory tests
CREATE TABLE IF NOT EXISTS lab_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  test TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL, -- 'Pendiente', 'En Proceso', 'Completado'
  results TEXT,
  ordered_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Imaging/Radiology tests
CREATE TABLE IF NOT EXISTS imaging_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  test_type TEXT NOT NULL, -- 'Rayos X', 'CT Scan', 'MRI', 'Ultrasonido'
  body_part TEXT NOT NULL,
  ordered_by INTEGER NOT NULL,
  ordered_date TEXT NOT NULL,
  scheduled_date TEXT,
  performed_date TEXT,
  radiologist_id INTEGER,
  priority TEXT DEFAULT 'Routine', -- 'STAT', 'Urgent', 'Routine'
  status TEXT DEFAULT 'Ordered',
  findings TEXT,
  impression TEXT,
  images_path TEXT,
  report_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (ordered_by) REFERENCES users(id)
);

-- ============================================================
-- PHARMACY & PRESCRIPTIONS
-- ============================================================

-- Prescriptions
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
);

-- Pharmacy inventory
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL, -- 'comprimidos', 'ml', 'frascos', etc.
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
);

-- ============================================================
-- EMERGENCY DEPARTMENT
-- ============================================================

-- Emergency cases
CREATE TABLE IF NOT EXISTS emergency_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  arrival_time TEXT NOT NULL,
  triage_level INTEGER NOT NULL, -- 1-5, 1=most urgent
  chief_complaint TEXT NOT NULL,
  vital_signs TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'Waiting', -- 'Waiting', 'In Treatment', 'Admitted', 'Discharged'
  emergency_contact TEXT,
  ambulance_arrival INTEGER DEFAULT 0,
  outcome TEXT,
  discharge_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SURGICAL SERVICES
-- ============================================================

-- Surgery scheduling
CREATE TABLE IF NOT EXISTS surgeries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  procedure_name TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  operating_room TEXT NOT NULL,
  surgeon_id INTEGER NOT NULL,
  anesthesiologist_id INTEGER,
  nurses TEXT, -- JSON array
  status TEXT DEFAULT 'Scheduled',
  pre_op_notes TEXT,
  post_op_notes TEXT,
  complications TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (surgeon_id) REFERENCES users(id)
);

-- ============================================================
-- FACILITY MANAGEMENT
-- ============================================================

-- Rooms management
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  department TEXT NOT NULL,
  room_type TEXT NOT NULL, -- 'Individual', 'Compartida', 'UCI', 'Quirófano'
  bed_count INTEGER NOT NULL,
  occupied_beds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Available', -- 'Available', 'Occupied', 'Maintenance', 'Reserved'
  equipment TEXT, -- JSON array
  daily_rate REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Patient transfers between rooms
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
);

-- ============================================================
-- BILLING & FINANCE
-- ============================================================

-- Invoices/Billing
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
  status TEXT DEFAULT 'Pending', -- 'Pending', 'Partial', 'Paid', 'Overdue'
  payment_method TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  item_type TEXT NOT NULL, -- 'consultation', 'procedure', 'medication', 'room', etc.
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- ============================================================
-- STAFF MANAGEMENT
-- ============================================================

-- Staff shifts
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shift_type TEXT NOT NULL, -- 'Mañana', 'Tarde', 'Noche'
  department TEXT NOT NULL,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- NOTIFICATIONS & COMMUNICATIONS
-- ============================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- PREVENTIVE CARE
-- ============================================================

-- Vaccinations
CREATE TABLE IF NOT EXISTS vaccinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER NOT NULL,
  date_administered TEXT NOT NULL,
  next_due_date TEXT,
  administered_by INTEGER NOT NULL,
  batch_number TEXT,
  site TEXT, -- 'Brazo izquierdo', 'Muslo derecho', etc.
  reaction_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (administered_by) REFERENCES users(id)
);

-- ============================================================
-- SECURITY & AUDIT
-- ============================================================

-- Audit logs for compliance and security
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Patient indexes
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_room ON patients(room);
CREATE INDEX IF NOT EXISTS idx_patients_condition ON patients(condition);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Treatment indexes
CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);

-- Vital signs indexes
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_date ON vital_signs(date);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- DEFAULT DATA (Demo Users)
-- ============================================================

-- Demo users are created programmatically via createDefaultUsers() function:
-- 1. admin / admin123 (role: admin)
-- 2. enfermero / enfermeros123 (role: nurse) 
-- 3. paciente / paciente123 (role: patient)

-- ============================================================
-- DATABASE LOCATION
-- ============================================================
-- The SQLite database file is created at runtime by Tauri in:
-- Linux: ~/.local/share/[app-identifier]/hospital.db
-- Windows: %APPDATA%/[app-identifier]/hospital.db  
-- macOS: ~/Library/Application Support/[app-identifier]/hospital.db
-- ============================================================
