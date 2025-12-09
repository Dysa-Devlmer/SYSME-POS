// web-interface/frontend/src/components/TasksPanel.jsx
// Panel de gestión de tareas con CRUD completo

import React, { useState } from 'react';
import axios from 'axios';

export default function TasksPanel({ tasks, socket }) {
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [filter, setFilter] = useState('all');

  const addTask = async () => {
    if (!newTaskDescription.trim()) return;

    try {
      await axios.post('/api/tasks', {
        description: newTaskDescription,
        priority: newTaskPriority
      });

      setNewTaskDescription('');
      setNewTaskPriority('medium');

      if (socket) {
        socket.emit('request:refresh');
      }
    } catch (error) {
      console.error('Error creando tarea:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, { status: newStatus });

      if (socket) {
        socket.emit('request:refresh');
      }
    } catch (error) {
      console.error('Error actualizando tarea:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);

      if (socket) {
        socket.emit('request:refresh');
      }
    } catch (error) {
      console.error('Error eliminando tarea:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const taskStats = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">✅ Gestión de Tareas</h2>
        <div className="text-sm text-gray-400">
          Total: {tasks.length} tareas
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-800 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold">{taskStats.all}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-yellow-900 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold">{taskStats.pending}</div>
          <div className="text-xs text-gray-400">Pendientes</div>
        </div>
        <div className="bg-blue-900 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold">{taskStats['in-progress']}</div>
          <div className="text-xs text-gray-400">En Progreso</div>
        </div>
        <div className="bg-green-900 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold">{taskStats.completed}</div>
          <div className="text-xs text-gray-400">Completadas</div>
        </div>
      </div>

      {/* New Task Form */}
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">➕ Nueva Tarea</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Descripción de la tarea..."
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addTask();
              }
            }}
            className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            className="p-3 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
          <button
            onClick={addTask}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'in-progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {status === 'all' ? 'Todas' :
             status === 'pending' ? 'Pendientes' :
             status === 'in-progress' ? 'En Progreso' :
             'Completadas'}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-400">No hay tareas en esta categoría</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-2">{task.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' ? 'bg-red-600' :
                      task.priority === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {task.priority === 'high' ? 'Alta' :
                       task.priority === 'medium' ? 'Media' :
                       'Baja'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'completed' ? 'bg-green-700' :
                      task.status === 'in-progress' ? 'bg-blue-700' :
                      'bg-gray-700'
                    }`}>
                      {task.status === 'completed' ? 'Completada' :
                       task.status === 'in-progress' ? 'En Progreso' :
                       'Pendiente'}
                    </span>
                    {task.created && (
                      <span className="text-xs text-gray-500">
                        📅 {new Date(task.created).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {task.status !== 'in-progress' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'in-progress')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                      title="Marcar en progreso"
                    >
                      ▶️
                    </button>
                  )}
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                      title="Marcar completada"
                    >
                      ✅
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
