import React, { useEffect, useState } from 'react';
import { User, Clock, MapPin, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';

export default function UserProfile({ user }) {
  const [shiftStatus, setShiftStatus] = useState('checking');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Actualizar cada minuto

    const checkShift = () => {
      // Si no hay datos de turno, asumimos desconocido
      if (!user.shift || !user.shift.start) return 'unknown';
      
      const now = new Date();
      // Convertir hora actual a decimal (ej: 14:30 -> 14.5)
      const currentH = now.getHours() + now.getMinutes() / 60;
      
      // Parsear horas de inicio y fin (ej: "06:00")
      const [sh, sm] = user.shift.start.split(':').map(Number);
      const [eh, em] = user.shift.end.split(':').map(Number);
      
      const start = sh + sm/60;
      const end = eh + em/60;

      // Validación simple (asume turno en el mismo día)
      if (currentH >= start && currentH < end) {
        return 'active';
      }
      return 'inactive'; // Fuera de turno -> ERR-15
    };

    setShiftStatus(checkShift());
    return () => clearInterval(timer);
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Perfil */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-hospital-200 flex items-center gap-6">
        <div className="w-24 h-24 bg-clinical-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-3xl font-black text-hospital-900">{user.name}</h2>
          <div className="flex gap-4 mt-2 text-sm font-medium text-hospital-500">
             <span className="flex items-center gap-1"><Briefcase size={16}/> Enfermería General</span>
             <span className="bg-blue-50 text-clinical-primary px-2 py-0.5 rounded border border-blue-100">Cédula: {user.cedula}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
           <p className="text-xs uppercase font-bold text-hospital-400">Hora Sistema</p>
           <p className="text-2xl font-mono font-bold text-hospital-800">
             {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
           </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Detalle Jornada (ECU-14) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200">
           <h3 className="font-bold text-hospital-800 mb-4 flex items-center gap-2">
             <Clock className="text-clinical-primary"/> Mi Jornada Laboral
           </h3>
           <div className="space-y-3">
             <div className="flex justify-between p-3 bg-hospital-50 rounded-xl">
               <span className="text-hospital-500 text-sm">Horario</span>
               <span className="font-bold text-hospital-800">{user.shift?.start} - {user.shift?.end}</span>
             </div>
             <div className="flex justify-between p-3 bg-hospital-50 rounded-xl">
               <span className="text-hospital-500 text-sm">Ubicación</span>
               <span className="font-bold text-hospital-800 flex items-center gap-1"><MapPin size={14}/> {user.shift?.area}</span>
             </div>
           </div>
        </div>

        {/* Estado y Error (ERR-15) */}
        <div className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center text-center ${
          shiftStatus === 'active' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
        }`}>
           {shiftStatus === 'active' ? (
             <>
               <CheckCircle size={40} className="text-emerald-500 mb-2"/>
               <h3 className="text-xl font-bold text-emerald-800">Jornada Activa</h3>
               <p className="text-emerald-600 text-sm">Sistema habilitado para registros.</p>
             </>
           ) : (
             <>
               <AlertTriangle size={40} className="text-red-500 mb-2"/>
               <h3 className="text-xl font-bold text-red-800">Fuera de Horario</h3>
               <div className="bg-white px-3 py-1 rounded border border-red-200 text-red-600 font-mono font-bold text-xs mt-2 mb-2">CODIGO: ERR-15</div>
               <p className="text-red-600 text-sm">No tiene una jornada laboral activa. El acceso a edición está restringido.</p>
             </>
           )}
        </div>
      </div>
    </div>
  );
}
