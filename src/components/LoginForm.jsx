import React, { useState } from 'react';
import { Activity, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { login as authLogin } from '../services/auth';

export default function LoginForm({ onLoginSuccess }) {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Llamada al servicio auth.js (que consulta SQLite)
      const user = await authLogin(cedula, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-hospital-50 p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl grid md:grid-cols-5 overflow-hidden border border-hospital-100 animate-scaleIn">
        
        {/* Lado Izquierdo (Branding) */}
        <div className="hidden md:flex md:col-span-2 bg-gradient-to-br from-clinical-primary to-clinical-dark p-10 flex-col justify-between text-white relative">
          <Activity size={100} className="absolute -top-5 -right-5 opacity-10" />
          <div>
            <h1 className="text-3xl font-black leading-tight mb-2">Hospital<br/>San Rafael</h1>
            <p className="text-blue-100 font-medium">Gestión de Enfermería</p>
          </div>
          <div className="text-xs text-blue-200 space-y-1">
            <p>• Cumplimiento NOM-004</p>
            <p>• Acceso Seguro SSL</p>
            <p>v2.5.0 Enterprise</p>
          </div>
        </div>

        {/* Lado Derecho (Formulario) */}
        <div className="md:col-span-3 p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-hospital-800 mb-6">Iniciar Sesión</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-pulse">
              <AlertCircle size={20}/> <span className="font-bold text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-hospital-500 uppercase mb-2 ml-1">Cédula Profesional</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-hospital-400 group-focus-within:text-clinical-primary transition-colors" size={20} />
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-hospital-50 border border-hospital-200 rounded-xl focus:bg-white focus:border-clinical-primary focus:ring-4 focus:ring-blue-50 outline-none font-bold text-hospital-800 transition-all placeholder:font-normal placeholder:text-hospital-300"
                  placeholder="Ej. ENF-12345"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-hospital-500 uppercase mb-2 ml-1">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-hospital-400 group-focus-within:text-clinical-primary transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-hospital-50 border border-hospital-200 rounded-xl focus:bg-white focus:border-clinical-primary focus:ring-4 focus:ring-blue-50 outline-none font-bold text-hospital-800 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-4 bg-clinical-primary text-white rounded-xl font-bold hover:bg-clinical-dark transition shadow-xl shadow-blue-200/50 flex justify-center items-center gap-2 disabled:opacity-70 mt-2">
              {isLoading ? 'Verificando...' : <>Acceder al Sistema <ArrowRight size={20}/></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-hospital-100 text-center">
            <p className="text-hospital-400 text-xs mb-2">Credenciales Demo (ADS):</p>
            <div className="inline-block bg-hospital-50 px-4 py-2 rounded-lg border border-hospital-200 text-xs text-hospital-600 font-mono">
              User: <b>ENF-12345</b> &nbsp;|&nbsp; Pass: <b>enfermeros123</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
