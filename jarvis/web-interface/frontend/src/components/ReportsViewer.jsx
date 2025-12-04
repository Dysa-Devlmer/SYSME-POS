// web-interface/frontend/src/components/ReportsViewer.jsx
// Componente para visualizar reportes de mantenimiento

import React, { useState, useEffect } from 'react';

const ReportsViewer = ({ socket }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, daily, weekly, monthly

  useEffect(() => {
    if (!socket) return;

    // Solicitar lista de reportes
    socket.emit('maintenance:get-reports');

    // Escuchar lista de reportes
    socket.on('maintenance:reports-list', (reportsList) => {
      setReports(reportsList);
      setLoading(false);
    });

    // Escuchar reporte específico
    socket.on('maintenance:report-content', (content) => {
      setSelectedReport(content);
    });

    return () => {
      socket.off('maintenance:reports-list');
      socket.off('maintenance:report-content');
    };
  }, [socket]);

  const handleSelectReport = (reportName) => {
    socket.emit('maintenance:get-report', reportName);
  };

  const handleGenerateReport = (type) => {
    socket.emit('maintenance:generate-report', type);
    // Refrescar lista después de generar
    setTimeout(() => {
      socket.emit('maintenance:get-reports');
    }, 1000);
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'all') return true;
    return r.name.startsWith(filter);
  });

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <p className="text-gray-400 text-center py-8">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros y acciones */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">📊 Reportes de Mantenimiento</h2>
          <span className="text-sm text-gray-400">{reports.length} reportes</span>
        </div>

        {/* Filtros */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Todos ({reports.length})
          </button>
          <button
            onClick={() => setFilter('daily')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'daily'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Diarios ({reports.filter(r => r.name.startsWith('daily')).length})
          </button>
          <button
            onClick={() => setFilter('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'weekly'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Semanales ({reports.filter(r => r.name.startsWith('weekly')).length})
          </button>
          <button
            onClick={() => setFilter('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'monthly'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Mensuales ({reports.filter(r => r.name.startsWith('monthly')).length})
          </button>
        </div>

        {/* Acciones de generación */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleGenerateReport('daily')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
          >
            ➕ Generar Diario
          </button>
          <button
            onClick={() => handleGenerateReport('weekly')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            ➕ Generar Semanal
          </button>
          <button
            onClick={() => handleGenerateReport('monthly')}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all"
          >
            ➕ Generar Mensual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de reportes */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Lista de Reportes</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredReports.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay reportes disponibles</p>
            ) : (
              filteredReports.map((report, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectReport(report.name)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedReport && selectedReport.timestamp === report.created
                      ? 'bg-cyan-600 bg-opacity-20 border border-cyan-500'
                      : 'bg-gray-700 hover:bg-gray-650'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {report.name.replace('.json', '')}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatDate(report.created)} • {formatSize(report.size)}
                      </p>
                    </div>
                    <span className="text-cyan-400 ml-4">▶</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visualización del reporte seleccionado */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Detalles del Reporte</h3>

          {!selectedReport ? (
            <p className="text-gray-400 text-center py-8">
              Selecciona un reporte para ver sus detalles
            </p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {/* Resumen */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">📊 Resumen</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Periodo</p>
                    <p className="text-lg font-bold text-cyan-400">{selectedReport.period}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Fecha/Rango</p>
                    <p className="text-sm text-white">{selectedReport.date || selectedReport.week || selectedReport.month}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Sesiones</p>
                    <p className="text-lg font-bold text-white">{selectedReport.summary?.totalSessions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Exitosas</p>
                    <p className="text-lg font-bold text-green-400">{selectedReport.summary?.successfulSessions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Score Promedio</p>
                    <p className="text-lg font-bold text-cyan-400">{selectedReport.summary?.averageScore || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sub-tareas</p>
                    <p className="text-lg font-bold text-purple-400">{selectedReport.summary?.totalSubtasks || 0}</p>
                  </div>
                </div>
              </div>

              {/* Top Tareas */}
              {selectedReport.topTasks && selectedReport.topTasks.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">🏆 Top Tareas</h4>
                  <div className="space-y-2">
                    {selectedReport.topTasks.map((task, i) => (
                      <div key={i} className="bg-gray-600 rounded p-3">
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm font-medium flex-1 min-w-0 truncate">
                            {task.task}
                          </p>
                          <div className="flex items-center space-x-3 ml-3">
                            <span className="text-xs text-gray-400">{task.count}x</span>
                            <span className="text-sm font-bold text-cyan-400">{task.avgScore}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks por tipo */}
              {selectedReport.subtasksByType && Object.keys(selectedReport.subtasksByType).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">🔧 Sub-tareas por Tipo</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedReport.subtasksByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-gray-400 capitalize">{type}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tendencias */}
              {selectedReport.trends && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">📈 Tendencias</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Score Trend</span>
                      <span className={`font-bold ${
                        selectedReport.trends.scoreTrend > 0 ? 'text-green-400' :
                        selectedReport.trends.scoreTrend < 0 ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {selectedReport.trends.scoreTrend > 0 ? '↗️' : selectedReport.trends.scoreTrend < 0 ? '↘️' : '→'}
                        {' '}{selectedReport.trends.scoreTrend}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Score Promedio</span>
                      <span className="text-white font-bold">{selectedReport.trends.averageScore}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Insights */}
              {selectedReport.insights && selectedReport.insights.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">💡 Insights</h4>
                  <ul className="space-y-2">
                    {selectedReport.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start">
                        <span className="text-cyan-400 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Breakdown diario (para reportes semanales/mensuales) */}
              {selectedReport.dailyBreakdown && Object.keys(selectedReport.dailyBreakdown).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">📅 Breakdown Diario</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(selectedReport.dailyBreakdown).map(([date, data]) => (
                      <div key={date} className="bg-gray-600 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{date}</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-green-400">{data.successful}✓</span>
                            <span className="text-xs text-cyan-400">{data.avgScore}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsViewer;
