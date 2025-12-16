#!/bin/bash

# Hospital Management System - Database Helper Script
# This script helps you find and interact with the SQLite database

echo "🏥 Hospital Management System - Database Helper"
echo "================================================"
echo ""

# Find the database file
echo "🔍 Searching for hospital.db..."
DB_PATH=$(find ~/.local/share -name "hospital.db" 2>/dev/null | head -1)

if [ -z "$DB_PATH" ]; then
    echo "❌ Database file not found!"
    echo ""
    echo "The database is created when the application runs for the first time."
    echo "Please make sure:"
    echo "  1. The application has been started at least once"
    echo "  2. You have logged in or initialized the database"
    echo ""
    echo "Expected location: ~/.local/share/com.hospital.system/hospital.db"
    exit 1
fi

echo "✅ Database found at: $DB_PATH"
echo ""

# Show file size
SIZE=$(du -h "$DB_PATH" | cut -f1)
echo "📊 Database size: $SIZE"
echo ""

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo "⚠️  sqlite3 command not found. Install it with:"
    echo "   sudo apt install sqlite3  (Debian/Ubuntu)"
    echo "   sudo dnf install sqlite   (Fedora)"
    echo "   sudo pacman -S sqlite     (Arch)"
    exit 1
fi

# Show menu
while true; do
    echo "========================================"
    echo "What would you like to do?"
    echo "========================================"
    echo "1. List all tables"
    echo "2. Count records in each table"
    echo "3. View all users"
    echo "4. View all patients"
    echo "5. Check database integrity"
    echo "6. Open SQLite interactive shell"
    echo "7. Backup database"
    echo "8. Export schema to SQL file"
    echo "9. Exit"
    echo ""
    read -p "Enter your choice (1-9): " choice

    case $choice in
        1)
            echo ""
            echo "📋 Tables in database:"
            sqlite3 "$DB_PATH" ".tables"
            echo ""
            ;;
        2)
            echo ""
            echo "📊 Record counts:"
            sqlite3 "$DB_PATH" "SELECT 'users' as table_name, COUNT(*) as count FROM users
                UNION ALL SELECT 'patients', COUNT(*) FROM patients
                UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
                UNION ALL SELECT 'treatments', COUNT(*) FROM treatments
                UNION ALL SELECT 'vital_signs', COUNT(*) FROM vital_signs
                UNION ALL SELECT 'nurse_notes', COUNT(*) FROM nurse_notes;" | column -t -s '|'
            echo ""
            ;;
        3)
            echo ""
            echo "👥 Users in system:"
            sqlite3 "$DB_PATH" -header -column "SELECT id, username, role, name, email, is_active FROM users;"
            echo ""
            ;;
        4)
            echo ""
            echo "🏥 Patients:"
            sqlite3 "$DB_PATH" -header -column "SELECT id, name, age, room, condition, status FROM patients LIMIT 10;"
            echo ""
            ;;
        5)
            echo ""
            echo "🔍 Checking database integrity..."
            sqlite3 "$DB_PATH" "PRAGMA integrity_check;"
            echo ""
            ;;
        6)
            echo ""
            echo "🖥️  Opening SQLite shell..."
            echo "Tip: Type .tables to see tables, .quit to exit"
            echo ""
            sqlite3 "$DB_PATH"
            ;;
        7)
            BACKUP_FILE="$HOME/hospital-backup-$(date +%Y%m%d-%H%M%S).db"
            cp "$DB_PATH" "$BACKUP_FILE"
            echo ""
            echo "✅ Database backed up to: $BACKUP_FILE"
            echo ""
            ;;
        8)
            SCHEMA_FILE="$HOME/hospital-schema-$(date +%Y%m%d).sql"
            sqlite3 "$DB_PATH" ".schema" > "$SCHEMA_FILE"
            echo ""
            echo "✅ Schema exported to: $SCHEMA_FILE"
            echo ""
            ;;
        9)
            echo ""
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo ""
            echo "❌ Invalid choice. Please enter 1-9."
            echo ""
            ;;
    esac
done
