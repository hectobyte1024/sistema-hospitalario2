import { getUserByCedula } from './database';

// Simulación de hash simple para coincidir con tu seed data.
// En producción real usarías bcrypt, pero para este proyecto escolar esto es aceptable.
const hashPassword = (pwd) => `hash_${pwd}`;

// ECU-01: Iniciar sesión con Cédula
export async function login(cedula, password) {
  try {
    console.log(`Intentando login con cédula: ${cedula}`);
    
    // Consulta a la Base de Datos SQLite real
    const user = await getUserByCedula(cedula);
    
    if (!user) {
      throw new Error('Cédula no encontrada en el sistema.');
    }

    // Verificación de contraseña (hash simple)
    const inputHash = hashPassword(password);
    if (user.password_hash !== inputHash) {
      console.warn('Password mismatch');
      throw new Error('Contraseña incorrecta.');
    }

    // Convertir el JSON de turnos si viene de la BD como string
    let shiftData = null;
    try {
        if (user.assigned_shifts && typeof user.assigned_shifts === 'string') {
            shiftData = JSON.parse(user.assigned_shifts);
        }
    } catch (e) {
        console.warn('Error parsing shift data', e);
    }

    // Retornar objeto de usuario limpio para el frontend
    return {
        id: user.id,
        name: user.name,
        cedula: user.license_number || user.username,
        role: user.role,
        email: user.email,
        shift: shiftData
    };

  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// ECU-02: Recuperar contraseña
export async function recoverPassword(cedula) {
  const user = await getUserByCedula(cedula);
  if (!user) {
    throw new Error('No existe usuario con esa cédula.');
  }
  // Aquí simularías el envío de correo o generación de token
  return `Se ha enviado un enlace de recuperación al correo asociado: ${user.email}`;
}
