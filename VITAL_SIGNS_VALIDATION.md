# Validación de Signos Vitales

## 📊 Rangos Fisiológicos Implementados

Este sistema valida automáticamente los signos vitales para prevenir errores de entrada de datos y alertar sobre valores críticos.

---

## 🌡️ Temperatura Corporal

### Rangos Válidos

| Clasificación | Rango | Color | Acción |
|---------------|-------|-------|--------|
| **Crítica Baja** | < 34°C | 🔴 Rojo | ⚠️ Alerta crítica |
| **Hipotermia** | 34-35°C | 🟠 Naranja | ⚠️ Advertencia |
| **Normal** | 36-37.5°C | 🟢 Verde | ✓ Normal |
| **Febrícula** | 37.6-38°C | 🟠 Naranja | ⚠️ Advertencia |
| **Fiebre** | 38.1-39°C | 🟠 Naranja | ⚠️ Advertencia |
| **Fiebre Alta** | 39.1-40°C | 🔴 Rojo | ⚠️ Alerta crítica |
| **Crítica Alta** | > 40°C | 🔴 Rojo | ⚠️ Alerta crítica |

**Límites absolutos:** 32°C - 42°C (límites de supervivencia)

---

## 💓 Frecuencia Cardíaca

### Rangos Válidos

| Clasificación | Rango | Color | Acción |
|---------------|-------|-------|--------|
| **Bradicardia Severa** | < 40 lpm | 🔴 Rojo | ⚠️ Alerta crítica |
| **Bradicardia** | 40-50 lpm | 🟠 Naranja | ⚠️ Advertencia |
| **Normal** | 60-100 lpm | 🟢 Verde | ✓ Normal |
| **Taquicardia Leve** | 101-120 lpm | 🟠 Naranja | ⚠️ Advertencia |
| **Taquicardia** | 121-160 lpm | 🔴 Rojo | ⚠️ Alerta crítica |
| **Taquicardia Severa** | > 160 lpm | 🔴 Rojo | ⚠️ Alerta crítica |

**Límites absolutos:** 30-220 lpm

**Nota:** 
- Deportistas pueden tener FC en reposo 40-60 lpm (normal para ellos)
- Niños pequeños: 80-120 lpm es normal
- Ancianos: 60-80 lpm típico

---

## 🩸 Presión Arterial

### Rangos Válidos

| Clasificación | Sistólica | Diastólica | Color | Acción |
|---------------|-----------|------------|-------|--------|
| **Hipotensión Severa** | < 70 mmHg | < 45 mmHg | 🔴 Rojo | ⚠️ Alerta crítica |
| **Hipotensión** | 70-89 mmHg | 45-59 mmHg | 🟠 Naranja | ⚠️ Advertencia |
| **Normal** | 90-120 mmHg | 60-80 mmHg | 🟢 Verde | ✓ Normal |
| **Prehipertensión** | 121-139 mmHg | 81-89 mmHg | 🟠 Naranja | ⚠️ Advertencia |
| **Hipertensión** | 140-179 mmHg | 90-109 mmHg | 🔴 Rojo | ⚠️ Alerta crítica |
| **Crisis Hipertensiva** | ≥ 180 mmHg | ≥ 110 mmHg | 🔴 Rojo | ⚠️ Alerta crítica |

**Límites absolutos:** 
- Sistólica: 60-250 mmHg
- Diastólica: 40-150 mmHg

**Validaciones adicionales:**
- Sistólica debe ser > Diastólica
- Presión de pulso (diferencia): 20-60 mmHg normal
- Presión de pulso < 20 mmHg: advertencia (posible shock)
- Presión de pulso > 60 mmHg: advertencia (posible rigidez arterial)

---

## 🫁 Frecuencia Respiratoria

### Rangos Válidos

| Clasificación | Rango | Color | Acción |
|---------------|-------|-------|--------|
| **Bradipnea Severa** | < 8 rpm | 🔴 Rojo | ⚠️ Alerta crítica |
| **Bradipnea** | 8-11 rpm | 🟠 Naranja | ⚠️ Advertencia |
| **Normal** | 12-20 rpm | 🟢 Verde | ✓ Normal |
| **Taquipnea Leve** | 21-25 rpm | 🟠 Naranja | ⚠️ Advertencia |
| **Taquipnea** | 26-35 rpm | 🔴 Rojo | ⚠️ Alerta crítica |
| **Taquipnea Severa** | > 35 rpm | 🔴 Rojo | ⚠️ Alerta crítica |

