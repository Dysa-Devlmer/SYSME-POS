// web-interface/frontend/src/components/LogViewer.jsx
// Visualizador de Logs y Monitoreo del Sistema

import React, { useState, useEffect, useRef } from 'react';

const LogViewer = ({ socket }) => {
  const [activeView, setActiveView] = useState('logs'); // 'logs', 'metrics', 'health'

  // Logs
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);

  // Filtros
  const [filters, setFilters] = useState({
    level: 'all', // all, debug, info, warn, error
    category: 'all',
    search: ''
  });

  // Métricas
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState({
    cpu: [],
    memory: [],
    disk: []
  });

  // Health
  const [healthReport, setHealthReport] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Categories
  const categories = [
    'all', 'system', 'agent', 'scheduler', 'workflow',
    'search', 'docs', 'voice', 'notifications', 'errors'
  ];

  useEffect(() => {
    if (!socket) return;

    // Logs listeners
    socket.on('logs:recent', (data) => {
      setLogs(data);
    });

    socket.on('logs:new', (log) => {
      setLogs(prev => [log, ...prev].slice(0, 500)); // Mantener últimos 500
    });

    socket.on('logs:stats', (stats) => {
      setLogStats(stats);
    });

    // Metrics listeners
    socket.on('monitor:metrics', (data) => {
      setMetrics(data);

      // Actualizar historial
      setMetricsHistory(prev => ({
        cpu: [...prev.cpu, { timestamp: data.timestamp, value: data.cpu.usage }].slice(-60),
        memory: [...prev.memory, { timestamp: data.timestamp, value: data.memory.usage }].slice(-60),
        disk: [...prev.disk, { timestamp: data.timestamp, value: data.disk.usage }].slice(-60)
      }));
    });

    socket.on('monitor:alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10));
    });

    socket.on('monitor:health', (report) => {
      setHealthReport(report);
    });

    // Initial data fetch
    socket.emit('logs:get-recent', filters);
    socket.emit('logs:get-stats');
    socket.emit('monitor:get-current');
    socket.emit('monitor:get-health');

    return () => {
      socket.off('logs:recent');
      socket.off('logs:new');
      socket.off('logs:stats');
      socket.off('monitor:metrics');
      socket.off('monitor:alert');
      socket.off('monitor:health');
    };
  }, [socket]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Apply filters
  useEffect(() => {
    if (socket) {
      socket.emit('logs:get-recent', filters);
    }
  }, [filters, socket]);

  const handleExportLogs = () => {
    if (!socket) return;
    socket.emit('logs:export', { format: 'json' });
  };

  const handleClearLogs = () => {
    if (!confirm('¿Limpiar logs visualizados?')) return;
    setLogs([]);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'debug': return 'text-gray-400';
      case 'info': return 'text-cyan-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const getLevelBg = (level) => {
    switch (level) {
      case 'debug': return 'bg-gray-700';
      case 'info': return 'bg-cyan-900 bg-opacity-30';
      case 'warn': return 'bg-yellow-900 bg-opacity-30';
      case 'error': return 'bg-red-900 bg-opacity-30';
      default: return 'bg-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  const getMetricColor = (value) => {
    if (value >= 90) return 'text-red-400';
    if (value >= 75) return 'text-yellow-400';
    if (value >= 50) return 'text-cyan-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">📊 Logs & Monitoreo</h2>
          <p className="text-gray-400 text-sm mt-1">
            Sistema de logging y monitoreo en tiempo real
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('logs')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'logs'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📝 Logs
          </button>
          <button
            onClick={() => setActiveView('metrics')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'metrics'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📈 Métricas
          </button>
          <button
            onClick={() => setActiveView('health')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'health'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ❤️ Salud
          </button>
        </div>
      </div>

      {/* Stats */}
      {logStats && activeView === 'logs' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Total Logs</p>
            <p className="text-2xl font-bold text-white">{logStats.totalLogs}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Errores</p>
            <p className="text-2xl font-bold text-red-400">{logStats.byLevel.error}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Warnings</p>
            <p className="text-2xl font-bold text-yellow-400">{logStats.byLevel.warn}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Buffer</p>
            <p className="text-2xl font-bold text-cyan-400">{logStats.bufferSize}</p>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nivel</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Buscar</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Buscar en logs..."
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    autoScroll
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {autoScroll ? '📜 Auto' : '⏸️ Pausado'}
                </button>
                <button
                  onClick={handleExportLogs}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  ⬇️ Exportar
                </button>
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                >
                  🗑️ Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Logs List */}
          <div className="bg-gray-800 rounded-lg p-4 h-[600px] overflow-y-auto custom-scrollbar">
            {logs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No hay logs disponibles</p>
              </div>
            )}

            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`${getLevelBg(log.level)} rounded p-2 ${getLevelColor(log.level)}`}
                >
                  <span className="text-gray-500">{formatTime(log.timestamp)}</span>
                  {' '}
                  <span className="font-bold">[{log.category}]</span>
                  {' '}
                  <span className={`font-bold ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}:
                  </span>
                  {' '}
                  <span className="text-white">{log.message}</span>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <div className="text-gray-400 mt-1 pl-4">
                      {JSON.stringify(log.meta, null, 2)}
                    </div>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Metrics View */}
      {activeView === 'metrics' && metrics && (
        <div className="space-y-4">
          {/* Current Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">💻 CPU</h3>
                <span className={`text-3xl font-bold ${getMetricColor(metrics.cpu.usage)}`}>
                  {metrics.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Cores: <span className="text-white">{metrics.cpu.cores}</span></p>
                <p className="text-gray-400">Speed: <span className="text-white">{metrics.cpu.speed} GHz</span></p>
                <p className="text-gray-400">Model: <span className="text-white text-xs">{metrics.cpu.model}</span></p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">🧠 Memoria</h3>
                <span className={`text-3xl font-bold ${getMetricColor(metrics.memory.usage)}`}>
                  {metrics.memory.usage.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Usada: <span className="text-white">{formatBytes(metrics.memory.used)}</span></p>
                <p className="text-gray-400">Total: <span className="text-white">{formatBytes(metrics.memory.total)}</span></p>
                <p className="text-gray-400">Libre: <span className="text-white">{formatBytes(metrics.memory.free)}</span></p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">💾 Disco</h3>
                <span className={`text-3xl font-bold ${getMetricColor(metrics.disk.usage)}`}>
                  {metrics.disk.usage.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Usado: <span className="text-white">{formatBytes(metrics.disk.used)}</span></p>
                <p className="text-gray-400">Total: <span className="text-white">{formatBytes(metrics.disk.total)}</span></p>
                <p className="text-gray-400">Libre: <span className="text-white">{formatBytes(metrics.disk.free)}</span></p>
              </div>
            </div>
          </div>

          {/* Process Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">🔧 Proceso Node.js</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">PID</p>
                <p className="text-white font-bold">{metrics.process.pid}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Memoria Heap</p>
                <p className="text-white font-bold">{metrics.process.memoryMB} MB</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Uso de Heap</p>
                <p className="text-white font-bold">{metrics.process.memoryUsage}%</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Uptime</p>
                <p className="text-white font-bold">{Math.floor(metrics.process.uptime / 3600)}h</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
              <h3 className="text-lg font-bold text-red-400 mb-3">🚨 Alertas Recientes</h3>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={index} className="bg-red-900 bg-opacity-30 rounded p-3">
                    <p className="text-red-400 font-semibold">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Umbral: {alert.threshold}% | Actual: {alert.value.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health View */}
      {activeView === 'health' && healthReport && (
        <div className="space-y-4">
          {/* Status */}
          <div className={`rounded-lg p-6 border-2 ${
            healthReport.status === 'healthy' ? 'bg-green-900 bg-opacity-20 border-green-500' :
            healthReport.status === 'warning' ? 'bg-yellow-900 bg-opacity-20 border-yellow-500' :
            'bg-red-900 bg-opacity-20 border-red-500'
          }`}>
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-6xl">{getHealthIcon(healthReport.status)}</span>
              <div className="flex-1">
                <h3 className={`text-2xl font-bold ${getHealthColor(healthReport.status)}`}>
                  Estado: {healthReport.status === 'healthy' ? 'Saludable' : healthReport.status === 'warning' ? 'Advertencia' : 'Crítico'}
                </h3>
                <p className="text-gray-300 mt-1">{healthReport.message}</p>
              </div>
            </div>
          </div>

          {/* Issues & Warnings */}
          {(healthReport.issues.length > 0 || healthReport.warnings.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {healthReport.issues.length > 0 && (
                <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-red-400 mb-3">❌ Problemas Críticos</h3>
                  <ul className="space-y-2">
                    {healthReport.issues.map((issue, index) => (
                      <li key={index} className="text-red-300">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {healthReport.warnings.length > 0 && (
                <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-yellow-400 mb-3">⚠️ Advertencias</h3>
                  <ul className="space-y-2">
                    {healthReport.warnings.map((warning, index) => (
                      <li key={index} className="text-yellow-300">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Metrics Summary */}
          {healthReport.metrics && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 Resumen de Métricas</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-2">CPU</p>
                  <p className={`text-2xl font-bold ${getMetricColor(healthReport.metrics.current.cpu)}`}>
                    {healthReport.metrics.current.cpu.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Promedio: {healthReport.metrics.averages.cpu.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Pico: {healthReport.metrics.peaks.cpu.toFixed(1)}%
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Memoria</p>
                  <p className={`text-2xl font-bold ${getMetricColor(healthReport.metrics.current.memory)}`}>
                    {healthReport.metrics.current.memory.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Promedio: {healthReport.metrics.averages.memory.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Pico: {healthReport.metrics.peaks.memory.toFixed(1)}%
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Disco</p>
                  <p className={`text-2xl font-bold ${getMetricColor(healthReport.metrics.current.disk)}`}>
                    {healthReport.metrics.current.disk.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Performance */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-bold text-white mb-3">⚡ Rendimiento</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Requests</p>
                    <p className="text-white font-bold">{healthReport.metrics.performance.requests}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Errores</p>
                    <p className="text-white font-bold">{healthReport.metrics.performance.errors}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tasa de Error</p>
                    <p className="text-white font-bold">{healthReport.metrics.performance.errorRate.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogViewer;
