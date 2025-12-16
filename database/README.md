# Database Documentation

## Overview

This hospital management system uses **SQLite** as its database engine, integrated through Tauri's SQL plugin (`@tauri-apps/plugin-sql`).

## Database Location

The SQLite database file (`hospital.db`) is **automatically created at runtime** by Tauri in the application's data directory:

- **Linux**: `~/.local/share/com.hospital.system/hospital.db`
- **Windows**: `%APPDATA%\com.hospital.system\hospital.db`
- **macOS**: `~/Library/Application Support/com.hospital.system/hospital.db`

## Schema Management

### Programmatic Schema Creation

The database schema is created and managed programmatically through the application code:

- **Schema Definition**: `src/services/database.js` - `createTables()` function
- **Schema Documentation**: `database/schema.sql` - This file documents the schema but is NOT executed

### Why No SQL File Execution?

This project uses a **code-first** approach:

1. ✅ Tables are created dynamically via JavaScript/TypeScript
2. ✅ Allows for easy migration and version control
3. ✅ Works seamlessly with Tauri's security model
4. ✅ No need for SQL file parsing or execution

The `schema.sql` file exists purely for **documentation purposes** so developers can:
- Understand the database structure at a glance
- Reference table definitions without reading code
- Use it as a reference for database queries

## Database Initialization

The database is initialized when the application starts:

```javascript
// src/main.jsx and src/hooks/useDatabase.js
initializeApp()
  ├─ initDatabase()           // Creates connection
  ├─ createTables()          // Creates all tables
  ├─ createDefaultUsers()    // Creates demo users
  └─ seedInitialData()       // Optionally seeds sample data
```

## Default Users

The system automatically creates three demo users on first run:

| Username   | Password       | Role    | Purpose                    |
|-----------|----------------|---------|----------------------------|
| enfermero | enfermeros123  | nurse   | Nurse dashboard access     |
| admin     | admin123       | admin   | Administrative access      |
| paciente  | paciente123    | patient | Patient portal access      |

## Database Tables

### Core Tables
- `users` - System users (staff, doctors, nurses, patients)
- `patients` - Patient records
- `appointments` - Appointment scheduling

### Clinical Records
- `treatments` - Medication and treatment plans
- `vital_signs` - Patient vital signs monitoring
- `nurse_notes` - Nursing observations and notes
- `medical_history` - Patient medical history

### Nursing Procedures
- `non_pharmacological_treatments` - Non-drug treatments
- `nursing_shift_reports` - Shift handover reports

### Laboratory & Diagnostics
- `lab_tests` - Laboratory test orders and results
- `imaging_tests` - Radiology and imaging tests

### Pharmacy
- `prescriptions` - Doctor prescriptions
- `pharmacy_inventory` - Medication inventory

### Emergency Services
- `emergency_cases` - Emergency department cases

### Surgical Services
- `surgeries` - Surgery scheduling and records

### Facility Management
- `rooms` - Hospital room management
- `patient_transfers` - Room/floor transfers

### Billing
- `invoices` - Patient billing
- `invoice_items` - Itemized billing details

### Staff Management
- `shifts` - Staff shift scheduling

### System
- `notifications` - User notifications
- `audit_logs` - Security and compliance auditing
- `password_reset_tokens` - Password reset functionality
- `vaccinations` - Immunization records

## Accessing the Database

### From Within the App
```javascript
import Database from '@tauri-apps/plugin-sql';

const db = await Database.load('sqlite:hospital.db');
const results = await db.select('SELECT * FROM patients WHERE status = ?', ['Active']);
```

### Using SQLite CLI
You can directly query the database file:

```bash
# Find the database
find ~/.local/share -name "hospital.db" 2>/dev/null

# Open with sqlite3
sqlite3 ~/.local/share/com.hospital.system/hospital.db

# Run queries
sqlite> .tables
sqlite> SELECT * FROM users;
sqlite> .exit
```

### Using DB Browser for SQLite
1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open the `hospital.db` file from the app data directory
3. Browse tables, run queries, and view data

## Database Migrations

Currently, the system uses a simple approach:
- Schema changes are made in `src/services/database.js`
- `IF NOT EXISTS` clauses prevent errors on existing tables
- For production, implement proper migration system

### Future: Migration System
Consider implementing:
- Version tracking table
- Migration files with up/down functions
- Automated migration runner

## Performance Optimizations

Indexes are automatically created for commonly queried fields:
- User lookups by username/email
- Patient searches by name/room/condition
- Appointments by date/patient
- Treatments by patient/status
- Vital signs by patient/date

See `schema.sql` for full index list.

## Backup Strategy

### Manual Backup
```bash
# Backup database file
cp ~/.local/share/com.hospital.system/hospital.db ~/backup/hospital-$(date +%Y%m%d).db
```

### Automated Backup (Recommended)
Implement in the application:
```javascript
// Periodic database backup
setInterval(async () => {
  // Copy database file to backup location
  await backupDatabase();
}, 24 * 60 * 60 * 1000); // Daily
```

## Security Considerations

✅ **Password Security**: User passwords are hashed using SHA-256
✅ **SQL Injection Protection**: Parameterized queries throughout
✅ **Audit Logging**: All critical operations are logged
✅ **Access Control**: Role-based permissions enforced

⚠️ **For Production**:
- Use stronger password hashing (bcrypt, Argon2)
- Implement database encryption at rest
- Regular automated backups
- Add database connection pooling
- Implement proper migration system

## Troubleshooting

### Database Not Found
- The database is created on first run
- Check application logs for initialization errors
- Verify Tauri permissions in `tauri.conf.json`

### Permission Errors
```bash
# Linux: Check file permissions
ls -la ~/.local/share/com.hospital.system/
chmod 600 ~/.local/share/com.hospital.system/hospital.db
```

### Reset Database
```bash
# Delete database file to reset
rm ~/.local/share/com.hospital.system/hospital.db
# Restart application - it will recreate
```

### Check Database Integrity
```bash
sqlite3 ~/.local/share/com.hospital.system/hospital.db
sqlite> PRAGMA integrity_check;
sqlite> PRAGMA quick_check;
```

## Development Tips

### View SQL Execution
Enable SQL logging in development:
```javascript
// Add to database.js
console.log('Executing SQL:', query, params);
```

### Database Inspector
Use Chrome DevTools or similar to inspect:
```javascript
// Expose database in dev mode
if (import.meta.env.DEV) {
  window.__db__ = db;
}
```

### Query Performance
```javascript
// Use EXPLAIN QUERY PLAN to analyze queries
const plan = await db.select('EXPLAIN QUERY PLAN SELECT * FROM patients WHERE name LIKE ?', ['%John%']);
console.log('Query plan:', plan);
```

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Tauri SQL Plugin](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/sql)
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Best Practices](https://www.sqlite.org/whentouse.html)
