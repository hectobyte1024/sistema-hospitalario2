import { getUserByUsername, createUser, getUserByEmail, updateLastLogin, incrementFailedLoginAttempts, isAccountLocked, createSession, hasActiveSession, terminateSession, terminateAllUserSessions } from './database';

// Validate password strength
function validatePasswordStrength(password) {
  if (!password || password.length <= 6) {
    return { valid: false, message: 'La contraseña debe tener más de 6 caracteres (mínimo 7)' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' };
  }
  
  return { valid: true, message: 'Contraseña válida' };
}

// Simple hash function using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Verify password
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Login function
export async function login(username, password, deviceInfo = {}) {
  try {
    console.log('🔐 Attempting login for user:', username);
    
    // Get user from database
    const user = await getUserByUsername(username);
    console.log('👤 User lookup result:', user ? 'Found' : 'Not found');
    
    if (!user) {
      console.error('❌ User not found:', username);
      throw new Error('Usuario no encontrado');
    }

    // Check if account is locked
    const lockStatus = await isAccountLocked(user.id);
    console.log('🔒 Account lock status:', lockStatus);
    
    if (lockStatus.locked) {
      const errorMessage = `ERR-01: Su cuenta está bloqueada temporalmente por seguridad debido a múltiples intentos fallidos. Debe esperar ${lockStatus.remainingMinutes} minuto(s) más o contactar al administrador.`;
      console.error('🔒 Account locked:', errorMessage);
      throw new Error(errorMessage);
    }

    // Check if user is active
    if (user.is_active === 0) {
      console.error('❌ User account is inactive:', username);
      throw new Error('Esta cuenta ha sido desactivada');
    }

    console.log('🔑 Verifying password...');
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    console.log('✅ Password verification:', isValid ? 'Success' : 'Failed');
    
    if (!isValid) {
      console.error('❌ Invalid password for user:', username);
      
      // Increment failed login attempts
      const attemptResult = await incrementFailedLoginAttempts(user.id);
      console.log('⚠️ Failed attempt result:', attemptResult);
      
      if (attemptResult && attemptResult.locked) {
        throw new Error('ERR-01: Contraseña incorrecta. Su cuenta ha sido bloqueada temporalmente por 15 minutos debido a 3 intentos fallidos consecutivos. Debe esperar ese tiempo o contactar al administrador.');
      } else if (attemptResult) {
        const remaining = attemptResult.remainingAttempts;
        throw new Error(`Contraseña incorrecta. Le quedan ${remaining} intento(s) antes de que su cuenta sea bloqueada temporalmente.`);
      } else {
        throw new Error('Contraseña incorrecta');
      }
    }

    // Session management
    let sessionToken = null;
    let sessionWarning = null;
    
    try {
      // Check for existing active session
      const sessionCheck = await hasActiveSession(user.id);
      console.log('📱 Session check:', sessionCheck);
      
      if (sessionCheck.hasSession) {
        console.warn('⚠️ Existing session detected, will be terminated');
        await terminateAllUserSessions(user.id);
        sessionWarning = 'Sesión anterior cerrada automáticamente';
      }

      // Create new session
      const sessionResult = await createSession(user.id, {
        browser: deviceInfo.browser || 'Unknown Browser',
        os: deviceInfo.os || 'Unknown OS',
        ipAddress: deviceInfo.ipAddress || 'Unknown',
        userAgent: deviceInfo.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown')
      });
      
      sessionToken = sessionResult.sessionToken;
    } catch (sessionError) {
      console.error('⚠️ Session management error (non-critical):', sessionError);
      // Continue with login even if session management fails
    }

    // Update last login and reset failed attempts
    await updateLastLogin(user.id);
    console.log('✅ Login successful for user:', username, '- Role:', user.role);

    // Return user data (without password hash) with session token
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      specialization: user.specialization,
      sessionToken: sessionToken,
      sessionWarning: sessionWarning
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Register new user
export async function register(userData) {
  try {
    // Check if username already exists
    const existingUser = await getUserByUsername(userData.username);
    
    if (existingUser) {
      throw new Error('El nombre de usuario ya está en uso');
    }

    // Check if email already exists
    if (userData.email) {
      const existingEmail = await getUserByEmail(userData.email);
      if (existingEmail) {
        throw new Error('El correo electrónico ya está registrado');
      }
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(userData.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Create user
    await createUser({
      username: userData.username,
      password_hash: passwordHash,
      role: userData.role || 'patient',
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      license_number: userData.licenseNumber || null
    });

    console.log('User registered successfully');
    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Create default users if they don't exist
export async function createDefaultUsers() {
  try {
    // Check if admin user exists
    const adminExists = await getUserByUsername('admin');
    if (!adminExists) {
      await register({
        username: 'admin',
        password: 'Admin123',
        role: 'admin',
        name: 'Administrador',
        email: 'admin@hospital.com'
      });
      console.log('✓ Default admin user created (username: admin, password: Admin123)');
    }

    // Create default nurse user
    const nurseExists = await getUserByUsername('enfermero');
    if (!nurseExists) {
      await register({
        username: 'enfermero',
        password: 'Enfermero123',
        role: 'nurse',
        name: 'Enfermero Juan López',
        email: 'enfermero@hospital.com',
        licenseNumber: '1234567'
      });
      console.log('✓ Default nurse user created (username: enfermero, password: Enfermero123, license: 1234567)');
    }

    // Create default patient user
    const patientExists = await getUserByUsername('paciente');
    if (!patientExists) {
      await register({
        username: 'paciente',
        password: 'Paciente123',
        role: 'patient',
        name: 'Juan Pérez',
        email: 'paciente@hospital.com'
      });
      console.log('✓ Default patient user created (username: paciente, password: Paciente123)');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

// Logout function (clears session)
export async function logout(sessionToken) {
  try {
    console.log('🚪 Logging out...');
    
    if (sessionToken) {
      // Terminate the session in database
      await terminateSession(sessionToken);
      console.log('✅ Session terminated successfully');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
}

// Change password function
export async function changePassword(userId, oldPassword, newPassword) {
  try {
    // Import dynamic to avoid circular dependency
    const { getUserById, updateUserPassword } = await import('./database');
    
    // Get user
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Get full user with password hash
    const { getUserByUsername } = await import('./database');
    const fullUser = await getUserByUsername(user.username);

    // Verify old password
    const isValid = await verifyPassword(oldPassword, fullUser.password_hash);
    if (!isValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await updateUserPassword(userId, newPasswordHash);

    console.log('Password changed successfully');
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
}

// Request password reset
export async function requestPasswordReset(email) {
  try {
    const { getUserByEmail, createPasswordResetToken } = await import('./database');
    
    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: 'Si el correo existe, recibirás instrucciones' };
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token
    await createPasswordResetToken(user.id, token, expiresAt.toISOString());

    // In a real app, send email with token
    console.log('Password reset token:', token);
    
    return { success: true, token, message: 'Token de recuperación generado' };
  } catch (error) {
    console.error('Request password reset error:', error);
    throw error;
  }
}

// Reset password with token
export async function resetPasswordWithToken(token, newPassword) {
  try {
    const { getPasswordResetToken, getUserById, updateUserPassword, markTokenAsUsed } = await import('./database');
    
    // Validate token
    const resetToken = await getPasswordResetToken(token);
    if (!resetToken) {
      throw new Error('Token inválido o ya utilizado');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (now > expiresAt) {
      throw new Error('El token ha expirado');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await updateUserPassword(resetToken.user_id, newPasswordHash);

    // Mark token as used
    await markTokenAsUsed(token);

    console.log('Password reset successfully');
    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

// Recover password by license number (for nurses)
// Password recovery - Send email (simulated)
export async function requestPasswordRecovery(licenseNumber) {
  try {
    console.log('📧 Requesting password recovery for license:', licenseNumber);
    const { getUserByLicenseNumber } = await import('./database');
    
    // Find nurse by license number
    const user = await getUserByLicenseNumber(licenseNumber);
    
    if (!user) {
      console.error('❌ ERR-03: No nurse found with this license number');
      throw new Error('No se encontró un enfermero con esta cédula profesional');
    }

    // Check if user is active
    if (user.is_active === 0) {
      console.error('❌ User account is inactive');
      throw new Error('Esta cuenta ha sido desactivada');
    }

    // In a real application, this would:
    // 1. Generate a secure reset token
    // 2. Store the token with expiration in database
    // 3. Send email with reset link containing the token
    
    console.log('✅ MSG-02: Recovery email would be sent to:', user.email);
    console.log('📧 Email would contain reset link for user:', user.name);
    
    // Simulate email sending success
    return { 
      success: true, 
      message: 'Se envió un correo para la recuperación de contraseña',
      email: user.email,
      username: user.username
    };
  } catch (error) {
    console.error('❌ Password recovery request error:', error);
    throw error;
  }
}

// Password recovery - Old method (kept for backwards compatibility)
export async function recoverPasswordByLicense(licenseNumber, newPassword) {
  try {
    console.log('🔐 Attempting password recovery with license number');
    const { getUserByLicenseNumber, updateUserPassword } = await import('./database');
    
    // Find nurse by license number
    const user = await getUserByLicenseNumber(licenseNumber);
    
    if (!user) {
      console.error('❌ No nurse found with this license number');
      throw new Error('No se encontró un enfermero con esta cédula profesional');
    }

    // Check if user is active
    if (user.is_active === 0) {
      console.error('❌ User account is inactive');
      throw new Error('Esta cuenta ha sido desactivada');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    console.log('🔑 Generating new password hash...');
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    console.log('💾 Updating password in database...');
    // Update password
    await updateUserPassword(user.id, newPasswordHash);

    console.log('✅ Password recovered successfully for:', user.name);
    return { 
      success: true, 
      message: 'Contraseña actualizada exitosamente',
      username: user.username,
      name: user.name
    };
  } catch (error) {
    console.error('❌ Password recovery error:', error);
    throw error;
  }
}

// Export hash function and validation for testing
export { hashPassword, validatePasswordStrength };
