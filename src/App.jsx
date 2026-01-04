import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, Activity, Users, Pill, 
  LogOut, Heart, Stethoscope, AlertCircle, CheckCircle, 
  Menu, X, LayoutDashboard, Syringe, ClipboardList, ChevronRight, 
  Save, Building2, LineChart as ChartIcon, UserCircle 
} from 'lucide-react';
import { 
  usePatients, useAppointments, useTreatments, useVitalSigns, useNurseNotes, initializeApp 
} from './hooks/useDatabase';
import LoginForm from './components/LoginForm';
import ReportsAnalytics from './components/ReportsAnalytics';
import UserProfile from './components/UserProfile';

// --- COMPONENTES UI REUTILIZABLES ---

const StatCard = ({ title, value, icon: Icon, colorName, subtext }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  };
  const theme = colors[colorName] || colors.blue;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200 flex items-start justify-between transition-all hover:shadow-md animate-fadeIn">
      <div>
        <p className="text-hospital-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-hospital-800 mt-2">{value}</h3>
        {subtext && <p className="text-xs text-hospital-500 mt-1 font-medium flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${theme.bg} ${theme.ring} ring-2`}></span> {subtext}
        </p>}
      </div>
      <div className={`p-4 rounded-xl ${theme.bg} ${theme.text}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
    </div>
  );
};

// --- DASHBOARD PRINCIPAL DE ENFERMERÍA ---

const NurseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Hooks de Base de Datos (Conectados a SQLite)
  const { patients, updatePatient, loading: patientsLoading } = usePatients();
  const { appointments } = useAppointments();
  const { treatments, addTreatment: addTreatmentDB } = useTreatments();
  const { vitalSigns, addVitalSigns: addVitalSignsDB } = useVitalSigns();
  const { nurseNotes, addNurseNote: addNurseNoteDB } = useNurseNotes();

  // Estados locales para formularios de la Zona de Cuidados
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newVitalSigns, setNewVitalSigns] = useState({ temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '' });
  const [newMedication, setNewMedication] = useState({ medication: '', dose: '', frequency: '', notes: '' });
  const [newNote, setNewNote] = useState('');
  const [newCondition, setNewCondition] = useState('');

  // --- LÓGICA DE REGISTRO (ECU-06, ECU-09, ECU-05) ---

  const handleVitalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return alert("⚠️ Seleccione un paciente primero.");
    const now = new Date();
    try {
      await addVitalSignsDB({
        patient_id: parseInt(selectedPatientId),
        date: now.toLocaleString('es-MX'), // Formato fecha legible
        temperature: newVitalSigns.temperature,
        blood_pressure: newVitalSigns.bloodPressure,
        heart_rate: newVitalSigns.heartRate,
        respiratory_rate: newVitalSigns.respiratoryRate,
        registered_by: user.name
      });
      alert("✅ Signos vitales registrados en expediente.");
      setNewVitalSigns({ temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '' });
    } catch (error) { console.error(error); alert("Error al registrar: " + error.message); }
  };

  const handleMedicationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return alert("⚠️ Seleccione un paciente.");
    const now = new Date();
    try {
      await addTreatmentDB({
        patientId: parseInt(selectedPatientId),
        ...newMedication,
        startDate: now.toLocaleDateString(),
        appliedBy: user.name,
        lastApplication: now.toLocaleString(),
      });
      alert("✅ Medicamento registrado en Kardex.");
      setNewMedication({ medication: '', dose: '', frequency: '', notes: '' });
    } catch (error) { alert("Error al registrar medicamento."); }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !newNote) return;
    try {
      await addNurseNoteDB({
        patientId: parseInt(selectedPatientId),
        date: new Date().toLocaleString(),
        note: newNote,
        nurseName: user.name
      });
      setNewNote('');
      alert("✅ Nota SOAP guardada.");
    } catch (error) { alert("Error al guardar nota."); }
  };

  const handleConditionUpdate = async () => {
    if (!selectedPatientId || !newCondition) return;
    const patient = patients.find(p => p.id == selectedPatientId);
    if (!patient) return;
    try {
      await updatePatient(patient.id, { ...patient, condition: newCondition });
      alert(`✅ Estado clínico actualizado a: ${newCondition}`);
    } catch (error) { console.error(error); alert("Error al actualizar estado."); }
  };

  // --- VISTAS DEL DASHBOARD ---

  const OverviewView = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Pacientes Asignados" value={patients.length} icon={Users} colorName="blue" subtext="Turno Actual" />
        <StatCard title="Críticos" value={patients.filter(p => p.condition === 'Crítico').length} icon={AlertCircle} colorName="red" subtext="Atención Inmediata" />
        <StatCard title="Medicamentos" value={treatments.length} icon={Pill} colorName="emerald" subtext="Activos hoy" />
        <StatCard title="Citas" value={appointments.length} icon={Calendar} colorName="purple" subtext="Programadas" />
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-hospital-100 flex items-center justify-between bg-hospital-50">
          <h3 className="font-bold text-hospital-800 flex items-center gap-2">
            <Clock size={20} className="text-clinical-primary" />
            Bitácora Reciente del Turno
          </h3>
        </div>
        <div className="p-6">
          {nurseNotes.length > 0 ? (
            <div className="space-y-4">
              {nurseNotes.slice(0, 5).map((note, idx) => {
                 const pt = patients.find(p => p.id === note.patient_id || p.id === note.patientId);
                 return (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b border-hospital-100 last:border-0">
                    <div className="bg-blue-50 p-2 rounded-lg text-clinical-primary mt-1">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-hospital-800">
                        {note.note_type || 'Nota'} - {pt ? pt.name : 'Paciente Desconocido'}
                      </p>
                      <p className="text-sm text-hospital-600 italic">"{note.note}"</p>
                      <p className="text-xs text-hospital-400 mt-1 font-medium">{note.date} por {note.nurseName}</p>
                    </div>
                  </div>
                 )
              })}
            </div>
          ) : <p className="text-hospital-400 italic text-center py-4">No hay actividad reciente registrada.</p>}
        </div>
      </div>
    </div>
  );

  const PatientsListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden animate-fadeIn">
      <div className="px-6 py-5 border-b border-hospital-100 bg-hospital-50">
        <h3 className="font-bold text-hospital-800 flex items-center gap-2">
            <Users size={20} className="text-clinical-primary" />
            Directorio de Pacientes Asignados (ECU-03)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-hospital-50 text-hospital-500 text-xs uppercase font-bold tracking-wider border-b border-hospital-100">
            <tr>
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Diagnóstico</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hospital-100">
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-hospital-900">{patient.name}</div>
                  <div className="text-xs text-hospital-500">{patient.age} años | {patient.bloodType}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-hospital-700 font-medium">
                    <Building2 size={16} className="text-hospital-400"/> {patient.room}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-hospital-600">
                  {patient.diagnosis || 'En valoración'}
                  {patient.allergies && <div className="text-xs text-red-500 font-bold mt-1">⚠️ {patient.allergies}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                    ${patient.condition === 'Crítico' ? 'bg-red-50 text-red-700 border-red-100' : 
                      patient.condition === 'Estable' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {patient.condition}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => { setSelectedPatientId(patient.id); setActiveTab('care'); }}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded-xl hover:bg-clinical-dark transition shadow-sm hover:shadow-md"
                  >
                    Atender <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CareView = () => {
    const selectedPatient = patients.find(p => p.id == selectedPatientId);
    
    return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fadeIn items-start">
      {/* COLUMNA IZQUIERDA: Contexto del Paciente */}
      <div className="xl:col-span-1 space-y-6 xl:sticky xl:top-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200">
          <label className="block text-xs font-bold text-hospital-500 uppercase mb-2 ml-1">Seleccionar Paciente</label>
          <div className="relative">
            <select 
              className="w-full p-3 pl-10 bg-hospital-50 border border-hospital-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-primary font-medium text-hospital-700 transition"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">-- Buscar paciente --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.room}</option>
              ))}
            </select>
            <User className="absolute left-3 top-3.5 text-hospital-400" size={20} />
          </div>

          {selectedPatient ? (
            <div className="mt-6 animate-scaleIn">
              <div className="p-5 bg-clinical-primary/5 rounded-2xl border border-clinical-primary/20 mb-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-clinical-primary text-white flex items-center justify-center font-bold text-xl shadow-lg">
                        {selectedPatient.name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-hospital-900 text-lg leading-tight">{selectedPatient.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-hospital-600 mt-1">
                           <span className="bg-white px-2 py-0.5 rounded border border-hospital-200">ID: {selectedPatient.id}</span>
                           <span>{selectedPatient.age} años</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`p-3 rounded-xl border ${selectedPatient.allergies ? 'bg-red-50 border-red-200' : 'bg-white border-hospital-100'}`}>
                     <span className="text-xs font-bold uppercase block mb-1 text-hospital-500">Alergias</span>
                     <span className={`font-bold ${selectedPatient.allergies ? 'text-red-600' : 'text-emerald-600'}`}>
                        {selectedPatient.allergies || 'Ninguna'}
                     </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-hospital-100">
                    <span className="text-xs font-bold uppercase block mb-1 text-hospital-500">Sangre</span>
                    <span className="font-bold text-hospital-800">{selectedPatient.bloodType}</span>
                  </div>
                </div>
              </div>

              {/* Actualizar Estado */}
              <div className="p-4 bg-white border-2 border-hospital-100 rounded-2xl">
                <label className="block text-xs font-bold text-hospital-500 uppercase mb-2">Condición Clínica</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2.5 bg-hospital-50 border border-hospital-200 rounded-xl text-sm font-bold text-hospital-700 outline-none"
                    value={newCondition || selectedPatient.condition}
                    onChange={(e) => setNewCondition(e.target.value)}
                  >
                    <option value="Estable">🟢 Estable</option>
                    <option value="Crítico">🔴 Crítico</option>
                    <option value="Recuperación">🔵 Recuperación</option>
                    <option value="Observación">🟡 Observación</option>
                  </select>
                  <button onClick={handleConditionUpdate} className="bg-hospital-900 text-white p-2.5 rounded-xl hover:bg-black transition shadow-sm">
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-8 border-2 border-dashed border-hospital-200 rounded-2xl text-center bg-hospital-50/50">
                <Stethoscope size={40} className="text-hospital-300 mx-auto mb-3" />
                <p className="text-hospital-500 font-medium text-sm">Seleccione un paciente para habilitar los formularios de registro.</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: Formularios de Acción */}
      {selectedPatient && (
        <div className="xl:col-span-2 space-y-6">
          {/* ECU-06: Signos Vitales */}
          <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden">
            <div className="p-5 border-b border-hospital-100 bg-hospital-50 flex items-center gap-3">
              <div className="bg-clinical-primary p-2 rounded-lg text-white"><Activity size={20}/></div>
              <h3 className="font-bold text-hospital-800">Registrar Signos Vitales</h3>
            </div>
            <form onSubmit={handleVitalSubmit} className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Temp (°C)', name: 'temperature', ph: '36.5' },
                  { label: 'Presión', name: 'bloodPressure', ph: '120/80' },
                  { label: 'Frec. Card.', name: 'heartRate', ph: '80' },
                  { label: 'Frec. Resp.', name: 'respiratoryRate', ph: '18' }
                ].map((field) => (
                  <div key={field.name}>
                    <label className="text-xs font-bold text-hospital-500 mb-1 block ml-1">{field.label}</label>
                    <input 
                      type="text" required placeholder={field.ph} 
                      className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-bold text-hospital-800 outline-none focus:border-clinical-primary transition"
                      value={newVitalSigns[field.name]} 
                      onChange={e => setNewVitalSigns({...newVitalSigns, [field.name]: e.target.value})} 
                    />
                  </div>
                ))}
              </div>
              <button type="submit" className="mt-6 w-full py-3 bg-clinical-primary text-white rounded-xl font-bold hover:bg-clinical-dark transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                <CheckCircle size={18} /> Guardar Registro
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ECU-09: Medicamentos */}
            <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden">
              <div className="p-5 border-b border-hospital-100 bg-hospital-50 flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-white"><Syringe size={20}/></div>
                <h3 className="font-bold text-hospital-800">Medicamentos</h3>
              </div>
              <form onSubmit={handleMedicationSubmit} className="p-5 space-y-4">
                <input type="text" required placeholder="Nombre del Fármaco" className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-emerald-500 transition"
                  value={newMedication.medication} onChange={e => setNewMedication({...newMedication, medication: e.target.value})} />
                <div className="flex gap-3">
                  <input type="text" required placeholder="Dosis" className="flex-1 p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-emerald-500 transition"
                    value={newMedication.dose} onChange={e => setNewMedication({...newMedication, dose: e.target.value})} />
                  <input type="text" required placeholder="Frecuencia" className="flex-1 p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-emerald-500 transition"
                    value={newMedication.frequency} onChange={e => setNewMedication({...newMedication, frequency: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition shadow-lg shadow-emerald-100">
                  Registrar Aplicación
                </button>
              </form>
            </div>

            {/* ECU-05: Notas */}
            <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-hospital-100 bg-hospital-50 flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg text-white"><ClipboardList size={20}/></div>
                <h3 className="font-bold text-hospital-800">Nota Evolutiva</h3>
              </div>
              <form onSubmit={handleNoteSubmit} className="p-5 flex-1 flex flex-col">
                <textarea required rows="4" placeholder="Observaciones SOAP..." 
                  className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-purple-500 transition resize-none flex-1 mb-4"
                  value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
                <button type="submit" className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition shadow-lg shadow-purple-100 mt-auto">
                  Guardar Nota
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );};

  // --- ESTRUCTURA PRINCIPAL (SIDEBAR + MAIN) ---
  return (
    <div className="flex h-screen bg-hospital-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-24'} bg-hospital-900 text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-4 border-b border-hospital-800 mb-2">
          <div className="bg-clinical-primary p-2.5 rounded-xl shadow-lg shadow-clinical-primary/30">
            <Activity size={26} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="font-black text-xl leading-none tracking-tight">San Rafael</h1>
              <span className="text-xs text-hospital-400 font-medium tracking-wide">Gestión Clínica</span>
            </div>
          )}
        </div>
        
        {/* Toggle Sidebar */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute -right-3 top-24 bg-white text-hospital-900 p-1 rounded-full shadow-md border border-hospital-200 hover:scale-110 transition z-30 hidden md:block">
           <ChevronRight size={14} className={sidebarOpen ? 'rotate-180' : ''}/>
        </button>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {/* Sección Clínica */}
          {sidebarOpen && <p className="px-2 text-xs font-bold text-hospital-500 uppercase tracking-wider mb-2 mt-2">Módulos Clínicos</p>}
          {[
            { id: 'overview', label: 'Resumen del Turno', icon: LayoutDashboard },
            { id: 'patients', label: 'Pacientes Asignados', icon: Users },
            { id: 'care', label: 'Zona de Cuidados', icon: Stethoscope },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-clinical-primary text-white shadow-lg shadow-clinical-primary/20 translate-x-1' 
                  : 'text-hospital-400 hover:bg-hospital-800 hover:text-white'
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Sección Administrativa */}
          <div className="my-4 border-t border-hospital-800"></div>
          {sidebarOpen && <p className="px-2 text-xs font-bold text-hospital-500 uppercase tracking-wider mb-2">Expediente y Personal</p>}
          
          {[
            { id: 'history', label: 'Historiales y Gráficas', icon: ChartIcon }, // NUEVO Módulo 6
            { id: 'profile', label: 'Mi Jornada Laboral', icon: UserCircle },   // NUEVO Módulo 7
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-clinical-primary text-white shadow-lg shadow-clinical-primary/20 translate-x-1' 
                  : 'text-hospital-400 hover:bg-hospital-800 hover:text-white'
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer Usuario */}
        <div className="p-4 border-t border-hospital-800 bg-hospital-900/50">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-clinical-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
               {user.name.charAt(0)}
             </div>
             {sidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-white truncate">{user.name}</p>
                 <p className="text-xs text-hospital-400 truncate">Cédula: {user.cedula}</p>
               </div>
             )}
          </div>
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-400 bg-red-900/10 hover:bg-red-900/30 hover:text-red-300 transition-colors font-bold text-sm border border-red-900/20 ${!sidebarOpen && 'px-0'}`}>
            <LogOut size={18} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative flex flex-col bg-hospital-50">
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-hospital-200 z-10 px-8 py-5 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-hospital-800 tracking-tight">
              {activeTab === 'overview' && 'Tablero de Control'}
              {activeTab === 'patients' && 'Lista de Pacientes'}
              {activeTab === 'care' && 'Gestión de Cuidados'}
              {activeTab === 'history' && 'Análisis Clínico'}
              {activeTab === 'profile' && 'Perfil Profesional'}
            </h2>
            <p className="text-hospital-500 text-sm font-medium flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema en línea • {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="hidden md:block">
             <div className="bg-hospital-50 px-4 py-2 rounded-xl border border-hospital-200 text-xs font-bold text-hospital-600 uppercase tracking-wide">
                Turno: {user.shift?.start || '00:00'} - {user.shift?.end || '00:00'}
             </div>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1">
          {patientsLoading ? (
            <div className="flex h-full items-center justify-center flex-col gap-4 opacity-60">
              <div className="w-12 h-12 border-4 border-clinical-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-hospital-600 animate-pulse">Sincronizando base de datos...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewView />}
              {activeTab === 'patients' && <PatientsListView />}
              {activeTab === 'care' && <CareView />}
              
              {/* NUEVOS MÓDULOS IMPORTADOS */}
              {activeTab === 'history' && (
                <ReportsAnalytics 
                  patients={patients} 
                  vitalSigns={vitalSigns} 
                  treatments={treatments} 
                  nurseNotes={nurseNotes} 
                />
              )}
              {activeTab === 'profile' && <UserProfile user={user} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// --- PUNTO DE ENTRADA (APP) ---

const HospitalManagementSystem = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [appInitialized, setAppInitialized] = useState(false);

  // Inicialización de la BD al arrancar
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        // Pequeño delay para asegurar que el seeding termine en máquinas lentas
        setTimeout(() => setAppInitialized(true), 1000);
      } catch (err) {
        console.error("Error iniciando app:", err);
      }
    };
    init();
  }, []);

  if (!appInitialized) return (
    <div className="h-screen flex items-center justify-center bg-hospital-50 flex-col gap-6">
       <Activity size={60} className="text-clinical-primary animate-bounce"/>
       <div className="text-center">
         <h2 className="text-2xl font-black text-hospital-800">Hospital San Rafael</h2>
         <p className="text-hospital-500 font-medium mt-2">Cargando Sistema Integral...</p>
       </div>
    </div>
  );

  return (
    <>
      {!currentUser ? (
        <LoginForm onLoginSuccess={setCurrentUser} />
      ) : (
        <NurseDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
      )}
    </>
  );
};

export default HospitalManagementSystem;
