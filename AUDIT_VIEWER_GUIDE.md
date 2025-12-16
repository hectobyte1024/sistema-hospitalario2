# Guía de Uso - Componente AuditTrailViewer

## 🔍 Cómo usar el componente de auditoría en el sistema

El componente `AuditTrailViewer` te permite visualizar el registro completo de auditoría según la NOM-004-SSA3-2012.

---

## 📦 Importación

```jsx
import AuditTrailViewer from './components/AuditTrailViewer';
```

---

## 🎯 Casos de Uso

### 1. Ver auditoría de un paciente específico

Muestra todas las acciones relacionadas con un paciente:

```jsx
<AuditTrailViewer patientId={123} />
```

**Resultado:** Lista todas las notas, signos vitales, tratamientos, etc. del paciente 123.

---

### 2. Ver toda la auditoría del sistema

Sin props, muestra todas las acciones de todos los pacientes:

```jsx
<AuditTrailViewer />
```

**Resultado:** Registro completo del sistema con filtros por fecha.

---

### 3. Filtrar por tipo de entidad

Solo mostrar auditoría de notas de enfermería:

```jsx
<AuditTrailViewer entityType="nurse_note" />
```

**Tipos disponibles:**
- `nurse_note` - Notas de enfermería
- `vital_signs` - Signos vitales
- `treatment` - Tratamientos farmacológicos
- `medication` - Medicaciones
- Cualquier otro entity_type registrado

---

## 🏗️ Integración en App.jsx

### Opción A: Agregar tab de Auditoría en NurseDashboard

```jsx
// En App.jsx, dentro de NurseDashboard

const [activeTab, setActiveTab] = useState('overview');

const tabs = [
  { id: 'overview', label: 'Panel General', icon: LayoutDashboard },
  { id: 'patients', label: 'Lista de Pacientes', icon: Users },
  { id: 'care', label: 'Zona de Cuidados', icon: Heart },
  { id: 'shifts', label: 'Mi Turno', icon: Calendar },
  { id: 'nursing-sheet', label: 'Hoja de Enfermería', icon: ClipboardList },
  { id: 'audit', label: 'Registro de Auditoría', icon: ShieldCheck }  // ⬅️ NUEVO
];

// Más abajo en el render:

{activeTab === 'audit' && (
  <div className="space-y-6">
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <ShieldCheck className="text-indigo-600" />
        Registro de Auditoría (NOM-004)
      </h2>
      <AuditTrailViewer />
    </div>
  </div>
)}
```

---

### Opción B: Modal de auditoría para un paciente

```jsx
// Estado para controlar el modal
const [showAudit, setShowAudit] = useState(false);
const [auditPatientId, setAuditPatientId] = useState(null);

// Botón en la card del paciente
<button
  onClick={() => {
    setAuditPatientId(patient.id);
    setShowAudit(true);
  }}
  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  <ShieldCheck size={16} /> Ver Auditoría
</button>

// Modal
{showAudit && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-xl font-bold">Registro de Auditoría NOM-004</h3>
        <button
          onClick={() => setShowAudit(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
        <AuditTrailViewer patientId={auditPatientId} />
      </div>
    </div>
  </div>
)}
```

---

### Opción C: Sección dentro de Zona de Cuidados

```jsx
{activeTab === 'care' && selectedPatientId && (
  <div className="space-y-6">
    {/* ...otras secciones del paciente... */}
    
    {/* Nueva sección de Auditoría */}
    <div className="bg-white rounded-2xl shadow-card border-2 border-indigo-100 overflow-hidden">
      <div className="p-6 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" /> 
          Registro de Auditoría del Paciente (NOM-004)
        </h3>
      </div>
      <div className="p-6">
        <AuditTrailViewer patientId={parseInt(selectedPatientId)} />
      </div>
    </div>
  </div>
)}
```

---

## 🎨 Características del Componente

### Filtros Automáticos
- **Todos**: Muestra todo el historial
- **Hoy**: Solo acciones de hoy
- **Última Semana**: Últimos 7 días

### Íconos por Tipo de Acción
- 📄 `CREATE` - Verde (nueva entrada)
- 🔄 `UPDATE` - Azul (modificación)
- 🚫 `DELETE` - Rojo (eliminación - NO permitida)
- 👁️ `VIEW` - Gris (visualización)

### Información Mostrada
- Usuario que realizó la acción
- Timestamp preciso
- Descripción de la acción
- Tipo de entidad y ID
- Dirección IP
- Detalles técnicos (JSON expandible)

---

## 🔐 Seguridad y Privacidad

### Control de Acceso (Recomendado)

```jsx
// Solo mostrar auditoría a usuarios con rol de admin o supervisor
{currentUser.role === 'admin' || currentUser.role === 'supervisor' ? (
  <AuditTrailViewer />
) : (
  <div className="text-center py-8 text-gray-500">
    <ShieldCheck size={48} className="mx-auto mb-3 text-gray-400" />
    <p>No tienes permisos para ver el registro de auditoría</p>
  </div>
)}
```

---

## 📋 Ejemplo Completo Integrado

```jsx
import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import AuditTrailViewer from './components/AuditTrailViewer';

function App() {
  const [showAudit, setShowAudit] = useState(false);
  const [currentUser] = useState({ role: 'admin', name: 'Dr. García' });

  return (
    <div>
      {/* Botón para abrir auditoría */}
      {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
        <button
          onClick={() => setShowAudit(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 z-40"
        >
          <ShieldCheck size={24} />
        </button>
      )}

      {/* Modal de auditoría */}
      {showAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden m-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck size={24} />
                Registro de Auditoría NOM-004
              </h3>
              <button
                onClick={() => setShowAudit(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <AuditTrailViewer />
            </div>
          </div>
        </div>
      )}

      {/* Resto de la aplicación... */}
    </div>
  );
}

export default App;
```

---

## 🧪 Testing

### Verificar que se registra auditoría

```javascript
// Después de crear una nota de enfermería
import { getAuditTrailByPatient } from './services/database';

const auditLogs = await getAuditTrailByPatient(123);
console.log('Auditoría del paciente 123:', auditLogs);
```

### Verificar integridad NOM-004

```bash
# Ejecutar script de verificación
./verify_nom004.sh
```

---

## 📖 Referencias

- [NOM004_COMPLIANCE.md](../NOM004_COMPLIANCE.md) - Documentación completa
- [NOM004_COMPLIANCE.js](../src/utils/NOM004_COMPLIANCE.js) - Funciones de protección
- [database.js](../src/services/database.js) - Funciones de auditoría

---

## ⚡ Tips de Rendimiento

Para grandes volúmenes de datos:

```jsx
// Agregar paginación
<AuditTrailViewer patientId={123} pageSize={50} />

// O limitar a últimos N días
<AuditTrailViewer patientId={123} maxDays={30} />
```

**Nota:** La implementación actual carga todos los registros. Para sistemas con miles de registros, considera implementar paginación en el backend.

---

✅ **El sistema está listo para cumplir con la NOM-004-SSA3-2012**
