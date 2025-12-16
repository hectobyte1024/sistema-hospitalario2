#!/bin/bash

# Script para resetear la base de datos del sistema hospitalario

echo "🏥 Sistema Hospitalario - Reset de Base de Datos"
echo "================================================="
echo ""

# Directorio de la base de datos
DB_DIR="$HOME/.local/share/hospital-system"
DB_FILE="$DB_DIR/hospital.db"

# Crear directorio si no existe
echo "📁 Verificando directorio de base de datos..."
mkdir -p "$DB_DIR"

# Eliminar base de datos existente
if [ -f "$DB_FILE" ]; then
    echo "🗑️  Eliminando base de datos existente..."
    rm "$DB_FILE"
    echo "   ✓ Base de datos eliminada"
else
    echo "   ℹ️  No se encontró base de datos existente"
fi

echo ""
echo "✅ Base de datos lista para reinicializar"
echo ""
echo "🚀 Ahora ejecuta: npm run dev"
echo "   El sistema creará automáticamente una nueva base de datos"
echo ""
echo "👤 Credenciales predeterminadas:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Admin:      usuario: admin     contraseña: Admin123"
echo "   Enfermero:  usuario: enfermero contraseña: Enfermero123"
echo "   Paciente:   usuario: paciente  contraseña: Paciente123"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
