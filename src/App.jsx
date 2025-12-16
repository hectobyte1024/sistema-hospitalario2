import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, Activity, Users, Pill, 
  LogOut, Heart, Stethoscope, AlertCircle, CheckCircle, 
  Menu, X, LayoutDashboard, Syringe, ClipboardList, ChevronRight, Save, Building2, ShieldCheck, Bed, Edit2
} from 'lucide-react';
import { usePatients, useAppointments, useTreatments, useVitalSigns, useNurseNotes, useNonPharmaTreatments, initializeApp } from './hooks/useDatabase';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PasswordRecoveryForm from './components/PasswordRecoveryForm';
import { validateAllVitalSigns, getStatusColor, getStatusIcon } from './utils/vitalSignsValidation';
import { 
  filterPatientsByAssignment, 
  getNurseAssignmentStats, 
  getAccessRestrictionMessage,
  checkShiftStatus,
  getCurrentShift
} from './utils/nurseAssignments';
import BedManagement from './components/BedManagement';
import {
  validateMedicationForPatient,
  generateAlertMessage,
  getSeverityColors,
  getSeverityLabel,
  formatAllergiesForDisplay,
  canOverrideAllergyWarning
} from './utils/allergyValidation';
import { logAllergyAlert, editNurseNote, getNoteEditHistory } from './services/database';

// --- COMPONENTES UI REUTILIZABLES (Tarjetas, Encabezados) ---

