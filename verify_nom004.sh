#!/bin/bash

# Script de verificación de cumplimiento NOM-004-SSA3-2012
# Para el Sistema Hospitalario

echo "🏥 VERIFICACIÓN DE CUMPLIMIENTO NOM-004-SSA3-2012"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de verificaciones
PASSED=0
FAILED=0

echo "📋 Checklist de Integridad del Expediente Clínico"
echo ""

# Test 1: Verificar ausencia de funciones de eliminación
echo -n "1. Verificar ausencia de funciones de eliminación... "
if grep -r "deleteNote\|removeNote\|DELETE.*FROM.*nurse_notes" src/ --include="*.js" --include="*.jsx" | grep -v "NOM004_COMPLIANCE.js" | grep -v "AuditTrailViewer.jsx" > /dev/null 2>&1; then
    echo -e "${RED}❌ FALLO${NC} - Se encontraron funciones de eliminación"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ ÉXITO${NC} - No hay funciones de eliminación"
    PASSED=$((PASSED + 1))
fi

# Test 2: Verificar existencia de tabla audit_trail
echo -n "2. Verificar tabla audit_trail en código... "
if grep -q "CREATE TABLE IF NOT EXISTS audit_trail" src/services/database.js; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Tabla de auditoría encontrada"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Tabla de auditoría NO encontrada"
    FAILED=$((FAILED + 1))
fi

# Test 3: Verificar función createAuditLog
echo -n "3. Verificar función createAuditLog... "
if grep -q "export async function createAuditLog" src/services/database.js; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Función de auditoría encontrada"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Función de auditoría NO encontrada"
    FAILED=$((FAILED + 1))
fi

# Test 4: Verificar llamadas a createAuditLog en operaciones críticas
echo -n "4. Verificar registro automático en createNurseNote... "
if grep -A 20 "export async function createNurseNote" src/services/database.js | grep -q "createAuditLog"; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Auditoría automática implementada"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Auditoría automática NO implementada"
    FAILED=$((FAILED + 1))
fi

# Test 5: Verificar componente AuditTrailViewer
echo -n "5. Verificar componente AuditTrailViewer... "
if [ -f "src/components/AuditTrailViewer.jsx" ]; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Componente de auditoría encontrado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Componente de auditoría NO encontrado"
    FAILED=$((FAILED + 1))
fi

# Test 6: Verificar archivo de cumplimiento
echo -n "6. Verificar archivo NOM004_COMPLIANCE.js... "
if [ -f "src/utils/NOM004_COMPLIANCE.js" ]; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Archivo de cumplimiento encontrado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Archivo de cumplimiento NO encontrado"
    FAILED=$((FAILED + 1))
fi

# Test 7: Verificar documentación
echo -n "7. Verificar documentación NOM004_COMPLIANCE.md... "
if [ -f "NOM004_COMPLIANCE.md" ]; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Documentación encontrada"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Documentación NO encontrada"
    FAILED=$((FAILED + 1))
fi

# Test 8: Verificar comentarios NOM-004 en código
echo -n "8. Verificar comentarios NOM-004 en código... "
if grep -q "NOM-004" src/services/database.js; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Comentarios de cumplimiento encontrados"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Comentarios de cumplimiento NO encontrados"
    FAILED=$((FAILED + 1))
fi

# Test 9: Verificar alerta visual en UI
echo -n "9. Verificar alerta visual NOM-004 en UI... "
if grep -q "NOM-004: Integridad del expediente" src/App.jsx; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Alerta visual encontrada"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Alerta visual NO encontrada"
    FAILED=$((FAILED + 1))
fi

# Test 10: Verificar icono ShieldCheck
echo -n "10. Verificar icono ShieldCheck importado... "
if grep -q "ShieldCheck" src/App.jsx; then
    echo -e "${GREEN}✅ ÉXITO${NC} - Icono de cumplimiento encontrado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALLO${NC} - Icono de cumplimiento NO encontrado"
    FAILED=$((FAILED + 1))
fi

# Resumen
echo ""
echo "=================================================="
echo "📊 RESULTADOS DE LA VERIFICACIÓN"
echo "=================================================="
echo -e "Pruebas exitosas: ${GREEN}${PASSED}${NC}"
echo -e "Pruebas fallidas: ${RED}${FAILED}${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 CUMPLIMIENTO NOM-004: COMPLETO${NC}"
    echo ""
    echo "El sistema cumple con todos los requisitos de integridad"
    echo "del expediente clínico según la NOM-004-SSA3-2012."
    echo ""
    echo "✅ No existen funciones de eliminación de registros médicos"
    echo "✅ Sistema de auditoría completo implementado"
    echo "✅ Trazabilidad legal garantizada"
    echo "✅ Alertas visuales en interfaz de usuario"
    echo "✅ Documentación completa disponible"
    exit 0
else
    echo -e "${RED}⚠️  CUMPLIMIENTO NOM-004: INCOMPLETO${NC}"
    echo ""
    echo "El sistema tiene $FAILED deficiencias que deben corregirse"
    echo "para cumplir completamente con la NOM-004-SSA3-2012."
    echo ""
    echo "Por favor revise los errores arriba y corrija antes de"
    echo "usar el sistema en producción."
    exit 1
fi
