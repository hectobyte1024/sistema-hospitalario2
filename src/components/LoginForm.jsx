import React, { useState } from 'react';
import { Activity, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { login as authLogin } from '../services/auth';

export default function LoginForm({ onLoginSuccess, onBackToHome, onShowRegister, onShowPasswordRecovery }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Pequeño timeout para simular carga y que se vea el spinner
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = await authLogin(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
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
    }} className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full p-8 relative animate-scaleIn" style={{ maxWidth: '360px' }}>
        {/* Icon at top */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity size={40} className="text-white" strokeWidth={3} />
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-800 mb-2">Sistema Gestor Hospitalario</h2>
          <p className="text-gray-600 font-medium">Módulo de Enfermería</p>
        </div>
          
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cédula</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="Ingrese su cédula"
                required
                disabled={isLoading}
                autoFocus
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="Ingrese su contraseña"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Iniciando...</span>
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        
        <div className="text-center mt-6">
          <button 
            onClick={onShowPasswordRecovery}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
          >
            ¿Olvidó su contraseña?
          </button>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-900 font-semibold mb-1">Demo:</p>
          <p className="text-xs text-amber-800">Usuario: <span className="font-mono font-bold">enfermero</span> / Contraseña: <span className="font-mono font-bold">Enfermero123</span></p>
          <p className="text-xs text-amber-700 mt-1">Cédula profesional: <span className="font-mono font-bold">1234567</span></p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">¿No tienes una cuenta?</p>
          <button 
            onClick={onShowRegister} 
            className="text-blue-600 hover:text-blue-700 font-bold text-sm transition-colors inline-flex items-center gap-1"
          >
            Crear cuenta nueva <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
