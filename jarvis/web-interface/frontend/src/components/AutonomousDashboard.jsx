// web-interface/frontend/src/components/AutonomousDashboard.jsx
// Dashboard para visualizar el Autonomous Agent en tiempo real

import React, { useState, useEffect } from 'react';
import './AutonomousDashboard.css';
import MetricsChart, {
  createScoreHistoryData,
  createSuccessRateData,
  createSubtasksByTypeData,
  createTimelineData,
  createKnowledgeGrowthData,
  createMemoryDistributionData
} from './MetricsChart';
import SessionHistory from './SessionHistory';
import ReportsViewer from './ReportsViewer';
import NotificationCenter from './NotificationCenter';
import CodeSearch from './CodeSearch';
import DocGenerator from './DocGenerator';
import VoiceControl from './VoiceControl';
import TaskScheduler from './TaskScheduler';
import LogViewer from './LogViewer';
import Settings from './Settings';
import BackupManager from './BackupManager';
import TestRunner from './TestRunner';
import UserManagement from './UserManagement';
import PerformanceDashboard from './PerformanceDashboard';

const AutonomousDashboard = ({ socket }) => {
  // Estado del agente
  const [agentState, setAgentState] = useState({
    state: 'idle',
    currentTask: null,
    progress: null,
    results: []
  });

  // Plan actual
  const [currentPlan, setCurrentPlan] = useState(null);

  // Sub-tarea actual
  const [currentSubtask, setCurrentSubtask] = useState(null);

  // Log de eventos
  const [eventLog, setEventLog] = useState([]);

  // Estadísticas
  const [stats, setStats] = useState(null);

  // Historial de sesiones
  const [sessions, setSessions] = useState([]);

  // Form state
  const [taskInput, setTaskInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Tab activo (dashboard o analytics)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Voice control handlers
  const handleVoiceAction = (action, parameters) => {
    switch (action) {
      case 'execute-task':
        if (parameters?.task) {
          setTaskInput(parameters.task);
          setActiveTab('dashboard');
        }
        break;
      case 'search':
        setActiveTab('search');
        break;
      case 'document':
        setActiveTab('docs');
        break;
      case 'show-notifications':
        // Las notificaciones son flotantes, no hacemos nada
        break;
      case 'open-view':
        if (parameters?.view) {
          setActiveTab(parameters.view);
        }
        break;
      default:
        console.log('Acción de voz no manejada:', action);
    }
  };

  // Agregar evento al log
  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [
      { type, message, timestamp, data },
      ...prev.slice(0, 99) // Mantener últimos 100
    ]);
  };

  useEffect(() => {
    if (!socket) return;

    // Obtener estado inicial
    socket.emit('autonomous:get-state');
    socket.emit('autonomous:get-stats');
    socket.emit('autonomous:get-sessions'); // Obtener historial de sesiones

    // === TASK EVENTS ===
    socket.on('autonomous:task-start', (data) => {
      addLog('task', `Tarea iniciada: ${data.taskDescription}`);
      setIsExecuting(true);
      setAgentState(prev => ({
        ...prev,
        currentTask: data.taskDescription,
        state: 'planning'
      }));
    });

    socket.on('autonomous:task-planned', (data) => {
      addLog('plan', `Plan creado: ${data.subtaskCount} sub-tareas`);
      setCurrentPlan(data.plan);
    });

    socket.on('autonomous:task-complete', (data) => {
      addLog('success', `Tarea completada! Score: ${data.summary.averageScore}%`, data);
      setIsExecuting(false);
      setAgentState(prev => ({
        ...prev,
        state: 'completed',
        currentTask: null
      }));

      // Añadir sesión al historial
      const newSession = {
        id: Date.now(),
        timestamp: Date.now(),
        content: {
          task: agentState.currentTask,
          plan: currentPlan,
          summary: data.summary,
          results: data.results,
          duration: data.duration
        }
      };
      setSessions(prev => [...prev, newSession]);

      // Refrescar stats y sesiones
      socket.emit('autonomous:get-stats');
      socket.emit('autonomous:get-sessions');
    });

    socket.on('autonomous:task-failed', (data) => {
      addLog('error', `Tarea falló: ${data.error}`, data);
      setIsExecuting(false);
      setAgentState(prev => ({
        ...prev,
        state: 'failed'
      }));
    });

    // === EXECUTION EVENTS ===
    socket.on('autonomous:execution-start', (data) => {
      addLog('execution', `Ejecutando: ${data.subtask.title}`);
      setCurrentSubtask(data.subtask);
      setAgentState(prev => ({
        ...prev,
        state: 'executing'
      }));
    });

    socket.on('autonomous:execution-complete', (data) => {
      addLog('execution', `Completada: ${data.subtask.title}`);
    });

    socket.on('autonomous:execution-failed', (data) => {
      addLog('error', `Falló: ${data.subtask.title}`);
    });

    // === VERIFICATION EVENTS ===
    socket.on('autonomous:verification-start', (data) => {
      setAgentState(prev => ({
        ...prev,
        state: 'verifying'
      }));
    });

    socket.on('autonomous:verification-passed', (data) => {
      addLog('success', `Verificación pasada (score: ${data.score}%)`);
    });

    socket.on('autonomous:verification-failed', (data) => {
      addLog('warning', `Verificación fallida: ${data.issues.length} issues`);
    });

    // === SUBTASK EVENTS ===
    socket.on('autonomous:subtask-success', (data) => {
      addLog('success', `Sub-tarea ${data.index}/${data.total} exitosa`);
      setAgentState(prev => ({
        ...prev,
        progress: {
          current: data.index,
          total: data.total,
          percentage: Math.round((data.index / data.total) * 100)
        }
      }));
    });

    socket.on('autonomous:subtask-failed', (data) => {
      addLog('error', `Sub-tarea ${data.index}/${data.total} fallida`);
    });

    socket.on('autonomous:subtask-corrected', (data) => {
      addLog('warning', `Sub-tarea ${data.index}/${data.total} corregida automáticamente`);
    });

    // === RESEARCH EVENTS ===
    socket.on('autonomous:research-start', (data) => {
      addLog('research', `Investigando: ${data.query}`);
    });

    socket.on('autonomous:research-complete', (data) => {
      addLog('research', `Investigación completa: ${data.knowledgeCount} conocimientos`);
    });

    // === STATE EVENTS ===
    socket.on('autonomous:state', (state) => {
      setAgentState(state);
    });

    socket.on('autonomous:stats', (statsData) => {
      setStats(statsData);
    });

    socket.on('autonomous:sessions', (sessionsData) => {
      setSessions(sessionsData || []);
    });

    socket.on('autonomous:paused', () => {
      addLog('info', 'Agente pausado');
      setAgentState(prev => ({ ...prev, state: 'paused' }));
    });

    socket.on('autonomous:resumed', () => {
      addLog('info', 'Agente reanudado');
      setAgentState(prev => ({ ...prev, state: 'executing' }));
    });

    socket.on('autonomous:cancelled', () => {
      addLog('warning', 'Tarea cancelada');
      setIsExecuting(false);
      setAgentState(prev => ({ ...prev, state: 'idle', currentTask: null }));
    });

    // === ERROR EVENTS ===
    socket.on('autonomous:error', (data) => {
      addLog('error', `Error: ${data.message}`);
    });

    // Cleanup
    return () => {
      socket.off('autonomous:task-start');
      socket.off('autonomous:task-planned');
      socket.off('autonomous:task-complete');
      socket.off('autonomous:task-failed');
      socket.off('autonomous:execution-start');
      socket.off('autonomous:execution-complete');
      socket.off('autonomous:execution-failed');
      socket.off('autonomous:verification-start');
      socket.off('autonomous:verification-passed');
      socket.off('autonomous:verification-failed');
      socket.off('autonomous:subtask-success');
      socket.off('autonomous:subtask-failed');
      socket.off('autonomous:subtask-corrected');
      socket.off('autonomous:research-start');
      socket.off('autonomous:research-complete');
      socket.off('autonomous:state');
      socket.off('autonomous:stats');
      socket.off('autonomous:sessions');
      socket.off('autonomous:paused');
      socket.off('autonomous:resumed');
      socket.off('autonomous:cancelled');
      socket.off('autonomous:error');
    };
  }, [socket]);

  // Ejecutar tarea
  const handleExecuteTask = () => {
    if (!taskInput.trim() || !socket) return;

    socket.emit('autonomous:execute-task', {
      taskDescription: taskInput,
      context: {
        projectName: 'JARVIS',
        language: 'javascript'
      }
    });

    addLog('info', `Ejecutando tarea: ${taskInput}`);
    setTaskInput('');
  };

  // Control de agente
  const handlePause = () => {
    socket.emit('autonomous:pause');
  };

  const handleResume = () => {
    socket.emit('autonomous:resume');
  };

  const handleCancel = () => {
    socket.emit('autonomous:cancel');
  };

  // Render estado
  const renderState = () => {
    const stateColors = {
      idle: 'bg-gray-500',
      planning: 'bg-yellow-500',
      executing: 'bg-blue-500',
      verifying: 'bg-cyan-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      paused: 'bg-orange-500'
    };

    const stateLabels = {
      idle: 'Idle',
      planning: 'Planificando',
      executing: 'Ejecutando',
      verifying: 'Verificando',
      completed: 'Completado',
      failed: 'Fallido',
      paused: 'Pausado',
      'not-initialized': 'No Inicializado'
    };

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${stateColors[agentState.state] || 'bg-gray-400'} animate-pulse`}></div>
        <span className="font-semibold">{stateLabels[agentState.state] || agentState.state}</span>
      </div>
    );
  };

  // Render progreso
  const renderProgress = () => {
    if (!agentState.progress) return null;

    const { current, total, percentage } = agentState.progress;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progreso</span>
          <span className="font-semibold">{current}/{total} ({percentage}%)</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 flex items-center justify-center text-xs font-bold text-white"
            style={{ width: `${percentage}%` }}
          >
            {percentage > 10 && `${percentage}%`}
          </div>
        </div>
      </div>
    );
  };

  // Render log
  const renderLog = (log) => {
    const typeColors = {
      task: 'text-blue-400',
      plan: 'text-purple-400',
      execution: 'text-cyan-400',
      research: 'text-yellow-400',
      success: 'text-green-400',
      warning: 'text-orange-400',
      error: 'text-red-400',
      info: 'text-gray-400'
    };

    const typeIcons = {
      task: '🎯',
      plan: '📋',
      execution: '⚙️',
      research: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };

    return (
      <div className="flex items-start space-x-2 text-sm py-2 border-b border-gray-700 last:border-0">
        <span className="text-lg">{typeIcons[log.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 text-xs">{log.timestamp}</span>
            <span className={`font-mono text-xs ${typeColors[log.type]}`}>[{log.type.toUpperCase()}]</span>
          </div>
          <p className="text-white mt-1 break-words">{log.message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="autonomous-dashboard p-6 space-y-6">
      {/* Notification Center (floating) */}
      <NotificationCenter socket={socket} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-cyan-900 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <span>🤖</span>
              <span>Autonomous Agent Dashboard</span>
            </h1>
            <p className="text-cyan-300 mt-2">Monitoreo en tiempo real del sistema autónomo</p>
          </div>
          <div className="text-right">
            {renderState()}
            {agentState.currentTask && (
              <p className="text-sm text-gray-300 mt-2">
                Tarea: <span className="font-semibold">{agentState.currentTask}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'dashboard'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'analytics'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📈 Analytics
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'history'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📜 Historial
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'reports'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Reportes
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'search'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔍 Búsqueda
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'docs'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📚 Documentación
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'voice'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎤 Voz
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'scheduler'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⏰ Tareas
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'logs'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Logs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'settings'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⚙️ Config
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'backup'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💾 Backup
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'tests'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🧪 Tests
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'security'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔐 Seguridad
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'performance'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⚡ Performance
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Task Input */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Ejecutar Tarea Autónoma</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleExecuteTask()}
            placeholder="Ej: Crear un validador de email con tests y documentación"
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isExecuting}
          />
          <button
            onClick={handleExecuteTask}
            disabled={!taskInput.trim() || isExecuting}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isExecuting ? 'Ejecutando...' : 'Ejecutar'}
          </button>
        </div>

        {/* Controls */}
        {isExecuting && (
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              ⏸️ Pausar
            </button>
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ▶️ Reanudar
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🛑 Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      {agentState.progress && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Progreso</h2>
          {renderProgress()}
          {currentSubtask && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Sub-tarea actual:</p>
              <p className="text-white font-semibold mt-1">{currentSubtask.title}</p>
              <p className="text-gray-300 text-sm mt-2">{currentSubtask.description}</p>
              <div className="flex space-x-4 mt-3 text-xs">
                <span className="text-cyan-400">Tipo: {currentSubtask.type}</span>
                <span className="text-purple-400">Complejidad: {currentSubtask.complexity}</span>
                <span className="text-yellow-400">Tiempo est: {currentSubtask.estimatedTime}min</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Log */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Log de Eventos</h2>
            <span className="text-sm text-gray-400">{eventLog.length} eventos</span>
          </div>
          <div className="h-96 overflow-y-auto space-y-1 custom-scrollbar">
            {eventLog.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay eventos aún</p>
            ) : (
              eventLog.map((log, i) => (
                <div key={i}>{renderLog(log)}</div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Estadísticas Globales</h2>
          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Sesiones Totales</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.totalSessions}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Sesiones Exitosas</p>
                  <p className="text-3xl font-bold text-green-400 mt-2">{stats.successfulSessions}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Score Promedio</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">{stats.averageScore}%</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Sub-tareas Completadas</p>
                  <p className="text-3xl font-bold text-purple-400 mt-2">{stats.totalSubtasksCompleted}</p>
                </div>
              </div>

              {/* Web Intelligence Stats */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-bold text-white mb-3">🌐 Web Intelligence</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Búsquedas:</span>
                    <span className="text-white font-semibold">{stats.webIntelligenceStats?.totalSearches || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conocimientos:</span>
                    <span className="text-white font-semibold">{stats.webIntelligenceStats?.totalKnowledge || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conceptos:</span>
                    <span className="text-white font-semibold">{stats.webIntelligenceStats?.totalConcepts || 0}</span>
                  </div>
                </div>
              </div>

              {/* Memory Stats */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-bold text-white mb-3">💾 Neural Memory</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Memorias:</span>
                    <span className="text-white font-semibold">{stats.memoryStats?.totalMemories || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Corto Plazo:</span>
                    <span className="text-white font-semibold">{stats.memoryStats?.shortTermCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Largo Plazo:</span>
                    <span className="text-white font-semibold">{stats.memoryStats?.longTermCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Cargando estadísticas...</p>
          )}
        </div>
      </div>
      </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score History Chart */}
            <MetricsChart
              type="line"
              data={createScoreHistoryData(sessions)}
              title="📈 Historial de Scores"
              height={300}
            />

            {/* Success Rate Chart */}
            <MetricsChart
              type="doughnut"
              data={createSuccessRateData(stats)}
              title="✅ Tasa de Éxito"
              height={300}
            />

            {/* Subtasks by Type Chart */}
            <MetricsChart
              type="bar"
              data={createSubtasksByTypeData(sessions)}
              title="🔧 Sub-tareas por Tipo"
              height={300}
            />

            {/* Timeline Chart */}
            <MetricsChart
              type="bar"
              data={createTimelineData(sessions)}
              title="⏱️ Línea de Tiempo"
              height={300}
            />

            {/* Knowledge Growth Chart */}
            <MetricsChart
              type="bar"
              data={createKnowledgeGrowthData(stats)}
              title="🧠 Crecimiento de Conocimiento"
              height={300}
            />

            {/* Memory Distribution Chart */}
            <MetricsChart
              type="doughnut"
              data={createMemoryDistributionData(stats)}
              title="💾 Distribución de Memoria"
              height={300}
            />
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <SessionHistory sessions={sessions} />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <ReportsViewer socket={socket} />
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <CodeSearch socket={socket} />
      )}

      {/* Documentation Tab */}
      {activeTab === 'docs' && (
        <DocGenerator socket={socket} />
      )}

      {/* Voice Control Tab */}
      {activeTab === 'voice' && (
        <div className="h-[calc(100vh-220px)]">
          <VoiceControl socket={socket} onAction={handleVoiceAction} />
        </div>
      )}

      {/* Task Scheduler Tab */}
      {activeTab === 'scheduler' && (
        <TaskScheduler socket={socket} />
      )}

      {/* Logs & Monitoring Tab */}
      {activeTab === 'logs' && (
        <LogViewer socket={socket} />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Settings socket={socket} />
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <BackupManager socket={socket} />
      )}

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <TestRunner socket={socket} />
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <UserManagement socket={socket} currentUser={null} />
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <PerformanceDashboard socket={socket} />
      )}
    </div>
  );
};

export default AutonomousDashboard;