// Tarjeta de Estadísticas del Dashboard - Enhanced with vibrant gradients
const StatCard = ({ title, value, icon: Icon, colorName, subtext, onClick }) => {
  const colors = {
    blue: { 
      gradient: 'from-blue-500 to-cyan-500', 
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50', 
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      glow: 'shadow-blue-500/20',
      ring: 'ring-blue-200'
    },
    red: { 
      gradient: 'from-rose-500 to-red-500', 
      bg: 'bg-gradient-to-br from-rose-50 to-red-50', 
      iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
      glow: 'shadow-rose-500/20',
      ring: 'ring-rose-200'
    },
    emerald: { 
      gradient: 'from-emerald-500 to-teal-500', 
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', 
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/20',
      ring: 'ring-emerald-200'
    },
    purple: { 
      gradient: 'from-purple-500 to-pink-500', 
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50', 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      glow: 'shadow-purple-500/20',
      ring: 'ring-purple-200'
    },
    orange: { 
      gradient: 'from-orange-500 to-amber-500', 
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50', 
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
      glow: 'shadow-orange-500/20',
      ring: 'ring-orange-200'
    },
  };
  const theme = colors[colorName] || colors.blue;

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden ${theme.bg} p-6 rounded-2xl border-2 border-white shadow-lg ${theme.glow} flex items-start justify-between transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <p className="text-gray-600 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className={`text-4xl font-black bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent mt-1`}>{value}</h3>
        {subtext && (
          <p className="text-xs text-gray-600 mt-3 font-semibold flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${theme.gradient} ${theme.ring} ring-2 animate-pulse`}></span> 
            {subtext}
          </p>
        )}
      </div>
      <div className={`relative z-10 ${theme.iconBg} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
        <Icon size={32} strokeWidth={2.5} />
      </div>
    </div>
  );
};

// Encabezado de Sección con Icono - Enhanced with gradients
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-500 to-amber-500'
  };
  return (
    <div className="mb-8 flex items-center gap-4">
      <div className={`p-3 bg-gradient-to-br ${colors[color]} rounded-2xl text-white shadow-lg`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <h2 className={`text-2xl font-black bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>{title}</h2>
        {subtitle && <p className="text-gray-600 text-sm font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// --- DASHBOARD PRINCIPAL DE ENFERMERÍA ---

const NurseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Hooks de Base de Datos (Tu lógica original intacta)
  const { patients: allPatients, updatePatient, loading: patientsLoading } = usePatients();
  const { appointments } = useAppointments();
  const { treatments, addTreatment: addTreatmentDB } = useTreatments();
  const { vitalSigns, addVitalSigns: addVitalSignsDB } = useVitalSigns();
  const { nurseNotes, addNurseNote: addNurseNoteDB } = useNurseNotes();
  const { nonPharmaTreatments, addNonPharmaTreatment: addNonPharmaTreatmentDB } = useNonPharmaTreatments();

  // Estados locales para formularios
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newVitalSigns, setNewVitalSigns] = useState({ temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '' });
  const [vitalSignsValidation, setVitalSignsValidation] = useState(null);
  const [newMedication, setNewMedication] = useState({ medication: '', dose: '', frequency: '', notes: '' });
  const [allergyAlert, setAllergyAlert] = useState(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [pendingMedication, setPendingMedication] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newNonPharmaTreatment, setNewNonPharmaTreatment] = useState({
    treatmentType: '',
    description: '',
    duration: '',
    materialsUsed: '',
    observations: ''
  });
  
  // Note editing states
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteReason, setEditNoteReason] = useState('');
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [selectedNoteHistory, setSelectedNoteHistory] = useState(null);
  const [showNoteHistoryModal, setShowNoteHistoryModal] = useState(false);
  const [noteEditHistory, setNoteEditHistory] = useState([]);
  
  const [nursingSheetData, setNursingSheetData] = useState({
    shiftDate: new Date().toISOString().split('T')[0],
    shiftType: '',
    startTime: '',
    endTime: '',
    patientsAssigned: '',
    proceduresPerformed: '',
    interventions: '',
    relevantEvents: '',
    vitalSignsSummary: '',
    medicationsAdministered: '',
    pendingTasks: '',
    handoverNotes: '',
    generalObservations: '',
    incidents: '',
    supervisorName: ''
  });

  // Mock de ubicaciones completas y traslados (en producción vendría de la BD)
  const [patientLocations] = useState({
    1: { floor: 3, area: 'Cardiología', room: '305', bed: 'A' },
    2: { floor: 2, area: 'Neumología', room: '210', bed: 'B' },
    3: { floor: 4, area: 'Geriatría', room: '405', bed: 'A' },
    4: { floor: 1, area: 'Urgencias', room: '105', bed: 'C' },
    5: { floor: 3, area: 'Cirugía', room: '310', bed: 'B' },
    6: { floor: 2, area: 'Medicina Interna', room: '215', bed: 'A' },
    7: { floor: 5, area: 'UCI', room: '501', bed: 'A' },
    8: { floor: 1, area: 'Urgencias', room: '108', bed: 'B' },
    9: { floor: 4, area: 'Pediatría', room: '402', bed: 'C' },
    10: { floor: 3, area: 'Cardiología', room: '308', bed: 'D' },
  });

  const [transferHistory] = useState([
    { patientId: 1, date: '2025-12-15 08:30', from: 'Piso 2, UCI, Hab. 201, Cama A', to: 'Piso 3, Cardiología, Hab. 305, Cama A', reason: 'Mejora clínica - Alta de UCI', nurse: 'Enf. María González' },
    { patientId: 2, date: '2025-12-14 15:45', from: 'Piso 1, Emergencias, Hab. 102, Cama C', to: 'Piso 2, Neumología, Hab. 210, Cama B', reason: 'Estabilización - Ingreso a piso', nurse: 'Enf. Juan Pérez' },
    { patientId: 1, date: '2025-12-13 22:15', from: 'Piso 1, Emergencias, Hab. 105, Cama A', to: 'Piso 2, UCI, Hab. 201, Cama A', reason: 'Deterioro respiratorio - Requiere monitoreo intensivo', nurse: 'Enf. Ana López' },
  ]);

  // Agregar asignaciones al usuario si no existen (parsear desde BD)
  const userWithAssignments = {
    ...user,
    assignedFloors: user.assignedFloors || user.assigned_floors ? 
      (typeof user.assignedFloors === 'string' ? JSON.parse(user.assignedFloors) : 
       typeof user.assigned_floors === 'string' ? JSON.parse(user.assigned_floors) : 
       user.assignedFloors || user.assigned_floors) : null,
    assignedShifts: user.assignedShifts || user.assigned_shifts ? 
      (typeof user.assignedShifts === 'string' ? JSON.parse(user.assignedShifts) : 
       typeof user.assigned_shifts === 'string' ? JSON.parse(user.assigned_shifts) : 
       user.assignedShifts || user.assigned_shifts) : null
  };

  // Filtrar pacientes según asignaciones
  const patients = filterPatientsByAssignment(allPatients, userWithAssignments, patientLocations);
  
  // Estadísticas de asignación
  const assignmentStats = getNurseAssignmentStats(userWithAssignments, allPatients, patientLocations);
  const accessRestriction = getAccessRestrictionMessage(userWithAssignments);
  const shiftStatus = checkShiftStatus(userWithAssignments);
  const currentShift = getCurrentShift();

  // Función para obtener ubicación completa de un paciente
  const getPatientLocation = (patientId) => {
    if (patientLocations[patientId]) {
      return patientLocations[patientId];
    }
    // Generar ubicación por defecto basada en el paciente
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return { floor: 1, area: 'General', room: '101', bed: 'A' };
    const floor = Math.floor(Math.random() * 5) + 1;
    return {
      floor: floor,
      area: patient.condition === 'Crítico' ? 'UCI' : 'General',
      room: patient.room,
      bed: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
    };
  };

  // Verificar si un paciente fue trasladado recientemente (últimas 24 horas)
  const wasRecentlyTransferred = (patientId) => {
    const recentTransfers = transferHistory.filter(t => {
      const transferDate = new Date(t.date);
      const now = new Date();
      const hoursDiff = (now - transferDate) / (1000 * 60 * 60);
      return t.patientId === patientId && hoursDiff <= 24;
    });
    return recentTransfers.length > 0;
  };

  // Smart action handlers
  const handleExportPatients = () => {
    const patientData = patients.map(p => 
      `${p.name} - Habitación ${p.room} - ${p.age} años - ${p.condition}`
    ).join('\n');
    const blob = new Blob([`LISTA DE PACIENTES\n\n${patientData}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    alert('✅ Lista de pacientes exportada correctamente');
  };

  const handleCriticalAlert = () => {
    const criticalPatients = patients.filter(p => p.condition === 'Crítico');
    if (criticalPatients.length === 0) {
      alert('✅ No hay pacientes en estado crítico');
      return;
    }
    const message = criticalPatients.map(p => `• ${p.name} - Habitación ${p.room}`).join('\n');
    if (confirm(`⚠️ PACIENTES EN ESTADO CRÍTICO:\n\n${message}\n\n¿Ir al primer paciente?`)) {
      setSelectedPatientId(criticalPatients[0].id);
      setActiveTab('care');
    }
  };

  const handleShowTreatments = () => {
    const activeTreatments = treatments.map(t => {
      const patient = patients.find(p => p.id === t.patientId);
      return `• ${patient?.name || 'Desconocido'}: ${t.medication} - ${t.dose} cada ${t.frequency}`;
    }).join('\n');
    alert(`💊 TRATAMIENTOS ACTIVOS HOY:\n\n${activeTreatments || 'No hay tratamientos programados'}`);
  };

  const handleShowAppointments = () => {
    const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]);
    if (todayAppointments.length === 0) {
      alert('📅 No hay citas programadas para hoy');
      return;
    }
    const message = todayAppointments.map(a => {
      const patient = patients.find(p => p.id === a.patientId);
      return `• ${a.time} - ${patient?.name || 'Desconocido'}: ${a.type}`;
    }).join('\n');
    alert(`📅 CITAS DE HOY:\n\n${message}`);
  };

  // --- Manejadores de Formularios (Tu lógica original) ---

  const handleVitalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return alert("⚠️ Por favor seleccione un paciente primero.");
    
    // Validar signos vitales
    const validation = validateAllVitalSigns(newVitalSigns);
    setVitalSignsValidation(validation);
    
    // Si hay errores, no permitir guardar
    if (!validation.valid) {
      alert(`❌ VALORES INVÁLIDOS:\n\n${validation.errors.join('\n')}\n\nPor favor, corrija los valores antes de continuar.`);
      return;
    }
    
    // Si hay valores críticos, confirmar antes de guardar
    if (validation.criticals.length > 0) {
      const confirmCritical = window.confirm(
        `🚨 ALERTA: VALORES CRÍTICOS DETECTADOS\n\n${validation.criticals.join('\n')}\n\nEstos valores requieren atención médica inmediata.\n\n¿Confirma que desea registrar estos valores críticos?`
      );
      if (!confirmCritical) return;
    }
    
    // Si hay advertencias, informar al usuario
    if (validation.warnings.length > 0) {
      const confirmWarning = window.confirm(
        `⚠️ VALORES ANORMALES DETECTADOS:\n\n${validation.warnings.join('\n')}\n\n¿Desea continuar con el registro?`
      );
      if (!confirmWarning) return;
    }
    
    const now = new Date();
    try {
      await addVitalSignsDB({
        patient_id: parseInt(selectedPatientId),
        date: now.toLocaleString('es-MX'),
        temperature: newVitalSigns.temperature,
        blood_pressure: newVitalSigns.bloodPressure,
        heart_rate: newVitalSigns.heartRate,
        respiratory_rate: newVitalSigns.respiratoryRate,
        registered_by: user.name
      });
      alert("✅ Signos vitales registrados correctamente.");
      setNewVitalSigns({ temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '' });
      setVitalSignsValidation(null);
    } catch (error) { console.error(error); alert("Error al registrar: " + error.message); }
  };

  const handleMedicationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return alert("⚠️ Seleccione un paciente.");
    
    // Validación de alergias
    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    if (patient && newMedication.medication) {
      const validation = validateMedicationForPatient(newMedication.medication, patient);
      
      if (!validation.valid) {
        // Detectada alergia - mostrar alerta
        setAllergyAlert(validation);
        setShowAllergyWarning(true);
        setPendingMedication(newMedication);
        
        // Registrar alerta en base de datos
        await logAllergyAlert({
          patientId: patient.id,
          patientName: patient.name,
          medication: newMedication.medication,
          allergies: patient.allergies,
          alertType: validation.warning.hasAllergy ? 'direct_match' : 'cross_reactivity',
          severity: validation.warning.severity,
          message: generateAlertMessage(validation),
          attemptedBy: user.name,
          attemptedByRole: user.role,
          wasOverridden: false
        });
        
        return; // Detener ejecución
      }
    }
    
    // No hay alergias, proceder normalmente
    await completeMedicationSubmit(newMedication);
  };
  
  const completeMedicationSubmit = async (medicationData) => {
    const now = new Date();
    try {
      await addTreatmentDB({
        patientId: parseInt(selectedPatientId),
        ...medicationData,
        startDate: now.toLocaleDateString(),
        appliedBy: user.name,
        lastApplication: now.toLocaleString(),
      });
      alert("✅ Medicamento registrado.");
      setNewMedication({ medication: '', dose: '', frequency: '', notes: '' });
      setAllergyAlert(null);
      setShowAllergyWarning(false);
      setPendingMedication(null);
    } catch (error) { alert("Error al registrar medicamento."); }
  };
  
  const handleOverrideAllergy = async () => {
    if (!canOverrideAllergyWarning(user)) {
      alert('❌ No tiene permisos para sobrescribir alertas de alergia. Solo médicos pueden hacerlo.');
      return;
    }
    
    const reason = prompt('Ingrese el motivo para sobrescribir esta alerta de alergia:');
    if (!reason) return;
    
    // Actualizar registro de alerta como sobrescrito
    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    await logAllergyAlert({
      patientId: patient.id,
      patientName: patient.name,
      medication: pendingMedication.medication,
      allergies: patient.allergies,
      alertType: allergyAlert.warning.hasAllergy ? 'direct_match' : 'cross_reactivity',
      severity: allergyAlert.warning.severity,
      message: generateAlertMessage(allergyAlert),
      attemptedBy: user.name,
      attemptedByRole: user.role,
      wasOverridden: true,
      overrideReason: reason
    });
    
    // Proceder con la medicación
    await completeMedicationSubmit(pendingMedication);
  };
  
  const handleCancelAllergy = () => {
    setAllergyAlert(null);
    setShowAllergyWarning(false);
    setPendingMedication(null);
    setNewMedication({ medication: '', dose: '', frequency: '', notes: '' });
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
      alert("✅ Nota guardada.");
    } catch (error) { alert("Error al guardar nota."); }
  };

  const handleNonPharmaTreatmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    try {
      const now = new Date();
      await addNonPharmaTreatmentDB({
        patientId: parseInt(selectedPatientId),
        treatmentType: newNonPharmaTreatment.treatmentType,
        description: newNonPharmaTreatment.description,
        applicationDate: now.toLocaleString('es-MX'),
        applicationTime: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        duration: newNonPharmaTreatment.duration,
        performedBy: user.name,
        materialsUsed: newNonPharmaTreatment.materialsUsed,
        observations: newNonPharmaTreatment.observations,
        status: 'Completado'
      });
      alert('✅ Tratamiento no farmacológico registrado correctamente');
      setNewNonPharmaTreatment({
        treatmentType: '',
        description: '',
        duration: '',
        materialsUsed: '',
        observations: ''
      });
    } catch (err) {
      alert('❌ Error al registrar el tratamiento: ' + err.message);
    }
  };

  const handleConditionUpdate = async () => {
    if (!selectedPatientId || !newCondition) return;
    const patient = patients.find(p => p.id == selectedPatientId);
    if (!patient) return;
    try {
      await updatePatient(patient.id, { ...patient, condition: newCondition });
      alert(`✅ Estado actualizado a: ${newCondition}`);
    } catch (error) { console.error(error); alert("Error al actualizar estado."); }
  };

  // --- Vistas de Contenido ---

  const OverviewView = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Información de Asignación */}
      {accessRestriction && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-white" size={24} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                {accessRestriction.title}
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentShift.icon} bg-${currentShift.color}-100 text-${currentShift.color}-700 border border-${currentShift.color}-300`}>
                  {currentShift.icon} {accessRestriction.currentShift}
                </span>
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {accessRestriction.message}
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="text-indigo-600" size={14} />
                  <span className="font-semibold text-gray-600">Turnos:</span>
                  <span className="text-gray-800 font-bold">{accessRestriction.assignedShifts}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="text-indigo-600" size={14} />
                  <span className="font-semibold text-gray-600">Pisos:</span>
                  <span className="text-gray-800 font-bold">{accessRestriction.assignedFloors}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="text-indigo-600" size={14} />
                  <span className="font-semibold text-gray-600">Pacientes visibles:</span>
                  <span className="text-gray-800 font-bold">{assignmentStats.assignedPatients} de {assignmentStats.totalPatients}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta si está fuera de turno */}
      {!shiftStatus.inShift && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0" size={28} />
            <div>
              <h4 className="font-bold text-amber-800 text-lg">⚠️ Fuera de Turno Asignado</h4>
              <p className="text-sm text-amber-700 mt-1">
                {shiftStatus.message} • Turnos asignados: <strong>{shiftStatus.assignedShifts.join(', ')}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pacientes Asignados" 
          value={patients.length} 
          icon={Users} 
          colorName="blue" 
          subtext="Click para exportar lista" 
          onClick={handleExportPatients}
        />
        <StatCard 
          title="Atención Prioritaria" 
          value={patients.filter(p => p.condition === 'Crítico').length} 
          icon={AlertCircle} 
          colorName="red" 
          subtext="Click para ver alerta" 
          onClick={handleCriticalAlert}
        />
        <StatCard 
          title="Tratamientos Activos" 
          value={treatments.length} 
          icon={Pill} 
          colorName="emerald" 
          subtext="Click para ver horario" 
          onClick={handleShowTreatments}
        />
        <StatCard 
          title="Citas de Hoy" 
          value={appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length} 
          icon={Calendar} 
          colorName="purple" 
          subtext="Click para ver timeline" 
          onClick={handleShowAppointments}
        />
      </div>

      {/* Sección de Actividad Reciente (Rediseñada como línea de tiempo) */}
      <div className="bg-white rounded-2xl shadow-card border border-hospital-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-hospital-100 flex items-center justify-between bg-hospital-50/50">
          <h3 className="font-bold text-hospital-800 flex items-center gap-2 text-lg">
            <Clock size={20} className="text-clinical-primary" />
            Últimos Movimientos y Notas
          </h3>
        </div>
        <div className="p-6">
          {nurseNotes.length > 0 ? (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-[8.75rem] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-hospital-200 before:to-transparent">
              {nurseNotes.slice(0, 5).map((note, idx) => {
                 const pt = patients.find(p => p.id === note.patientId);
                 
                 // Calculate note age and editability
                 const noteDate = new Date(note.date);
                 const now = new Date();
                 const ageHours = (now - noteDate) / (1000 * 60 * 60);
                 const isEditable = ageHours <= 24;
                 const timeRemaining = 24 - ageHours;
                 
                 // Determine urgency level
                 let urgencyColor = 'gray';
                 let urgencyLabel = '🔒 Bloqueada';
                 let urgencyBg = 'bg-gray-100';
                 let urgencyBorder = 'border-gray-300';
                 
                 if (isEditable) {
                   if (timeRemaining > 12) {
                     urgencyColor = 'green';
                     urgencyLabel = '✏️ Editable';
                     urgencyBg = 'bg-green-50';
                     urgencyBorder = 'border-green-300';
                   } else if (timeRemaining > 2) {
                     urgencyColor = 'yellow';
                     urgencyLabel = '⚠️ Vence pronto';
                     urgencyBg = 'bg-yellow-50';
                     urgencyBorder = 'border-yellow-300';
                   } else {
                     urgencyColor = 'orange';
                     urgencyLabel = '🚨 URGENTE';
                     urgencyBg = 'bg-orange-50';
                     urgencyBorder = 'border-orange-400';
                   }
                 }
                 
                 const formatTimeRemaining = (hours) => {
                   if (hours <= 0) return 'Expirado';
                   const h = Math.floor(hours);
                   const m = Math.floor((hours - h) * 60);
                   return h > 0 ? `${h}h ${m}m` : `${m} minutos`;
                 };
                 
                 return (
                  <div key={idx} className={`relative flex items-start group md:ml-32 ${urgencyBg} rounded-xl p-2 border ${urgencyBorder}`}>
                    {/* Icono en la línea de tiempo */}
                    <div className="absolute -left-2 md:-left-10 bg-white p-1 rounded-full border-2 border-purple-100 z-10">
                        <div className="bg-purple-50 p-1.5 rounded-full text-purple-600">
                            <FileText size={14} />
                        </div>
                    </div>
                    
                    <div className="ml-10 md:ml-0 bg-white p-4 rounded-xl border border-hospital-100 shadow-sm w-full group-hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-hospital-800 flex items-center gap-2">
                                Nota sobre {pt ? pt.name : 'Paciente'}
                            </h4>
                            {note.was_edited && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                ✏️ Editada ({note.edit_count || 1}x)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-medium text-hospital-400 bg-hospital-50 px-2 py-1 rounded-full">{note.date}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              urgencyColor === 'green' ? 'bg-green-100 text-green-700' :
                              urgencyColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              urgencyColor === 'orange' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {urgencyLabel}
                            </span>
                            {isEditable && (
                              <span className="text-xs text-gray-500">
                                ⏱️ {formatTimeRemaining(timeRemaining)}
                              </span>
                            )}
                          </div>
                      </div>
                      <p className="text-sm text-hospital-600 italic border-l-4 border-purple-200 pl-3 my-2">"{note.note}"</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-hospital-500 font-medium flex items-center gap-1">
                          <User size={12} /> Registrado por: {note.nurseName}
                        </p>
                        <div className="flex gap-2">
                          {note.was_edited && (
                            <button
                              onClick={() => {
                                setSelectedNoteHistory(note);
                                setShowNoteHistoryModal(true);
                              }}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                            >
                              <Clock size={12} /> Ver historial
                            </button>
                          )}
                          {isEditable && (
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setEditNoteContent(note.note);
                                setEditNoteReason('');
                                setShowEditNoteModal(true);
                              }}
                              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                                urgencyColor === 'orange' 
                                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 animate-pulse' 
                                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                              }`}
                            >
                              <Edit2 size={12} /> Editar nota
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>
          ) : <div className="text-center py-10 text-hospital-400 flex flex-col items-center gap-2"><ClipboardList size={40} opacity={0.5}/>No hay actividad reciente.</div>}
        </div>
      </div>
    </div>
  );

  const ShiftsView = () => {
    // Datos de ejemplo del turno actual
    const currentShift = {
      type: 'Mañana',
      startTime: '07:00',
      endTime: '15:00',
      duration: '8 horas',
      date: new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    };

    const upcomingShifts = [
      { date: 'Mañana', type: 'Tarde', time: '15:00 - 23:00', status: 'Confirmado' },
      { date: 'Pasado mañana', type: 'Noche', time: '23:00 - 07:00', status: 'Confirmado' },
      { date: 'En 3 días', type: 'Mañana', time: '07:00 - 15:00', status: 'Confirmado' },
      { date: 'En 4 días', type: 'Descanso', time: '-', status: 'Libre' },
    ];

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Turno Actual */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl shadow-xl border-2 border-orange-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Clock size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-800">Turno Actual</h2>
              <p className="text-lg text-gray-600 font-medium">{currentShift.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm">
              <p className="text-sm font-bold text-orange-600 uppercase mb-2">Tipo de Turno</p>
              <p className="text-2xl font-black text-gray-800">{currentShift.type}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm">
              <p className="text-sm font-bold text-orange-600 uppercase mb-2">Hora Entrada</p>
              <p className="text-2xl font-black text-gray-800">{currentShift.startTime}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm">
              <p className="text-sm font-bold text-orange-600 uppercase mb-2">Hora Salida</p>
              <p className="text-2xl font-black text-gray-800">{currentShift.endTime}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm">
              <p className="text-sm font-bold text-orange-600 uppercase mb-2">Duración</p>
              <p className="text-2xl font-black text-gray-800">{currentShift.duration}</p>
            </div>
          </div>

          <div className="mt-6 bg-white p-6 rounded-xl border-2 border-orange-200 shadow-sm">
            <p className="text-sm font-bold text-orange-600 uppercase mb-3">Pacientes Asignados en Este Turno</p>
            <p className="text-xl font-bold text-gray-800">{patients.length} pacientes bajo tu supervisión</p>
            <button 
              onClick={() => setActiveTab('patients')} 
              className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              Ver Lista Completa
            </button>
          </div>
        </div>

        {/* Próximos Turnos */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <Calendar size={28} className="text-blue-600" />
              Próximos Turnos Programados
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingShifts.map((shift, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
                      shift.type === 'Mañana' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                      shift.type === 'Tarde' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                      shift.type === 'Noche' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                      'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {shift.type === 'Descanso' ? '🌟' : shift.type.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-800">{shift.date}</p>
                      <p className="text-sm text-gray-600 font-medium">{shift.type} • {shift.time}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    shift.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {shift.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NursingSheetView = () => {
    const handleNursingSheetSubmit = async (e) => {
      e.preventDefault();
      try {
        // En producción, guardar en la base de datos
        alert('✅ Hoja de Enfermería guardada correctamente');
        console.log('Datos del formato:', nursingSheetData);
      } catch (err) {
        alert('❌ Error al guardar: ' + err.message);
      }
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-2xl shadow-xl border-2 border-indigo-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <ClipboardList size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800">Formato Digital de Actividades de Enfermería</h2>
                <p className="text-gray-600 font-medium mt-1">Registro completo del turno, procedimientos e intervenciones</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleNursingSheetSubmit} className="p-8 space-y-8">
            {/* Sección 1: Información del Turno */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" /> Información del Turno
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha del Turno</label>
                  <input type="date" required
                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all font-medium"
                    value={nursingSheetData.shiftDate}
                    onChange={e => setNursingSheetData({...nursingSheetData, shiftDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Turno</label>
                  <select required
                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all font-medium"
                    value={nursingSheetData.shiftType}
                    onChange={e => setNursingSheetData({...nursingSheetData, shiftType: e.target.value})}>
                    <option value="">Seleccione...</option>
                    <option value="Mañana">Mañana (07:00 - 15:00)</option>
                    <option value="Tarde">Tarde (15:00 - 23:00)</option>
                    <option value="Noche">Noche (23:00 - 07:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Enfermera Responsable</label>
                  <input type="text" disabled
                    className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-50 font-bold text-gray-800"
                    value={user.name} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hora de Inicio</label>
                  <input type="time" required
                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all font-medium"
                    value={nursingSheetData.startTime}
                    onChange={e => setNursingSheetData({...nursingSheetData, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hora de Finalización</label>
                  <input type="time"
                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all font-medium"
                    value={nursingSheetData.endTime}
                    onChange={e => setNursingSheetData({...nursingSheetData, endTime: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Sección 2: Pacientes Asignados */}
            <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-xl border-2 border-emerald-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <Users className="text-emerald-600" /> Pacientes Asignados
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Lista de pacientes bajo tu cuidado (nombres, habitaciones)
                </label>
                <textarea rows="3" required
                  className="w-full p-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Ej: Ana Torres - Hab. 301, Carlos Ramírez - Hab. 205..."
                  value={nursingSheetData.patientsAssigned}
                  onChange={e => setNursingSheetData({...nursingSheetData, patientsAssigned: e.target.value})} />
              </div>
            </div>

            {/* Sección 3: Procedimientos Realizados */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border-2 border-purple-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <Syringe className="text-purple-600" /> Procedimientos Realizados
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Detalle todos los procedimientos ejecutados durante el turno
                </label>
                <textarea rows="4" required
                  className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Ej: Curaciones, toma de signos vitales, administración de medicamentos, nebulizaciones..."
                  value={nursingSheetData.proceduresPerformed}
                  onChange={e => setNursingSheetData({...nursingSheetData, proceduresPerformed: e.target.value})} />
              </div>
            </div>

            {/* Sección 4: Intervenciones de Enfermería */}
            <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-xl border-2 border-pink-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <Stethoscope className="text-pink-600" /> Intervenciones de Enfermería
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Intervenciones específicas realizadas (cambios de posición, apoyo emocional, educación al paciente, etc.)
                </label>
                <textarea rows="4"
                  className="w-full p-3 border-2 border-pink-200 rounded-lg focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Describa las intervenciones de enfermería realizadas..."
                  value={nursingSheetData.interventions}
                  onChange={e => setNursingSheetData({...nursingSheetData, interventions: e.target.value})} />
              </div>
            </div>

            {/* Sección 5: Eventos Relevantes */}
            <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border-2 border-red-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-600" /> Eventos Relevantes del Turno
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Eventos importantes ocurridos (cambios en el estado del paciente, emergencias, visitas familiares importantes)
                </label>
                <textarea rows="4"
                  className="w-full p-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Registre eventos relevantes..."
                  value={nursingSheetData.relevantEvents}
                  onChange={e => setNursingSheetData({...nursingSheetData, relevantEvents: e.target.value})} />
              </div>
            </div>

            {/* Sección 6: Resumen de Medicamentos */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-xl border-2 border-orange-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <Pill className="text-orange-600" /> Medicamentos Administrados
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Resumen de medicamentos administrados durante el turno
                </label>
                <textarea rows="3"
                  className="w-full p-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Paciente - Medicamento - Dosis - Hora..."
                  value={nursingSheetData.medicationsAdministered}
                  onChange={e => setNursingSheetData({...nursingSheetData, medicationsAdministered: e.target.value})} />
              </div>
            </div>

            {/* Sección 7: Tareas Pendientes */}
            <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-xl border-2 border-amber-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="text-amber-600" /> Tareas Pendientes
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Actividades que quedan pendientes para el siguiente turno
                </label>
                <textarea rows="3"
                  className="w-full p-3 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:ring-4 focus:ring-amber-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Tareas pendientes..."
                  value={nursingSheetData.pendingTasks}
                  onChange={e => setNursingSheetData({...nursingSheetData, pendingTasks: e.target.value})} />
              </div>
            </div>

            {/* Sección 8: Notas de Relevo */}
            <div className="bg-gradient-to-br from-cyan-50 to-white p-6 rounded-xl border-2 border-cyan-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <ChevronRight className="text-cyan-600" /> Notas para el Relevo
              </h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Información importante para el personal del siguiente turno
                </label>
                <textarea rows="4" required
                  className="w-full p-3 border-2 border-cyan-200 rounded-lg focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/30 outline-none transition-all font-medium resize-none"
                  placeholder="Notas importantes para el relevo..."
                  value={nursingSheetData.handoverNotes}
                  onChange={e => setNursingSheetData({...nursingSheetData, handoverNotes: e.target.value})} />
              </div>
            </div>

            {/* Sección 9: Observaciones Generales */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
              <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList className="text-gray-600" /> Observaciones Generales
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales</label>
                  <textarea rows="3"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-gray-500 focus:ring-4 focus:ring-gray-500/30 outline-none transition-all font-medium resize-none"
                    placeholder="Observaciones generales del turno..."
                    value={nursingSheetData.generalObservations}
                    onChange={e => setNursingSheetData({...nursingSheetData, generalObservations: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Supervisor (si aplica)</label>
                  <input type="text"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-gray-500 focus:ring-4 focus:ring-gray-500/30 outline-none transition-all font-medium"
                    placeholder="Nombre del supervisor que revisó"
                    value={nursingSheetData.supervisorName}
                    onChange={e => setNursingSheetData({...nursingSheetData, supervisorName: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => setNursingSheetData({
                  shiftDate: new Date().toISOString().split('T')[0],
                  shiftType: '',
                  startTime: '',
                  endTime: '',
                  patientsAssigned: '',
                  proceduresPerformed: '',
                  interventions: '',
                  relevantEvents: '',
                  vitalSignsSummary: '',
                  medicationsAdministered: '',
                  pendingTasks: '',
                  handoverNotes: '',
                  generalObservations: '',
                  incidents: '',
                  supervisorName: ''
                })}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-200">
                Limpiar Formulario
              </button>
              <button
                type="submit"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-2">
                <Save size={20} />
                Guardar Hoja de Enfermería
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const PatientsListView = () => (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/30 rounded-2xl shadow-card border-2 border-blue-100 overflow-hidden animate-fadeIn hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300">
      <div className="px-6 py-5 border-b border-blue-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <Users size={20} className="text-blue-600" />
            Directorio de Pacientes
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widerFirst">Paciente</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Ubicación</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Info. Médica</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Estado Actual</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hospital-100">
            {patients.map((patient) => {
               const location = getPatientLocation(patient.id);
               const recentTransfer = wasRecentlyTransferred(patient.id);
               const statusConfig = {
                'Crítico': { 
                  bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
                  text: 'text-white',
                  dot: 'bg-white',
                  border: 'border-red-300',
                  glow: 'shadow-lg shadow-red-500/30'
                },
                'Estable': { 
                  bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', 
                  text: 'text-white',
                  dot: 'bg-white',
                  border: 'border-emerald-300',
                  glow: 'shadow-lg shadow-emerald-500/30'
                },
                'Recuperación': { 
                  bg: 'bg-gradient-to-r from-blue-500 to-cyan-600', 
                  text: 'text-white',
                  dot: 'bg-white',
                  border: 'border-blue-300',
                  glow: 'shadow-lg shadow-blue-500/30'
                },
                'Regular': { 
                  bg: 'bg-gradient-to-r from-amber-500 to-orange-600', 
                  text: 'text-white',
                  dot: 'bg-white',
                  border: 'border-amber-300',
                  glow: 'shadow-lg shadow-amber-500/30'
                },
               };
               const statusStyle = statusConfig[patient.condition] || statusConfig['Regular'];
               
               return (
              <tr key={patient.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
                        {patient.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-gray-800">{patient.name}</div>
                        <div className="text-xs text-gray-600">ID: #{patient.id.toString().padStart(4, '0')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <Building2 size={16} className="text-blue-500" /> 
                      <span>Piso {location.floor} - Hab. {location.room}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{location.area} • Cama {location.bed}</div>
                    {recentTransfer && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        <Activity size={12} className="animate-pulse" /> Trasladado recientemente
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{patient.age} años</span> • Tipo {patient.bloodType}
                  </div>
                  {patient.allergies && <div className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full inline-flex"><AlertCircle size={12}/> Alergias: {patient.allergies}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.glow} inline-flex items-center gap-1.5`}>
                    <div className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`}></div>
                    {patient.condition}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => { setSelectedPatientId(patient.id); setActiveTab('care'); }}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200 group"
                  >
                    Gestionar Cuidados <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CareView = () => {
    const selectedPatient = patients.find(p => p.id == selectedPatientId);
    
    return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fadeIn items-start">
      {/* COLUMNA IZQUIERDA: Resumen del Paciente (Sticky) */}
      <div className="xl:col-span-1 space-y-6 xl:sticky xl:top-24">
        {/* Tarjeta de Selección y Resumen */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 p-6 rounded-2xl shadow-card border-2 border-blue-100 hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="text-blue-600" /> Selección de Paciente
          </h3>
          
          <div className="relative">
            <select 
              className="w-full p-3 pl-10 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl appearance-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-200 font-medium text-gray-700 hover:shadow-lg hover:shadow-blue-200/50"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">-- Seleccionar Paciente --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-3.5 text-blue-500" size={20} />
            <Users className="absolute left-3 top-3.5 text-blue-500" size={20} />
          </div>

          {selectedPatient ? (
            <div className="mt-6 animate-fadeIn">
              <div className="p-5 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl border-2 border-blue-200 mb-4 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-purple-500/50 ring-2 ring-white">
                        {selectedPatient.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-xl leading-tight">{selectedPatient.name}</h4>
                        {(() => {
                          const loc = getPatientLocation(selectedPatient.id);
                          return (
                            <div className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                              <Building2 size={14}/> 
                              <span className="font-semibold">Piso {loc.floor} - {loc.area} - Hab. {loc.room} - Cama {loc.bed}</span>
                            </div>
                          );
                        })()}
                        {wasRecentlyTransferred(selectedPatient.id) && (
                          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-300">
                            <Activity size={12} className="animate-pulse" /> Trasladado en las últimas 24h
                          </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm border-t-2 border-white pt-4">
                  <div className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-sm">
                    <span className="text-blue-600 text-xs font-bold uppercase block mb-1">Edad / Sangre</span>
                    <span className="text-gray-800 font-bold">{selectedPatient.age} años, {selectedPatient.bloodType}</span>
                  </div>
                  <div className={`p-3 rounded-xl border-2 shadow-sm ${selectedPatient.allergies ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300' : 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-300'}`}>
                     <span className={`text-xs font-bold uppercase block mb-1 ${selectedPatient.allergies ? 'text-red-700' : 'text-emerald-700'}`}>Alergias</span>
                     <span className={`font-bold ${selectedPatient.allergies ? 'text-red-800' : 'text-emerald-800'} flex items-center gap-1`}>
                        {selectedPatient.allergies ? <><AlertCircle size={14}/> {selectedPatient.allergies}</> : <><CheckCircle size={14}/> Ninguna</>}
                     </span>
                  </div>
                </div>
              </div>

              {/* Actualizar Estado */}
              <div className="p-4 bg-gradient-to-br from-white to-amber-50/50 border-2 border-amber-200 rounded-2xl shadow-lg">
                <label className="block text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">
                  <Activity size={14} /> Actualizar Condición Clínica
                </label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2.5 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-xl text-sm font-medium outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/30 transition-all duration-200"
                    value={newCondition || selectedPatient.condition}
                    onChange={(e) => setNewCondition(e.target.value)}
                  >
                    <option value="Estable">🟢 Estable</option>
                    <option value="Crítico">🔴 Crítico</option>
                    <option value="Recuperación">🔵 Recuperación</option>
                    <option value="Observación">🟡 Observación</option>
                  </select>
                  <button onClick={handleConditionUpdate} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-2.5 rounded-xl hover:shadow-lg hover:shadow-amber-500/50 hover:scale-110 transition-all duration-200">
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-8 border-2 border-dashed border-purple-300 rounded-2xl text-center bg-gradient-to-br from-purple-50 to-pink-50">
                <User size={40} className="text-purple-400 mx-auto mb-2" />
                <p className="text-gray-700 font-medium">Seleccione un paciente para habilitar las acciones de cuidado.</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: Formularios de Acción (Solo visibles si hay paciente) */}
      {selectedPatient && (
        <div className="xl:col-span-2 space-y-6">
          {/* Tarjeta de Signos Vitales */}
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl shadow-card border-2 border-blue-100 overflow-hidden relative group hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300">
             <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
            <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-600" /> Registro de Signos Vitales
              </h3>
            </div>
            <form onSubmit={handleVitalSubmit} className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { label: 'Temperatura (°C)', name: 'temperature', icon: <Heart size={16} className="text-red-500"/>, placeholder: '36.5', color: 'red' },
                  { label: 'Presión Arterial', name: 'bloodPressure', icon: <Activity size={16} className="text-blue-500"/>, placeholder: '120/80', color: 'blue' },
                  { label: 'Frec. Cardíaca (LPM)', name: 'heartRate', icon: <Heart size={16} className="text-rose-500"/>, placeholder: '80', color: 'rose' },
                  { label: 'Frec. Respiratoria', name: 'respiratoryRate', icon: <Activity size={16} className="text-cyan-500"/>, placeholder: '18', color: 'cyan' }
                ].map(field => (
                  <div key={field.name} className={`bg-gradient-to-br from-${field.color}-50 to-white p-3 rounded-xl border-2 border-${field.color}-200 focus-within:border-${field.color}-500 focus-within:ring-4 ring-${field.color}-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-${field.color}-200/50`}>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">{field.icon} {field.label}</label>
                    <input 
                        type="text" 
                        required 
                        placeholder={field.placeholder} 
                        className="w-full bg-transparent font-bold text-gray-800 outline-none placeholder:text-gray-400 placeholder:font-normal"
                        value={newVitalSigns[field.name]} 
                        onChange={e => {
                          const updatedVitals = {...newVitalSigns, [field.name]: e.target.value};
                          setNewVitalSigns(updatedVitals);
                          // Validar en tiempo real si hay valores
                          if (Object.values(updatedVitals).some(v => v !== '')) {
                            setVitalSignsValidation(validateAllVitalSigns(updatedVitals));
                          } else {
                            setVitalSignsValidation(null);
                          }
                        }} 
                    />
                    {vitalSignsValidation?.details[field.name] && vitalSignsValidation.details[field.name].message && (
                      <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${getStatusColor(vitalSignsValidation.details[field.name].status)}`}>
                        <span>{getStatusIcon(vitalSignsValidation.details[field.name].status)}</span>
                        <span>{vitalSignsValidation.details[field.name].message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Resumen de validación */}
              {vitalSignsValidation && (
                <div className="mt-4 space-y-2">
                  {vitalSignsValidation.criticals.length > 0 && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                        <AlertCircle size={20} />
                        <span>🚨 VALORES CRÍTICOS - Atención Inmediata Requerida</span>
                      </div>
                      <ul className="text-sm text-red-700 space-y-1 ml-6">
                        {vitalSignsValidation.criticals.map((msg, idx) => (
                          <li key={idx}>• {msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {vitalSignsValidation.warnings.length > 0 && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                        <AlertCircle size={18} />
                        <span>⚠️ Valores Anormales - Monitoreo Recomendado</span>
                      </div>
                      <ul className="text-sm text-amber-700 space-y-1 ml-6">
                        {vitalSignsValidation.warnings.map((msg, idx) => (
                          <li key={idx}>• {msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {vitalSignsValidation.valid && vitalSignsValidation.criticals.length === 0 && vitalSignsValidation.warnings.length === 0 && (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 text-green-800 font-bold">
                        <CheckCircle size={18} />
                        <span>✓ Todos los valores están en rango normal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button type="submit" className="mt-6 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 font-bold flex items-center justify-center gap-2 ml-auto group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" disabled={vitalSignsValidation && !vitalSignsValidation.valid}>
                <Save size={18} className="group-hover:rotate-12 transition-transform" /> 
                {vitalSignsValidation && !vitalSignsValidation.valid ? 'Corrija los valores' : 'Guardar Signos'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta de Medicación */}
            <div className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 rounded-2xl shadow-card border-2 border-emerald-100 overflow-hidden relative hover:shadow-2xl hover:shadow-emerald-200/50 transition-all duration-300">
               <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-500"></div>
              <div className="p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Syringe className="text-emerald-600" /> Administración de Medicamento
                </h3>
                {selectedPatient?.allergies && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
                    <span className="text-xs font-bold text-red-800">
                      ⚠️ Paciente con alergias: {selectedPatient.allergies}
                    </span>
                  </div>
                )}
              </div>
              <form onSubmit={handleMedicationSubmit} className="p-5 space-y-4">
                <div>
                    <input type="text" required placeholder="Nombre del Medicamento" className="w-full p-3 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-200 font-medium hover:shadow-lg hover:shadow-emerald-200/50"
                    value={newMedication.medication} onChange={e => setNewMedication({...newMedication, medication: e.target.value})} />
                </div>
                <div className="flex gap-3">
                  <input type="text" required placeholder="Dosis (ej. 500mg)" className="flex-1 p-3 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-200 font-medium"
                    value={newMedication.dose} onChange={e => setNewMedication({...newMedication, dose: e.target.value})} />
                  <input type="text" required placeholder="Frecuencia" className="flex-1 p-3 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-200 font-medium"
                    value={newMedication.frequency} onChange={e => setNewMedication({...newMedication, frequency: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 font-bold flex items-center justify-center gap-2 group">
                  <CheckCircle size={18} className="group-hover:rotate-12 transition-transform" /> Registrar Aplicación
                </button>
              </form>
            </div>

            {/* Tarjeta de Notas */}
            <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-2xl shadow-card border-2 border-purple-100 overflow-hidden relative flex flex-col hover:shadow-2xl hover:shadow-purple-200/50 transition-all duration-300">
               <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
              <div className="p-5 border-b border-purple-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ClipboardList className="text-purple-600" /> Nota de Evolución / Reporte
                </h3>
              </div>
              <form onSubmit={handleNoteSubmit} className="p-5 flex-1 flex flex-col">
                <textarea required rows="4" placeholder="Escriba observaciones, cambios en el paciente, etc..." 
                  className="w-full p-3 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all duration-200 font-medium resize-none flex-1 mb-4 hover:shadow-lg hover:shadow-purple-200/50"
                  value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-fuchsia-600 text-white rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 font-bold flex items-center justify-center gap-2 mt-auto group">
                  <FileText size={18} className="group-hover:rotate-12 transition-transform" /> Guardar Nota
                </button>
              </form>
            </div>
          </div>

          {/* Tarjeta de Tratamientos No Farmacológicos */}
          <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 rounded-2xl shadow-card border-2 border-orange-100 overflow-hidden relative hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-500 to-amber-500"></div>
            <div className="p-5 border-b border-orange-100 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Stethoscope className="text-orange-600" /> Tratamiento No Farmacológico
              </h3>
              <p className="text-xs text-gray-600 mt-1 font-medium">Curaciones, nebulizaciones, fluidoterapia, etc.</p>
            </div>
            <form onSubmit={handleNonPharmaTreatmentSubmit} className="p-5 space-y-4">
              <div>
                <select required className="w-full p-3 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all duration-200 font-medium hover:shadow-lg hover:shadow-orange-200/50"
                  value={newNonPharmaTreatment.treatmentType} onChange={e => setNewNonPharmaTreatment({...newNonPharmaTreatment, treatmentType: e.target.value})}>
                  <option value="">Seleccione tipo de tratamiento</option>
                  <option value="Curación">🩹 Curación</option>
                  <option value="Nebulización">💨 Nebulización</option>
                  <option value="Fluidoterapia">💧 Fluidoterapia</option>
                  <option value="Oxigenoterapia">🫁 Oxigenoterapia</option>
                  <option value="Fisioterapia Respiratoria">🌬️ Fisioterapia Respiratoria</option>
                  <option value="Aspiración de Secreciones">🔧 Aspiración de Secreciones</option>
                  <option value="Cambio de Posición">🔄 Cambio de Posición</option>
                  <option value="Baño en Cama">🛁 Baño en Cama</option>
                  <option value="Terapia de Frío/Calor">❄️🔥 Terapia de Frío/Calor</option>
                  <option value="Otros">🏥 Otros</option>
                </select>
              </div>
              <div>
                <textarea required rows="2" placeholder="Descripción detallada del tratamiento"
                  className="w-full p-3 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all duration-200 font-medium resize-none hover:shadow-lg hover:shadow-orange-200/50"
                  value={newNonPharmaTreatment.description} onChange={e => setNewNonPharmaTreatment({...newNonPharmaTreatment, description: e.target.value})}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Duración (ej: 15 min)"
                  className="p-3 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all duration-200 font-medium"
                  value={newNonPharmaTreatment.duration} onChange={e => setNewNonPharmaTreatment({...newNonPharmaTreatment, duration: e.target.value})} />
                <input type="text" placeholder="Materiales usados"
                  className="p-3 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all duration-200 font-medium"
                  value={newNonPharmaTreatment.materialsUsed} onChange={e => setNewNonPharmaTreatment({...newNonPharmaTreatment, materialsUsed: e.target.value})} />
              </div>
              <div>
                <textarea rows="2" placeholder="Observaciones adicionales (opcional)"
                  className="w-full p-3 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all duration-200 font-medium resize-none hover:shadow-lg hover:shadow-orange-200/50"
                  value={newNonPharmaTreatment.observations} onChange={e => setNewNonPharmaTreatment({...newNonPharmaTreatment, observations: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white rounded-xl hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 font-bold flex items-center justify-center gap-2 group">
                <CheckCircle size={18} className="group-hover:rotate-12 transition-transform" /> Registrar Tratamiento
              </button>
            </form>
          </div>

          {/* Historial de Signos Vitales */}
          <div className="bg-gradient-to-br from-white via-rose-50/30 to-red-50/30 rounded-2xl shadow-card border-2 border-rose-100 overflow-hidden">
            <div className="p-6 border-b border-rose-100 bg-gradient-to-r from-rose-50/50 to-red-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-rose-600" /> Historial de Signos Vitales
              </h3>
              <p className="text-xs text-gray-600 mt-1 font-medium">Registro completo por fecha y turno</p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {vitalSigns.filter(vs => vs.patientId === parseInt(selectedPatientId)).length > 0 ? (
                <div className="space-y-4">
                  {vitalSigns
                    .filter(vs => vs.patientId === parseInt(selectedPatientId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((vital, idx) => {
                      // Determinar el turno según la hora
                      const dateTime = new Date(vital.date);
                      const hour = dateTime.getHours();
                      let shift = '';
                      let shiftColor = '';
                      if (hour >= 7 && hour < 15) {
                        shift = 'Turno Mañana';
                        shiftColor = 'from-amber-500 to-orange-500';
                      } else if (hour >= 15 && hour < 23) {
                        shift = 'Turno Tarde';
                        shiftColor = 'from-blue-500 to-indigo-500';
                      } else {
                        shift = 'Turno Noche';
                        shiftColor = 'from-indigo-600 to-purple-700';
                      }
                      
                      // Evaluar valores anormales
                      const temp = parseFloat(vital.temperature);
                      const hr = parseInt(vital.heartRate);
                      const rr = parseInt(vital.respiratoryRate);
                      
                      const isTempAbnormal = temp < 36 || temp > 38;
                      const isHrAbnormal = hr < 60 || hr > 100;
                      const isRrAbnormal = rr < 12 || rr > 20;
                      const hasAbnormal = isTempAbnormal || isHrAbnormal || isRrAbnormal;
                      
                      return (
                        <div key={idx} className={`relative p-5 rounded-xl border-2 transition-all duration-200 ${
                          hasAbnormal 
                            ? 'bg-red-50 border-red-300 shadow-lg shadow-red-200/50' 
                            : 'bg-white border-rose-200 hover:shadow-md'
                        }`}>
                          {hasAbnormal && (
                            <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                              <AlertCircle size={12} className="animate-pulse" /> Valores Anormales
                            </div>
                          )}
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${shiftColor} flex items-center justify-center text-white font-bold shadow-md`}>
                              <Activity size={28} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-bold text-rose-600 uppercase">{vital.date}</p>
                                  <p className={`text-xs font-bold bg-gradient-to-r ${shiftColor} bg-clip-text text-transparent`}>
                                    {shift}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                <div className={`p-3 rounded-lg border-2 ${isTempAbnormal ? 'bg-red-100 border-red-400' : 'bg-gradient-to-br from-red-50 to-white border-red-200'}`}>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Heart size={14} className="text-red-500" />
                                    <p className="text-xs font-bold text-gray-700">Temperatura</p>
                                    {isTempAbnormal && <AlertCircle size={12} className="text-red-600" />}
                                  </div>
                                  <p className="text-xl font-black text-gray-800">{vital.temperature}°C</p>
                                  <p className="text-xs text-gray-500 mt-1">Normal: 36-38°C</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border-2 border-blue-200">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Activity size={14} className="text-blue-500" />
                                    <p className="text-xs font-bold text-gray-700">Presión Arterial</p>
                                  </div>
                                  <p className="text-xl font-black text-gray-800">{vital.bloodPressure}</p>
                                  <p className="text-xs text-gray-500 mt-1">Normal: 120/80</p>
                                </div>
                                
                                <div className={`p-3 rounded-lg border-2 ${isHrAbnormal ? 'bg-rose-100 border-rose-400' : 'bg-gradient-to-br from-rose-50 to-white border-rose-200'}`}>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Heart size={14} className="text-rose-500" />
                                    <p className="text-xs font-bold text-gray-700">Frec. Cardíaca</p>
                                    {isHrAbnormal && <AlertCircle size={12} className="text-rose-600" />}
                                  </div>
                                  <p className="text-xl font-black text-gray-800">{vital.heartRate} LPM</p>
                                  <p className="text-xs text-gray-500 mt-1">Normal: 60-100</p>
                                </div>
                                
                                <div className={`p-3 rounded-lg border-2 ${isRrAbnormal ? 'bg-cyan-100 border-cyan-400' : 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200'}`}>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Activity size={14} className="text-cyan-500" />
                                    <p className="text-xs font-bold text-gray-700">Frec. Respiratoria</p>
                                    {isRrAbnormal && <AlertCircle size={12} className="text-cyan-600" />}
                                  </div>
                                  <p className="text-xl font-black text-gray-800">{vital.respiratoryRate} RPM</p>
                                  <p className="text-xs text-gray-500 mt-1">Normal: 12-20</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-600">
                                <User size={12} />
                                <span className="font-semibold">Registrado por: {vital.registeredBy}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity size={48} className="text-rose-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No hay signos vitales registrados para este paciente.</p>
                  <p className="text-gray-500 text-sm mt-2">Los signos vitales aparecerán aquí después del primer registro.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tratamientos Asignados al Paciente */}
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl shadow-card border-2 border-blue-100 overflow-hidden">
            <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Pill className="text-blue-600" /> Tratamientos Asignados
              </h3>
              <p className="text-xs text-gray-600 mt-1 font-medium">Medicamentos, horarios y médico responsable</p>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {treatments.filter(t => t.patientId === parseInt(selectedPatientId)).length > 0 ? (
                <div className="space-y-4">
                  {treatments
                    .filter(t => t.patientId === parseInt(selectedPatientId))
                    .map((treatment, idx) => {
                      const isActive = treatment.status === 'Activo';
                      const administrationTimes = treatment.administrationTimes ? 
                        JSON.parse(treatment.administrationTimes).join(', ') : 
                        'Por confirmar';
                      
                      return (
                        <div key={idx} className={`relative p-5 rounded-xl border-2 transition-all duration-200 ${
                          isActive 
                            ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300 shadow-lg' 
                            : 'bg-gray-50 border-gray-300'
                        }`}>
                          {isActive && (
                            <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                              <CheckCircle size={12} /> Activo
                            </div>
                          )}
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                              isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'
                            }`}>
                              <Pill size={28} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="text-xl font-black text-gray-800 mb-1">{treatment.medication}</h4>
                                  <p className="text-sm text-gray-600 font-semibold">
                                    <span className="text-blue-600 font-bold">{treatment.dose}</span> • {treatment.frequency}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <p className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                                    <Clock size={12} /> Horarios de Administración
                                  </p>
                                  <p className="text-sm text-gray-800 font-semibold">{administrationTimes}</p>
                                </div>
                                
                                <div className="bg-white p-3 rounded-lg border border-indigo-100">
                                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1">
                                    <Stethoscope size={12} /> Médico Responsable
                                  </p>
                                  <p className="text-sm text-gray-800 font-semibold">{treatment.responsibleDoctor || 'No asignado'}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 font-semibold mb-1">Fecha de Inicio:</p>
                                  <p className="text-gray-800 font-bold">{treatment.startDate}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-semibold mb-1">Fecha de Fin:</p>
                                  <p className="text-gray-800 font-bold">{treatment.endDate || 'Indefinido'}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500 font-semibold mb-1">Última Aplicación:</p>
                                <div className="flex items-center gap-2">
                                  <User size={12} className="text-gray-500" />
                                  <p className="text-sm text-gray-800">
                                    {treatment.lastApplication} por <span className="font-bold">{treatment.appliedBy}</span>
                                  </p>
                                </div>
                              </div>
                              
                              {treatment.notes && (
                                <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                                  <p className="text-xs font-bold text-amber-700 uppercase mb-1">Notas:</p>
                                  <p className="text-sm text-gray-800 italic">{treatment.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Pill size={48} className="text-blue-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No hay tratamientos registrados para este paciente.</p>
                  <p className="text-gray-500 text-sm mt-2">Los tratamientos asignados aparecerán aquí.</p>
                </div>
              )}
            </div>
          </div>

          {/* Historial de Traslados */}
          <div className="bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/30 rounded-2xl shadow-card border-2 border-cyan-100 overflow-hidden">
            <div className="p-6 border-b border-cyan-100 bg-gradient-to-r from-cyan-50/50 to-blue-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-cyan-600" /> Historial de Traslados
              </h3>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {transferHistory.filter(t => t.patientId === parseInt(selectedPatientId)).length > 0 ? (
                <div className="space-y-4">
                  {transferHistory
                    .filter(t => t.patientId === parseInt(selectedPatientId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((transfer, idx) => {
                      const isRecent = (() => {
                        const transferDate = new Date(transfer.date);
                        const now = new Date();
                        const hoursDiff = (now - transferDate) / (1000 * 60 * 60);
                        return hoursDiff <= 24;
                      })();
                      
                      return (
                        <div key={idx} className={`relative p-5 rounded-xl border-2 transition-all duration-200 ${
                          isRecent 
                            ? 'bg-amber-50 border-amber-300 shadow-lg shadow-amber-200/50' 
                            : 'bg-white border-cyan-200 hover:shadow-md'
                        }`}>
                          {isRecent && (
                            <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                              <Activity size={12} className="animate-pulse" /> Reciente
                            </div>
                          )}
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-cyan-600 uppercase mb-2">{transfer.date}</p>
                              
                              <div className="space-y-3">
                                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                                  <p className="text-xs font-bold text-red-700 uppercase mb-1">Desde:</p>
                                  <p className="text-sm text-gray-800 font-semibold">{transfer.from}</p>
                                </div>
                                
                                <div className="flex justify-center">
                                  <ChevronRight size={24} className="text-gray-400" />
                                </div>
                                
                                <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded">
                                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Hacia:</p>
                                  <p className="text-sm text-gray-800 font-semibold">{transfer.to}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Motivo del traslado:</p>
                                <p className="text-sm text-gray-800 italic">{transfer.reason}</p>
                              </div>
                              
                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                                <User size={12} />
                                <span className="font-semibold">Coordinado por: {transfer.nurse}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity size={48} className="text-cyan-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No hay traslados registrados para este paciente.</p>
                  <p className="text-gray-500 text-sm mt-2">El historial de movimientos aparecerá aquí.</p>
                </div>
              )}
            </div>
          </div>

          {/* Historial de Notas Evolutivas del Paciente */}
          <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-2xl shadow-card border-2 border-indigo-100 overflow-hidden">
            <div className="p-6 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-indigo-600" /> Historial de Notas Evolutivas
              </h3>
              <p className="text-xs text-indigo-600 mt-1 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> NOM-004: Integridad del expediente - Las notas no pueden ser eliminadas
              </p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {nurseNotes.filter(note => note.patientId === parseInt(selectedPatientId)).length > 0 ? (
                <div className="space-y-4">
                  {nurseNotes
                    .filter(note => note.patientId === parseInt(selectedPatientId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((note, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-xl border-2 border-indigo-100 hover:shadow-lg transition-all duration-200 hover:border-indigo-300">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <FileText size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-indigo-600 uppercase">Nota Evolutiva</p>
                              <p className="text-xs text-gray-500 font-medium">{note.date}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                            #{nurseNotes.filter(n => n.patientId === parseInt(selectedPatientId)).length - idx}
                          </span>
                        </div>
                        <div className="pl-10">
                          <p className="text-gray-700 text-sm leading-relaxed mb-3 border-l-4 border-indigo-200 pl-4 italic">
                            "{note.note}"
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User size={12} />
                            <span className="font-semibold">Registrado por: {note.nurseName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="text-indigo-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No hay notas evolutivas registradas para este paciente.</p>
                  <p className="text-gray-500 text-sm mt-2">Las notas que registres aparecerán aquí.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Alerta de Alergia */}
      {showAllergyWarning && allergyAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className={`${getSeverityColors(allergyAlert.warning?.severity).alert} p-6 border-b-4 ${getSeverityColors(allergyAlert.warning?.severity).border}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getSeverityColors(allergyAlert.warning?.severity).gradient} flex items-center justify-center shadow-xl`}>
                    <AlertCircle className="text-white" size={32} strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black ${getSeverityColors(allergyAlert.warning?.severity).text} flex items-center gap-2`}>
                      {getSeverityLabel(allergyAlert.warning?.severity)} ALERTA DE ALERGIA
                    </h2>
                    <p className="text-sm font-bold text-gray-700 mt-1">
                      Sistema de Seguridad del Paciente
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Patient Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <User className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-gray-600 uppercase">Paciente</p>
                    <p className="text-lg font-black text-gray-800">{allergyAlert.patientName}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                  <p className="text-xs font-bold text-red-700 uppercase mb-1">Alergias Conocidas</p>
                  <p className="text-sm font-black text-red-900">{allergyAlert.patientAllergies}</p>
                </div>
              </div>

              {/* Medication Attempted */}
              <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-300">
                <p className="text-sm font-bold text-amber-700 uppercase mb-2">Medicamento Intentado</p>
                <p className="text-xl font-black text-gray-800">{pendingMedication?.medication}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Dosis: {pendingMedication?.dose} | Frecuencia: {pendingMedication?.frequency}
                </p>
              </div>

              {/* Direct Matches */}
              {allergyAlert.warning?.hasAllergy && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-red-600" size={24} />
                    <h3 className="text-lg font-black text-red-800">CONTRAINDICACIÓN ABSOLUTA</h3>
                  </div>
                  <div className="space-y-2">
                    {allergyAlert.warning.matches.map((match, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-red-200">
                        <p className="text-sm font-bold text-red-900">{match.message}</p>
                        {match.category && (
                          <p className="text-xs text-red-700 mt-1">
                            Categoría: {match.category}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm font-black text-red-900 flex items-center gap-2">
                      <span className="text-2xl">⛔</span>
                      NO ADMINISTRAR ESTE MEDICAMENTO
                    </p>
                  </div>
                </div>
              )}

              {/* Cross-Reactivity Warnings */}
              {allergyAlert.warning?.hasCrossReactivity && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-yellow-600" size={24} />
                    <h3 className="text-lg font-black text-yellow-800">ADVERTENCIA: POSIBLE REACCIÓN CRUZADA</h3>
                  </div>
                  <div className="space-y-2">
                    {allergyAlert.warning.crossReactivity.map((cross, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-yellow-200">
                        <p className="text-sm font-bold text-yellow-900">{cross.message}</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Categoría: {cross.category}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm font-black text-yellow-900 flex items-center gap-2">
                      <span className="text-2xl">⚠️</span>
                      Considere medicamento alternativo o consulte con médico
                    </p>
                  </div>
                </div>
              )}

              {/* User info */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600">
                  Esta alerta ha sido registrada en el sistema de auditoría.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Usuario: <strong>{user.name}</strong> ({user.role})
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={handleCancelAllergy}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all"
              >
                ✓ Cancelar y Revisar
              </button>
              {canOverrideAllergyWarning(user) && (
                <button
                  onClick={handleOverrideAllergy}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Sobrescribir (Solo Médico)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Edición de Nota */}
      {showEditNoteModal && editingNote && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 border-b-4 border-purple-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xl">
                    <Edit2 className="text-white" size={32} strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      Editar Nota de Enfermería
                    </h2>
                    <p className="text-sm font-bold text-purple-100 mt-1">
                      NOM-004: Período de edición de 24 horas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Time Warning */}
              {(() => {
                const noteDate = new Date(editingNote.date);
                const now = new Date();
                const ageHours = (now - noteDate) / (1000 * 60 * 60);
                const timeRemaining = 24 - ageHours;
                
                const formatTimeRemaining = (hours) => {
                  const h = Math.floor(hours);
                  const m = Math.floor((hours - h) * 60);
                  return h > 0 ? `${h}h ${m}m` : `${m} minutos`;
                };
                
                let urgencyColor = 'green';
                if (timeRemaining <= 2) urgencyColor = 'orange';
                else if (timeRemaining <= 12) urgencyColor = 'yellow';
                
                return (
                  <div className={`p-4 rounded-xl border-2 ${
                    urgencyColor === 'orange' ? 'bg-orange-50 border-orange-400 animate-pulse' :
                    urgencyColor === 'yellow' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-green-50 border-green-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Clock className={`${
                        urgencyColor === 'orange' ? 'text-orange-600' :
                        urgencyColor === 'yellow' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} size={24} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-700 uppercase">Tiempo Restante</p>
                        <p className={`text-2xl font-black ${
                          urgencyColor === 'orange' ? 'text-orange-700' :
                          urgencyColor === 'yellow' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {formatTimeRemaining(timeRemaining)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Nota creada el:</p>
                        <p className="text-sm font-bold text-gray-800">{editingNote.date}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Patient Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <User className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-gray-600 uppercase">Paciente</p>
                    <p className="text-lg font-black text-gray-800">
                      {patients.find(p => p.id === editingNote.patientId)?.name || 'Desconocido'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Original Note */}
              {editingNote.was_edited && editingNote.original_note && (
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <p className="text-sm font-bold text-gray-600 uppercase mb-2">Nota Original</p>
                  <p className="text-sm text-gray-700 italic">"{editingNote.original_note}"</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Esta nota ya ha sido editada {editingNote.edit_count || 1} veces
                  </p>
                </div>
              )}

              {/* Edit Area */}
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-2">
                  Contenido de la Nota *
                </label>
                <textarea
                  value={editNoteContent}
                  onChange={(e) => setEditNoteContent(e.target.value)}
                  className="w-full h-40 p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="Escriba el contenido actualizado de la nota..."
                />
              </div>

              {/* Edit Reason */}
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-2">
                  Razón de la Edición (Opcional)
                </label>
                <input
                  type="text"
                  value={editNoteReason}
                  onChange={(e) => setEditNoteReason(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="Ej: Corrección de dosis, información adicional, etc."
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800 font-medium">
                  ℹ️ Esta edición será registrada en el historial de auditoría conforme a NOM-004.
                  La nota original se preservará para trazabilidad legal.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowEditNoteModal(false);
                  setEditingNote(null);
                  setEditNoteContent('');
                  setEditNoteReason('');
                }}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!editNoteContent.trim()) {
                    alert('El contenido de la nota no puede estar vacío');
                    return;
                  }
                  
                  const result = await editNurseNote(
                    editingNote.id,
                    editNoteContent,
                    user.name,
                    user.role,
                    editNoteReason
                  );
                  
                  if (result.success) {
                    alert('✓ Nota editada correctamente');
                    setShowEditNoteModal(false);
                    setEditingNote(null);
                    setEditNoteContent('');
                    setEditNoteReason('');
                    // Refresh notes
                    window.location.reload();
                  } else {
                    alert(`❌ Error: ${result.error}`);
                  }
                }}
                disabled={!editNoteContent.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Ediciones */}
      {showNoteHistoryModal && selectedNoteHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 border-b-4 border-blue-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xl">
                    <Clock className="text-white" size={32} strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      Historial de Ediciones
                    </h2>
                    <p className="text-sm font-bold text-blue-100 mt-1">
                      Auditoría completa de cambios (NOM-004)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNoteHistoryModal(false);
                    setSelectedNoteHistory(null);
                    setNoteEditHistory([]);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Current State */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="text-green-600" size={24} />
                  <p className="text-sm font-bold text-green-800 uppercase">Versión Actual</p>
                </div>
                <p className="text-base text-gray-800 italic border-l-4 border-green-400 pl-3">
                  "{selectedNoteHistory.note}"
                </p>
                <div className="mt-3 flex gap-4 text-xs text-gray-600">
                  <span>Editada: {selectedNoteHistory.edit_count || 0} veces</span>
                  {selectedNoteHistory.last_edit_date && (
                    <span>Última edición: {new Date(selectedNoteHistory.last_edit_date).toLocaleString('es-MX')}</span>
                  )}
                </div>
              </div>

              {/* Original Note */}
              {selectedNoteHistory.original_note && (
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="text-gray-600" size={24} />
                    <p className="text-sm font-bold text-gray-700 uppercase">Nota Original</p>
                  </div>
                  <p className="text-base text-gray-700 italic border-l-4 border-gray-400 pl-3">
                    "{selectedNoteHistory.original_note}"
                  </p>
                  <div className="mt-3 text-xs text-gray-600">
                    Creada: {selectedNoteHistory.date}
                  </div>
                </div>
              )}

              {/* Edit History Timeline */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-indigo-600" />
                  Línea de Tiempo de Ediciones
                </h3>
                
                {noteEditHistory.length === 0 ? (
                  <div 
                    onClick={async () => {
                      const history = await getNoteEditHistory(selectedNoteHistory.id);
                      setNoteEditHistory(history);
                    }}
                    className="text-center py-8 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-100 transition-all"
                  >
                    <Clock size={40} className="text-indigo-400 mx-auto mb-2" />
                    <p className="text-indigo-600 font-bold">Click para cargar historial</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {noteEditHistory.map((edit, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {edit.edited_by} ({edit.edited_by_role})
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(edit.edit_date).toLocaleString('es-MX')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                              {edit.note_age_hours.toFixed(1)}h después
                            </span>
                          </div>
                        </div>
                        
                        {edit.edit_reason && (
                          <div className="mb-3 p-2 bg-amber-50 border-l-4 border-amber-400 rounded">
                            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Razón</p>
                            <p className="text-sm text-amber-900">{edit.edit_reason}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <p className="text-xs font-bold text-red-700 uppercase mb-2">Contenido Anterior</p>
                            <p className="text-sm text-gray-700 line-through">"{edit.previous_content}"</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <p className="text-xs font-bold text-green-700 uppercase mb-2">Contenido Nuevo</p>
                            <p className="text-sm text-gray-700">"{edit.new_content}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t-2 border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowNoteHistoryModal(false);
                  setSelectedNoteHistory(null);
                  setNoteEditHistory([]);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );};

  // --- RENDERIZADO PRINCIPAL CON NUEVO LAYOUT (Sidebar + Contenido) ---
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* SIDEBAR DE NAVEGACIÓN - Redesigned */}
      <aside className={`${sidebarOpen ? 'w-96' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="p-6 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Activity className="text-white" size={40} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-6xl font-black text-gray-800 leading-tight">San Rafael</h1>
                    <span className="text-2xl text-gray-500 font-semibold">Gestión Clínica</span>
                </div>
            </div>
          ) : (
             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md mx-auto">
                <Activity className="text-white" size={24} strokeWidth={2.5} />
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Panel General', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-600' },
            { id: 'patients', label: 'Lista de Pacientes', icon: Users, color: 'from-emerald-500 to-teal-600' },
            { id: 'beds', label: 'Disponibilidad Camas', icon: Building2, color: 'from-indigo-500 to-purple-600' },
            { id: 'care', label: 'Zona de Cuidados', icon: Stethoscope, color: 'from-purple-500 to-pink-600' },
            { id: 'shifts', label: 'Mi Turno', icon: Clock, color: 'from-orange-500 to-amber-600' },
            { id: 'nursingSheet', label: 'Hoja de Enfermería', icon: ClipboardList, color: 'from-indigo-500 to-purple-600' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-6 py-6 rounded-xl transition-all duration-200 font-bold text-3xl ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={36} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Perfil de Usuario */}
        <div className="p-6 border-t border-gray-200">
          <div className={`flex items-center gap-4 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-3xl shadow-sm">
              {user.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-3xl font-bold text-gray-800 truncate">{user.name}</p>
                <p className="text-2xl text-gray-500">Enfermería</p>
              </div>
            )}
          </div>
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-3 px-6 py-5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-all font-bold text-2xl ${!sidebarOpen && 'px-0'}`}>
            <LogOut size={32} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Header Superior (Sticky) */}
        <header className="sticky top-0 bg-gradient-to-r from-white via-blue-50/50 to-purple-50/50 backdrop-blur-md border-b-2 border-purple-200 z-10 px-8 py-5 flex justify-between items-center shadow-lg shadow-blue-100/50">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
              {activeTab === 'overview' && 'Visión General'}
              {activeTab === 'patients' && 'Directorio de Pacientes'}
              {activeTab === 'beds' && 'Disponibilidad de Camas'}
              {activeTab === 'care' && 'Gestión y Cuidados'}
            </h1>
            <p className="text-gray-600 text-sm font-medium mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse shadow-lg shadow-emerald-500/50"></span> Sistema Hospitalario Activo
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
              <div className="text-right hidden lg:block bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-xl border-2 border-purple-200 shadow-sm">
                <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
             <button className="bg-gradient-to-r from-blue-100 to-purple-100 p-2 rounded-full text-purple-600 hover:shadow-lg hover:shadow-purple-200 hover:scale-110 transition-all md:hidden">
                <Menu size={24} />
             </button>
          </div>
        </header>

        {/* Contenedor de Vistas */}
        <div className="p-6 md:p-8 flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
          {patientsLoading ? (
            <div className="flex h-full items-center justify-center flex-col gap-6">
              <div className="relative">
                 <div className="w-20 h-20 border-4 border-purple-200 rounded-full"></div>
                 <div className="w-20 h-20 border-4 border-t-blue-600 border-r-purple-600 border-b-pink-600 border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                 <Activity className="text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={28}/>
              </div>
              <p className="text-gray-600 font-medium animate-pulse">Cargando datos del sistema...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewView />}
              {activeTab === 'patients' && <PatientsListView />}
              {activeTab === 'beds' && <BedManagement user={user} patients={patients} />}
              {activeTab === 'care' && <CareView />}
              {activeTab === 'shifts' && <ShiftsView />}
              {activeTab === 'nursingSheet' && <NursingSheetView />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (Entry Point) ---
const HospitalManagementSystem = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(true); // Iniciar con login visible
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPasswordRecoveryModal, setShowPasswordRecoveryModal] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try { await initializeApp(); setAppInitialized(true); } 
      catch (err) { console.error("Error iniciando app:", err); }
    };
    init();
  }, []);

  if (!appInitialized) return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-gradient">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 border-8 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-white" size={40} strokeWidth={3} />
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-black text-white">Iniciando Sistema Hospitalario</h2>
        <p className="mt-3 text-white/80 font-medium">Configurando servicios médicos...</p>
        <div className="mt-6 flex gap-2 justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!currentUser ? (
        <>
          {showLoginModal && (
            <LoginForm 
              onLoginSuccess={(user) => { setCurrentUser({...user, type: user.role === 'nurse' ? 'nurse' : 'other'}); setShowLoginModal(false); }}
              onBackToHome={() => {}} 
              onShowRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
              onShowPasswordRecovery={() => { setShowLoginModal(false); setShowPasswordRecoveryModal(true); }}
            />
          )}
          {showRegisterModal && (
            <RegisterForm 
              onRegisterSuccess={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
              onBackToHome={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
            />
          )}
          {showPasswordRecoveryModal && (
            <PasswordRecoveryForm 
              onBack={() => { setShowPasswordRecoveryModal(false); setShowLoginModal(true); }}
              onRecoverySuccess={() => { setShowPasswordRecoveryModal(false); setShowLoginModal(true); }}
            />
          )}
        </>
      ) : (
        currentUser.type === 'nurse' 
          ? <NurseDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
          : <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-gradient-to-br from-rose-50 to-red-50">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-red-200">
                <h2 className="text-3xl font-black bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent mb-3">Acceso Restringido</h2>
                <p className="text-gray-700 mb-6">Este portal es exclusivo para personal de enfermería.</p>
                <button 
                  onClick={() => setCurrentUser(null)} 
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
      )}
    </>
  );
};

export default HospitalManagementSystem;
