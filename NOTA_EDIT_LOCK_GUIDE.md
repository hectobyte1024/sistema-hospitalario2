# Sistema de Bloqueo de Edición por Tiempo para Notas de Enfermería

## 📋 Descripción General

Sistema de control temporal para la edición de notas de enfermería que cumple con NOM-004 para garantizar la integridad del expediente clínico. Las notas solo pueden ser editadas dentro de las primeras **24 horas** desde su creación.

---

## 🎯 Características Principales

### 1. **Ventana de Edición de 24 Horas**
- Las notas son **editables solo durante las primeras 24 horas** desde su creación
- Después de 24 horas, las notas quedan **bloqueadas permanentemente**
- El sistema calcula el tiempo restante en tiempo real

### 2. **Indicadores Visuales de Urgencia**

| Color | Estado | Tiempo Restante | Comportamiento |
|-------|--------|----------------|----------------|
| 🟢 **Verde** | Editable | > 12 horas | Sin urgencia |
| 🟡 **Amarillo** | Editable - Vence pronto | 2-12 horas | Advertencia moderada |
| 🟠 **Naranja** | Editable - URGENTE | < 2 horas | Alerta con animación pulsante |
| 🔴 **Rojo** | 🔒 Bloqueada | Expirado | Sin posibilidad de edición |

### 3. **Auditoría Completa (NOM-004)**
- **Nota original preservada**: Se guarda el contenido original antes de cualquier edición
- **Historial de cambios**: Registro completo de cada edición con:
  - Contenido anterior y nuevo
  - Editor y su rol
  - Fecha y hora exacta
  - Edad de la nota al momento de edición
  - Razón de la edición (opcional)
- **Registro de intentos bloqueados**: Se auditan incluso los intentos de edición fuera del período permitido

### 4. **Interfaz de Edición Intuitiva**
- **Modal de edición** con:
  - Contador de tiempo restante en formato legible
  - Visualización del paciente asociado
  - Nota original (si fue editada previamente)
  - Campo de razón de edición
  - Validación antes de guardar
- **Modal de historial** con:
  - Línea de tiempo de todas las ediciones
  - Comparación lado a lado (anterior vs nuevo)
  - Información del editor
  - Razones de edición

---

## 🗄️ Estructura de Base de Datos

### Tabla: `nurse_notes` (Modificada)

