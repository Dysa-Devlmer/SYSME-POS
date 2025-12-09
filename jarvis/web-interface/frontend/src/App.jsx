// web-interface/frontend/src/App.jsx
// J.A.R.V.I.S. MARK VII - Panel Web Frontend

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import MemoriesPanel from './components/MemoriesPanel';
import TasksPanel from './components/TasksPanel';
import ProjectsPanel from './components/ProjectsPanel';
import ChatPanel from './components/ChatPanel';
import CommandInput from './components/CommandInput';
import SystemMonitor from './components/SystemMonitor';
import TerminalPanel from './components/TerminalPanel';
import NotificationToast from './components/NotificationToast';
import CommandPalette from './components/CommandPalette';
import ProactiveAlerts from './components/ProactiveAlerts';
import LearningAnalytics from './components/LearningAnalytics';
import AutonomousDashboard from './components/AutonomousDashboard';
import AIBrain from './components/AIBrain';
import MasterControl from './components/MasterControl';

function App() {
  const [socket, setSocket] = useState(null);
  const [data, setData] = useState({
    memories: [],
    tasks: [],
    projects: [],
    dashboard: {}
  });
  const [activePanel, setActivePanel] = useState('chat');
  const [connected, setConnected] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Connect socket
  useEffect(() => {
    const newSocket = io('http://localhost:7777');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Conectado al servidor');
      setConnected(true);
      newSocket.emit('request:refresh');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor');
      setConnected(false);
    });

    newSocket.on('data:updated', (updatedData) => {
      setData(prev => ({
        ...prev,
        memories: updatedData.memories,
        tasks: updatedData.tasks,
        projects: updatedData.projects || prev.projects
      }));
    });

    newSocket.on('task:created', (newTask) => {
      setData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
    });

    newSocket.on('task:updated', (updatedTask) => {
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      }));
    });

    newSocket.on('task:deleted', (taskId) => {
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
    });

    return () => newSocket.close();
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboard, memories, tasks, projects] = await Promise.all([
          axios.get('/api/dashboard'),
          axios.get('/api/memories'),
          axios.get('/api/tasks'),
          axios.get('/api/projects')
        ]);

        setData({
          memories: memories.data,
          tasks: tasks.data,
          projects: projects.data,
          dashboard: dashboard.data
        });
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    if (socket) {
      socket.emit('request:refresh');
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+K or Cmd+K to open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🤖</div>
            <div>
              <h1 className="text-2xl font-bold">J.A.R.V.I.S. MARK VII</h1>
              <p className="text-xs text-gray-400">Panel de Control Web</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-2"
              title="Abrir paleta de comandos (Ctrl+K)"
            >
              <span>⌘</span>
              <span className="hidden md:inline">Comandos</span>
              <kbd className="bg-purple-800 px-1.5 py-0.5 rounded text-xs">Ctrl+K</kbd>
            </button>
            <button
              onClick={refreshData}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              🔄 Actualizar
            </button>
            <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 shadow">
        <div className="container mx-auto p-2 flex gap-2">
          {[
            { id: 'master', label: '⚙️ Master Control', icon: '⚙️' },
            { id: 'chat', label: '💬 Chat', icon: '💬' },
            { id: 'aibrain', label: '🧠 AI Brain', icon: '🧠' },
            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
            { id: 'autonomous', label: '🤖 Autonomous', icon: '🤖' },
            { id: 'proactive', label: '⚡ Proactive', icon: '⚡' },
            { id: 'learning', label: '📚 Learning', icon: '📚' },
            { id: 'monitor', label: '📡 Monitor', icon: '📡' },
            { id: 'terminal', label: '🖥️ Terminal', icon: '🖥️' },
            { id: 'memories', label: '📝 Memorias', icon: '📝' },
            { id: 'tasks', label: '✅ Tareas', icon: '✅' },
            { id: 'projects', label: '📁 Proyectos', icon: '📁' }
          ].map(panel => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              className={`px-4 py-2 rounded transition-colors ${
                activePanel === panel.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-6 pb-32">
        {activePanel === 'master' && (
          <MasterControl />
        )}
        {activePanel === 'chat' && (
          <ChatPanel socket={socket} connected={connected} />
        )}
        {activePanel === 'aibrain' && (
          <AIBrain />
        )}
        {activePanel === 'dashboard' && (
          <Dashboard data={data.dashboard} />
        )}
        {activePanel === 'monitor' && (
          <SystemMonitor socket={socket} connected={connected} />
        )}
        {activePanel === 'terminal' && (
          <TerminalPanel socket={socket} connected={connected} />
        )}
        {activePanel === 'memories' && (
          <MemoriesPanel memories={data.memories} />
        )}
        {activePanel === 'tasks' && (
          <TasksPanel tasks={data.tasks} socket={socket} />
        )}
        {activePanel === 'projects' && (
          <ProjectsPanel projects={data.projects} />
        )}
        {activePanel === 'proactive' && (
          <ProactiveAlerts socket={socket} />
        )}
        {activePanel === 'autonomous' && (
          <AutonomousDashboard socket={socket} />
        )}
        {activePanel === 'learning' && (
          <LearningAnalytics socket={socket} />
        )}
      </main>

      {/* Command Input - Fixed Bottom */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 shadow-2xl">
        <div className="container mx-auto">
          <CommandInput socket={socket} connected={connected} />
        </div>
      </footer>

      {/* Notification Toast System */}
      <NotificationToast socket={socket} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(panel) => {
          setActivePanel(panel);
          setCommandPaletteOpen(false);
        }}
        socket={socket}
      />
    </div>
  );
}

export default App;
