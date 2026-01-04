import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, User, FileText, Activity, Users, Pill, 
  LogOut, Heart, Stethoscope, AlertCircle, CheckCircle, 
  Menu, X, LayoutDashboard, Syringe, ClipboardList, ChevronRight, Save, Building2, ShieldCheck, Bed, Edit2,
  MessageCircle, Eye, Brain, Lock, Info, Droplet, Gauge, AlertTriangle, Bandage, FileSignature
} from 'lucide-react';
import { usePatients, useAppointments, useTreatments, useVitalSigns, useNurseNotes, useNonPharmaTreatments, initializeApp } from './hooks/useDatabase';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PasswordRecoveryForm from './components/PasswordRecoveryForm';
import { logout as authLogout } from './services/auth';
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
import { logAllergyAlert, editNurseNote, getNoteEditHistory, createNurseNote, getAllPharmacyItems } from './services/database';

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
  const { nurseNotes, addNurseNote: addNurseNoteDB, refresh: refreshNotes } = useNurseNotes();
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
  
  // Triage modal states
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [selectedTriagePatient, setSelectedTriagePatient] = useState(null);
  
  // Transfers modal states
  const [showTransfersModal, setShowTransfersModal] = useState(false);
  const [selectedTransfersPatient, setSelectedTransfersPatient] = useState(null);
  
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

  // Función para obtener información de triaje según nivel
  const getTriageInfo = (level) => {
    const triageMap = {
      1: { name: 'Nivel I - Resucitación', color: 'bg-red-600', textColor: 'text-red-600', borderColor: 'border-red-600', ringColor: 'ring-red-200', description: 'Riesgo vital inmediato' },
      2: { name: 'Nivel II - Emergencia', color: 'bg-orange-500', textColor: 'text-orange-500', borderColor: 'border-orange-500', ringColor: 'ring-orange-200', description: 'Situación de emergencia' },
      3: { name: 'Nivel III - Urgencia', color: 'bg-yellow-500', textColor: 'text-yellow-600', borderColor: 'border-yellow-500', ringColor: 'ring-yellow-200', description: 'Situación urgente' },
      4: { name: 'Nivel IV - Urgencia Menor', color: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-500', ringColor: 'ring-green-200', description: 'Urgencia menor' },
      5: { name: 'Nivel V - No Urgente', color: 'bg-blue-500', textColor: 'text-blue-600', borderColor: 'border-blue-500', ringColor: 'ring-blue-200', description: 'Sin urgencia' }
    };
    return triageMap[level] || triageMap[3];
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
      </div>,
      document.body
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

  // Modal de Triaje
  const TriageModal = () => {
    if (!showTriageModal || !selectedTriagePatient) return null;
    
    const triageInfo = getTriageInfo(selectedTriagePatient.triage_level || 3);
    
    // Obtener signos vitales de ingreso (primeros registrados)
    const admissionVitals = vitalSigns
      .filter(vs => vs.patientId === selectedTriagePatient.id)
      .sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date))[0];
    
    const handleClose = () => {
      setShowTriageModal(false);
      setSelectedTriagePatient(null);
    };
    
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn" 
        style={{ zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 px-6 py-5 flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={28} className="animate-pulse" />
              <div>
                <h2 className="text-2xl font-black">Información de Triaje</h2>
                <p className="text-white/90 text-sm mt-1">Paciente: {selectedTriagePatient.name}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowTriageModal(false);
                setSelectedTriagePatient(null);
              }}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            {/* Nivel y Color de Triaje */}
            <div className={`border-2 ${triageInfo.borderColor} rounded-xl p-5 bg-gradient-to-br from-white to-gray-50`}>
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-16 h-16 rounded-xl ${triageInfo.color} flex items-center justify-center text-white font-black text-2xl shadow-lg`}>
                  {selectedTriagePatient.triage_level || 3}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Nivel de Triaje</p>
                  <p className={`text-xl font-black ${triageInfo.textColor}`}>{triageInfo.name}</p>
                </div>
              </div>
              <p className="text-gray-700 font-medium">{triageInfo.description}</p>
            </div>

            {/* Signos Vitales de Ingreso */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Heart size={20} className="text-red-500" />
                Signos Vitales de Ingreso
              </h3>
              {admissionVitals ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Temperatura</p>
                    <p className="text-2xl font-bold text-gray-900">{admissionVitals.temperature}°C</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                    <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Presión Arterial</p>
                    <p className="text-2xl font-bold text-gray-900">{admissionVitals.bloodPressure}</p>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
                    <p className="text-xs font-semibold text-pink-600 uppercase mb-1">Frecuencia Cardíaca</p>
                    <p className="text-2xl font-bold text-gray-900">{admissionVitals.heartRate} bpm</p>
                  </div>
                  <div className="bg-cyan-50 rounded-xl p-4 border-2 border-cyan-200">
                    <p className="text-xs font-semibold text-cyan-600 uppercase mb-1">Frecuencia Respiratoria</p>
                    <p className="text-2xl font-bold text-gray-900">{admissionVitals.respiratoryRate} rpm</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-gray-200">
                  <p className="text-gray-600 font-medium">No hay signos vitales de ingreso registrados</p>
                </div>
              )}
            </div>

            {/* Motivo de Consulta */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" />
                Motivo de Consulta
              </h3>
              <div className="bg-indigo-50 rounded-xl p-5 border-2 border-indigo-200">
                <p className="text-gray-800 font-medium leading-relaxed">
                  {selectedTriagePatient.admission_reason || selectedTriagePatient.reason || 'No especificado'}
                </p>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Ingreso</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(selectedTriagePatient.admission_date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Estado Actual</p>
                <p className="text-sm font-bold text-gray-900">{selectedTriagePatient.condition}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => {
                setShowTriageModal(false);
                setSelectedTriagePatient(null);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Traslados
  const TransfersModal = () => {
    if (!showTransfersModal || !selectedTransfersPatient) return null;
    
    // Filtrar traslados del paciente seleccionado
    const patientTransfers = transferHistory.filter(t => t.patientId === selectedTransfersPatient.id);
    
    const handleClose = () => {
      setShowTransfersModal(false);
      setSelectedTransfersPatient(null);
    };
    
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn" 
        style={{ zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-5 flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Building2 size={28} />
              <div>
                <h2 className="text-2xl font-black">Historial de Traslados</h2>
                <p className="text-white/90 text-sm mt-1">Paciente: {selectedTransfersPatient.name}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowTransfersModal(false);
                setSelectedTransfersPatient(null);
              }}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {patientTransfers.length > 0 ? (
              <div className="space-y-4">
                {/* Timeline de Traslados */}
                {patientTransfers
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((transfer, index) => {
                    const transferDate = new Date(transfer.date);
                    const isToday = transferDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={index} className="relative pl-8 pb-6 border-l-4 border-indigo-200 last:pb-0">
                        {/* Punto en la línea de tiempo */}
                        <div className="absolute left-[-10px] top-0 w-5 h-5 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 border-4 border-white shadow-lg"></div>
                        
                        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl p-5 shadow-md border-2 border-indigo-100 hover:shadow-lg transition-all">
                          {/* Fecha y Hora */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-indigo-600" />
                              <span className="text-sm font-bold text-gray-900">
                                {transferDate.toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-sm text-gray-600">•</span>
                              <span className="text-sm font-semibold text-indigo-600">
                                {transferDate.toLocaleTimeString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {isToday && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                HOY
                              </span>
                            )}
                          </div>

                          {/* Movimiento */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                              <p className="text-xs font-semibold text-red-600 uppercase mb-1">Origen</p>
                              <p className="text-sm font-bold text-gray-900">{transfer.from}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                              <p className="text-xs font-semibold text-green-600 uppercase mb-1">Destino</p>
                              <p className="text-sm font-bold text-gray-900">{transfer.to}</p>
                            </div>
                          </div>

                          {/* Motivo */}
                          {transfer.reason && (
                            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200 mb-3">
                              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Motivo del Traslado</p>
                              <p className="text-sm text-gray-800 font-medium">{transfer.reason}</p>
                            </div>
                          )}

                          {/* Responsable */}
                          <div className="flex items-center gap-2 text-sm">
                            <User size={16} className="text-purple-600" />
                            <span className="text-gray-600">Responsable:</span>
                            <span className="font-bold text-gray-900">{transfer.nurse}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              // Mensaje ERR-13
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200 p-12 text-center">
                <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-700 mb-2">ERR-13</h3>
                <p className="text-gray-600 font-medium">No hay traslados registrados para este paciente</p>
                <p className="text-gray-500 text-sm mt-2">
                  El paciente no ha sido trasladado desde su ingreso
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => {
                setShowTransfersModal(false);
                setSelectedTransfersPatient(null);
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PatientsListView = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3">
              <Users size={32} />
              Lista de Pacientes Asignados
            </h2>
            <p className="text-blue-100 mt-2 text-sm font-medium">
              Mostrando {patients.length} paciente(s) asignado(s) a su turno actual
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl border-2 border-white/30">
            <p className="text-sm font-semibold text-blue-100">Turno Actual</p>
            <p className="text-2xl font-black">{currentShift?.name || 'No asignado'}</p>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Pacientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {patients.map((patient) => {
          const location = getPatientLocation(patient.id);
          const hasAllergies = patient.allergies && patient.allergies.trim() !== '';
          
          const statusConfig = {
            'Crítico': { 
              bg: 'from-red-500 to-rose-600', 
              dot: 'bg-red-500',
              ring: 'ring-red-200',
              text: 'text-red-700'
            },
            'Estable': { 
              bg: 'from-emerald-500 to-teal-600', 
              dot: 'bg-emerald-500',
              ring: 'ring-emerald-200',
              text: 'text-emerald-700'
            },
            'Recuperación': { 
              bg: 'from-blue-500 to-cyan-600', 
              dot: 'bg-blue-500',
              ring: 'ring-blue-200',
              text: 'text-blue-700'
            },
            'Regular': { 
              bg: 'from-amber-500 to-orange-600', 
              dot: 'bg-amber-500',
              ring: 'ring-amber-200',
              text: 'text-amber-700'
            },
          };
          const statusStyle = statusConfig[patient.condition] || statusConfig['Regular'];
          
          return (
            <div 
              key={patient.id}
              className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${hasAllergies ? 'border-red-500 ring-4 ring-red-200' : 'border-gray-200 hover:border-blue-300'}`}
            >
              {/* Alerta de Alergia - Franja Roja Superior */}
              {hasAllergies && (
                <div className="bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 flex items-center gap-2">
                  <AlertCircle size={20} className="text-white animate-pulse" />
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">⚠️ ALERTA DE ALERGIA</p>
                    <p className="text-red-100 text-xs font-medium">{patient.allergies}</p>
                  </div>
                </div>
              )}

              {/* Contenido de la Tarjeta */}
              <div className="p-6">
                {/* Identificación */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${statusStyle.bg} text-white flex items-center justify-center font-black text-2xl shadow-lg flex-shrink-0`}>
                    {patient.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 truncate">{patient.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span className="font-medium">CI: {patient.id.toString().padStart(8, '0')}</span>
                      <span>•</span>
                      <span>{patient.age} años</span>
                      <span>•</span>
                      <span>{patient.gender || 'N/D'}</span>
                    </div>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={18} className="text-blue-600" />
                    <p className="text-xs font-bold text-blue-600 uppercase">Ubicación</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Habitación</p>
                      <p className="font-bold text-gray-900">{location.room}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Cama</p>
                      <p className="font-bold text-gray-900">{location.bed}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">Área</p>
                      <p className="font-bold text-gray-900">Piso {location.floor} - {location.area}</p>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope size={18} className="text-purple-600" />
                    <p className="text-xs font-bold text-purple-600 uppercase">Diagnóstico Principal</p>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">
                    {patient.primary_diagnosis || 'No especificado'}
                  </p>
                </div>

                {/* Estado y Acción */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${statusStyle.dot} animate-pulse`}></div>
                    <span className={`text-sm font-bold ${statusStyle.text}`}>{patient.condition}</span>
                  </div>
                  
                  {/* Botones de Acción */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => { 
                        setSelectedTriagePatient(patient);
                        setShowTriageModal(true);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <AlertCircle size={14} />
                      Ver Triaje
                    </button>
                    <button 
                      onClick={() => { 
                        setSelectedTransfersPatient(patient);
                        setShowTransfersModal(true);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <Building2 size={14} />
                      Ver Traslados
                    </button>
                    <button 
                      onClick={() => { 
                        setSelectedPatientId(patient.id); 
                        setActiveTab('care'); 
                      }}
                      className="col-span-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      Ver Detalles Completos
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensaje si no hay pacientes */}
      {patients.length === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200 p-12 text-center">
          <Users size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">No hay pacientes asignados</h3>
          <p className="text-gray-600">No tiene pacientes asignados para su turno actual</p>
        </div>
      )}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fadeIn">
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fadeIn">
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fadeIn">
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

  // --- NUEVOS COMPONENTES DE VISTA ---
  
  // Vista de Pacientes Asignados - Lista de trabajo del día
  const AssignedPatientsView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-emerald-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Users size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-800">Pacientes Asignados</h2>
            <p className="text-lg text-gray-600 font-medium">Su lista de trabajo del día • {patients.length} pacientes</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => {
            const loc = getPatientLocation(patient.id);
            return (
              <div key={patient.id} className="bg-white p-6 rounded-xl border-2 border-emerald-200 shadow-md hover:shadow-xl transition-all cursor-pointer hover:scale-105" onClick={() => { setSelectedPatientId(patient.id); setActiveTab('care'); }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {patient.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{patient.name}</h3>
                    <p className="text-sm text-gray-600">{patient.age} años • {patient.bloodType}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-emerald-600" />
                    <span className="text-gray-700 font-medium">Piso {loc.floor} - {loc.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed size={14} className="text-emerald-600" />
                    <span className="text-gray-700 font-medium">Hab. {loc.room} - Cama {loc.bed}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    patient.condition === 'Crítico' ? 'bg-red-100 text-red-700' :
                    patient.condition === 'Estable' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {patient.condition}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Vista de Registro Clínico - Formularios para documentar atención
  const ClinicalRecordView = () => {
    const [selectedClinicalPatient, setSelectedClinicalPatient] = useState('');
    const [vitalSignsForm, setVitalSignsForm] = useState({
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      respiratoryRate: '',
      temperature: '',
      oxygenSaturation: '',
      glucose: '',
      painLevel: ''
    });
    const [validationErrors, setValidationErrors] = useState({});
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    
    // Estados para Notas Evolutivas SOAP
    const [selectedSOAPPatient, setSelectedSOAPPatient] = useState('');
    const [soapForm, setSOAPForm] = useState({
      subjective: '',
      objective: '',
      analysis: '',
      plan: ''
    });
    const [showSOAPSuccess, setShowSOAPSuccess] = useState(false);
    const [showSOAPConfirm, setShowSOAPConfirm] = useState(false);
    
    // Estados para Administración de Medicamentos (ECU-09)
    const [selectedMedPatient, setSelectedMedPatient] = useState('');
    const [medicationForm, setMedicationForm] = useState({
      medication: '',
      dose: '',
      route: '',
      observations: ''
    });
    const [pharmacyInventory, setPharmacyInventory] = useState([]);
    const [allergyAlert, setAllergyAlert] = useState(null);
    const [stockError, setStockError] = useState(null);
    const [showFiveRights, setShowFiveRights] = useState(false);
    const [showMedSuccess, setShowMedSuccess] = useState(false);
    
    // Cargar inventario de farmacia
    useEffect(() => {
      const loadPharmacy = async () => {
        const items = await getAllPharmacyItems();
        setPharmacyInventory(items);
      };
      loadPharmacy();
    }, []);
    
    // Estados para Formatos Digitales (ECU-13)
    const [activeDigitalForm, setActiveDigitalForm] = useState('balance');
    const [selectedFormPatient, setSelectedFormPatient] = useState('');
    
    // A. Balance Hídrico
    const [balanceForm, setBalanceForm] = useState({
      oralIntake: '',
      ivIntake: '',
      urineOutput: '',
      drainageOutput: '',
      observations: ''
    });
    const [showBalanceSuccess, setShowBalanceSuccess] = useState(false);
    
    // B. Valoración de Dolor
    const [painForm, setPainForm] = useState({
      intensity: '',
      location: '',
      painType: '',
      triggers: '',
      treatment: ''
    });
    const [showPainSuccess, setShowPainSuccess] = useState(false);
    
    // C. Valoración de Riesgo de Caídas
    const [fallRiskForm, setFallRiskForm] = useState({
      over65: '',
      fallHistory: '',
      gaitAlteration: '',
      riskMedication: '',
      preventiveMeasures: []
    });
    const [showFallRiskSuccess, setShowFallRiskSuccess] = useState(false);
    
    // D. Registro de Cuidados de Heridas
    const [woundForm, setWoundForm] = useState({
      location: '',
      length: '',
      width: '',
      appearance: '',
      exudateType: '',
      treatment: '',
      materials: ''
    });
    const [showWoundSuccess, setShowWoundSuccess] = useState(false);
    
    // E. Consentimiento Informado
    const [consentForm, setConsentForm] = useState({
      procedure: '',
      risks: '',
      understands: '',
      consentGiven: ''
    });
    const [showConsentSuccess, setShowConsentSuccess] = useState(false);
    const [showConsentConfirm, setShowConsentConfirm] = useState(false);
    
    // Función de validación de rangos (RN-02)
    const validateVitalSigns = () => {
      const errors = {};
      
      // Presión Arterial Sistólica (90-250 mmHg)
      if (vitalSignsForm.bloodPressureSystolic) {
        const systolic = parseFloat(vitalSignsForm.bloodPressureSystolic);
        if (isNaN(systolic) || systolic < 50 || systolic > 300) {
          errors.bloodPressureSystolic = 'La presión sistólica debe estar entre 50-300 mmHg';
        }
      }
      
      // Presión Arterial Diastólica (40-150 mmHg)
      if (vitalSignsForm.bloodPressureDiastolic) {
        const diastolic = parseFloat(vitalSignsForm.bloodPressureDiastolic);
        if (isNaN(diastolic) || diastolic < 30 || diastolic > 200) {
          errors.bloodPressureDiastolic = 'La presión diastólica debe estar entre 30-200 mmHg';
        }
      }
      
      // Frecuencia Cardíaca (30-250 lpm)
      if (vitalSignsForm.heartRate) {
        const hr = parseFloat(vitalSignsForm.heartRate);
        if (isNaN(hr) || hr < 30 || hr > 250) {
          errors.heartRate = 'La frecuencia cardíaca debe estar entre 30-250 lpm';
        }
      }
      
      // Frecuencia Respiratoria (8-60 rpm)
      if (vitalSignsForm.respiratoryRate) {
        const rr = parseFloat(vitalSignsForm.respiratoryRate);
        if (isNaN(rr) || rr < 8 || rr > 60) {
          errors.respiratoryRate = 'La frecuencia respiratoria debe estar entre 8-60 rpm';
        }
      }
      
      // Temperatura (35-42°C)
      if (vitalSignsForm.temperature) {
        const temp = parseFloat(vitalSignsForm.temperature);
        if (isNaN(temp) || temp < 35 || temp > 42) {
          errors.temperature = 'La temperatura debe estar entre 35-42°C (revise si ingresó 375 en lugar de 37.5)';
        }
      }
      
      // Saturación de Oxígeno (70-100%)
      if (vitalSignsForm.oxygenSaturation) {
        const sat = parseFloat(vitalSignsForm.oxygenSaturation);
        if (isNaN(sat) || sat < 70 || sat > 100) {
          errors.oxygenSaturation = 'La saturación de oxígeno debe estar entre 70-100%';
        }
      }
      
      // Glucosa (20-600 mg/dL) - Opcional
      if (vitalSignsForm.glucose) {
        const gluc = parseFloat(vitalSignsForm.glucose);
        if (isNaN(gluc) || gluc < 20 || gluc > 600) {
          errors.glucose = 'La glucosa debe estar entre 20-600 mg/dL';
        }
      }
      
      // Nivel de Dolor EVA (0-10) - Opcional
      if (vitalSignsForm.painLevel) {
        const pain = parseFloat(vitalSignsForm.painLevel);
        if (isNaN(pain) || pain < 0 || pain > 10) {
          errors.painLevel = 'El nivel de dolor debe estar entre 0-10';
        }
      }
      
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    };
    
    const handleSaveVitalSigns = async () => {
      // Validar que haya un paciente seleccionado
      if (!selectedClinicalPatient) {
        alert('Debe seleccionar un paciente');
        return;
      }
      
      // Validar campos obligatorios
      if (!vitalSignsForm.bloodPressureSystolic || !vitalSignsForm.bloodPressureDiastolic || 
          !vitalSignsForm.heartRate || !vitalSignsForm.respiratoryRate || 
          !vitalSignsForm.temperature || !vitalSignsForm.oxygenSaturation) {
        alert('Debe completar todos los campos obligatorios');
        return;
      }
      
      // Validar rangos
      if (!validateVitalSigns()) {
        return;
      }
      
      // Guardar signos vitales
      const bloodPressure = `${vitalSignsForm.bloodPressureSystolic}/${vitalSignsForm.bloodPressureDiastolic}`;
      await addVitalSignsDB(
        selectedClinicalPatient,
        new Date().toISOString(),
        vitalSignsForm.temperature,
        bloodPressure,
        vitalSignsForm.heartRate,
        vitalSignsForm.respiratoryRate,
        user.name
      );
      
      // Mostrar mensaje de éxito MSG-04
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Limpiar formulario
      setVitalSignsForm({
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        respiratoryRate: '',
        temperature: '',
        oxygenSaturation: '',
        glucose: '',
        painLevel: ''
      });
      setSelectedClinicalPatient('');
      setValidationErrors({});
    };
    
    // Función para guardar nota SOAP con confirmación MSG-03
    const handleSaveSOAPNote = () => {
      // Validar que haya un paciente seleccionado
      if (!selectedSOAPPatient) {
        alert('Debe seleccionar un paciente');
        return;
      }
      
      // Validar campos obligatorios
      if (!soapForm.subjective || !soapForm.objective || !soapForm.analysis || !soapForm.plan) {
        alert('Debe completar todos los campos del formato SOAP');
        return;
      }
      
      // Mostrar confirmación MSG-03
      setShowSOAPConfirm(true);
    };
    
    // Confirmar y guardar nota SOAP
    const confirmSaveSOAPNote = async () => {
      const soapNote = `NOTA EVOLUTIVA - FORMATO SOAP\n\n` +
                       `S (SUBJETIVO):\n${soapForm.subjective}\n\n` +
                       `O (OBJETIVO):\n${soapForm.objective}\n\n` +
                       `A (ANÁLISIS):\n${soapForm.analysis}\n\n` +
                       `P (PLAN):\n${soapForm.plan}`;
      
      await createNurseNote({
        patientId: selectedSOAPPatient,
        date: new Date().toISOString(),
        note: soapNote,
        noteType: 'evolutiva_soap',
        nurseName: user.name,
        userId: user.id
      });
      
      // Cerrar confirmación y mostrar éxito
      setShowSOAPConfirm(false);
      setShowSOAPSuccess(true);
      setTimeout(() => setShowSOAPSuccess(false), 3000);
      
      // Limpiar formulario
      setSOAPForm({
        subjective: '',
        objective: '',
        analysis: '',
        plan: ''
      });
      setSelectedSOAPPatient('');
      
      // Recargar notas
      await refreshNotes();
    };
    
    // Función para verificar si una nota es editable (RN-07: 24 horas)
    const isNoteEditable = (noteDate) => {
      const noteTime = new Date(noteDate).getTime();
      const currentTime = new Date().getTime();
      const hoursDiff = (currentTime - noteTime) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    };
    
    // Función para validar medicamento seleccionado (RN-05 y RN-10)
    const handleMedicationSelect = (medicationId) => {
      setMedicationForm({...medicationForm, medication: medicationId});
      setAllergyAlert(null);
      setStockError(null);
      
      if (!selectedMedPatient || !medicationId) return;
      
      // Buscar el medicamento en el inventario
      const selectedMed = pharmacyInventory.find(m => m.id === parseInt(medicationId));
      if (!selectedMed) return;
      
      // RN-10: Verificar stock
      if (selectedMed.quantity === 0) {
        setStockError(`RN-10: Sin stock suficiente de ${selectedMed.medication_name}`);
        return;
      }
      
      // RN-05: Validar alergias
      const patient = patients.find(p => p.id === parseInt(selectedMedPatient));
      if (patient) {
        const validation = validateMedicationForPatient(selectedMed.medication_name, patient);
        if (!validation.valid) {
          setAllergyAlert({
            medication: selectedMed.medication_name,
            patient: patient.name,
            allergies: patient.allergies,
            warning: validation.warning
          });
        }
      }
    };
    
    // Función para mostrar los 5 Correctos antes de guardar
    const handleShowFiveRights = () => {
      // Validar campos obligatorios
      if (!selectedMedPatient || !medicationForm.medication || !medicationForm.dose || !medicationForm.route) {
        alert('Debe completar todos los campos obligatorios');
        return;
      }
      
      // Verificar que no haya alertas críticas
      if (allergyAlert) {
        alert('No puede administrar este medicamento debido a alergias del paciente');
        return;
      }
      
      if (stockError) {
        alert('No puede administrar este medicamento debido a falta de stock');
        return;
      }
      
      setShowFiveRights(true);
    };
    
    // Función para guardar la administración de medicamento
    const confirmMedicationAdministration = async () => {
      const selectedMed = pharmacyInventory.find(m => m.id === parseInt(medicationForm.medication));
      const patient = patients.find(p => p.id === parseInt(selectedMedPatient));
      
      await addTreatmentDB({
        patientId: selectedMedPatient,
        medication: selectedMed.medication_name,
        dose: medicationForm.dose,
        frequency: 'Única vez',
        startDate: new Date().toISOString(),
        appliedBy: user.name,
        lastApplication: new Date().toISOString(),
        responsibleDoctor: '',
        administrationTimes: medicationForm.route,
        status: 'Completado',
        notes: medicationForm.observations || ''
      });
      
      // Cerrar modal y mostrar éxito
      setShowFiveRights(false);
      setShowMedSuccess(true);
      setTimeout(() => setShowMedSuccess(false), 3000);
      
      // Limpiar formulario
      setMedicationForm({
        medication: '',
        dose: '',
        route: '',
        observations: ''
      });
      setSelectedMedPatient('');
      setAllergyAlert(null);
      setStockError(null);
    };
    
    // Funciones de guardado para Formatos Digitales (ECU-13)
    
    // A. Guardar Balance Hídrico
    const handleSaveBalance = async () => {
      if (!selectedFormPatient || !balanceForm.oralIntake || !balanceForm.ivIntake || !balanceForm.urineOutput || !balanceForm.drainageOutput) {
        alert('Debe completar todos los campos obligatorios del Balance Hídrico');
        return;
      }
      
      const balanceNote = `BALANCE HÍDRICO\n\n` +
                          `INGRESOS:\n` +
                          `- Vía Oral: ${balanceForm.oralIntake} ml\n` +
                          `- Vía Intravenosa: ${balanceForm.ivIntake} ml\n` +
                          `- TOTAL INGRESOS: ${parseInt(balanceForm.oralIntake) + parseInt(balanceForm.ivIntake)} ml\n\n` +
                          `EGRESOS:\n` +
                          `- Diuresis: ${balanceForm.urineOutput} ml\n` +
                          `- Drenajes: ${balanceForm.drainageOutput} ml\n` +
                          `- TOTAL EGRESOS: ${parseInt(balanceForm.urineOutput) + parseInt(balanceForm.drainageOutput)} ml\n\n` +
                          `BALANCE: ${(parseInt(balanceForm.oralIntake) + parseInt(balanceForm.ivIntake)) - (parseInt(balanceForm.urineOutput) + parseInt(balanceForm.drainageOutput))} ml\n\n` +
                          `OBSERVACIONES: ${balanceForm.observations || 'Ninguna'}`;
      
      await createNurseNote({
        patientId: selectedFormPatient,
        date: new Date().toISOString(),
        note: balanceNote,
        noteType: 'balance_hidrico',
        nurseName: user.name,
        userId: user.id
      });
      
      setShowBalanceSuccess(true);
      setTimeout(() => setShowBalanceSuccess(false), 3000);
      setBalanceForm({ oralIntake: '', ivIntake: '', urineOutput: '', drainageOutput: '', observations: '' });
      await refreshNotes();
    };
    
    // B. Guardar Valoración de Dolor
    const handleSavePain = async () => {
      if (!selectedFormPatient || !painForm.intensity || !painForm.location || !painForm.painType) {
        alert('Debe completar todos los campos obligatorios de Valoración de Dolor');
        return;
      }
      
      const painNote = `VALORACIÓN DE DOLOR (EVA)\n\n` +
                       `Intensidad: ${painForm.intensity}/10\n` +
                       `Localización: ${painForm.location}\n` +
                       `Tipo de Dolor: ${painForm.painType}\n` +
                       `Factores Desencadenantes: ${painForm.triggers || 'No especificado'}\n` +
                       `Tratamiento Aplicado: ${painForm.treatment || 'Ninguno'}`;
      
      await createNurseNote({
        patientId: selectedFormPatient,
        date: new Date().toISOString(),
        note: painNote,
        noteType: 'valoracion_dolor',
        nurseName: user.name,
        userId: user.id
      });
      
      setShowPainSuccess(true);
      setTimeout(() => setShowPainSuccess(false), 3000);
      setPainForm({ intensity: '', location: '', painType: '', triggers: '', treatment: '' });
      await refreshNotes();
    };
    
    // C. Guardar Valoración de Riesgo de Caídas
    const handleSaveFallRisk = async () => {
      if (!selectedFormPatient || !fallRiskForm.over65 || !fallRiskForm.fallHistory || !fallRiskForm.gaitAlteration || !fallRiskForm.riskMedication) {
        alert('Debe completar todos los campos obligatorios de Valoración de Riesgo de Caídas');
        return;
      }
      
      const riskScore = 
        (fallRiskForm.over65 === 'si' ? 1 : 0) +
        (fallRiskForm.fallHistory === 'si' ? 1 : 0) +
        (fallRiskForm.gaitAlteration === 'si' ? 1 : 0) +
        (fallRiskForm.riskMedication === 'si' ? 1 : 0);
      
      const riskLevel = riskScore === 0 ? 'BAJO' : riskScore <= 2 ? 'MODERADO' : 'ALTO';
      
      const fallRiskNote = `VALORACIÓN DE RIESGO DE CAÍDAS\n\n` +
                           `¿Mayor de 65 años?: ${fallRiskForm.over65.toUpperCase()}\n` +
                           `¿Historia de caídas?: ${fallRiskForm.fallHistory.toUpperCase()}\n` +
                           `¿Alteración de la marcha?: ${fallRiskForm.gaitAlteration.toUpperCase()}\n` +
                           `¿Medicación de riesgo?: ${fallRiskForm.riskMedication.toUpperCase()}\n\n` +
                           `PUNTUACIÓN: ${riskScore}/4\n` +
                           `NIVEL DE RIESGO: ${riskLevel}\n\n` +
                           `MEDIDAS PREVENTIVAS APLICADAS:\n${fallRiskForm.preventiveMeasures.length > 0 ? fallRiskForm.preventiveMeasures.join('\n') : 'Ninguna'}`;
      
      await createNurseNote({
        patientId: selectedFormPatient,
        date: new Date().toISOString(),
        note: fallRiskNote,
        noteType: 'riesgo_caidas',
        nurseName: user.name,
        userId: user.id
      });
      
      setShowFallRiskSuccess(true);
      setTimeout(() => setShowFallRiskSuccess(false), 3000);
      setFallRiskForm({ over65: '', fallHistory: '', gaitAlteration: '', riskMedication: '', preventiveMeasures: [] });
      await refreshNotes();
    };
    
    // D. Guardar Cuidados de Heridas
    const handleSaveWound = async () => {
      if (!selectedFormPatient || !woundForm.location || !woundForm.length || !woundForm.width || !woundForm.appearance || !woundForm.exudateType || !woundForm.treatment || !woundForm.materials) {
        alert('Debe completar todos los campos obligatorios de Cuidados de Heridas');
        return;
      }
      
      const woundNote = `REGISTRO DE CUIDADOS DE HERIDAS\n\n` +
                        `LOCALIZACIÓN Y TAMAÑO:\n` +
                        `- Ubicación: ${woundForm.location}\n` +
                        `- Dimensiones: ${woundForm.length} cm x ${woundForm.width} cm\n\n` +
                        `CARACTERÍSTICAS:\n` +
                        `- Aspecto: ${woundForm.appearance}\n` +
                        `- Tipo de Exudado: ${woundForm.exudateType}\n\n` +
                        `INTERVENCIÓN:\n` +
                        `- Cura Realizada: ${woundForm.treatment}\n` +
                        `- Material Utilizado: ${woundForm.materials}`;
      
      await createNurseNote({
        patientId: selectedFormPatient,
        date: new Date().toISOString(),
        note: woundNote,
        noteType: 'cuidado_heridas',
        nurseName: user.name,
        userId: user.id
      });
      
      setShowWoundSuccess(true);
      setTimeout(() => setShowWoundSuccess(false), 3000);
      setWoundForm({ location: '', length: '', width: '', appearance: '', exudateType: '', treatment: '', materials: '' });
      await refreshNotes();
    };
    
    // E. Guardar Consentimiento Informado (con confirmación legal)
    const handleSaveConsent = () => {
      if (!selectedFormPatient || !consentForm.procedure || !consentForm.risks || !consentForm.understands || !consentForm.consentGiven) {
        alert('Debe completar todos los campos obligatorios del Consentimiento Informado');
        return;
      }
      
      setShowConsentConfirm(true);
    };
    
    const confirmSaveConsent = async () => {
      const timestamp = new Date().toISOString();
      const consentNote = `CONSENTIMIENTO INFORMADO - DOCUMENTO LEGAL\n\n` +
                          `PROCEDIMIENTO: ${consentForm.procedure}\n\n` +
                          `RIESGOS EXPLICADOS:\n${consentForm.risks}\n\n` +
                          `¿PACIENTE COMPRENDE?: ${consentForm.understands}\n` +
                          `¿CONSENTIMIENTO OTORGADO?: ${consentForm.consentGiven}\n\n` +
                          `FECHA Y HORA DE REGISTRO (INMUTABLE): ${new Date(timestamp).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'long' })}\n` +
                          `ENFERMERO/A RESPONSABLE: ${user.name}`;
      
      await createNurseNote({
        patientId: selectedFormPatient,
        date: timestamp,
        note: consentNote,
        noteType: 'consentimiento_informado',
        nurseName: user.name,
        userId: user.id
      });
      
      setShowConsentConfirm(false);
      setShowConsentSuccess(true);
      setTimeout(() => setShowConsentSuccess(false), 3000);
      setConsentForm({ procedure: '', risks: '', understands: '', consentGiven: '' });
      await refreshNotes();
    };
    
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black">Registro Clínico del Turno</h2>
              <p className="text-blue-100 mt-1">Documentación de la atención de enfermería</p>
            </div>
          </div>
        </div>

        {/* Mensaje de Éxito MSG-04 */}
        {showSuccessMessage && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg animate-fadeIn flex items-center gap-3">
            <CheckCircle size={24} />
            <p className="font-bold">MSG-04: Signos vitales guardados correctamente</p>
          </div>
        )}

        {/* Formulario de Signos Vitales */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b-2 border-blue-200">
            <div className="flex items-center gap-3">
              <Heart size={24} className="text-blue-600" />
              <h3 className="text-2xl font-bold text-gray-800">Registrar Signos Vitales</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Selección de Paciente */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Paciente *
              </label>
              <select
                value={selectedClinicalPatient}
                onChange={(e) => setSelectedClinicalPatient(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium"
              >
                <option value="">-- Seleccione un paciente --</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - Hab. {patient.room} / Cama {patient.bed}
                  </option>
                ))}
              </select>
            </div>

            {/* Campos Obligatorios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Presión Arterial */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Presión Arterial (mmHg) *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Sistólica"
                    value={vitalSignsForm.bloodPressureSystolic}
                    onChange={(e) => setVitalSignsForm({...vitalSignsForm, bloodPressureSystolic: e.target.value})}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                      validationErrors.bloodPressureSystolic 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                  <span className="text-gray-600 font-bold">/</span>
                  <input
                    type="number"
                    placeholder="Diastólica"
                    value={vitalSignsForm.bloodPressureDiastolic}
                    onChange={(e) => setVitalSignsForm({...vitalSignsForm, bloodPressureDiastolic: e.target.value})}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                      validationErrors.bloodPressureDiastolic 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                </div>
                {(validationErrors.bloodPressureSystolic || validationErrors.bloodPressureDiastolic) && (
                  <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    {validationErrors.bloodPressureSystolic || validationErrors.bloodPressureDiastolic}
                  </p>
                )}
              </div>

              {/* Frecuencia Cardíaca */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Frecuencia Cardíaca (lpm) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 72"
                  value={vitalSignsForm.heartRate}
                  onChange={(e) => setVitalSignsForm({...vitalSignsForm, heartRate: e.target.value})}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                    validationErrors.heartRate 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {validationErrors.heartRate && (
                  <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    {validationErrors.heartRate}
                  </p>
                )}
              </div>

              {/* Frecuencia Respiratoria */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Frecuencia Respiratoria (rpm) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 18"
                  value={vitalSignsForm.respiratoryRate}
                  onChange={(e) => setVitalSignsForm({...vitalSignsForm, respiratoryRate: e.target.value})}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                    validationErrors.respiratoryRate 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {validationErrors.respiratoryRate && (
                  <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    {validationErrors.respiratoryRate}
                  </p>
                )}
              </div>

              {/* Temperatura */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Temperatura (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 37.5"
                  value={vitalSignsForm.temperature}
                  onChange={(e) => setVitalSignsForm({...vitalSignsForm, temperature: e.target.value})}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                    validationErrors.temperature 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {validationErrors.temperature && (
                  <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    {validationErrors.temperature}
                  </p>
                )}
              </div>

              {/* Saturación de Oxígeno */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Saturación de Oxígeno (%) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 98"
                  value={vitalSignsForm.oxygenSaturation}
                  onChange={(e) => setVitalSignsForm({...vitalSignsForm, oxygenSaturation: e.target.value})}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                    validationErrors.oxygenSaturation 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {validationErrors.oxygenSaturation && (
                  <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    {validationErrors.oxygenSaturation}
                  </p>
                )}
              </div>
            </div>

            {/* Campos Opcionales */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-700 mb-4">Campos Opcionales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Glucosa */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Glucosa (mg/dL)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 110"
                    value={vitalSignsForm.glucose}
                    onChange={(e) => setVitalSignsForm({...vitalSignsForm, glucose: e.target.value})}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                      validationErrors.glucose 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                  {validationErrors.glucose && (
                    <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                      <AlertCircle size={14} />
                      {validationErrors.glucose}
                    </p>
                  )}
                </div>

                {/* Nivel de Dolor EVA */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nivel de Dolor - EVA (0-10)
                  </label>
                  <input
                    type="number"
                    placeholder="0 = Sin dolor, 10 = Dolor máximo"
                    min="0"
                    max="10"
                    value={vitalSignsForm.painLevel}
                    onChange={(e) => setVitalSignsForm({...vitalSignsForm, painLevel: e.target.value})}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                      validationErrors.painLevel 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                  {validationErrors.painLevel && (
                    <p className="text-red-600 text-sm mt-1 font-medium flex items-center gap-1">
                      <AlertCircle size={14} />
                      {validationErrors.painLevel}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveVitalSigns}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <Save size={20} />
                Guardar Signos Vitales
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de Notas Evolutivas SOAP (ECU-05) */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b-2 border-emerald-200">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-emerald-600" />
              <h3 className="text-2xl font-bold text-gray-800">Registrar Notas Evolutivas - Formato SOAP</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Mensaje de Éxito */}
            {showSOAPSuccess && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg animate-fadeIn flex items-center gap-3">
                <CheckCircle size={24} />
                <p className="font-bold">Nota evolutiva guardada correctamente</p>
              </div>
            )}

            {/* Modal de Confirmación MSG-03 */}
            {showSOAPConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slideUp">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={32} className="text-amber-500" />
                    <h3 className="text-2xl font-bold text-gray-800">Confirmar Registro</h3>
                  </div>
                  <p className="text-gray-700 mb-6 text-lg">
                    <strong>MSG-03:</strong> ¿Está seguro de guardar esta nota evolutiva?
                  </p>
                  <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <strong>RN-07:</strong> Una vez guardada, la nota solo será editable durante las primeras 24 horas. Pasado ese tiempo, se bloqueará permanentemente para garantizar la integridad legal del expediente.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSOAPConfirm(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmSaveSOAPNote}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selección de Paciente */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Paciente *
              </label>
              <select
                value={selectedSOAPPatient}
                onChange={(e) => setSelectedSOAPPatient(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-medium"
              >
                <option value="">-- Seleccione un paciente --</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - Hab. {patient.room} / Cama {patient.bed}
                  </option>
                ))}
              </select>
            </div>

            {/* Información del Formato SOAP */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Guía del Formato SOAP
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <strong className="text-blue-600">S - Subjetivo:</strong> Lo que refiere el paciente (síntomas, dolor)
                </div>
                <div>
                  <strong className="text-purple-600">O - Objetivo:</strong> Lo que usted observa y mide (signos, aspecto)
                </div>
                <div>
                  <strong className="text-indigo-600">A - Análisis:</strong> Su interpretación profesional de la evolución
                </div>
                <div>
                  <strong className="text-teal-600">P - Plan:</strong> Cuidados y pendientes para el siguiente turno
                </div>
              </div>
            </div>

            {/* Campos SOAP */}
            <div className="space-y-4">
              {/* S - Subjetivo */}
              <div>
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <MessageCircle size={18} />
                  S - Subjetivo (Lo que refiere el paciente) *
                </label>
                <textarea
                  value={soapForm.subjective}
                  onChange={(e) => setSOAPForm({...soapForm, subjective: e.target.value})}
                  placeholder="Ej: 'Paciente refiere dolor abdominal de intensidad 7/10, náuseas desde esta mañana...'"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                />
              </div>

              {/* O - Objetivo */}
              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                  <Eye size={18} />
                  O - Objetivo (Lo que observa y mide) *
                </label>
                <textarea
                  value={soapForm.objective}
                  onChange={(e) => setSOAPForm({...soapForm, objective: e.target.value})}
                  placeholder="Ej: 'Abdomen distendido, ruidos intestinales disminuidos. TA: 120/80, FC: 78 lpm, Temp: 37.2°C. Facies de dolor...'"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none"
                />
              </div>

              {/* A - Análisis */}
              <div>
                <label className="block text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2">
                  <Brain size={18} />
                  A - Análisis (Interpretación profesional) *
                </label>
                <textarea
                  value={soapForm.analysis}
                  onChange={(e) => setSOAPForm({...soapForm, analysis: e.target.value})}
                  placeholder="Ej: 'Paciente presenta evolución estacionaria de cuadro digestivo. Persiste sintomatología a pesar de tratamiento. Se requiere valoración médica...'"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-indigo-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                />
              </div>

              {/* P - Plan */}
              <div>
                <label className="block text-sm font-bold text-teal-700 mb-2 flex items-center gap-2">
                  <ClipboardList size={18} />
                  P - Plan (Cuidados y pendientes) *
                </label>
                <textarea
                  value={soapForm.plan}
                  onChange={(e) => setSOAPForm({...soapForm, plan: e.target.value})}
                  placeholder="Ej: 'Continuar con dieta líquida, monitorear signos vitales c/4h, avisar a médico si dolor aumenta. Pendiente: solicitar interconsulta con cirugía...'"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-teal-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Información RN-07 */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Lock size={20} className="text-amber-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong className="text-amber-700">Regla RN-07:</strong> Una vez guardada, esta nota solo será editable durante las primeras 24 horas. Después de ese período, se bloqueará permanentemente para garantizar la integridad legal del expediente clínico.
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSOAPNote}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <Save size={20} />
                Guardar Nota Evolutiva
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de Administración de Medicamentos (ECU-09) */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b-2 border-purple-200">
            <div className="flex items-center gap-3">
              <Pill size={24} className="text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-800">Registrar Administración de Medicamentos</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Mensaje de Éxito */}
            {showMedSuccess && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg animate-fadeIn flex items-center gap-3">
                <CheckCircle size={24} />
                <p className="font-bold">Medicamento administrado y registrado correctamente</p>
              </div>
            )}

            {/* Alerta Crítica RN-05: Alergia */}
            {allergyAlert && (
              <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-xl p-6 text-white shadow-2xl animate-pulse border-4 border-red-300">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle size={32} className="flex-shrink-0" />
                  <h4 className="text-2xl font-black">⚠️ ALERTA CRÍTICA - RN-05</h4>
                </div>
                <p className="text-xl font-bold mb-2">
                  EL PACIENTE {allergyAlert.patient.toUpperCase()} ES ALÉRGICO A: {allergyAlert.allergies.toUpperCase()}
                </p>
                <p className="text-lg">
                  No se puede administrar <strong>{allergyAlert.medication}</strong>
                </p>
                <p className="mt-3 text-red-100 bg-red-800/30 p-3 rounded-lg">
                  ⛔ REGISTRO BLOQUEADO - Seleccione otro medicamento
                </p>
              </div>
            )}

            {/* Error de Stock RN-10 */}
            {stockError && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-4 text-white shadow-lg animate-fadeIn flex items-center gap-3 border-2 border-orange-300">
                <AlertCircle size={24} />
                <div>
                  <p className="font-bold text-lg">{stockError}</p>
                  <p className="text-sm text-orange-100">Contacte a Farmacia para reabastecer el inventario</p>
                </div>
              </div>
            )}

            {/* Modal de los 5 Correctos */}
            {showFiveRights && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 animate-slideUp">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck size={36} className="text-amber-500" />
                    <h3 className="text-2xl font-bold text-gray-800">Verificar los 5 Correctos</h3>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-6 mb-6">
                    <p className="text-amber-900 font-bold mb-4 text-lg">
                      ⚠️ Antes de administrar, verifique:
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: '1. Paciente Correcto', value: patients.find(p => p.id === parseInt(selectedMedPatient))?.name },
                        { label: '2. Medicamento Correcto', value: pharmacyInventory.find(m => m.id === parseInt(medicationForm.medication))?.medication_name },
                        { label: '3. Dosis Correcta', value: medicationForm.dose },
                        { label: '4. Vía Correcta', value: medicationForm.route },
                        { label: '5. Hora Correcta', value: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-200">
                          <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-gray-800">{item.label}</p>
                            <p className="text-gray-600">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {medicationForm.observations && (
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="font-bold text-gray-800 mb-1">Observaciones:</p>
                      <p className="text-gray-700">{medicationForm.observations}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFiveRights(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
                    >
                      Revisar
                    </button>
                    <button
                      onClick={confirmMedicationAdministration}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Confirmar y Administrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selección de Paciente */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Paciente *
              </label>
              <select
                value={selectedMedPatient}
                onChange={(e) => {
                  setSelectedMedPatient(e.target.value);
                  setAllergyAlert(null);
                  setStockError(null);
                  if (medicationForm.medication) {
                    handleMedicationSelect(medicationForm.medication);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium"
              >
                <option value="">-- Seleccione un paciente --</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - Hab. {patient.room} / Cama {patient.bed}
                    {patient.allergies ? ` ⚠️ ALERGIAS: ${patient.allergies}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de Medicamento del Catálogo */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Medicamento del Catálogo *
              </label>
              <select
                value={medicationForm.medication}
                onChange={(e) => handleMedicationSelect(e.target.value)}
                disabled={!selectedMedPatient}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all font-medium ${
                  allergyAlert 
                    ? 'border-red-500 bg-red-50 cursor-not-allowed' 
                    : stockError
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                }`}
              >
                <option value="">-- Seleccione un medicamento --</option>
                {pharmacyInventory.map(med => (
                  <option key={med.id} value={med.id} disabled={med.quantity === 0}>
                    {med.medication_name} ({med.generic_name}) - Stock: {med.quantity} {med.unit}
                    {med.quantity === 0 ? ' ❌ SIN STOCK' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dosis */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dosis *
              </label>
              <input
                type="text"
                value={medicationForm.dose}
                onChange={(e) => setMedicationForm({...medicationForm, dose: e.target.value})}
                placeholder="Ej: 500 mg, 2 tabletas, 10 ml"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              />
            </div>

            {/* Vía de Administración */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Vía de Administración *
              </label>
              <select
                value={medicationForm.route}
                onChange={(e) => setMedicationForm({...medicationForm, route: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium"
              >
                <option value="">-- Seleccione vía de administración --</option>
                <option value="Oral">Oral</option>
                <option value="Intravenosa (IV)">Intravenosa (IV)</option>
                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                <option value="Subcutánea (SC)">Subcutánea (SC)</option>
                <option value="Tópica">Tópica</option>
                <option value="Sublingual">Sublingual</option>
                <option value="Rectal">Rectal</option>
                <option value="Inhalatoria">Inhalatoria</option>
                <option value="Oftálmica">Oftálmica</option>
                <option value="Ótica">Ótica</option>
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={medicationForm.observations}
                onChange={(e) => setMedicationForm({...medicationForm, observations: e.target.value})}
                placeholder="Notas adicionales sobre la administración..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none"
              />
            </div>

            {/* Botón Administrar */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleShowFiveRights}
                disabled={allergyAlert || stockError}
                className={`px-8 py-4 font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center gap-2 ${
                  allergyAlert || stockError
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white'
                }`}
              >
                <Pill size={20} />
                Verificar y Administrar
              </button>
            </div>
          </div>
        </div>

        {/* Formatos Digitales de Enfermería (ECU-13) */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b-2 border-indigo-200">
            <div className="flex items-center gap-3">
              <ClipboardList size={24} className="text-indigo-600" />
              <h3 className="text-2xl font-bold text-gray-800">Formatos Digitales de Enfermería (ECU-13)</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">Digitalización de registros para reducir el uso de papel</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Selector de Paciente Global */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Paciente para Formatos *
              </label>
              <select
                value={selectedFormPatient}
                onChange={(e) => setSelectedFormPatient(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium"
              >
                <option value="">-- Seleccione un paciente --</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - Hab. {patient.room} / Cama {patient.bed}
                  </option>
                ))}
              </select>
            </div>

            {/* Pestañas de Formatos */}
            <div className="flex flex-wrap gap-2 border-b-2 border-gray-200 pb-2">
              {[
                { id: 'balance', label: 'Balance Hídrico', icon: Droplet, color: 'blue' },
                { id: 'pain', label: 'Valoración Dolor', icon: Gauge, color: 'red' },
                { id: 'falls', label: 'Riesgo Caídas', icon: AlertTriangle, color: 'amber' },
                { id: 'wounds', label: 'Cuidados Heridas', icon: Bandage, color: 'green' },
                { id: 'consent', label: 'Consentimiento', icon: FileSignature, color: 'purple' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDigitalForm(tab.id)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                    activeDigitalForm === tab.id
                      ? `bg-${tab.color}-600 text-white shadow-lg`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* A. Balance Hídrico */}
            {activeDigitalForm === 'balance' && (
              <div className="space-y-4 animate-fadeIn">
                {showBalanceSuccess && (
                  <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={24} />
                    <p className="font-bold">Balance Hídrico registrado correctamente</p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Droplet size={20} />
                    A. Balance Hídrico - Control Estricto de Líquidos
                  </h4>
                  <p className="text-sm text-blue-700">Todos los valores deben ser en mililitros (ml) enteros.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Ingresos Orales (ml) *
                    </label>
                    <input
                      type="number"
                      value={balanceForm.oralIntake}
                      onChange={(e) => setBalanceForm({...balanceForm, oralIntake: e.target.value})}
                      placeholder="Líquidos ingeridos por boca"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Ingresos Intravenosos (ml) *
                    </label>
                    <input
                      type="number"
                      value={balanceForm.ivIntake}
                      onChange={(e) => setBalanceForm({...balanceForm, ivIntake: e.target.value})}
                      placeholder="Soluciones IV, medicamentos, hemoderivados"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Egresos - Diuresis (ml) *
                    </label>
                    <input
                      type="number"
                      value={balanceForm.urineOutput}
                      onChange={(e) => setBalanceForm({...balanceForm, urineOutput: e.target.value})}
                      placeholder="Volumen de orina excretado"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Egresos - Drenajes (ml) *
                    </label>
                    <input
                      type="number"
                      value={balanceForm.drainageOutput}
                      onChange={(e) => setBalanceForm({...balanceForm, drainageOutput: e.target.value})}
                      placeholder="Sondas, drenajes quirúrgicos, vómito"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={balanceForm.observations}
                    onChange={(e) => setBalanceForm({...balanceForm, observations: e.target.value})}
                    placeholder="Características de los líquidos: color, olor, sedimento..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                  />
                </div>

                {balanceForm.oralIntake && balanceForm.ivIntake && balanceForm.urineOutput && balanceForm.drainageOutput && (
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-xl border-2 border-cyan-300">
                    <h5 className="font-bold text-gray-800 mb-2">Cálculo Automático:</h5>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Ingresos</p>
                        <p className="text-2xl font-black text-green-600">{parseInt(balanceForm.oralIntake) + parseInt(balanceForm.ivIntake)} ml</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Egresos</p>
                        <p className="text-2xl font-black text-red-600">{parseInt(balanceForm.urineOutput) + parseInt(balanceForm.drainageOutput)} ml</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className="text-2xl font-black text-blue-600">
                          {(parseInt(balanceForm.oralIntake) + parseInt(balanceForm.ivIntake)) - (parseInt(balanceForm.urineOutput) + parseInt(balanceForm.drainageOutput))} ml
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveBalance}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Balance Hídrico
                </button>
              </div>
            )}

            {/* B. Valoración de Dolor */}
            {activeDigitalForm === 'pain' && (
              <div className="space-y-4 animate-fadeIn">
                {showPainSuccess && (
                  <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={24} />
                    <p className="font-bold">Valoración de Dolor registrada correctamente</p>
                  </div>
                )}

                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                    <Gauge size={20} />
                    B. Valoración de Dolor - Escala Visual Análoga (EVA)
                  </h4>
                  <p className="text-sm text-red-700">0 = Sin dolor | 10 = Peor dolor imaginable</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Intensidad del Dolor (0-10) *
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={painForm.intensity}
                    onChange={(e) => setPainForm({...painForm, intensity: e.target.value})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>0 - Sin dolor</span>
                    <span className="text-3xl font-black text-red-600">{painForm.intensity || '?'}</span>
                    <span>10 - Máximo</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Localización *
                  </label>
                  <input
                    type="text"
                    value={painForm.location}
                    onChange={(e) => setPainForm({...painForm, location: e.target.value})}
                    placeholder="Ej: Cuadrante inferior derecho abdominal"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de Dolor *
                  </label>
                  <select
                    value={painForm.painType}
                    onChange={(e) => setPainForm({...painForm, painType: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  >
                    <option value="">-- Seleccione tipo --</option>
                    <option value="Punzante">Punzante</option>
                    <option value="Opresivo">Opresivo</option>
                    <option value="Quemante">Quemante</option>
                    <option value="Cólico">Cólico</option>
                    <option value="Sordo">Sordo</option>
                    <option value="Lancinante">Lancinante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Factores Desencadenantes
                  </label>
                  <input
                    type="text"
                    value={painForm.triggers}
                    onChange={(e) => setPainForm({...painForm, triggers: e.target.value})}
                    placeholder="Actividad o movimiento que provoca el dolor"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tratamiento Aplicado
                  </label>
                  <textarea
                    value={painForm.treatment}
                    onChange={(e) => setPainForm({...painForm, treatment: e.target.value})}
                    placeholder="Medidas farmacológicas o físicas empleadas"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSavePain}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Valoración de Dolor
                </button>
              </div>
            )}

            {/* C. Riesgo de Caídas - Parte 1 */}
            {activeDigitalForm === 'falls' && (
              <div className="space-y-4 animate-fadeIn">
                {showFallRiskSuccess && (
                  <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={24} />
                    <p className="font-bold">Valoración de Riesgo de Caídas registrada correctamente</p>
                  </div>
                )}

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    C. Valoración de Riesgo de Caídas
                  </h4>
                  <p className="text-sm text-amber-700">Herramienta preventiva obligatoria al ingreso y cambio de turno</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ¿Mayor de 65 años? *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="over65"
                          value="si"
                          checked={fallRiskForm.over65 === 'si'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, over65: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">Sí</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="over65"
                          value="no"
                          checked={fallRiskForm.over65 === 'no'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, over65: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ¿Historia de caídas? *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fallHistory"
                          value="si"
                          checked={fallRiskForm.fallHistory === 'si'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, fallHistory: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">Sí</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fallHistory"
                          value="no"
                          checked={fallRiskForm.fallHistory === 'no'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, fallHistory: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">No</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Últimos 3 meses</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ¿Alteración de la marcha? *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gaitAlteration"
                          value="si"
                          checked={fallRiskForm.gaitAlteration === 'si'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, gaitAlteration: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">Sí</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gaitAlteration"
                          value="no"
                          checked={fallRiskForm.gaitAlteration === 'no'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, gaitAlteration: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">No</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Bastón, andadera, inestabilidad</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ¿Medicación de riesgo? *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="riskMedication"
                          value="si"
                          checked={fallRiskForm.riskMedication === 'si'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, riskMedication: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">Sí</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="riskMedication"
                          value="no"
                          checked={fallRiskForm.riskMedication === 'no'}
                          onChange={(e) => setFallRiskForm({...fallRiskForm, riskMedication: e.target.value})}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">No</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Sedantes, diuréticos, hipotensores</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Medidas Preventivas *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {['Barandales arriba', 'Timbre al alcance', 'Iluminación adecuada', 'Piso seco', 'Zapatos antiderrapantes', 'Acompañamiento'].map(measure => (
                      <label key={measure} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={fallRiskForm.preventiveMeasures.includes(measure)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFallRiskForm({...fallRiskForm, preventiveMeasures: [...fallRiskForm.preventiveMeasures, measure]});
                            } else {
                              setFallRiskForm({...fallRiskForm, preventiveMeasures: fallRiskForm.preventiveMeasures.filter(m => m !== measure)});
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <span className="font-medium">{measure}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveFallRisk}
                  className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Valoración de Riesgo
                </button>
              </div>
            )}

            {/* D. Registro de Cuidados de Heridas */}
            {activeDigitalForm === 'wounds' && (
              <div className="space-y-4 animate-fadeIn">
                {showWoundSuccess && (
                  <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={24} />
                    <p className="font-bold">Registro de Cuidados de Heridas guardado correctamente</p>
                  </div>
                )}

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                    <Bandage size={20} />
                    D. Registro de Cuidados de Heridas
                  </h4>
                  <p className="text-sm text-green-700">Seguimiento detallado de lesiones y tratamientos</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Localización de la Herida *
                  </label>
                  <input
                    type="text"
                    value={woundForm.location}
                    onChange={(e) => setWoundForm({...woundForm, location: e.target.value})}
                    placeholder="Ej: Región sacra, talón izquierdo, antebrazo derecho"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Longitud (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={woundForm.length}
                      onChange={(e) => setWoundForm({...woundForm, length: e.target.value})}
                      placeholder="Ej: 3.5"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Ancho (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={woundForm.width}
                      onChange={(e) => setWoundForm({...woundForm, width: e.target.value})}
                      placeholder="Ej: 2.0"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Aspecto *
                  </label>
                  <select
                    value={woundForm.appearance}
                    onChange={(e) => setWoundForm({...woundForm, appearance: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  >
                    <option value="">-- Seleccione aspecto --</option>
                    <option value="Granuloso">Granuloso</option>
                    <option value="Necrótico">Necrótico</option>
                    <option value="Epitelizado">Epitelizado</option>
                    <option value="Infectado">Infectado</option>
                    <option value="Limpio">Limpio</option>
                    <option value="Fibrinoso">Fibrinoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de Exudado *
                  </label>
                  <select
                    value={woundForm.exudateType}
                    onChange={(e) => setWoundForm({...woundForm, exudateType: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  >
                    <option value="">-- Seleccione tipo --</option>
                    <option value="Seroso">Seroso</option>
                    <option value="Purulento">Purulento</option>
                    <option value="Hemático">Hemático</option>
                    <option value="Serosanguinolento">Serosanguinolento</option>
                    <option value="Sin exudado">Sin exudado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Cura Realizada *
                  </label>
                  <textarea
                    value={woundForm.treatment}
                    onChange={(e) => setWoundForm({...woundForm, treatment: e.target.value})}
                    placeholder="Ej: Lavado mecánico con solución salina, desbridamiento de tejido necrótico, aplicación de apósito hidrocoloide"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Material Utilizado *
                  </label>
                  <input
                    type="text"
                    value={woundForm.materials}
                    onChange={(e) => setWoundForm({...woundForm, materials: e.target.value})}
                    placeholder="Ej: Gasas estériles, apósito hidrocoloide 10x10cm, solución salina 250ml"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para control de inventario</p>
                </div>

                <button
                  onClick={handleSaveWound}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Registro de Heridas
                </button>
              </div>
            )}

            {/* E. Consentimiento Informado */}
            {activeDigitalForm === 'consent' && (
              <div className="space-y-4 animate-fadeIn">
                {showConsentSuccess && (
                  <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={24} />
                    <p className="font-bold">Consentimiento Informado registrado correctamente</p>
                  </div>
                )}

                {/* Modal de Confirmación Legal */}
                {showConsentConfirm && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full mx-4 animate-slideUp">
                      <div className="flex items-center gap-3 mb-4">
                        <FileSignature size={36} className="text-purple-600" />
                        <h3 className="text-2xl font-bold text-gray-800">Confirmar Consentimiento Informado</h3>
                      </div>
                      
                      <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 mb-6">
                        <p className="text-purple-900 font-bold mb-4 text-lg flex items-center gap-2">
                          <Lock size={20} />
                          DOCUMENTO CON VALOR LEGAL
                        </p>
                        <p className="text-purple-800 mb-3">
                          Al confirmar, el sistema estampará automáticamente:
                        </p>
                        <ul className="space-y-2 text-purple-700">
                          <li>✓ Fecha y hora exacta (INMUTABLE)</li>
                          <li>✓ Nombre del enfermero/a responsable</li>
                          <li>✓ Datos del paciente</li>
                          <li>✓ Procedimiento y riesgos explicados</li>
                        </ul>
                        <p className="text-sm text-purple-600 mt-4 bg-purple-100 p-3 rounded-lg">
                          <strong>Importante:</strong> Este documento NO podrá ser editado después de guardado y tiene validez legal en el expediente clínico.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowConsentConfirm(false)}
                          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={confirmSaveConsent}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                          <FileSignature size={20} />
                          Confirmar y Registrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                    <FileSignature size={20} />
                    E. Consentimiento Informado - Documento Legal
                  </h4>
                  <p className="text-sm text-purple-700">Este formato tiene valor legal. Fecha y hora serán inmutables.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Procedimiento a Realizar *
                  </label>
                  <input
                    type="text"
                    value={consentForm.procedure}
                    onChange={(e) => setConsentForm({...consentForm, procedure: e.target.value})}
                    placeholder="Nombre técnico del procedimiento"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Riesgos Explicados *
                  </label>
                  <textarea
                    value={consentForm.risks}
                    onChange={(e) => setConsentForm({...consentForm, risks: e.target.value})}
                    placeholder="Resumen de los riesgos informados al paciente..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ¿Paciente Comprende? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg flex-1">
                      <input
                        type="radio"
                        name="understands"
                        value="Sí, comprende completamente"
                        checked={consentForm.understands === 'Sí, comprende completamente'}
                        onChange={(e) => setConsentForm({...consentForm, understands: e.target.value})}
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Sí, comprende completamente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg flex-1">
                      <input
                        type="radio"
                        name="understands"
                        value="No comprende / Requiere más explicación"
                        checked={consentForm.understands === 'No comprende / Requiere más explicación'}
                        onChange={(e) => setConsentForm({...consentForm, understands: e.target.value})}
                        className="w-5 h-5"
                      />
                      <span className="font-medium">No comprende / Requiere más explicación</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ¿Consentimiento Otorgado? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-green-50 p-3 rounded-lg flex-1 border-2 border-green-300">
                      <input
                        type="radio"
                        name="consentGiven"
                        value="SÍ - Consentimiento otorgado"
                        checked={consentForm.consentGiven === 'SÍ - Consentimiento otorgado'}
                        onChange={(e) => setConsentForm({...consentForm, consentGiven: e.target.value})}
                        className="w-5 h-5"
                      />
                      <span className="font-bold text-green-700">SÍ - Consentimiento otorgado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-red-50 p-3 rounded-lg flex-1 border-2 border-red-300">
                      <input
                        type="radio"
                        name="consentGiven"
                        value="NO - Consentimiento denegado"
                        checked={consentForm.consentGiven === 'NO - Consentimiento denegado'}
                        onChange={(e) => setConsentForm({...consentForm, consentGiven: e.target.value})}
                        className="w-5 h-5"
                      />
                      <span className="font-bold text-red-700">NO - Consentimiento denegado</span>
                    </label>
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
                  <Lock size={20} className="text-amber-600 mt-1 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-bold mb-1">⚠️ ADVERTENCIA LEGAL</p>
                    <p>Una vez guardado, este documento quedará sellado con fecha y hora inmutables. No podrá ser modificado posteriormente. Asegúrese de que toda la información sea correcta antes de confirmar.</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveConsent}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <FileSignature size={20} />
                  Registrar Consentimiento Informado
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Vista de Historiales - Consulta de datos previos
  const HistoriesView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl shadow-xl border-2 border-purple-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
            <ClipboardList size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-800">Historiales</h2>
            <p className="text-lg text-gray-600 font-medium">Consulta de datos previos y registros históricos</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Heart className="text-purple-600" size={20} />
                Historial de Signos Vitales
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {vitalSigns.slice(0, 5).map((vs, idx) => {
                  const patient = patients.find(p => p.id === vs.patientId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200">
                      <div>
                        <p className="font-bold text-gray-800">{patient?.name || 'Paciente'}</p>
                        <p className="text-sm text-gray-600">
                          T: {vs.temperature}°C | PA: {vs.bloodPressure} | FC: {vs.heartRate} bpm | FR: {vs.respiratoryRate} rpm
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{new Date(vs.timestamp).toLocaleString('es-MX')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-purple-600" size={20} />
                Historial de Notas de Enfermería
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {nurseNotes.slice(0, 5).map((note, idx) => {
                  const patient = patients.find(p => p.id === note.patientId);
                  return (
                    <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-800">{patient?.name || 'Paciente'}</p>
                        <span className="text-xs text-gray-500 font-medium">{new Date(note.timestamp).toLocaleString('es-MX')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{note.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Vista de Información Personal - Turno y jornada del usuario
  const PersonalInfoView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl shadow-xl border-2 border-cyan-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <User size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-800">Información Personal</h2>
            <p className="text-lg text-gray-600 font-medium">Su turno y jornada laboral</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border-2 border-cyan-200 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="text-cyan-600" size={20} />
              Datos del Usuario
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Nombre Completo</p>
                <p className="text-lg font-bold text-gray-800">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Usuario</p>
                <p className="text-lg font-bold text-gray-800">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Email</p>
                <p className="text-lg font-bold text-gray-800">{user.email || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Teléfono</p>
                <p className="text-lg font-bold text-gray-800">{user.phone || 'No especificado'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border-2 border-cyan-200 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="text-cyan-600" size={20} />
              Información de Turno
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Turno Actual</p>
                <p className="text-lg font-bold text-gray-800">
                  {currentShift === 'Matutino' && '🌅 Matutino (07:00 - 15:00)'}
                  {currentShift === 'Vespertino' && '🌆 Vespertino (15:00 - 23:00)'}
                  {currentShift === 'Nocturno' && '🌙 Nocturno (23:00 - 07:00)'}
                  {!currentShift && 'No definido'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Turnos Asignados</p>
                <p className="text-lg font-bold text-gray-800">
                  {userWithAssignments.assignedShifts 
                    ? userWithAssignments.assignedShifts.join(', ') 
                    : 'Todos los turnos'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Pisos Asignados</p>
                <p className="text-lg font-bold text-gray-800">
                  {userWithAssignments.assignedFloors 
                    ? userWithAssignments.assignedFloors.join(', ') 
                    : 'Todos los pisos'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Pacientes Asignados Hoy</p>
                <p className="text-lg font-bold text-gray-800">{patients.length} pacientes</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-100 to-blue-100 p-6 rounded-xl border-2 border-cyan-300 shadow-md md:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="text-cyan-700" size={20} />
              Información del Departamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-cyan-700 font-semibold">Departamento</p>
                <p className="text-lg font-bold text-gray-800">{user.department || 'Enfermería General'}</p>
              </div>
              <div>
                <p className="text-sm text-cyan-700 font-semibold">Especialización</p>
                <p className="text-lg font-bold text-gray-800">{user.specialization || 'No especificada'}</p>
              </div>
              <div>
                <p className="text-sm text-cyan-700 font-semibold">Rol</p>
                <p className="text-lg font-bold text-gray-800 capitalize">{user.role === 'nurse' ? 'Enfermero/a' : user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDERIZADO PRINCIPAL CON NUEVO LAYOUT (Sidebar + Contenido) ---
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {useMemo(() => [
            { id: 'overview', label: 'Panel General', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-600' },
            { id: 'assignedPatients', label: 'Pacientes Asignados', icon: Users, color: 'from-emerald-500 to-teal-600', badge: patients.length },
            { id: 'patients', label: 'Lista de Pacientes', icon: Users, color: 'from-emerald-500 to-teal-600' },
            { id: 'clinicalRecord', label: 'Registro Clínico', icon: FileText, color: 'from-blue-500 to-indigo-600' },
            { id: 'histories', label: 'Historiales', icon: ClipboardList, color: 'from-purple-500 to-pink-600' },
            { id: 'beds', label: 'Disponibilidad Camas', icon: Building2, color: 'from-indigo-500 to-purple-600' },
            { id: 'care', label: 'Zona de Cuidados', icon: Stethoscope, color: 'from-purple-500 to-pink-600' },
            { id: 'personalInfo', label: 'Información Personal', icon: User, color: 'from-cyan-500 to-blue-600' },
            { id: 'shifts', label: 'Mi Turno', icon: Clock, color: 'from-orange-500 to-amber-600' },
            { id: 'nursingSheet', label: 'Hoja de Enfermería', icon: ClipboardList, color: 'from-indigo-500 to-purple-600' },
          ], [patients.length]).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-6 py-6 rounded-xl transition-all duration-200 font-bold text-3xl relative ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={36} />
              {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
              {sidebarOpen && item.badge !== undefined && (
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                  {item.badge}
                </span>
              )}
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
        {/* Header Superior (Sticky) - Diseño Profesional Mejorado */}
        <header className="sticky top-0 bg-gradient-to-r from-white via-blue-50/30 to-white border-b-2 border-blue-100 z-10 shadow-md backdrop-blur-sm">
          <div className="w-full px-8 py-4">
            <div className="grid grid-cols-3 items-center gap-8">
              
              {/* Nombre Completo - Columna Izquierda */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg ring-2 ring-blue-100 flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600 font-medium">Personal de Enfermería</p>
                </div>
              </div>

              {/* Turno Actual - Columna Centro */}
              <div className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm mx-auto">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Turno:</p>
                  <p className="text-sm font-bold text-gray-900">
                    {currentShift?.name || 'No asignado'}
                  </p>
                </div>
              </div>

              {/* Botón Salir - Columna Derecha */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <LogOut size={20} strokeWidth={2.5} />
                  <span>Salir</span>
                </button>
              </div>
            </div>
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
              {activeTab === 'assignedPatients' && <AssignedPatientsView />}
              {activeTab === 'patients' && <PatientsListView />}
              {activeTab === 'clinicalRecord' && <ClinicalRecordView />}
              {activeTab === 'histories' && <HistoriesView />}
              {activeTab === 'beds' && <BedManagement user={user} patients={patients} />}
              {activeTab === 'care' && <CareView />}
              {activeTab === 'personalInfo' && <PersonalInfoView />}
              {activeTab === 'shifts' && <ShiftsView />}
              {activeTab === 'nursingSheet' && <NursingSheetView />}
            </>
          )}
        </div>
      </main>
      
      {/* Modales */}
      <TriageModal />
      <TransfersModal />
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
              onLoginSuccess={(user) => { 
                console.log('🔍 Login Success - User data:', user);
                console.log('🔍 User role:', user.role);
                const userWithType = {...user, type: user.role === 'nurse' ? 'nurse' : 'other'};
                console.log('🔍 User with type:', userWithType);
                setCurrentUser(userWithType); 
                setShowLoginModal(false); 
              }}
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
          ? <NurseDashboard user={currentUser} onLogout={() => {
              localStorage.removeItem('sessionToken');
              setCurrentUser(null);
              setShowLoginModal(true);
            }} />
          : <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-gradient-to-br from-rose-50 to-red-50">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-red-200">
                <h2 className="text-3xl font-black bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent mb-3">Acceso Restringido</h2>
                <p className="text-gray-700 mb-6">Este portal es exclusivo para personal de enfermería.</p>
                <button 
                  onClick={async () => {
                    try {
                      const sessionToken = localStorage.getItem('sessionToken');
                      if (sessionToken) {
                        await authLogout(sessionToken);
                        localStorage.removeItem('sessionToken');
                      }
                      setCurrentUser(null);
                    } catch (error) {
                      console.error('Error al cerrar sesión:', error);
                      localStorage.removeItem('sessionToken');
                      setCurrentUser(null);
                    }
                  }} 
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
