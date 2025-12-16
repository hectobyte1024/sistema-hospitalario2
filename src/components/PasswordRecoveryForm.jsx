import React, { useState } from 'react';
import { Key, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { recoverPasswordByLicense } from '../services/auth';

export default function PasswordRecoveryForm({ onBack, onRecoverySuccess }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    // Validar requisitos de seguridad de contraseña
    if (newPassword.length <= 6) {
      setError('La contraseña debe tener más de 6 caracteres (mínimo 7)');
      setIsLoading(false);
      return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      setError('La contraseña debe contener al menos una letra mayúscula');
      setIsLoading(false);
      return;
    }
    
    if (!/[a-z]/.test(newPassword)) {
      setError('La contraseña debe contener al menos una letra minúscula');
      setIsLoading(false);
      return;
    }
    
    if (!/[0-9]/.test(newPassword)) {
      setError('La contraseña debe contener al menos un número');
      setIsLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = await recoverPasswordByLicense(licenseNumber, newPassword);
      
      setSuccessMessage(`✅ ${result.message}. Usuario: ${result.username}`);
      
      // Limpiar campos
      setLicenseNumber('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        if (onRecoverySuccess) {
          onRecoverySuccess(result);
        } else {
          onBack();
        }
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al recuperar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }} className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full p-8 relative animate-scaleIn" style={{ maxWidth: '420px' }}>
        {/* Icon at top */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Key size={40} className="text-white" strokeWidth={3} />
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-800 mb-2">Recuperar Contraseña</h2>
          <p className="text-sm text-gray-600">Ingrese su cédula profesional para restablecer su contraseña</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-shake">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-1">Serás redirigido al login...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cédula Profesional
            </label>
            <input
              type="text"
              required
              placeholder="Ingrese su cédula profesional"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 outline-none transition-all text-base"
              disabled={isLoading || successMessage}
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo para personal de enfermería registrado
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="Ingrese nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 outline-none transition-all text-base"
              disabled={isLoading || successMessage}
              minLength={7}
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-gray-700">Requisitos de seguridad:</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length > 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${newPassword.length > 6 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Más de 6 caracteres</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 mayúscula</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[a-z]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 minúscula</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[0-9]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 número</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="Confirme la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 outline-none transition-all text-base"
              disabled={isLoading || successMessage}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || successMessage || !licenseNumber || !newPassword || !confirmPassword}
            className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Recuperando...</span>
              </div>
            ) : successMessage ? (
              'Contraseña Actualizada'
            ) : (
              'Restablecer Contraseña'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={onBack}
            disabled={isLoading}
            className="text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors inline-flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900 font-semibold mb-1">Ayuda:</p>
          <p className="text-xs text-blue-800">Si no recuerdas tu cédula profesional, contacta al administrador del sistema.</p>
        </div>
      </div>
    </div>
  );
}