```sql
CREATE TABLE nurse_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER,
  date TEXT,
  note TEXT,                        -- Contenido actual
  original_note TEXT,               -- ✨ Contenido original preservado
  note_type TEXT,
  nurse_name TEXT,
  was_edited INTEGER DEFAULT 0,    -- ✨ Flag de edición
  edit_count INTEGER DEFAULT 0,    -- ✨ Contador de ediciones
  last_edit_date TEXT,             -- ✨ Timestamp última edición
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

### Tabla: `note_edit_history` (Nueva)

```sql
CREATE TABLE note_edit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER,
  patient_id INTEGER,
  previous_content TEXT,            -- Contenido antes de editar
  new_content TEXT,                 -- Contenido después de editar
  edited_by TEXT,                   -- Nombre del editor
  edited_by_role TEXT,              -- Rol del editor
  edit_date TEXT,                   -- Fecha de edición
  note_age_hours REAL,              -- Edad de la nota al editar
  edit_reason TEXT,                 -- Razón de la edición
  was_within_window INTEGER,        -- 1 si estaba dentro de 24h
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES nurse_notes(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

### Tabla: `note_edit_attempts` (Nueva)

```sql
CREATE TABLE note_edit_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER,
  patient_id INTEGER,
  attempted_by TEXT,                -- Quien intentó editar
  attempted_by_role TEXT,           -- Rol del usuario
  attempt_date TEXT,                -- Fecha del intento
  note_age_hours REAL,              -- Edad de la nota al intentar
  was_allowed INTEGER,              -- 1 si se permitió, 0 si se bloqueó
  denial_reason TEXT,               -- Razón del bloqueo
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES nurse_notes(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

---

## 🔧 Funciones de la API

### `editNurseNote(noteId, newContent, editedBy, editedByRole, editReason)`

Edita una nota de enfermería con validación temporal.

**Parámetros:**
- `noteId` (number): ID de la nota a editar
- `newContent` (string): Nuevo contenido de la nota
- `editedBy` (string): Nombre del usuario editor
- `editedByRole` (string): Rol del usuario (enfermera, médico, admin)
- `editReason` (string, opcional): Razón de la edición

**Retorna:**
```javascript
{
  success: true,
  noteId: 123,
  editCount: 2,
  ageHours: 5.3
}

// O en caso de error:
{
  success: false,
  error: "La nota no puede ser editada después de 24 horas de su creación (NOM-004)",
  ageHours: 28.5
}
```

**Validaciones:**
1. ✅ Verifica que la nota exista
2. ✅ Calcula edad de la nota
3. ✅ Valida que esté dentro de las 24 horas
4. ✅ Preserva contenido original en primera edición
5. ✅ Registra en historial de ediciones
6. ✅ Registra intento en tabla de auditoría
7. ✅ Crea entrada en log de auditoría NOM-004

**Ejemplo de uso:**
```javascript
const result = await editNurseNote(
  456,                           // noteId
  "Paciente presenta mejoría...", // newContent
  "Enf. María González",         // editedBy
  "enfermera",                   // editedByRole
  "Corrección de signos vitales" // editReason
);

if (result.success) {
  console.log(`Nota editada exitosamente (${result.editCount} ediciones)`);
} else {
  console.error(result.error);
}
```

---

### `getNoteEditHistory(noteId)`

Obtiene el historial completo de ediciones de una nota.

**Parámetros:**
- `noteId` (number): ID de la nota

**Retorna:**
```javascript
[
  {
    id: 1,
    note_id: 456,
    patient_id: 123,
    previous_content: "Paciente estable...",
    new_content: "Paciente presenta mejoría...",
    edited_by: "Enf. María González",
    edited_by_role: "enfermera",
    edit_date: "2024-01-15T14:30:00.000Z",
    note_age_hours: 5.3,
    edit_reason: "Corrección de signos vitales",
    was_within_window: 1,
    created_at: "2024-01-15T14:30:00.000Z"
  },
  // ... más ediciones
]
```

---

### `getAllNoteEditAttempts(filters)`

Obtiene todos los intentos de edición (permitidos y bloqueados) para auditoría.

**Parámetros:**
- `filters` (object, opcional):
  - `wasAllowed` (boolean): Filtrar por permitidos/bloqueados
  - `startDate` (string): Fecha inicial ISO
  - `limit` (number): Máximo de resultados (default: 100)

**Ejemplo:**
```javascript
// Ver intentos bloqueados en los últimos 7 días
const blocked = await getAllNoteEditAttempts({
  wasAllowed: false,
  startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
  limit: 50
});
```

---

### `getNoteEditStats()`

Obtiene estadísticas de ediciones para reportes.

**Retorna:**
```javascript
{
  total_notes: 1250,          // Total de notas en el sistema
  edited_notes: 89,           // Notas que han sido editadas
  blocked_attempts: 15,       // Intentos bloqueados (fuera de 24h)
  total_edits: 112            // Total de ediciones realizadas
}
```

---

## 🎨 Componentes UI

### 1. **Vista de Lista de Notas**

Cada nota en la lista muestra:
- 🟢/🟡/🟠/🔴 Badge de estado de editabilidad
- ⏱️ Tiempo restante si es editable
- ✏️ Badge de "Editada" si fue modificada
- 🔒 Icono de candado si está bloqueada
- Botones de acción:
  - **"Editar nota"** (solo si editable)
  - **"Ver historial"** (si fue editada)

```jsx
<div className="note-item bg-green-50 border-green-300">
  <span className="badge bg-green-100 text-green-700">
    ✏️ Editable
  </span>
  <span className="time-remaining">
    ⏱️ 18h 42m
  </span>
  <button onClick={handleEdit}>Editar nota</button>
</div>
```

### 2. **Modal de Edición**

Características:
- **Header dinámico** con color según urgencia
- **Contador en tiempo real** con formato legible
- **Nota original** si fue editada previamente
- **Textarea** para nuevo contenido
- **Campo de razón** (opcional)
- **Botones**: Cancelar / Guardar Cambios

**Animaciones:**
- Pulse animation cuando quedan <2 horas
- Transiciones suaves en todos los elementos

### 3. **Modal de Historial**

Características:
- **Timeline visual** de todas las ediciones
- **Comparación lado a lado**:
  - Izquierda (rojo): Contenido anterior
  - Derecha (verde): Contenido nuevo
- **Información del editor** con timestamp
- **Razón de edición** destacada
- **Edad de la nota** al momento de edición

---

## 📊 Flujo de Trabajo

### Escenario 1: Edición Exitosa (Dentro de 24h)

```
1. Usuario crea nota a las 09:00
   └─> Sistema registra fecha de creación
   
2. Usuario ve nota en lista (11:00 - 2h después)
   └─> Badge VERDE: "✏️ Editable"
   └─> Tiempo restante: "22h 0m"
   
3. Usuario hace clic en "Editar nota"
   └─> Modal se abre con contador en tiempo real
   └─> Usuario modifica contenido
   └─> Usuario agrega razón: "Agregar signos vitales"
   
4. Usuario guarda cambios
   ├─> Sistema preserva contenido original
   ├─> Actualiza nota con nuevo contenido
   ├─> Incrementa edit_count a 1
   ├─> Registra en note_edit_history
   ├─> Registra en note_edit_attempts (was_allowed=1)
   └─> Crea entrada en audit_log (NOM-004)
   
5. Usuario ve confirmación: "✓ Nota editada correctamente"
   └─> Badge actualizado: "✏️ Editada (1x)"
```

### Escenario 2: Intento Bloqueado (Después de 24h)

```
1. Usuario crea nota a las 09:00 del día 1
   
2. Usuario intenta editar a las 10:00 del día 2 (25h después)
   └─> Badge ROJO: "🔒 Bloqueada"
   └─> Botón "Editar" NO aparece
   
3. Si usuario intenta acceder directamente:
   ├─> Sistema calcula edad: 25 horas
   ├─> Valida: 25 > 24 ❌
   ├─> Registra en note_edit_attempts (was_allowed=0)
   ├─> denial_reason: "Período de edición de 24h expirado"
   └─> Retorna error al usuario
   
4. Usuario ve mensaje:
   "❌ Error: La nota no puede ser editada después de 24 horas 
   de su creación (NOM-004)"
```

### Escenario 3: Edición Urgente (<2h restantes)

```
1. Nota creada hace 22.5 horas
   
2. Usuario ve en lista:
   └─> Badge NARANJA: "🚨 URGENTE" (animación pulsante)
   └─> Tiempo restante: "1h 30m"
   
3. Modal de edición muestra:
   ├─> Banner naranja con animación
   ├─> Contador descendente en grande
   └─> Advertencia visual prominente
   
4. Usuario completa edición rápidamente
   └─> Sistema registra con note_age_hours: 22.7
```

---

## 🔐 Cumplimiento NOM-004

### Requisitos Cumplidos

✅ **Integridad del Expediente Clínico**
- Todas las notas mantienen su contenido original
- No es posible eliminar información histórica
- Cada cambio está documentado con timestamp y autor

✅ **Trazabilidad Completa**
- Registro de quién, qué, cuándo y por qué
- Historial inmutable de ediciones
- Auditoría de intentos bloqueados

✅ **Control Temporal**
- Ventana de edición limitada (24h)
- Prevención de modificaciones tardías
- Indicadores visuales de urgencia

✅ **Auditoría Legal**
- Integración con sistema de auditoría general
- Logs detallados en `audit_log`
- Preservación de evidencia

### Registros de Auditoría Generados

Para cada edición exitosa:
```javascript
{
  actionType: 'EDIT',
  entityType: 'nurse_note',
  entityId: 456,
  actionDescription: 'Nota editada (2° edición) para paciente ID: 123',
  userName: 'Enf. María González',
  timestamp: '2024-01-15T14:30:00.000Z',
  details: {
    editReason: 'Corrección de signos vitales',
    ageHours: '5.30',
    previousLength: 245,
    newLength: 289
  }
}
```

---

## 🧪 Casos de Prueba

### Test 1: Creación y Edición Inmediata
```javascript
// 1. Crear nota
const noteId = await createNurseNote({
  patientId: 1,
  date: new Date().toISOString(),
  note: "Paciente estable",
  nurseName: "María"
});

// 2. Editar inmediatamente (debería funcionar)
const result = await editNurseNote(
  noteId,
  "Paciente muy estable",
  "María",
  "enfermera",
  "Agregar detalles"
);

console.assert(result.success === true);
console.assert(result.editCount === 1);
```

### Test 2: Bloqueo Después de 24h
```javascript
// 1. Simular nota antigua (modificar fecha en BD)
await db.execute(
  "UPDATE nurse_notes SET date = ? WHERE id = ?",
  [new Date(Date.now() - 25*60*60*1000).toISOString(), noteId]
);

// 2. Intentar editar (debería fallar)
const result = await editNurseNote(
  noteId,
  "Intento de edición tardía",
  "María",
  "enfermera"
);

console.assert(result.success === false);
console.assert(result.error.includes("24 horas"));
```

### Test 3: Múltiples Ediciones
```javascript
// 1. Primera edición
const edit1 = await editNurseNote(noteId, "Edit 1", "María", "enfermera");
console.assert(edit1.editCount === 1);

// 2. Segunda edición
const edit2 = await editNurseNote(noteId, "Edit 2", "María", "enfermera");
console.assert(edit2.editCount === 2);

// 3. Verificar historial
const history = await getNoteEditHistory(noteId);
console.assert(history.length === 2);
console.assert(history[0].previous_content === "Edit 1");
console.assert(history[0].new_content === "Edit 2");
```

### Test 4: Preservación de Original
```javascript
// 1. Crear nota
const noteId = await createNurseNote({
  note: "Original content"
});

// 2. Primera edición
await editNurseNote(noteId, "Modified content", "María", "enfermera");

// 3. Segunda edición
await editNurseNote(noteId, "Modified again", "María", "enfermera");

// 4. Verificar que original se preserva
const note = await db.select("SELECT * FROM nurse_notes WHERE id = ?", [noteId]);
console.assert(note[0].original_note === "Original content");
console.assert(note[0].note === "Modified again");
console.assert(note[0].edit_count === 2);
```

---

## 📈 Indicadores de Desempeño

### Métricas Clave

```javascript
const stats = await getNoteEditStats();

// Tasa de edición
const editRate = (stats.edited_notes / stats.total_notes * 100).toFixed(2);
console.log(`Tasa de edición: ${editRate}%`);

// Ediciones por nota editada
const editsPerNote = (stats.total_edits / stats.edited_notes).toFixed(2);
console.log(`Promedio de ediciones: ${editsPerNote}`);

// Tasa de bloqueo
const blockRate = (stats.blocked_attempts / stats.total_edits * 100).toFixed(2);
console.log(`Intentos bloqueados: ${blockRate}%`);
```

### Reportes Sugeridos

1. **Reporte Diario**: Notas editadas en últimas 24h
2. **Reporte Semanal**: Intentos bloqueados por usuario
3. **Reporte Mensual**: Estadísticas de edición por servicio
4. **Auditoría Anual**: Cumplimiento NOM-004

---

## 🚀 Mejoras Futuras

### Posibles Extensiones

1. **Notificaciones Proactivas**
   - Email/SMS cuando queden 2 horas
   - Alertas en dashboard para notas por expirar

2. **Roles Avanzados**
   - Administradores pueden extender ventana (con justificación)
   - Supervisores pueden aprobar ediciones tardías

3. **Configuración Personalizable**
   - Ventanas de edición por tipo de nota
   - Diferentes límites por servicio

4. **Análisis Predictivo**
   - IA que sugiere correcciones antes de que expire
   - Patrones de ediciones frecuentes

5. **Integración con Firma Electrónica**
   - Notas bloqueadas requieren firma digital
   - Validación biométrica para ediciones

---

## 📞 Soporte y Mantenimiento

### Logs del Sistema

Buscar en consola del navegador:
```
✓ Note 456 edited successfully by María González
❌ Edit attempt blocked: note 789 is 25.3 hours old
```

### Troubleshooting Común

**Problema**: "El botón de editar no aparece"
- **Causa**: Nota mayor a 24 horas
- **Solución**: Verificar fecha de creación en BD

**Problema**: "Error al guardar cambios"
- **Causa**: Contenido vacío o conexión BD
- **Solución**: Validar contenido y revisar logs

**Problema**: "El historial no carga"
- **Causa**: Nota no tiene ediciones previas
- **Solución**: Click en "Cargar historial" en el modal

---

## 📚 Referencias

- **NOM-004-SSA3-2012**: Del expediente clínico
- **Documentación del proyecto**: Ver `FEATURES_GUIDE.md`
- **Código fuente**:
  - Frontend: `src/App.jsx`
  - Backend: `src/services/database.js`
  - Validaciones: `src/utils/noteEditValidation.js`

---

## ✅ Checklist de Implementación

- [x] Base de datos actualizada con nuevas tablas
- [x] Funciones CRUD para edición
- [x] Validación temporal (24h)
- [x] Preservación de contenido original
- [x] Historial de ediciones
- [x] Auditoría de intentos
- [x] Indicadores visuales de urgencia
- [x] Modal de edición
- [x] Modal de historial
- [x] Integración con NOM-004
- [x] Documentación completa

---

**Sistema implementado exitosamente** ✨

*Última actualización: Enero 2024*
