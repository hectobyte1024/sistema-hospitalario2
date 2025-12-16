import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, FileText, Activity, Users, Clock } from 'lucide-react';
import * as db from '../services/database';

const AuditTrailViewer = ({ patientId, entityType = null }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAuditTrail();
  }, [patientId, entityType, filter]);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      let logs;
      if (patientId) {
        logs = await db.getAuditTrailByPatient(patientId);
      } else {
        const filters = {};
        if (entityType) filters.entityType = entityType;
        if (filter !== 'all') {
          const today = new Date();
          if (filter === 'today') {
            filters.dateFrom = today.toISOString().split('T')[0];
          } else if (filter === 'week') {
            const weekAgo = new Date(today.setDate(today.getDate() - 7));
            filters.dateFrom = weekAgo.toISOString().split('T')[0];
          }
        }
        logs = await db.getAuditTrail(filters);
      }
      setAuditLogs(logs || []);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'CREATE': return <FileText size={16} className="text-green-600" />;
      case 'UPDATE': return <Activity size={16} className="text-blue-600" />;
      case 'DELETE': return <AlertCircle size={16} className="text-red-600" />;
      case 'VIEW': return <Users size={16} className="text-gray-600" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'CREATE': return 'bg-green-50 border-green-200 text-green-700';
      case 'UPDATE': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'DELETE': return 'bg-red-50 border-red-200 text-red-700';
      case 'VIEW': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const formatDateTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con cumplimiento NOM-004 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} />
          <div>
            <h3 className="font-bold text-lg">Registro de Auditoría</h3>
            <p className="text-sm text-indigo-100">NOM-004: Trazabilidad Legal del Expediente Clínico</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {!patientId && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'today'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'week'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Última Semana
          </button>
        </div>
      )}

      {/* Lista de registros de auditoría */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-3 text-gray-400" />
            <p>No hay registros de auditoría disponibles</p>
          </div>
        ) : (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-lg border-2 ${getActionColor(log.action_type)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getActionIcon(log.action_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{log.action_type}</span>
                    <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-sm mb-1">{log.action_description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {log.user_name}
                    </span>
                    <span className="px-2 py-1 bg-white/50 rounded">
                      {log.entity_type} #{log.entity_id}
                    </span>
                    {log.ip_address && (
                      <span className="text-gray-400">IP: {log.ip_address}</span>
                    )}
                  </div>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-1 p-2 bg-white/50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.details), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer informativo */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>NOM-004-SSA3-2012:</strong> Todos los registros médicos y de enfermería son 
            permanentes y no pueden ser eliminados. Este registro de auditoría garantiza la 
            trazabilidad legal de todas las acciones realizadas sobre el expediente clínico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailViewer;