**Límites absolutos:** 6-60 rpm

**Nota:**
- Recién nacidos: 30-60 rpm es normal
- Niños: 20-30 rpm es normal
- Adultos: 12-20 rpm es normal

---

## 🔵 Saturación de Oxígeno (SpO₂)

### Rangos Válidos

| Clasificación | Rango | Color | Acción |
|---------------|-------|-------|--------|
| **Hipoxemia Severa** | < 85% | 🔴 Rojo | ⚠️ Alerta crítica |
| **Hipoxemia** | 85-89% | 🟠 Naranja | ⚠️ Advertencia |
| **Hipoxemia Leve** | 90-94% | 🟠 Naranja | ⚠️ Advertencia |
| **Normal** | 95-100% | 🟢 Verde | ✓ Normal |

**Límites absolutos:** 70-100%

**Nota:**
- Pacientes con EPOC: 88-92% puede ser aceptable
- < 90% requiere oxígeno suplementario
- < 85% es emergencia médica

---

## 🖥️ Implementación en el Sistema

### Validación en Tiempo Real

El formulario valida cada campo mientras el usuario escribe:

```javascript
// Se valida automáticamente al cambiar cualquier valor
onChange={e => {
  const updatedVitals = {...newVitalSigns, [field.name]: e.target.value};
  setNewVitalSigns(updatedVitals);
  setVitalSignsValidation(validateAllVitalSigns(updatedVitals));
}}
```

### Indicadores Visuales

Cada campo muestra:
- ✅ **Verde**: Valor normal
- ⚠️ **Naranja**: Valor anormal (advertencia)
- 🚨 **Rojo**: Valor crítico
- ❌ **Rojo**: Valor inválido (fuera de rango posible)

### Confirmaciones Requeridas

#### Valores Inválidos
```
❌ VALORES INVÁLIDOS:

• Temperatura: Valor fuera de rango posible (32-42 °C)
• Presión arterial: Formato incorrecto. Use formato: 120/80

Por favor, corrija los valores antes de continuar.
```
→ **NO permite guardar**

#### Valores Críticos
```
🚨 ALERTA: VALORES CRÍTICOS DETECTADOS

• Temperatura: ⚠️ VALOR CRÍTICO - Requiere atención inmediata
• Presión arterial: ⚠️ PRESIÓN ARTERIAL CRÍTICA - Requiere atención inmediata

Estos valores requieren atención médica inmediata.

¿Confirma que desea registrar estos valores críticos?
```
→ **Requiere confirmación explícita**

#### Valores Anormales
```
⚠️ VALORES ANORMALES DETECTADOS:

• Frecuencia cardíaca: ⚠️ Valor anormal - Monitoreo recomendado

¿Desea continuar con el registro?
```
→ **Requiere confirmación**

---

## 🔐 Validación Backend

Además de la validación en el frontend, el backend también valida:

```javascript
// En src/services/database.js
export async function createVitalSigns(vitalSigns) {
  // Validación de rangos fisiológicos
  validateVitalSign(vitalSigns.temperature, 32, 42, 'Temperatura');
  validateVitalSign(vitalSigns.heartRate, 30, 220, 'Frecuencia cardíaca');
  // ... más validaciones
  
  // Si pasa validación, guarda en BD
  const result = await db.execute(...);
}
```

**Ventajas:**
- ✅ Seguridad adicional
- ✅ Previene datos incorrectos en BD
- ✅ Logs de errores en backend
- ✅ Protección contra bypass del frontend

---

## 📖 Uso del Sistema

### 1. Abrir Zona de Cuidados

Ir a: **Zona de Cuidados** → Seleccionar paciente

### 2. Ingresar Signos Vitales

Formulario aparece automáticamente con 4 campos:
- Temperatura (°C)
- Presión Arterial (mmHg)
- Frecuencia Cardíaca (LPM)
- Frecuencia Respiratoria (RPM)

### 3. Validación en Tiempo Real

Al escribir, aparecen indicadores debajo de cada campo:
- ✅ Verde: "✓ Valor normal"
- ⚠️ Naranja: "⚠️ Valor anormal - Monitoreo recomendado"
- 🚨 Rojo: "⚠️ VALOR CRÍTICO - Requiere atención inmediata"
- ❌ Rojo: "Valor fuera de rango posible (X-Y)"

