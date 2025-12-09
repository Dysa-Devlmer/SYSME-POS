// web-interface/frontend/src/components/SystemMonitor.jsx
// Monitor del sistema en tiempo real

import React, { useState, useEffect } from 'react';

export default function SystemMonitor({ socket, connected }) {
  const [logs, setLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState({
    cpu: 0,
    memory: 0,
    processes: 0,
    uptime: 0
  });

  useEffect(() => {
    // Obtener métricas reales del sistema
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/system/metrics');
        const data = await response.json();
        setSystemInfo({
          cpu: data.cpu.usage,
          memory: data.memory.usagePercent,
          processes: data.cpu.cores, // Mostrar cores como referencia
          uptime: data.uptime,
          cpuBrand: data.cpu.brand,
          memoryTotal: data.memory.total,
          diskUsage: data.disk.usagePercent,
          hostname: data.os.hostname
        });
      } catch (error) {
        console.error('Error fetching system metrics:', error);
      }
    };

    fetchMetrics(); // Primera carga
    const interval = setInterval(fetchMetrics, 3000); // Cada 3 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Agregar log inicial
    addLog('Sistema JARVIS MARK VII iniciado', 'success');
    addLog('Todos los módulos cargados correctamente', 'info');
    addLog('Esperando comandos del usuario...', 'info');

    // Escuchar eventos del socket
    if (socket) {
      socket.on('system:log', (logEntry) => {
        addLog(logEntry.message, logEntry.type || 'info');
      });

      socket.on('chat:response', (data) => {
        addLog(`JARVIS: ${data.response.substring(0, 100)}...`, 'success');
      });

      socket.on('task:created', (task) => {
        addLog(`✅ Nueva tarea creada: "${task.title}"`, 'success');
      });

      socket.on('task:completed', (task) => {
        addLog(`🎉 Tarea completada: "${task.title}"`, 'success');
      });
    }

    return () => {
      if (socket) {
        socket.off('system:log');
        socket.off('chat:response');
        socket.off('task:created');
        socket.off('task:completed');
      }
    };
  }, [socket]);

  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('es-AR'),
      message,
      type
    };

    setLogs(prev => [...prev.slice(-49), newLog]); // Últimos 50 logs
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '📌';
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Monitor del Sistema
        </h2>
        <div className={`flex items-center gap-2 ${connected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          {connected ? 'Monitoreando' : 'Desconectado'}
        </div>
      </div>

      {/* Métricas en Tiempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl">💻</div>
            <div className="text-xs text-blue-300 font-semibold">CPU</div>
          </div>
          <div className="text-4xl font-bold mb-1">{systemInfo.cpu}%</div>
          <div className="w-full bg-blue-950 rounded-full h-2 mt-2">
            <div
              className="bg-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${systemInfo.cpu}%` }}
            ></div>
          </div>
        </div>

        {/* Memoria */}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl">🧠</div>
            <div className="text-xs text-purple-300 font-semibold">RAM</div>
          </div>
          <div className="text-4xl font-bold mb-1">{systemInfo.memory}%</div>
          <div className="w-full bg-purple-950 rounded-full h-2 mt-2">
            <div
              className="bg-purple-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${systemInfo.memory}%` }}
            ></div>
          </div>
        </div>

        {/* Disco */}
        <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl">💾</div>
            <div className="text-xs text-green-300 font-semibold">DISCO</div>
          </div>
          <div className="text-4xl font-bold mb-1">{systemInfo.diskUsage || 0}%</div>
          <div className="w-full bg-green-950 rounded-full h-2 mt-2">
            <div
              className="bg-green-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${systemInfo.diskUsage || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl">⏱️</div>
            <div className="text-xs text-orange-300 font-semibold">UPTIME</div>
          </div>
          <div className="text-lg font-bold mb-1">{formatUptime(systemInfo.uptime)}</div>
          <div className="text-xs text-orange-300 mt-1">sistema activo</div>
        </div>
      </div>

      {/* Logs en Tiempo Real */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-900 px-6 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>📝</span>
            Actividad del Sistema
          </h3>
          <button
            onClick={() => setLogs([])}
            className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Limpiar
          </button>
        </div>
        <div className="p-4 h-96 overflow-y-auto bg-black bg-opacity-30 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-4xl mb-2">📭</div>
              <div>No hay logs disponibles</div>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-gray-900 hover:bg-opacity-50 p-2 rounded transition-colors">
                  <span className="text-gray-500 text-xs w-20 flex-shrink-0">[{log.timestamp}]</span>
                  <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                  <span className={`flex-1 ${getLogColor(log.type)}`}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Servicios Activos */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔌</span>
          Servicios Activos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Backend API', status: 'running', port: '3001', color: 'green' },
            { name: 'Frontend React', status: 'running', port: '5173', color: 'green' },
            { name: 'WebSocket Server', status: 'running', port: '3001', color: 'green' },
            { name: 'Ollama IA', status: 'running', port: '11434', color: 'blue' },
            { name: 'SQLite Database', status: 'running', port: 'N/A', color: 'green' },
            { name: 'JARVIS Core', status: 'running', port: 'N/A', color: 'green' }
          ].map((service, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
            >
              <div>
                <div className="font-semibold text-sm">{service.name}</div>
                <div className="text-xs text-gray-400">Puerto: {service.port}</div>
              </div>
              <div className={`flex items-center gap-2 text-${service.color}-400`}>
                <div className={`w-2 h-2 bg-${service.color}-400 rounded-full animate-pulse`}></div>
                <span className="text-xs uppercase font-semibold">{service.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
