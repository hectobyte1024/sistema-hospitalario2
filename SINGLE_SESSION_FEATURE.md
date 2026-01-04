# Funcionalidad de Sesión Única

## Descripción General

Esta funcionalidad implementa un sistema de **sesión única** que asegura que un usuario solo pueda tener una sesión activa a la vez. Si un usuario intenta iniciar sesión desde un dispositivo diferente mientras ya tiene una sesión activa, la sesión anterior se cerrará automáticamente.

## Características Principales

### 1. Control de Sesiones Activas
- **Una sesión por usuario**: Solo se permite una sesión activa por cuenta de usuario
- **Cierre automático**: La sesión anterior se cierra automáticamente al detectar un nuevo inicio de sesión
- **Información de dispositivo**: Se registra información del dispositivo, navegador, IP y agente de usuario
- **Seguimiento de actividad**: Se registra la hora de inicio de sesión y última actividad

### 2. Información de Sesión Registrada

Para cada sesión activa se almacena:
- **Token de sesión**: Identificador único (UUID o timestamp-based)
- **Usuario**: ID del usuario propietario de la sesión
- **Información del dispositivo**:
  - Navegador utilizado
  - Sistema operativo
  - Dirección IP
  - User Agent completo
- **Timestamps**:
  - Hora de inicio de sesión
  - Última actividad registrada
- **Estado**: Sesión activa o terminada

### 3. Notificaciones al Usuario

El sistema proporciona mensajes informativos:
- **Sesión existente detectada**: "Ya existe una sesión activa para esta cuenta desde [fecha] (Dispositivo: [navegador], IP: [dirección]). La sesión anterior será cerrada automáticamente."
- **Advertencia post-login**: "Sesión anterior cerrada automáticamente" (si aplicable)

## Implementación Técnica

### Esquema de Base de Datos

Se añadió la tabla `user_sessions` con la siguiente estructura:

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  login_time TEXT DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

### Funciones Principales

#### 1. `generateSessionToken()`
Genera un token único para identificar la sesión.

**Retorna:**
- Token único (UUID o timestamp-based)

#### 2. `createSession(userId, deviceInfo)`
Crea una nueva sesión para el usuario, cerrando cualquier sesión anterior.

**Parámetros:**
- `userId`: ID del usuario
- `deviceInfo`: Objeto con información del dispositivo
  ```javascript
  {
    browser: 'Chrome',
    os: 'Windows 10',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }
  ```

**Retorna:**
```javascript
{
  sessionToken: 'abc123...',
  loginTime: '2024-01-15T10:30:00'
}
```

#### 3. `hasActiveSession(userId)`
Verifica si el usuario tiene una sesión activa.

**Parámetros:**
- `userId`: ID del usuario

**Retorna:**
```javascript
{
  hasSession: true/false,
  session: {
    sessionToken: 'abc123...',
    deviceInfo: { browser: '...', os: '...' },
    ipAddress: '192.168.1.100',
    loginTime: '2024-01-15T10:30:00',
    lastActivity: '2024-01-15T11:00:00'
  }
}
```

#### 4. `terminateSession(sessionToken)`
Termina una sesión específica.

**Parámetros:**
- `sessionToken`: Token de la sesión a terminar

**Retorna:**
- `true` si se cerró exitosamente

#### 5. `terminateAllUserSessions(userId)`
Termina todas las sesiones activas de un usuario.

**Parámetros:**
- `userId`: ID del usuario

**Retorna:**
- Número de sesiones cerradas

#### 6. `updateSessionActivity(sessionToken)`
Actualiza la última actividad de una sesión.

**Parámetros:**
- `sessionToken`: Token de la sesión

#### 7. `getUserBySessionToken(sessionToken)`
Obtiene la información del usuario asociado a una sesión.

**Parámetros:**
- `sessionToken`: Token de la sesión

**Retorna:**
- Objeto con datos del usuario o null si no se encuentra

## Flujo de Autenticación

### Proceso de Login

```
1. Usuario ingresa credenciales
   ↓
2. Verificar usuario existe
   ↓
3. Verificar cuenta no bloqueada (ERR-01)
   ↓
4. Verificar cuenta activa
   ↓
5. Verificar contraseña
   ↓
6. Verificar sesión activa existente
   ├─ SI → Cerrar sesión anterior automáticamente
   └─ NO → Continuar
   ↓
7. Crear nueva sesión con token único
   ↓
8. Registrar información del dispositivo
   ↓
9. Retornar datos de usuario + sessionToken
```

### Proceso de Logout

