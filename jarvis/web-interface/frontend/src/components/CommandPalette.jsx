// web-interface/frontend/src/components/CommandPalette.jsx
// Centro de Comandos Rápidos estilo VSCode/Spotlight

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function CommandPalette({ isOpen, onClose, onNavigate, socket }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Comandos predefinidos
  const commands = [
    { id: 'nav-dashboard', type: 'navigation', label: 'Ir a Dashboard', icon: '📊', action: () => onNavigate('dashboard') },
    { id: 'nav-chat', type: 'navigation', label: 'Ir a Chat', icon: '💬', action: () => onNavigate('chat') },
    { id: 'nav-monitor', type: 'navigation', label: 'Ir a Monitor', icon: '⚡', action: () => onNavigate('monitor') },
    { id: 'nav-terminal', type: 'navigation', label: 'Ir a Terminal', icon: '🖥️', action: () => onNavigate('terminal') },
    { id: 'nav-tasks', type: 'navigation', label: 'Ir a Tareas', icon: '✅', action: () => onNavigate('tasks') },
    { id: 'nav-memories', type: 'navigation', label: 'Ir a Memorias', icon: '🧠', action: () => onNavigate('memories') },
    { id: 'nav-projects', type: 'navigation', label: 'Ir a Proyectos', icon: '📁', action: () => onNavigate('projects') },
    { id: 'create-task', type: 'action', label: 'Crear nueva tarea', icon: '➕', action: () => createTask() },
    { id: 'system-status', type: 'query', label: 'Ver estado del sistema', icon: '🔍', action: () => showSystemStatus() },
    { id: 'refresh-data', type: 'action', label: 'Refrescar datos', icon: '🔄', action: () => refreshData() },
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const searchLower = search.toLowerCase();

    // Si no hay búsqueda, mostrar comandos principales
    if (!searchLower) {
      setResults(commands.slice(0, 7));
      return;
    }

    // Buscar en comandos
    const matchingCommands = commands.filter(cmd =>
      cmd.label.toLowerCase().includes(searchLower)
    );

    // Buscar en tareas (async)
    const searchTasks = async () => {
      try {
        const res = await axios.get('/api/tasks');
        const matchingTasks = res.data
          .filter(task => task.title?.toLowerCase().includes(searchLower))
          .slice(0, 5)
          .map(task => ({
            id: `task-${task.id}`,
            type: 'task',
            label: task.title,
            icon: task.completed ? '✅' : '⏳',
            description: `Tarea: ${task.priority}`,
            action: () => onNavigate('tasks')
          }));

        setResults([...matchingCommands, ...matchingTasks].slice(0, 10));
      } catch (error) {
        setResults(matchingCommands);
      }
    };

    searchTasks();
  }, [search, isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(results[selectedIndex]);
    }
  };

  const executeCommand = (command) => {
    if (command && command.action) {
      command.action();
      onClose();
    }
  };

  const createTask = () => {
    if (socket) {
      const title = search || 'Nueva tarea';
      socket.emit('task:create', {
        title,
        description: '',
        priority: 'medium',
        status: 'pending'
      });
    }
  };

  const showSystemStatus = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      alert(`Sistema JARVIS\n\nTareas: ${res.data.tasks?.total || 0}\nMemorias: ${res.data.memory?.total || 0}\nUptime: ${res.data.system?.uptime || 0}s`);
    } catch (error) {
      console.error(error);
    }
  };

  const refreshData = () => {
    if (socket) {
      socket.emit('request:refresh');
    }
    window.location.reload();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'navigation': return 'text-blue-400';
      case 'action': return 'text-green-400';
      case 'query': return 'text-purple-400';
      case 'task': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'navigation': return 'Navegar';
      case 'action': return 'Acción';
      case 'query': return 'Consulta';
      case 'task': return 'Tarea';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
      {/* Command Palette */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl border border-blue-500 border-opacity-30 overflow-hidden animate-slide-down">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔍</div>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar comandos, tareas, acciones..."
              className="flex-1 bg-transparent outline-none text-white text-lg placeholder-gray-500"
            />
            <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">ESC para cerrar</div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <div>No se encontraron resultados</div>
              <div className="text-xs mt-2">Intenta buscar comandos, tareas o acciones</div>
            </div>
          ) : (
            <div className="p-2">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => executeCommand(result)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    index === selectedIndex
                      ? 'bg-blue-600 bg-opacity-20 border border-blue-500'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="text-2xl flex-shrink-0">{result.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${getTypeColor(result.type)}`}>
                      {result.label}
                    </div>
                    {result.description && (
                      <div className="text-xs text-gray-500 truncate">{result.description}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                      {getTypeBadge(result.type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <div className="flex gap-4">
            <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">↑↓</kbd> Navegar</span>
            <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Enter</kbd> Seleccionar</span>
          </div>
          <div>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-down {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
        kbd {
          font-family: monospace;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
