# 🔐 Credenciales del Sistema Hospitalario

## Usuarios Predeterminados

### 👨‍⚕️ Administrador
- **Usuario**: `admin`
- **Contraseña**: `Admin123`
- **Rol**: Administrador del sistema
- **Email**: admin@hospital.com

### 👨‍⚕️ Enfermero
- **Usuario**: `enfermero` ⚠️ (NO "enfermera")
- **Contraseña**: `Enfermero123` ⚠️ (E mayúscula, 123 al final)
- **Rol**: Personal de enfermería
- **Email**: enfermero@hospital.com
- **Cédula**: 1234567

### 👤 Paciente
- **Usuario**: `paciente`
- **Contraseña**: `Paciente123` ⚠️ (P mayúscula, 123 al final)
- **Rol**: Paciente
- **Email**: paciente@hospital.com

---

## 🔒 Requisitos de Seguridad de Contraseñas

El sistema valida automáticamente que todas las contraseñas cumplan con:

✅ **Longitud mínima**: Más de 6 caracteres (mínimo 7)  
✅ **Al menos 1 mayúscula**: A-Z  
✅ **Al menos 1 minúscula**: a-z  
✅ **Al menos 1 número**: 0-9  

### Ejemplos válidos:
- ✅ `Enfermero123`
- ✅ `MiPassword2024`
- ✅ `Hospital99`

### Ejemplos inválidos:
- ❌ `enfermero123` (sin mayúscula)
- ❌ `ENFERMERO123` (sin minúscula)
- ❌ `Enfermero` (sin número)
- ❌ `Enf123` (menos de 7 caracteres)

**Nota**: Si intentas registrar un usuario con una contraseña que no cumple estos requisitos, el sistema mostrará un error explicando qué falta.

---

## ⚠️ Solución de Problemas

### "No puedo iniciar sesión"

1. **Verifica que estás usando las credenciales exactas** (distinguen mayúsculas/minúsculas)
   - Usuario enfermero: `enfermero` (todo minúscula)
   - Contraseña: `Enfermero123` (E mayúscula, resto minúscula, 123 al final)

2. **Si no funciona, resetea la base de datos**:
   ```bash
   ./reset-database.sh
   npm run dev
   ```

3. **La aplicación se está iniciando por primera vez**:
   - Espera unos segundos para que se cree la base de datos
   - Verás en consola: "✓ Default nurse user created"

4. **Abre la consola del navegador** (F12) y busca:
   - Errores en rojo
   - Mensaje: "✓ Default users created"

---

## 🚀 Primera Vez Usando el Sistema

1. Ejecuta: `npm run dev`
2. Espera a que aparezca: "✅ Default users created" en consola
3. Abre http://localhost:5173/ en el navegador
4. Usa las credenciales de arriba

---

## 🔄 Resetear Base de Datos

Si necesitas empezar de cero:

```bash
./reset-database.sh
npm run dev
```

Esto eliminará todos los datos y recreará los usuarios predeterminados.

---

## 📝 Notas Importantes

- **Distingue mayúsculas y minúsculas**: `enfermero` ≠ `Enfermero`
- **La primera letra de la contraseña es MAYÚSCULA**: `Enfermero123`
- **El usuario es "enfermero" en masculino**, no "enfermera"
- Si cambias la contraseña después de iniciar sesión, usa la nueva contraseña

---

## ✅ Verificación Rápida

Para probar que todo funciona:

1. Usuario: `admin`
2. Contraseña: `Admin123`
3. Si esto funciona, el sistema está OK
4. Luego prueba con `enfermero` / `Enfermero123`
