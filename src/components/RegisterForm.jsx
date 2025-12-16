import React, { useState } from 'react';
import { UserPlus, User, Lock, Mail, ArrowLeft, Activity, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { register as authRegister } from '../services/auth';

export default function RegisterForm({ onRegisterSuccess, onBackToHome }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'nurse'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the actual registration function
      await authRegister(formData);
      
      // Show success message
      alert("✅ Cuenta creada correctamente. Por favor inicie sesión.");
      onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrarse');
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
    }} className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full p-8 relative animate-scaleIn max-h-[95vh] overflow-y-auto" style={{ maxWidth: '360px' }}>
        {/* Back button */}
        <button 
          onClick={onBackToHome} 
          className="absolute top-6 left-6 text-gray-600 hover:text-emerald-600 transition-all flex items-center gap-2 font-semibold text-sm"
        >
          <ArrowLeft size={18} /> Volver
        </button>

        {/* Icon at top */}
        <div className="flex justify-center mb-6 mt-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <UserPlus size={40} className="text-white" strokeWidth={3} />
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-800 mb-2">Crear Cuenta</h2>
          <p className="text-gray-600 font-medium">Únete al equipo médico</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="Dr. Juan Pérez"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <ShieldCheck size={20} />
              </div>
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="usuario123"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="medico@hospital.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="Contraseña segura"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="mt-2 space-y-1 bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-bold text-gray-700 mb-1.5">Requisitos de seguridad:</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length > 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${formData.password.length > 6 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Más de 6 caracteres</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 mayúscula</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[a-z]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 minúscula</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className={`text-xs ${/[0-9]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>Al menos 1 número</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">¿Ya tienes cuenta?</p>
          <button 
            onClick={onBackToHome} 
            className="text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors inline-flex items-center gap-1"
          >
            Iniciar Sesión <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
