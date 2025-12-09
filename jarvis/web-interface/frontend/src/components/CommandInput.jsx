// web-interface/frontend/src/components/CommandInput.jsx
// Input de comandos para ejecutar acciones de JARVIS

import React, { useState } from 'react';
import axios from 'axios';

export default function CommandInput({ socket, connected }) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      // Add to history
      setHistory(prev => [command, ...prev.slice(0, 9)]);

      // Execute via API
      const response = await axios.post('/api/command', { command });

      console.log('Comando ejecutado:', response.data);

      // Also emit via socket if connected
      if (socket && connected) {
        socket.emit('command:execute', { command });
      }

      setCommand('');
    } catch (error) {
      console.error('Error ejecutando comando:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <div className="relative">
      {/* Command History Dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-400 mb-2">Historial de comandos:</div>
            {history.map((cmd, index) => (
              <button
                key={index}
                onClick={() => {
                  setCommand(cmd);
                  setShowHistory(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-600 rounded text-sm mb-1"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 items-center">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-3 py-3 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Historial"
        >
          📜
        </button>

        <div className="flex-1 flex gap-3 bg-gray-700 rounded-lg p-1">
          <input
            type="text"
            placeholder={connected ? "Comando J.A.R.V.I.S..." : "Desconectado - Esperando conexión..."}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!connected}
            className="flex-1 p-2 bg-transparent text-white focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={executeCommand}
            disabled={!connected || !command.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
          >
            Enviar
          </button>
        </div>

        <div className={`px-3 py-3 rounded ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
          {connected ? '🟢' : '🔴'}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="mt-2 flex gap-2 flex-wrap">
        {['ayuda', 'estado', 'memoria', 'tareas'].map(quickCmd => (
          <button
            key={quickCmd}
            onClick={() => setCommand(quickCmd)}
            disabled={!connected}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-xs transition-colors"
          >
            {quickCmd}
          </button>
        ))}
      </div>
    </div>
  );
}
