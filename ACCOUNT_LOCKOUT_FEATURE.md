# Sistema de Bloqueo de Cuenta por Intentos Fallidos (ERR-01)

## Descripción General

El sistema ahora incluye una medida de seguridad que bloquea temporalmente las cuentas de usuario después de 3 intentos fallidos consecutivos de inicio de sesión.

## Características

### 🔒 Bloqueo Automático
- **Límite de intentos:** 3 intentos fallidos consecutivos
- **Duración del bloqueo:** 15 minutos
- **Código de error:** ERR-01

### 🔓 Desbloqueo Automático
- La cuenta se desbloquea automáticamente después de 15 minutos
- El contador de intentos se resetea automáticamente al desbloquear
- Login exitoso resetea el contador de intentos fallidos

### ⚠️ Mensajes al Usuario

#### Intento Fallido (1-2 intentos)
```
Contraseña incorrecta. Le quedan X intento(s) antes de que su cuenta sea bloqueada temporalmente.
```

#### Cuenta Bloqueada (3er intento)
```
ERR-01: Contraseña incorrecta. Su cuenta ha sido bloqueada temporalmente por 15 minutos 
debido a 3 intentos fallidos consecutivos. Debe esperar ese tiempo o contactar al administrador.
```

#### Intento Durante Bloqueo
```
ERR-01: Su cuenta está bloqueada temporalmente por seguridad debido a múltiples intentos fallidos. 
Debe esperar X minuto(s) más o contactar al administrador.
```

## Implementación Técnica

### Base de Datos

Se agregaron dos nuevas columnas a la tabla `users`:

```sql
failed_login_attempts INTEGER DEFAULT 0
account_locked_until TEXT
```

### Funciones Principales

#### 1. `incrementFailedLoginAttempts(userId)`
- Incrementa el contador de intentos fallidos
- Bloquea la cuenta por 15 minutos al alcanzar 3 intentos
- Retorna información sobre el estado del bloqueo

#### 2. `isAccountLocked(userId)`
- Verifica si la cuenta está bloqueada
- Calcula minutos restantes de bloqueo
- Desbloquea automáticamente si el tiempo expiró

#### 3. `updateLastLogin(userId)`
- Actualiza timestamp del último acceso exitoso
- Resetea contador de intentos fallidos
- Elimina el bloqueo temporal

### Flujo de Autenticación

```
1. Usuario intenta login
   ↓
2. Se verifica si existe el usuario
   ↓
3. Se verifica si la cuenta está bloqueada
   ↓
4. Se verifica si la cuenta está activa
   ↓
5. Se valida la contraseña
   ↓
6a. Si es correcta:
    - Se resetean intentos fallidos
    - Se actualiza último login
    - Login exitoso
   ↓
6b. Si es incorrecta:
    - Se incrementa contador
    - Si llega a 3: bloqueo por 15 min
    - Se muestra mensaje con intentos restantes
```

## Migración Automática

El sistema ejecuta automáticamente la migración de base de datos al inicializar:

```javascript
async function migrateDatabase() {
  // Agrega columnas nuevas si no existen
  // No afecta datos existentes
  // Maneja errores gracefully
}
```

## Seguridad

### Medidas Implementadas
✅ Prevención de ataques de fuerza bruta
✅ Bloqueo temporal automático
✅ Desbloqueo automático por tiempo
✅ Registro en logs de intentos fallidos
✅ Mensajes informativos al usuario

### Recomendaciones Adicionales
- Los administradores pueden desactivar cuentas manualmente
- Se recomienda monitorear los logs de intentos fallidos
- Considerar implementar CAPTCHA después del 1er intento fallido (futuro)
- Notificar al usuario por email sobre bloqueos (futuro)

## Testing

### Caso de Prueba 1: Bloqueo por 3 Intentos
1. Intentar login con contraseña incorrecta (1er intento)
   - ✅ Mensaje: "Le quedan 2 intentos"
2. Intentar login con contraseña incorrecta (2do intento)
   - ✅ Mensaje: "Le queda 1 intento"
3. Intentar login con contraseña incorrecta (3er intento)
   - ✅ Mensaje: "ERR-01: Su cuenta ha sido bloqueada por 15 minutos"
4. Intentar login inmediatamente
   - ✅ Mensaje: "ERR-01: Debe esperar X minutos más"

### Caso de Prueba 2: Desbloqueo Automático
1. Esperar 15 minutos después del bloqueo
2. Intentar login con credenciales correctas
   - ✅ Login exitoso
   - ✅ Contador reseteado

### Caso de Prueba 3: Login Exitoso Resetea Contador
1. Intentar login con contraseña incorrecta (1er intento)
2. Intentar login con contraseña CORRECTA
   - ✅ Login exitoso
   - ✅ Contador reseteado a 0
3. Intentar login con contraseña incorrecta
   - ✅ Mensaje: "Le quedan 2 intentos" (no 1)

## Logs del Sistema

El sistema genera logs detallados:

```
🔐 Attempting login for user: enfermero
👤 User lookup result: Found
🔒 Account lock status: { locked: false, attempts: 0 }
🔑 Verifying password...
❌ Password verification: Failed
⚠️ Failed attempt result: { locked: false, attempts: 1, remainingAttempts: 2 }
```

## Configuración

### Parámetros Modificables

En `src/services/database.js`:

```javascript
// Cambiar duración del bloqueo (actualmente 15 minutos)
lockUntil.setMinutes(lockUntil.getMinutes() + 15);

// Cambiar número máximo de intentos (actualmente 3)
if (newAttempts >= 3) {
```

## Compatibilidad

- ✅ Compatible con base de datos existentes
- ✅ Migración automática sin pérdida de datos
- ✅ Funciona con todos los roles (admin, enfermero, paciente)
- ✅ No requiere cambios en el frontend

## Archivos Modificados

1. **src/services/database.js**
   - Agregadas funciones de bloqueo
   - Agregada migración automática
   - Modificada función `updateLastLogin()`

2. **src/services/auth.js**
   - Modificada función `login()` con verificación de bloqueo
   - Agregada lógica de intentos fallidos
   - Mejorados mensajes de error

## Próximas Mejoras (Roadmap)

- [ ] Panel de administración para ver cuentas bloqueadas
- [ ] Notificaciones por email sobre bloqueos
- [ ] CAPTCHA después del 1er intento fallido
- [ ] Whitelist de IPs confiables
- [ ] Logs de auditoría más detallados
- [ ] Desbloqueo manual por administradores

---

**Implementado:** Enero 3, 2026  
**Versión:** 1.0  
**Estado:** ✅ Producción