```
1. Usuario hace click en "Cerrar Sesión"
   ↓
2. Llamar logout(sessionToken)
   ↓
3. Marcar sesión como inactiva en BD
   ↓
4. Limpiar sessionToken del almacenamiento local
   ↓
5. Redirigir a pantalla de login
```

## Integración con el Frontend

### LoginForm.jsx

**Modificaciones requeridas:**

```javascript
// Al hacer login exitoso
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const deviceInfo = {
      browser: detectBrowser(),
      os: detectOS(),
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent
    };
    
    const userData = await login(username, password, deviceInfo);
    
    // Guardar sessionToken
    localStorage.setItem('sessionToken', userData.sessionToken);
    
    // Mostrar advertencia si sesión anterior fue cerrada
    if (userData.sessionWarning) {
      toast.warning(userData.sessionWarning);
    }
    
    setUser(userData);
    
  } catch (error) {
    setError(error.message);
  }
};
```

### App.jsx

**Modificaciones requeridas:**

```javascript
// Al hacer logout
const handleLogout = async () => {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    await logout(sessionToken);
    localStorage.removeItem('sessionToken');
    setUser(null);
    navigate('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
```

## Casos de Uso

### Caso 1: Login Normal (Sin Sesión Previa)

**Escenario:**
1. Usuario "dr.martinez" se autentica desde Chrome en Windows
2. No hay sesiones activas previas

**Resultado:**
- ✅ Login exitoso
- Se crea nueva sesión con token único
- Se registra: Chrome, Windows, IP, timestamp

**Mensaje:** Ninguno (login normal)

---

### Caso 2: Login con Sesión Activa en Otro Dispositivo

**Escenario:**
1. Usuario "dr.martinez" tiene sesión activa en Chrome/Windows desde 10:00 AM
2. Intenta login desde Firefox/Linux a las 11:00 AM

**Resultado:**
- ⚠️ Se detecta sesión existente
- Se muestra mensaje informativo con detalles de la sesión anterior
- Se cierra automáticamente la sesión de Chrome/Windows
- Se crea nueva sesión en Firefox/Linux
- ✅ Login exitoso

**Mensaje durante login:**
```
Sesión Única: Ya existe una sesión activa para esta cuenta desde 
15/01/2024 10:00:00 (Dispositivo: Chrome, IP: 192.168.1.100). 
No puede tener dos sesiones abiertas simultáneamente. 
La sesión anterior será cerrada automáticamente.
```

**Mensaje post-login:**
```
⚠️ Sesión anterior cerrada automáticamente
```

---

### Caso 3: Logout Normal

**Escenario:**
1. Usuario "enfermera.lopez" hace click en "Cerrar Sesión"

**Resultado:**
- ✅ Sesión marcada como inactiva en BD
- SessionToken eliminado del localStorage
- Usuario redirigido a pantalla de login

---

### Caso 4: Intento de Reutilizar Token de Sesión Cerrada

**Escenario:**
1. Usuario cierra sesión en dispositivo A
2. Intenta usar el token de sesión anterior

**Resultado:**
- ❌ Token marcado como inactivo
- Requiere nuevo login

## Seguridad

### Medidas Implementadas

1. **Token Único por Sesión**: Cada sesión tiene un identificador único irrepetible
2. **Cierre Automático**: Previene sesiones simultáneas (riesgo de compartir credenciales)
3. **Registro de Dispositivos**: Auditoría de dónde se accede a la cuenta
4. **Timestamps**: Seguimiento de actividad para detectar patrones sospechosos
5. **Cascade Delete**: Las sesiones se eliminan al eliminar el usuario

### Prevención de Ataques

- **Compartir Credenciales**: Solo una persona puede usar la cuenta a la vez
- **Brute Force Distribuido**: Combinado con ERR-01, bloquea cuenta tras 3 intentos
- **Session Hijacking**: Tokens únicos y validación en cada operación crítica
- **Auditoría**: Registro de IP, dispositivo y horarios para investigación

## Configuración

### Parámetros Ajustables

Actualmente no hay parámetros configurables. El comportamiento es fijo:
- **Sesiones permitidas**: 1 por usuario
- **Acción al detectar sesión**: Cierre automático de la anterior
- **Expiración**: No implementada (sesión activa hasta logout manual)

### Posibles Mejoras Futuras

1. **Expiración automática de sesiones**
   ```javascript
   // Cerrar sesión después de 30 minutos de inactividad
   const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
   ```

2. **Opción de "Forzar Cierre" manual**
   - Permitir al usuario ver y cerrar sesiones activas desde la configuración

