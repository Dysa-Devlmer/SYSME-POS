// web-interface/frontend/src/components/TerminalPanel.jsx
// Terminal integrado estilo hacker

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function TerminalPanel({ socket, connected }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Mensaje de bienvenida
    addOutput('J.A.R.V.I.S. MARK VII - Terminal Web v1.0', 'system');
    addOutput('Escriba "help" para ver comandos disponibles', 'system');
    addOutput('', 'system');
  }, []);

  useEffect(() => {
    // Auto-scroll al final
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const addOutput = (text, type = 'output') => {
    setHistory(prev => [...prev, { text, type, timestamp: Date.now() }]);
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();

    // Agregar al historial de comandos
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Mostrar comando
    addOutput(`jarvis@mark-vii:~$ ${cmd}`, 'command');

    // Resetear input
    setInput('');

    // Comandos locales (sin backend)
    if (cmd === 'help') {
      addOutput('Comandos disponibles:', 'success');
      addOutput('  help           - Muestra esta ayuda', 'output');
      addOutput('  clear          - Limpia la terminal', 'output');
      addOutput('  status         - Estado del sistema', 'output');
      addOutput('  tasks          - Lista todas las tareas', 'output');
      addOutput('  memories       - Lista memorias guardadas', 'output');
      addOutput('  chat <mensaje> - Enviar mensaje a JARVIS', 'output');
      addOutput('  search <query> - Buscar en la web', 'output');
      addOutput('  date           - Fecha y hora actual', 'output');
      addOutput('', 'output');
      return;
    }

    if (cmd === 'clear') {
      setHistory([]);
      addOutput('Terminal limpiada', 'system');
      return;
    }

    if (cmd === 'date') {
      addOutput(new Date().toString(), 'success');
      return;
    }

    if (cmd === 'status') {
      try {
        const res = await axios.get('/api/dashboard');
        addOutput('=== ESTADO DEL SISTEMA ===', 'success');
        addOutput(`Memorias: ${res.data.memory?.total || 0}`, 'output');
        addOutput(`Tareas Totales: ${res.data.tasks?.total || 0}`, 'output');
        addOutput(`Tareas Pendientes: ${res.data.tasks?.pending || 0}`, 'output');
        addOutput(`Tareas Completadas: ${res.data.tasks?.completed || 0}`, 'output');
        addOutput(`Uptime: ${res.data.system?.uptime || 0}s`, 'output');
        addOutput(`Version: ${res.data.system?.version || 'MARK VII'}`, 'output');
        addOutput('', 'output');
      } catch (error) {
        addOutput(`Error: ${error.message}`, 'error');
      }
      return;
    }

    if (cmd === 'tasks') {
      try {
        const res = await axios.get('/api/tasks');
        if (res.data.length === 0) {
          addOutput('No hay tareas registradas', 'warning');
        } else {
          addOutput(`=== TAREAS (${res.data.length}) ===`, 'success');
          res.data.forEach((task, i) => {
            const status = task.completed ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
            addOutput(`${i + 1}. ${status} ${task.title} [${task.priority}]`, 'output');
          });
        }
        addOutput('', 'output');
      } catch (error) {
        addOutput(`Error: ${error.message}`, 'error');
      }
      return;
    }

    if (cmd === 'memories') {
      try {
        const res = await axios.get('/api/memories');
        if (res.data.length === 0) {
          addOutput('No hay memorias guardadas', 'warning');
        } else {
          addOutput(`=== MEMORIAS (${res.data.length}) ===`, 'success');
          res.data.slice(0, 10).forEach((mem, i) => {
            addOutput(`${i + 1}. ${mem.content?.substring(0, 60)}...`, 'output');
          });
        }
        addOutput('', 'output');
      } catch (error) {
        addOutput(`Error: ${error.message}`, 'error');
      }
      return;
    }

    if (cmd.startsWith('chat ')) {
      const message = cmd.substring(5);
      try {
        addOutput('Enviando mensaje a JARVIS...', 'info');
        const res = await axios.post('/api/chat', { message });
        addOutput('', 'output');
        addOutput('JARVIS:', 'success');
        addOutput(res.data.response, 'output');
        addOutput('', 'output');
      } catch (error) {
        addOutput(`Error: ${error.message}`, 'error');
      }
      return;
    }

    if (cmd.startsWith('search ')) {
      const query = cmd.substring(7);
      try {
        addOutput(`Buscando en la web: "${query}"...`, 'info');
        const res = await axios.post('/api/search/web', { query });
        addOutput('', 'output');
        addOutput('=== RESULTADOS ===', 'success');
        if (res.data.results && res.data.results.length > 0) {
          res.data.results.slice(0, 5).forEach((result, i) => {
            addOutput(`${i + 1}. ${result.title}`, 'output');
            addOutput(`   ${result.snippet?.substring(0, 100)}...`, 'output');
          });
        } else {
          addOutput('No se encontraron resultados', 'warning');
        }
        addOutput('', 'output');
      } catch (error) {
        addOutput(`Error: ${error.message}`, 'error');
      }
      return;
    }

    // Comando desconocido
    addOutput(`Comando no reconocido: "${cmd}"`, 'error');
    addOutput('Escriba "help" para ver comandos disponibles', 'info');
  };

  const handleKeyDown = (e) => {
    // Historial de comandos con flechas arriba/abajo
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const getOutputColor = (type) => {
    switch (type) {
      case 'command': return 'text-green-400';
      case 'success': return 'text-blue-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-cyan-400';
      case 'system': return 'text-purple-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Terminal JARVIS
        </h2>
        <div className={`flex items-center gap-2 ${connected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="bg-black rounded-lg shadow-2xl overflow-hidden border border-green-500 border-opacity-30">
        {/* Header de terminal */}
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="ml-4 text-xs text-gray-400 font-mono">jarvis@mark-vii:~$</span>
          </div>
          <button
            onClick={() => setHistory([])}
            className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300 transition-colors"
          >
            CLEAR
          </button>
        </div>

        {/* Área de output */}
        <div
          ref={terminalRef}
          className="p-4 h-96 overflow-y-auto font-mono text-sm bg-black bg-opacity-50"
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((item, index) => (
            <div key={item.timestamp + index} className={`${getOutputColor(item.type)} whitespace-pre-wrap`}>
              {item.text}
            </div>
          ))}

          {/* Input line */}
          <form onSubmit={handleCommand} className="flex items-center gap-2 mt-2">
            <span className="text-green-400">jarvis@mark-vii:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-100 caret-green-400"
              autoFocus
              placeholder="Escriba un comando..."
            />
          </form>
        </div>
      </div>

      {/* Quick commands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {['help', 'status', 'tasks', 'clear'].map((cmd) => (
          <button
            key={cmd}
            onClick={() => {
              setInput(cmd);
              inputRef.current?.focus();
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-mono transition-colors border border-gray-700"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
