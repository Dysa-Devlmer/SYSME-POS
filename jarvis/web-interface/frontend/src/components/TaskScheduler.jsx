// web-interface/frontend/src/components/TaskScheduler.jsx
// Programador de Tareas y Workflows

import React, { useState, useEffect } from 'react';

const TaskScheduler = ({ socket }) => {
  const [activeView, setActiveView] = useState('tasks'); // 'tasks', 'workflows', 'templates'

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskStats, setTaskStats] = useState(null);

  // Workflows
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowStats, setWorkflowStats] = useState(null);
  const [templates, setTemplates] = useState([]);

  // Create Task Form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    type: 'cron', // 'cron', 'once', 'interval'
    schedule: '',
    action: 'autonomous-task', // 'autonomous-task', 'command', 'workflow'
    parameters: '',
    notifyOnSuccess: false,
    notifyOnError: true
  });

  // Create Workflow Form
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    steps: []
  });
  const [currentStep, setCurrentStep] = useState({
    name: '',
    action: 'autonomous-task',
    parameters: '',
    critical: true
  });

  useEffect(() => {
    if (!socket) return;

    // Tasks listeners
    socket.on('scheduler:tasks', (data) => {
      setTasks(data);
    });

    socket.on('scheduler:task-created', (task) => {
      setTasks(prev => [...prev, task]);
      setShowTaskForm(false);
      resetTaskForm();
    });

    socket.on('scheduler:task-updated', (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask(task);
      }
    });

    socket.on('scheduler:task-deleted', (data) => {
      setTasks(prev => prev.filter(t => t.id !== data.taskId));
      if (selectedTask && selectedTask.id === data.taskId) {
        setSelectedTask(null);
      }
    });

    socket.on('scheduler:stats', (stats) => {
      setTaskStats(stats);
    });

    socket.on('scheduler:task-history', (history) => {
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, history });
      }
    });

    // Workflows listeners
    socket.on('workflows:list', (data) => {
      setWorkflows(data);
    });

    socket.on('workflows:templates', (data) => {
      setTemplates(Object.entries(data).map(([id, template]) => ({
        id,
        ...template
      })));
    });

    socket.on('workflows:created', (workflow) => {
      setWorkflows(prev => [...prev, workflow]);
      setShowWorkflowForm(false);
      resetWorkflowForm();
    });

    socket.on('workflows:stats', (stats) => {
      setWorkflowStats(stats);
    });

    socket.on('workflows:execution-result', (result) => {
      console.log('Workflow execution result:', result);
    });

    // Initial data fetch
    socket.emit('scheduler:get-tasks');
    socket.emit('scheduler:get-stats');
    socket.emit('workflows:get-list');
    socket.emit('workflows:get-templates');
    socket.emit('workflows:get-stats');

    return () => {
      socket.off('scheduler:tasks');
      socket.off('scheduler:task-created');
      socket.off('scheduler:task-updated');
      socket.off('scheduler:task-deleted');
      socket.off('scheduler:stats');
      socket.off('scheduler:task-history');
      socket.off('workflows:list');
      socket.off('workflows:templates');
      socket.off('workflows:created');
      socket.off('workflows:stats');
      socket.off('workflows:execution-result');
    };
  }, [socket, selectedTask]);

  const resetTaskForm = () => {
    setTaskForm({
      name: '',
      description: '',
      type: 'cron',
      schedule: '',
      action: 'autonomous-task',
      parameters: '',
      notifyOnSuccess: false,
      notifyOnError: true
    });
  };

  const resetWorkflowForm = () => {
    setWorkflowForm({
      name: '',
      description: '',
      steps: []
    });
    setCurrentStep({
      name: '',
      action: 'autonomous-task',
      parameters: '',
      critical: true
    });
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!socket) return;

    const task = {
      ...taskForm,
      parameters: taskForm.parameters ? JSON.parse(taskForm.parameters) : null
    };

    socket.emit('scheduler:create-task', task);
  };

  const handleToggleTask = (taskId, enabled) => {
    if (!socket) return;
    socket.emit('scheduler:toggle-task', { taskId, enabled });
  };

  const handleDeleteTask = (taskId) => {
    if (!socket || !confirm('¿Eliminar esta tarea?')) return;
    socket.emit('scheduler:delete-task', { taskId });
  };

  const handleExecuteTask = (taskId) => {
    if (!socket) return;
    socket.emit('scheduler:execute-task', { taskId });
  };

  const handleViewTaskHistory = (task) => {
    if (!socket) return;
    setSelectedTask(task);
    socket.emit('scheduler:get-task-history', { taskId: task.id });
  };

  const handleAddStepToWorkflow = () => {
    if (!currentStep.name || !currentStep.action) return;

    const step = {
      ...currentStep,
      parameters: currentStep.parameters ? JSON.parse(currentStep.parameters) : {}
    };

    setWorkflowForm(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setCurrentStep({
      name: '',
      action: 'autonomous-task',
      parameters: '',
      critical: true
    });
  };

  const handleRemoveStep = (index) => {
    setWorkflowForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleCreateWorkflow = (e) => {
    e.preventDefault();
    if (!socket || workflowForm.steps.length === 0) return;

    socket.emit('workflows:create', workflowForm);
  };

  const handleExecuteWorkflow = (workflowId) => {
    if (!socket) return;
    socket.emit('workflows:execute', { workflowId });
  };

  const handleCreateFromTemplate = (templateId) => {
    if (!socket) return;
    socket.emit('workflows:create-from-template', { templateName: templateId });
  };

  const handleDeleteWorkflow = (workflowId) => {
    if (!socket || !confirm('¿Eliminar este workflow?')) return;
    socket.emit('workflows:delete', { workflowId });
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'cron': return '⏰';
      case 'once': return '🕐';
      case 'interval': return '🔄';
      default: return '📋';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'autonomous-task': return '🤖';
      case 'command': return '💻';
      case 'workflow': return '🔄';
      default: return '⚙️';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">⏰ Programador de Tareas</h2>
          <p className="text-gray-400 text-sm mt-1">
            Automatiza tareas y workflows de forma inteligente
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'tasks'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📋 Tareas
          </button>
          <button
            onClick={() => setActiveView('workflows')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'workflows'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔄 Workflows
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeView === 'templates'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📚 Templates
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {taskStats && (
          <>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Tareas Totales</p>
              <p className="text-2xl font-bold text-white">{taskStats.totalTasks}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Tareas Activas</p>
              <p className="text-2xl font-bold text-green-400">{taskStats.enabledTasks}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Ejecuciones Exitosas</p>
              <p className="text-2xl font-bold text-cyan-400">{taskStats.successfulExecutions || 0}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatDuration(taskStats.avgExecutionTime)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tasks View */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          {/* Create Task Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 transition-all font-semibold"
            >
              {showTaskForm ? '✕ Cancelar' : '➕ Nueva Tarea'}
            </button>
          </div>

          {/* Create Task Form */}
          {showTaskForm && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">➕ Crear Nueva Tarea</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Mi tarea programada"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Descripción de la tarea"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="cron">Cron (programada)</option>
                      <option value="interval">Intervalo</option>
                      <option value="once">Una vez</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      {taskForm.type === 'cron' && 'Expresión Cron'}
                      {taskForm.type === 'interval' && 'Intervalo (ms)'}
                      {taskForm.type === 'once' && 'Timestamp'}
                    </label>
                    <input
                      type="text"
                      value={taskForm.schedule}
                      onChange={(e) => setTaskForm({ ...taskForm, schedule: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder={
                        taskForm.type === 'cron' ? '0 9 * * *' :
                        taskForm.type === 'interval' ? '60000' :
                        Date.now().toString()
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Acción</label>
                  <select
                    value={taskForm.action}
                    onChange={(e) => setTaskForm({ ...taskForm, action: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="autonomous-task">🤖 Tarea Autónoma</option>
                    <option value="workflow">🔄 Workflow</option>
                    <option value="command">💻 Comando</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Parámetros (JSON)
                  </label>
                  <textarea
                    value={taskForm.parameters}
                    onChange={(e) => setTaskForm({ ...taskForm, parameters: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                    rows={3}
                    placeholder='{"task": "Generar reporte diario"}'
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.notifyOnSuccess}
                      onChange={(e) => setTaskForm({ ...taskForm, notifyOnSuccess: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Notificar en éxito</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.notifyOnError}
                      onChange={(e) => setTaskForm({ ...taskForm, notifyOnError: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Notificar en error</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => { setShowTaskForm(false); resetTaskForm(); }}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 transition-all font-semibold"
                  >
                    ✓ Crear Tarea
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            {tasks.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <p className="text-6xl mb-4">⏰</p>
                <p className="text-xl text-white mb-2">No hay tareas programadas</p>
                <p className="text-sm text-gray-400">Crea tu primera tarea automatizada</p>
              </div>
            )}

            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getTaskTypeIcon(task.type)}</span>
                      <h3 className="text-lg font-bold text-white">{task.name}</h3>
                      <span className="text-2xl">{getActionIcon(task.action)}</span>
                      {task.enabled ? (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
                          Pausada
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>📅 Schedule: {task.schedule}</span>
                      <span>⏱️ Última: {formatTime(task.lastRun)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExecuteTask(task.id)}
                      className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all"
                      title="Ejecutar ahora"
                    >
                      ▶️
                    </button>

                    <button
                      onClick={() => handleViewTaskHistory(task)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      title="Ver historial"
                    >
                      📊
                    </button>

                    <button
                      onClick={() => handleToggleTask(task.id, !task.enabled)}
                      className={`p-2 rounded-lg transition-all ${
                        task.enabled
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                      title={task.enabled ? 'Pausar' : 'Reanudar'}
                    >
                      {task.enabled ? '⏸️' : '▶️'}
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflows View */}
      {activeView === 'workflows' && (
        <div className="space-y-4">
          {/* Create Workflow Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowWorkflowForm(!showWorkflowForm)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
            >
              {showWorkflowForm ? '✕ Cancelar' : '➕ Nuevo Workflow'}
            </button>
          </div>

          {/* Create Workflow Form */}
          {showWorkflowForm && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">➕ Crear Nuevo Workflow</h3>
              <form onSubmit={handleCreateWorkflow} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Mi workflow"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={workflowForm.description}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descripción del workflow"
                  />
                </div>

                {/* Steps */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Pasos ({workflowForm.steps.length})
                  </label>

                  {workflowForm.steps.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {workflowForm.steps.map((step, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{index + 1}. {step.name}</p>
                            <p className="text-xs text-gray-400">{getActionIcon(step.action)} {step.action}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Step Form */}
                  <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-gray-300 font-semibold">Agregar Paso</p>

                    <input
                      type="text"
                      value={currentStep.name}
                      onChange={(e) => setCurrentStep({ ...currentStep, name: e.target.value })}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                      placeholder="Nombre del paso"
                    />

                    <select
                      value={currentStep.action}
                      onChange={(e) => setCurrentStep({ ...currentStep, action: e.target.value })}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      <option value="autonomous-task">🤖 Tarea Autónoma</option>
                      <option value="reindex-code">🔍 Reindexar Código</option>
                      <option value="generate-project-docs">📚 Generar Docs</option>
                    </select>

                    <textarea
                      value={currentStep.parameters}
                      onChange={(e) => setCurrentStep({ ...currentStep, parameters: e.target.value })}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-mono"
                      rows={2}
                      placeholder='{"task": "..."}'
                    />

                    <button
                      type="button"
                      onClick={handleAddStepToWorkflow}
                      className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-semibold"
                    >
                      ➕ Agregar Paso
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowWorkflowForm(false); resetWorkflowForm(); }}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={workflowForm.steps.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Crear Workflow
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Workflows List */}
          <div className="space-y-3">
            {workflows.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <p className="text-6xl mb-4">🔄</p>
                <p className="text-xl text-white mb-2">No hay workflows</p>
                <p className="text-sm text-gray-400">Crea tu primer workflow automatizado</p>
              </div>
            )}

            {workflows.map(workflow => (
              <div key={workflow.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">🔄 {workflow.name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-400 mb-3">{workflow.description}</p>
                    )}
                    <p className="text-xs text-gray-500">{workflow.steps.length} pasos</p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-semibold"
                    >
                      ▶️ Ejecutar
                    </button>

                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates View */}
      {activeView === 'templates' && (
        <div className="space-y-3">
          {templates.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-gray-400">Cargando templates...</p>
            </div>
          )}

          {templates.map(template => (
            <div key={template.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">📚 {template.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                  <div className="space-y-1">
                    {template.steps.map((step, index) => (
                      <p key={index} className="text-xs text-gray-500">
                        {index + 1}. {step.name}
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-semibold"
                >
                  ✨ Usar Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskScheduler;