3. **Notificaciones de seguridad**
   - Email al detectar login desde nuevo dispositivo/ubicación

4. **Whitelist de IPs**
   - Permitir múltiples sesiones desde IPs confiables (ej: red del hospital)

5. **Geolocalización**
   - Bloquear logins desde ubicaciones geográficas sospechosas

## Pruebas

### Test Case 1: Login sin sesión previa
```javascript
// Arrange
const user = { id: 1, username: 'test' };
const deviceInfo = { browser: 'Chrome', os: 'Windows' };

// Act
const result = await login('test', 'password123', deviceInfo);

// Assert
expect(result.sessionToken).toBeDefined();
expect(result.sessionWarning).toBeNull();
```

### Test Case 2: Login con sesión activa
```javascript
// Arrange
await createSession(1, { browser: 'Firefox', os: 'Linux' });

// Act
const result = await login('test', 'password123', { browser: 'Chrome', os: 'Windows' });

// Assert
expect(result.sessionToken).toBeDefined();
expect(result.sessionWarning).toBe('Sesión anterior cerrada automáticamente');
const activeSessions = await hasActiveSession(1);
expect(activeSessions.hasSession).toBe(true);
// Verificar que solo hay 1 sesión activa (la nueva)
```

### Test Case 3: Logout
```javascript
// Arrange
const { sessionToken } = await createSession(1, {});

// Act
await logout(sessionToken);

// Assert
const session = await getUserBySessionToken(sessionToken);
expect(session).toBeNull(); // Sesión terminada
```

### Test Case 4: Múltiples logins consecutivos
```javascript
// Simular login desde 3 dispositivos diferentes
const session1 = await login('test', 'pass', { browser: 'Chrome' });
const session2 = await login('test', 'pass', { browser: 'Firefox' });
const session3 = await login('test', 'pass', { browser: 'Safari' });

// Solo debe haber 1 sesión activa (la última)
const activeCheck = await hasActiveSession(1);
expect(activeCheck.hasSession).toBe(true);
expect(activeCheck.session.sessionToken).toBe(session3.sessionToken);
```

## Monitoreo y Auditoría

### Logs Generados

El sistema genera logs detallados en consola:
```
🔐 Attempting login for user: dr.martinez
👤 User lookup result: Found
🔒 Account lock status: { locked: false }
🔑 Verifying password...
✅ Password verification: Success
📱 Session check: { hasSession: true, session: {...} }
⚠️ Existing session detected, will be terminated
✅ Login successful for user: dr.martinez - Role: doctor
```

### Consultas SQL para Auditoría

```sql
-- Ver todas las sesiones activas
SELECT u.username, s.login_time, s.device_info, s.ip_address 
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = 1;

-- Historial de sesiones de un usuario
SELECT * FROM user_sessions 
WHERE user_id = 1 
ORDER BY login_time DESC;

-- Usuarios con sesiones activas por dispositivo
SELECT 
  device_info->'browser' as browser,
  COUNT(*) as count
FROM user_sessions
WHERE is_active = 1
GROUP BY browser;
```

## Compatibilidad

### Navegadores Soportados
- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Requisitos
- JavaScript ES6+ (async/await)
- localStorage API
- navigator.userAgent disponible

## Integración con Otras Funcionalidades

### ERR-01: Bloqueo de Cuenta
- **Prioridad**: El bloqueo de cuenta se verifica ANTES de la sesión única
- **Comportamiento**: Si la cuenta está bloqueada, no se permite login ni se crea sesión

### Validación de Contraseñas
- **Aplicación**: Contraseñas robustas reducen riesgo de acceso no autorizado
- **Sinergia**: Menos intentos exitosos de compartir credenciales

## Documentación Relacionada
- [ACCOUNT_LOCKOUT_FEATURE.md](ACCOUNT_LOCKOUT_FEATURE.md) - Sistema ERR-01
- [FEATURES_GUIDE.md](FEATURES_GUIDE.md) - Guía general de funcionalidades

## Soporte y Troubleshooting

### Problema: Token no se guarda en localStorage
**Solución:** Verificar que el navegador permite localStorage y no está en modo privado/incognito

### Problema: Sesión no se cierra al hacer logout
**Solución:** Verificar que se está pasando el sessionToken correcto a la función logout()

### Problema: Mensaje de sesión activa aparece incorrectamente
**Solución:** Revisar que terminateAllUserSessions() se ejecuta correctamente antes de crear la nueva sesión

---

**Versión:** 1.0  
**Fecha:** Enero 2024  
**Autor:** Sistema Hospitalario MANNY
