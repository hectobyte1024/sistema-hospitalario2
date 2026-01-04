import React, { useState } from 'react';
import { Key, ArrowLeft, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { requestPasswordRecovery } from '../services/auth';

export default function PasswordRecoveryForm({ onBack, onRecoverySuccess }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = await requestPasswordRecovery(licenseNumber);
      
      // MSG-02: Mensaje de éxito
      setSuccessMessage('MSG-02: Se envió un correo para la recuperación de contraseña. Revise su correo institucional para seguir las instrucciones.');
      
      // Limpiar campo
      setLicenseNumber('');
      
      // Redirigir al login después de 5 segundos
      setTimeout(() => {
        if (onRecoverySuccess) {
          onRecoverySuccess(result);
        } else {
          onBack();
        }
      }, 5000);
    } catch (err) {
      // ERR-03: Error de cédula inexistente
      if (err.message.includes('No se encontró') || err.message.includes('no existe')) {
        setError('ERR-03: Cédula inexistente');
      } else {
        setError(err.message || 'Error al solicitar recuperación de contraseña');
      }
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
          <p className="text-sm text-gray-600">Ingrese su cédula profesional. Le enviaremos las instrucciones a su correo institucional.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-shake">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3 animate-scaleIn">
            <Mail size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-800 font-semibold">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-2">⏱️ Será redirigido al login en 5 segundos...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cédula Profesional
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ingrese su cédula profesional"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 outline-none transition-all text-base font-medium"
                disabled={isLoading || successMessage}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              Solo para personal de enfermería registrado
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || successMessage || !licenseNumber}
            className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </div>
            ) : successMessage ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                Correo Enviado
              </span>
            ) : (
              'Enviar Correo de Recuperación'
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
          <p className="text-sm text-blue-900 font-semibold mb-1 flex items-center gap-1.5">
            <Mail size={14} />
            Nota Importante:
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">El enlace de recuperación será enviado a su correo institucional registrado. Si no tiene acceso a su correo o no recuerda su cédula profesional, contacte al administrador del sistema.</p>
        </div>
      </div>
    </div>
  );
}
