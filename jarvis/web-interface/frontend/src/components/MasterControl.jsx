/**
 * JARVIS MARK VII - MASTER CONTROL PANEL
 *
 * "All systems under my control, sir."
 * - JARVIS
 *
 * Panel de control maestro que integra todos los sistemas de JARVIS
 */

import { useState, useEffect } from 'react';
import { socket } from '../socket';

const MasterControl = () => {
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'unknown', uptime: 0, port: 7777 },
    frontend: { status: 'running', uptime: 0, port: 5173 },
    aiSystems: { active: 0, total: 4 },
    database: { status: 'unknown', connections: 0 },
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: { usage: 0 }
  });

  const [services, setServices] = useState([
    { id: 'ai-brain', name: 'AI Brain Systems', status: 'running', critical: true },
    { id: 'voice-control', name: 'Voice Control', status: 'running', critical: false },
    { id: 'autonomous', name: 'Autonomous Agent', status: 'running', critical: true },
    { id: 'proactive', name: 'Proactive Monitor', status: 'running', critical: true },
    { id: 'learning', name: 'Learning System', status: 'running', critical: false }
  ]);

  const [logs, setLogs] = useState([]);
  const [commandInput, setCommandInput] = useState('');

  useEffect(() => {
    // Request system status
    socket.emit('system:status:request');

    // Listen for status updates
    socket.on('system:status', (data) => {
      setSystemStatus(prev => ({ ...prev, ...data }));
    });

    // Listen for service updates
    socket.on('service:update', (data) => {
      setServices(prev => prev.map(s =>
        s.id === data.id ? { ...s, status: data.status } : s
      ));
    });

    // Listen for logs
    socket.on('system:log', (log) => {
      setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100
    });

    // Poll status every 5 seconds
    const interval = setInterval(() => {
      socket.emit('system:status:request');
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.off('system:status');
      socket.off('service:update');
      socket.off('system:log');
    };
  }, []);

  const handleServiceToggle = (serviceId) => {
    socket.emit('service:toggle', { serviceId });
    addLog(`Service toggle requested: ${serviceId}`, 'info');
  };

  const handleSystemRestart = () => {
    if (confirm('Are you sure you want to restart all systems?')) {
      socket.emit('system:restart');
      addLog('System restart initiated', 'warning');
    }
  };

  const handleCommand = (e) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    socket.emit('system:command', { command: commandInput });
    addLog(`Command executed: ${commandInput}`, 'info');
    setCommandInput('');
  };

  const addLog = (message, level = 'info') => {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      level
    };
    setLogs(prev => [log, ...prev].slice(0, 100));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'stopped': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              JARVIS MASTER CONTROL
            </h1>
            <p className="text-gray-300 text-lg">
              "All systems under my control, sir."
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSystemRestart}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-semibold transition-all shadow-lg"
            >
              RESTART ALL
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* System Status - Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Core Systems Status */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">CORE SYSTEMS</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Backend */}
              <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Backend Server</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusBg('running')} animate-pulse`}></div>
                </div>
                <div className="text-2xl font-bold text-cyan-400">Port {systemStatus.backend.port}</div>
                <div className="text-xs text-gray-400 mt-1">Uptime: {Math.floor(systemStatus.backend.uptime / 1000)}s</div>
              </div>

              {/* Frontend */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Frontend Server</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusBg('running')} animate-pulse`}></div>
                </div>
                <div className="text-2xl font-bold text-purple-400">Port {systemStatus.frontend.port}</div>
                <div className="text-xs text-gray-400 mt-1">Status: Active</div>
              </div>

              {/* AI Systems */}
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">AI Systems</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusBg('running')} animate-pulse`}></div>
                </div>
                <div className="text-2xl font-bold text-green-400">{systemStatus.aiSystems.active}/{systemStatus.aiSystems.total}</div>
                <div className="text-xs text-gray-400 mt-1">All Online</div>
              </div>

              {/* Database */}
              <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Database</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusBg('running')} animate-pulse`}></div>
                </div>
                <div className="text-2xl font-bold text-yellow-400">SQLite</div>
                <div className="text-xs text-gray-400 mt-1">Connections: Active</div>
              </div>
            </div>
          </div>

          {/* Services Control */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">SERVICES</h2>

            <div className="space-y-3">
              {services.map(service => (
                <div
                  key={service.id}
                  className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between border border-gray-700 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusBg(service.status)}`}></div>
                    <div>
                      <div className="font-semibold">{service.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{service.status}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {service.critical && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        CRITICAL
                      </span>
                    )}
                    <button
                      onClick={() => handleServiceToggle(service.id)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                        service.status === 'running'
                          ? 'bg-red-600/80 hover:bg-red-700 text-white'
                          : 'bg-green-600/80 hover:bg-green-700 text-white'
                      }`}
                    >
                      {service.status === 'running' ? 'STOP' : 'START'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Command Terminal */}
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-green-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-green-400">COMMAND TERMINAL</h2>

            <form onSubmit={handleCommand} className="flex gap-2 mb-4">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Enter system command..."
                className="flex-1 bg-black/50 border border-green-500/30 rounded px-4 py-2 text-green-400 font-mono focus:outline-none focus:border-green-500"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-all"
              >
                EXECUTE
              </button>
            </form>

            <div className="bg-black/70 rounded p-3 h-40 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. System ready.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`mb-1 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-yellow-400' :
                    log.level === 'success' ? 'text-green-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - System Resources */}
        <div className="space-y-6">

          {/* Resource Monitor */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">RESOURCES</h2>

            {/* CPU */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span className="text-cyan-400">{systemStatus.cpu.usage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${systemStatus.cpu.usage}%` }}
                />
              </div>
            </div>

            {/* Memory */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span className="text-purple-400">{systemStatus.memory.percentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                  style={{ width: `${systemStatus.memory.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {Math.round(systemStatus.memory.used / 1024 / 1024)} MB / {Math.round(systemStatus.memory.total / 1024 / 1024)} MB
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">QUICK ACTIONS</h2>

            <div className="space-y-2">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold transition-all">
                Test AI Systems
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all">
                Run Diagnostics
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold transition-all">
                Save All States
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg font-semibold transition-all">
                Clear Logs
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-green-500/30 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-green-400">SYSTEM INFO</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Version</span>
                <span className="text-green-400 font-semibold">MARK VII</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Build</span>
                <span className="text-green-400 font-mono">v7.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Node.js</span>
                <span className="text-green-400 font-mono">v22.14.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span className="text-green-400">Windows</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-gray-300">All Systems Operational</span>
            </div>
            <div className="text-gray-500">|</div>
            <div className="text-gray-400">
              Last Update: {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="text-gray-400 font-mono">
            JARVIS MARK VII - Powered by Stark Industries
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterControl;
