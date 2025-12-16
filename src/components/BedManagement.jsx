import React, { useState, useEffect } from 'react';
import { 
  Bed, Search, Filter, MapPin, AlertCircle, CheckCircle, 
  Clock, User, XCircle, Wrench, Droplet, ChevronDown, 
  ChevronUp, Info, TrendingUp, Building2, X
} from 'lucide-react';
import {
  getAllBeds,
  getBedsAvailability,
  assignPatientToBed,
  releaseBed,
  updateBedStatus,
  getBedHistory,
  getPatientBed,
  initializeHospitalBeds
} from '../services/database';
import {
  BED_STATUS,
  BED_STATUS_COLORS,
  isBedAvailable,
  validateBedAssignment,
  formatBedDisplay,
  formatBedShort,
  getBedStats,
  groupBedsByFloorAndArea,
  groupBedsByRoom,
  filterBedsByStatus,
  searchBeds,
  getAvailableBedsForFloor,
  getBedAvailabilityAlert,
  formatAssignmentDate,
  calculateOccupationDuration,
  generateAvailabilitySummary
} from '../utils/bedManagement';

const BedManagement = ({ user, patients = [] }) => {
  const [beds, setBeds] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [viewMode, setViewMode] = useState('availability'); // 'availability', 'grid', 'list'
  const [selectedBed, setSelectedBed] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [bedHistory, setBedHistory] = useState([]);
  const [expandedFloors, setExpandedFloors] = useState({});

  // Load beds data
  const loadBeds = async () => {
    try {
      setLoading(true);
      const [bedsData, availabilityData] = await Promise.all([
        getAllBeds(),
        getBedsAvailability()
      ]);
      setBeds(bedsData);
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error loading beds:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeds();
  }, []);

  // Initialize beds if empty
  useEffect(() => {
    if (!loading && beds.length === 0) {
      initializeHospitalBeds().then(() => loadBeds());
    }
  }, [loading, beds]);

  // Filter and search beds
  const filteredBeds = React.useMemo(() => {
    let result = beds;
    
    if (searchTerm) {
      result = searchBeds(result, searchTerm);
    }
    
    if (filterStatus) {
      result = filterBedsByStatus(result, filterStatus);
    }
    
    if (filterFloor) {
      result = result.filter(bed => bed.floor === parseInt(filterFloor));
    }
    
    if (filterArea) {
      result = result.filter(bed => bed.area === filterArea);
    }
    
    return result;
  }, [beds, searchTerm, filterStatus, filterFloor, filterArea]);

  // Get statistics
  const stats = React.useMemo(() => getBedStats(filteredBeds), [filteredBeds]);
  const summary = React.useMemo(() => generateAvailabilitySummary(availability), [availability]);

  // Handle bed assignment
  const handleAssignBed = async (bedId, patientId) => {
    try {
      const bed = beds.find(b => b.id === bedId);
      const validation = validateBedAssignment(bed, patientId);
      
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      const result = await assignPatientToBed(bedId, patientId, user.name, '');
      
      if (result.success) {
        alert(`✅ Paciente asignado a cama ${result.bedNumber}`);
        loadBeds();
        setShowAssignModal(false);
        setSelectedBed(null);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error assigning bed:', error);
      alert('Error al asignar cama');
    }
  };

  // Handle bed release
  const handleReleaseBed = async (bedId) => {
    if (!confirm('¿Liberar esta cama? Se marcará para limpieza.')) return;
    
    try {
      const result = await releaseBed(bedId, user.name, 'Alta/Traslado');
      
      if (result.success) {
        alert('✅ Cama liberada exitosamente');
        loadBeds();
        setSelectedBed(null);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error releasing bed:', error);
      alert('Error al liberar cama');
    }
  };

  // Handle status change
  const handleChangeStatus = async (bedId, newStatus) => {
    try {
      const result = await updateBedStatus(bedId, newStatus, user.name, '');
      
      if (result.success) {
        alert(`✅ Estado actualizado a: ${BED_STATUS_COLORS[newStatus].label}`);
        loadBeds();
        setSelectedBed(null);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating bed status:', error);
      alert('Error al actualizar estado');
    }
  };

  // Load bed history
  const loadBedHistory = async (bedId) => {
    try {
      const history = await getBedHistory(bedId);
      setBedHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading bed history:', error);
    }
  };

  // Toggle floor expansion
  const toggleFloorExpansion = (floor) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  };

  // Get available patients for assignment
  const availablePatients = patients.filter(p => 
    p.status === 'Active' && !beds.find(b => b.patient_id === p.id && b.status === 'ocupada')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
            <Bed size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Disponibilidad de Camas
            </h2>
            <p className="text-gray-600 text-sm font-medium mt-1">
              Sistema de gestión y asignación hospitalaria
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Camas"
          value={summary.totalBeds}
          icon={Bed}
          color="blue"
        />
        <StatCard
          title="Disponibles"
          value={summary.availableBeds}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Ocupadas"
          value={summary.occupiedBeds}
          icon={User}
          color="red"
          subtitle={`${summary.occupancyRate}% ocupación`}
        />
        <StatCard
          title="Limpieza"
          value={summary.cleaningBeds}
          icon={Droplet}
          color="blue"
        />
        <StatCard
          title="Mantenimiento"
          value={summary.maintenanceBeds}
          icon={Wrench}
          color="orange"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar cama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="ocupada">Ocupada</option>
            <option value="limpieza">Limpieza</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>

          {/* Floor Filter */}
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los pisos</option>
            <option value="1">Piso 1 - Urgencias</option>
            <option value="2">Piso 2 - Medicina Interna</option>
            <option value="3">Piso 3 - Cirugía/Cardiología</option>
            <option value="4">Piso 4 - Pediatría/Geriatría</option>
            <option value="5">Piso 5 - UCI</option>
          </select>

          {/* View Mode */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="availability">Vista Disponibilidad</option>
            <option value="grid">Vista Cuadrícula</option>
            <option value="list">Vista Lista</option>
          </select>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'availability' && (
        <AvailabilityView 
          availability={availability} 
          expandedFloors={expandedFloors}
          toggleFloorExpansion={toggleFloorExpansion}
        />
      )}

      {viewMode === 'grid' && (
        <GridView 
          beds={filteredBeds}
          onSelectBed={setSelectedBed}
          onAssign={(bed) => {
            setSelectedBed(bed);
            setShowAssignModal(true);
          }}
          onRelease={handleReleaseBed}
          onChangeStatus={handleChangeStatus}
          onViewHistory={loadBedHistory}
        />
      )}

      {viewMode === 'list' && (
        <ListView 
          beds={filteredBeds}
          patients={patients}
          onSelectBed={setSelectedBed}
          onAssign={(bed) => {
            setSelectedBed(bed);
            setShowAssignModal(true);
          }}
          onRelease={handleReleaseBed}
          onChangeStatus={handleChangeStatus}
        />
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedBed && (
        <AssignmentModal
          bed={selectedBed}
          patients={availablePatients}
          onAssign={handleAssignBed}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedBed(null);
          }}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          history={bedHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    red: 'from-rose-500 to-red-500',
    orange: 'from-orange-500 to-amber-500'
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-600 uppercase">{title}</p>
        <div className={`p-2 bg-gradient-to-br ${colors[color]} rounded-lg text-white`}>
          <Icon size={16} />
        </div>
      </div>
      <p className={`text-3xl font-black bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

// Availability View Component
const AvailabilityView = ({ availability, expandedFloors, toggleFloorExpansion }) => {
  const groupedByFloor = availability.reduce((acc, item) => {
    if (!acc[item.floor]) acc[item.floor] = [];
    acc[item.floor].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedByFloor).map(([floor, areas]) => {
        const floorTotal = areas.reduce((sum, area) => sum + area.total_beds, 0);
        const floorAvailable = areas.reduce((sum, area) => sum + area.available_beds, 0);
        const floorOccupied = areas.reduce((sum, area) => sum + area.occupied_beds, 0);
        const occupancyRate = floorTotal > 0 ? Math.round((floorOccupied / floorTotal) * 100) : 0;
        const isExpanded = expandedFloors[floor];

        return (
          <div key={floor} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Floor Header */}
            <div
              className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors"
              onClick={() => toggleFloorExpansion(floor)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="text-gray-600" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Piso {floor}</h3>
                    <p className="text-sm text-gray-600">
                      {floorAvailable} de {floorTotal} disponibles ({occupancyRate}% ocupación)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                      {floorAvailable} Disponibles
                    </span>
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                      {floorOccupied} Ocupadas
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
            </div>

            {/* Floor Areas */}
            {isExpanded && (
              <div className="p-4 space-y-3">
                {areas.map((area) => {
                  const areaOccupancy = area.total_beds > 0 
                    ? Math.round((area.occupied_beds / area.total_beds) * 100) 
                    : 0;
                  const alertLevel = getBedAvailabilityAlert(area.available_beds, area.total_beds);
                  const alertColors = {
                    success: 'bg-green-500',
                    warning: 'bg-yellow-500',
                    danger: 'bg-red-500'
                  };

                  return (
                    <div key={area.area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${alertColors[alertLevel]}`}></div>
                        <span className="font-semibold text-gray-800">{area.area}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          <strong className="text-green-600">{area.available_beds}</strong> disponibles
                        </span>
                        <span className="text-sm text-gray-600">
                          <strong className="text-red-600">{area.occupied_beds}</strong> ocupadas
                        </span>
                        <span className="text-sm text-gray-600">
                          {area.total_beds} total
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                            style={{ width: `${areaOccupancy}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{areaOccupancy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Grid View Component
const GridView = ({ beds, onSelectBed, onAssign, onRelease, onChangeStatus, onViewHistory }) => {
  const groupedBeds = groupBedsByRoom(beds);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groupedBeds.map((room) => (
        <div key={`${room.floor}-${room.area}-${room.room}`} className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-gray-800">Hab. {room.room}</h4>
              <p className="text-xs text-gray-600">Piso {room.floor} - {room.area}</p>
            </div>
            <MapPin className="text-gray-400" size={20} />
          </div>
          <div className="space-y-2">
            {room.beds.map((bed) => {
              const statusColor = BED_STATUS_COLORS[bed.status];
              return (
                <div
                  key={bed.id}
                  className={`${statusColor.bg} ${statusColor.border} border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => onSelectBed(bed)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800">Cama {bed.bed_label}</span>
                      <span className={`ml-2 text-xs ${statusColor.text} font-bold`}>
                        {statusColor.label}
                      </span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${statusColor.badge}`}></div>
                  </div>
                  {bed.status === 'ocupada' && bed.assigned_date && (
                    <p className="text-xs text-gray-600 mt-1">
                      {calculateOccupationDuration(bed.assigned_date)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// List View Component
const ListView = ({ beds, patients, onSelectBed, onAssign, onRelease, onChangeStatus }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Cama</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Ubicación</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Paciente</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Asignado</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {beds.map((bed) => {
            const statusColor = BED_STATUS_COLORS[bed.status];
            const patient = patients.find(p => p.id === bed.patient_id);

            return (
              <tr key={bed.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-bold text-gray-800">{formatBedShort(bed)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  Piso {bed.floor}, {bed.area}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 ${statusColor.bg} ${statusColor.text} text-xs font-bold rounded-full`}>
                    {statusColor.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {patient ? patient.name : '-'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {bed.assigned_date ? formatAssignmentDate(bed.assigned_date) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {bed.status === 'disponible' && (
                      <button
                        onClick={() => onAssign(bed)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600"
                      >
                        Asignar
                      </button>
                    )}
                    {bed.status === 'ocupada' && (
                      <button
                        onClick={() => onRelease(bed.id)}
                        className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600"
                      >
                        Liberar
                      </button>
                    )}
                    {bed.status === 'limpieza' && (
                      <button
                        onClick={() => onChangeStatus(bed.id, 'disponible')}
                        className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600"
                      >
                        Disponible
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ bed, patients, onAssign, onClose }) => {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm)
  );

  const handleSubmit = () => {
    if (!selectedPatient) {
      alert('Seleccione un paciente');
      return;
    }
    onAssign(bed.id, parseInt(selectedPatient));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Asignar Paciente</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {formatBedDisplay(bed)}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Patient Select */}
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione un paciente</option>
            {filteredPatients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name} - {patient.age} años
              </option>
            ))}
          </select>

          {filteredPatients.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay pacientes disponibles para asignar
            </p>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPatient}
            className="flex-1 px-4 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
};

// History Modal Component
const HistoryModal = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Historial de Cama</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay historial disponible</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800">{entry.action}</span>
                    <span className="text-xs text-gray-500">
                      {formatAssignmentDate(entry.created_at)}
                    </span>
                  </div>
                  {entry.patient_name && (
                    <p className="text-sm text-gray-600">Paciente: {entry.patient_name}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {entry.previous_status} → {entry.new_status}
                  </p>
                  <p className="text-sm text-gray-600">Por: {entry.assigned_by}</p>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BedManagement;