### 4. Resumen de Validación

Debajo del formulario aparece un resumen:

**Valores Críticos:**
```
🚨 VALORES CRÍTICOS - Atención Inmediata Requerida
• Temperatura: ⚠️ VALOR CRÍTICO - Requiere atención inmediata
```

**Valores Anormales:**
```
⚠️ Valores Anormales - Monitoreo Recomendado
• Frecuencia cardíaca: ⚠️ Valor anormal - Monitoreo recomendado
```

**Valores Normales:**
```
✓ Todos los valores están en rango normal
```

### 5. Botón de Guardar

- **Habilitado** (azul): Todos los valores válidos
- **Deshabilitado** (gris): Hay valores inválidos
- Texto cambia: "Corrija los valores" cuando hay errores

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Valores Normales
```
Temperatura: 36.8°C     → ✓ Valor normal
Presión: 118/75         → ✓ Presión arterial normal
FC: 78 lpm              → ✓ Valor normal
FR: 16 rpm              → ✓ Valor normal

Resultado: ✓ Todos los valores están en rango normal
Acción: Guardar sin confirmación
```

### Ejemplo 2: Fiebre Alta
```
Temperatura: 39.5°C     → ⚠️ VALOR CRÍTICO
Presión: 120/80         → ✓ Normal
FC: 105 lpm             → ⚠️ Valor anormal
FR: 22 rpm              → ⚠️ Valor anormal

Resultado: 
🚨 VALORES CRÍTICOS
⚠️ Valores Anormales

Acción: Requiere doble confirmación
```

### Ejemplo 3: Shock Hipovolémico
```
Temperatura: 35.2°C     → ⚠️ Hipotermia
Presión: 75/45          → ⚠️ PRESIÓN ARTERIAL CRÍTICA
FC: 135 lpm             → ⚠️ VALOR CRÍTICO
FR: 28 rpm              → ⚠️ Valor anormal

Resultado: 🚨 MÚLTIPLES VALORES CRÍTICOS
Acción: Alerta de emergencia médica
```

### Ejemplo 4: Valor Imposible
```
Temperatura: 50°C       → ❌ Fuera de rango posible (32-42 °C)
Presión: 120/80         → ✓ Normal
FC: 78 lpm              → ✓ Normal
FR: 16 rpm              → ✓ Normal

Resultado: ❌ VALORES INVÁLIDOS
Acción: No permite guardar, botón deshabilitado
```

---

## 🔧 Personalización de Rangos

Para modificar los rangos, editar:

**Archivo:** `src/utils/vitalSignsValidation.js`

```javascript
export const VITAL_SIGNS_RANGES = {
  temperature: {
    min: 32.0,        // Cambiar límite mínimo
    max: 42.0,        // Cambiar límite máximo
    normalMin: 36.0,  // Cambiar rango normal
    normalMax: 37.5,
    // ...
  },
  // ...
};
```

---

## 📊 Estadísticas de Validación

El sistema registra en auditoría:
- Valores guardados
- Usuario que registró
- Timestamp exacto
- Valores específicos registrados

Para ver historial de validaciones críticas:
```javascript
import { getAuditTrail } from './services/database';

const criticalVitals = await getAuditTrail({
  entityType: 'vital_signs',
  // Filtrar por detalles que contengan valores críticos
});
```

---

## ⚕️ Referencias Médicas

Rangos basados en:
- American Heart Association Guidelines
- WHO Vital Signs Standards
- Guías de Cuidados Intensivos
- Literatura médica pediátrica y geriátrica

**Nota importante:** Estos rangos son orientativos. Cada paciente puede tener valores "normales" diferentes según:
- Edad
- Condición médica
- Medicación actual
- Estado de salud basal

Siempre usar criterio clínico profesional.

---

## ✅ Checklist de Validación

- [x] Validación en tiempo real en frontend
- [x] Validación en backend (doble capa)
- [x] Indicadores visuales por campo
- [x] Resumen de validación completo
- [x] Confirmación para valores críticos
- [x] Confirmación para valores anormales
- [x] Bloqueo para valores inválidos
- [x] Mensajes de error descriptivos
- [x] Registro en auditoría (NOM-004)
- [x] Documentación completa

---

**Sistema listo para uso clínico con validación completa de signos vitales.**

_Última actualización: Diciembre 2025_
