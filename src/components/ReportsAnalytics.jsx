import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FileText, Activity, Pill, User } from 'lucide-react';

export default function ReportsAnalytics({ patients, vitalSigns, treatments, nurseNotes }) {
  const [activeTab, setActiveTab] = useState('vitals');
  // Seleccionar el primer paciente por defecto si existe
  const [selectedPatientId, setSelectedPatientId] = useState(patients.length > 0 ? patients[0].id : '');

  // Filtrar datos para el paciente seleccionado
  const patientVitals = vitalSigns.filter(v => v.patient_id == selectedPatientId || v.patientId == selectedPatientId);
  const patientNotes = nurseNotes.filter(n => n.patient_id == selectedPatientId || n.patientId == selectedPatientId);
  const patientMeds = treatments.filter(t => t.patient_id == selectedPatientId || t.patientId == selectedPatientId);

  // Formatear datos para la gráfica (ECU-11)
  const chartData = patientVitals.map(v => ({
    time: v.date.split(' ')[1] || v.date, // Extraer hora si es fecha larga
    fullDate: v.date,
    temp: parseFloat(v.temperature),
    hr: parseFloat(v.heart_rate || v.heartRate),
    bp: v.blood_pressure || v.bloodPressure
  })).slice(-10); // Mostrar últimos 10 puntos

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header y Selector */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-hospital-200 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-hospital-800">Expediente Clínico y Tendencias</h2>
           <p className="text-hospital-500 text-sm">Visualización histórica de datos</p>
        </div>
        <div className="flex items-center gap-2 bg-hospital-50 p-2 rounded-xl border border-hospital-100">
           <User size={20} className="text-hospital-400 ml-2"/>
           <select 
             className="bg-transparent font-bold text-hospital-800 outline-none cursor-pointer"
             value={selectedPatientId}
             onChange={(e) => setSelectedPatientId(e.target.value)}
           >
             {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hospital-200">
        {[
          { id: 'vitals', label: 'Gráficas Vitales', icon: Activity },
          { id: 'notes', label: 'Historial Notas', icon: FileText },
          { id: 'meds', label: 'Kardex Medicamentos', icon: Pill },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-t-xl flex items-center gap-2 font-bold transition ${
              activeTab === tab.id ? 'bg-clinical-primary text-white' : 'text-hospital-500 hover:bg-hospital-100'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* VISTA GRÁFICA (ECU-11) */}
      {activeTab === 'vitals' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200 h-96">
            <h3 className="font-bold text-hospital-800 mb-4">Evolución 24 Horas (Temp / FC)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="temp" name="Temperatura (°C)" stroke="#ef4444" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} />
                <Area type="monotone" dataKey="hr" name="Frec. Cardíaca" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorHr)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      )}

      {/* VISTA NOTAS (ECU-06B) */}
      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200 space-y-4">
           {patientNotes.length > 0 ? patientNotes.map((note, i) => (
             <div key={i} className="border-l-4 border-clinical-primary bg-hospital-50 p-4 rounded-r-xl">
                <div className="flex justify-between items-start mb-2">
                   <span className="font-bold text-clinical-primary text-xs uppercase">{note.note_type || 'Evolución'}</span>
                   <span className="text-hospital-400 text-xs">{note.date}</span>
                </div>
                <p className="text-hospital-800 text-sm">{note.note}</p>
                <p className="text-right text-xs text-hospital-500 mt-2 font-bold">{note.nurseName}</p>
             </div>
           )) : <p className="text-center text-hospital-400">No hay notas registradas.</p>}
        </div>
      )}

      {/* VISTA MEDICAMENTOS (ECU-09B) */}
      {activeTab === 'meds' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200">
           <table className="w-full text-left">
             <thead className="bg-emerald-50 text-emerald-800 text-sm uppercase">
               <tr><th className="p-3">Medicamento</th><th className="p-3">Dosis</th><th className="p-3">Frecuencia</th><th className="p-3">Estado</th></tr>
             </thead>
             <tbody className="text-sm text-hospital-600">
               {patientMeds.map((med, i) => (
                 <tr key={i} className="border-b border-emerald-100 hover:bg-emerald-50/50">
                   <td className="p-3 font-bold">{med.medication}</td>
                   <td className="p-3">{med.dose}</td>
                   <td className="p-3">{med.frequency}</td>
                   <td className="p-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Activo</span></td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
