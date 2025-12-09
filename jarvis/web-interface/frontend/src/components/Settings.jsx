// web-interface/frontend/src/components/Settings.jsx
// Panel de Configuración de JARVIS

import React, { useState, useEffect } from 'react';

const Settings = ({ socket }) => {
  const [settings, setSettings] = useState(null);
  const [activeSection, setActiveSection] = useState('system');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const sections = [
    { id: 'system', name: 'Sistema', icon: '⚙️' },
    { id: 'agent', name: 'Agente', icon: '🤖' },
    { id: 'scheduler', name: 'Tareas', icon: '⏰' },
    { id: 'logging', name: 'Logging', icon: '📝' },
    { id: 'monitoring', name: 'Monitoreo', icon: '📊' },
    { id: 'notifications', name: 'Notificaciones', icon: '🔔' },
    { id: 'search', name: 'Búsqueda', icon: '🔍' },
    { id: 'voice', name: 'Voz', icon: '🎤' },
    { id: 'ui', name: 'Interfaz', icon: '🎨' },
    { id: 'server', name: 'Servidor', icon: '🌐' }
  ];

  useEffect(() => {
    if (!socket) return;

    socket.on('settings:all', (data) => {
      setSettings(data);
    });

    socket.on('settings:saved', () => {
      setSaving(false);
      setHasChanges(false);
    });

    socket.emit('settings:get-all');

    return () => {
      socket.off('settings:all');
      socket.off('settings:saved');
    };
  }, [socket]);

  const handleChange = (path, value) => {
    if (!settings) return;

    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(settings));
    let target = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!socket || !hasChanges) return;

    setSaving(true);
    socket.emit('settings:save-all', settings);
  };

  const handleReset = (section) => {
    if (!socket || !confirm(`¿Reiniciar configuración de ${sections.find(s => s.id === section)?.name}?`)) return;

    socket.emit('settings:reset', section);
    socket.emit('settings:get-all');
  };

  const handleExport = () => {
    if (!socket) return;
    socket.emit('settings:export');
  };

  const handleBackup = () => {
    if (!socket) return;
    socket.emit('settings:backup');
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  const renderField = (sectionId, key, value, label, type = 'text', options = null) => {
    const path = `${sectionId}.${key}`;

    return (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">{label}</label>

        {type === 'boolean' && (
          <button
            onClick={() => handleChange(path, !value)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              value
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {value ? '✅ Habilitado' : '❌ Deshabilitado'}
          </button>
        )}

        {type === 'number' && (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(path, parseInt(e.target.value))}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        )}

        {type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(path, e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        )}

        {type === 'select' && options && (
          <select
            value={value}
            onChange={(e) => handleChange(path, e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {type === 'array' && (
          <div className="bg-gray-700 rounded-lg p-3">
            {Array.isArray(value) && value.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-300 mb-1">• {item}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (sectionId) => {
    const section = settings[sectionId];
    if (!section) return null;

    switch (sectionId) {
      case 'system':
        return (
          <div className="space-y-6">
            {renderField('system', 'projectName', section.projectName, 'Nombre del Proyecto')}
            {renderField('system', 'version', section.version, 'Versión')}
            {renderField('system', 'language', section.language, 'Idioma', 'select', ['es', 'en'])}
            {renderField('system', 'timezone', section.timezone, 'Zona Horaria')}
          </div>
        );

      case 'agent':
        return (
          <div className="space-y-6">
            {renderField('agent', 'maxConcurrentTasks', section.maxConcurrentTasks, 'Tareas Concurrentes', 'number')}
            {renderField('agent', 'defaultStrategy', section.defaultStrategy, 'Estrategia', 'select', ['balanced', 'speed', 'quality'])}
            {renderField('agent', 'maxRetries', section.maxRetries, 'Máx. Reintentos', 'number')}
            {renderField('agent', 'timeout', section.timeout, 'Timeout (ms)', 'number')}
          </div>
        );

      case 'scheduler':
        return (
          <div className="space-y-6">
            {renderField('scheduler', 'enabled', section.enabled, 'Habilitado', 'boolean')}
            {renderField('scheduler', 'maxTasks', section.maxTasks, 'Máx. Tareas', 'number')}
            {renderField('scheduler', 'defaultRetries', section.defaultRetries, 'Reintentos', 'number')}
          </div>
        );

      case 'logging':
        return (
          <div className="space-y-6">
            {renderField('logging', 'level', section.level, 'Nivel de Log', 'select', ['debug', 'info', 'warn', 'error'])}
            {renderField('logging', 'enableConsole', section.enableConsole, 'Console Log', 'boolean')}
            {renderField('logging', 'maxFileSize', section.maxFileSize, 'Tamaño Máx. Archivo')}
            {renderField('logging', 'maxFiles', section.maxFiles, 'Retención')}
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-6">
            {renderField('monitoring', 'enabled', section.enabled, 'Habilitado', 'boolean')}
            {renderField('monitoring', 'interval', section.interval, 'Intervalo (ms)', 'number')}
            {section.alerts && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-bold text-white mb-3">Umbrales de Alerta</h4>
                {renderField('monitoring.alerts', 'cpu', section.alerts.cpu, 'CPU (%)', 'number')}
                {renderField('monitoring.alerts', 'memory', section.alerts.memory, 'Memoria (%)', 'number')}
                {renderField('monitoring.alerts', 'disk', section.alerts.disk, 'Disco (%)', 'number')}
              </div>
            )}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {renderField('notifications', 'enabled', section.enabled, 'Habilitado', 'boolean')}
            {renderField('notifications', 'maxNotifications', section.maxNotifications, 'Máx. Notificaciones', 'number')}
            {renderField('notifications', 'retentionDays', section.retentionDays, 'Días de Retención', 'number')}
            {renderField('notifications', 'pushEnabled', section.pushEnabled, 'Push Notifications', 'boolean')}
          </div>
        );

      case 'search':
        return (
          <div className="space-y-6">
            {renderField('search', 'enabled', section.enabled, 'Habilitado', 'boolean')}
            {renderField('search', 'maxResults', section.maxResults, 'Máx. Resultados', 'number')}
            {renderField('search', 'excludePatterns', section.excludePatterns, 'Patrones Excluidos', 'array')}
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-6">
            {renderField('voice', 'enabled', section.enabled, 'Habilitado', 'boolean')}
            {renderField('voice', 'language', section.language, 'Idioma', 'select', ['es-ES', 'en-US'])}
            {renderField('voice', 'autoSpeak', section.autoSpeak, 'Auto Speak', 'boolean')}
            {renderField('voice', 'speechRate', section.speechRate, 'Velocidad de Voz', 'number')}
          </div>
        );

      case 'ui':
        return (
          <div className="space-y-6">
            {renderField('ui', 'theme', section.theme, 'Tema', 'select', ['dark', 'light'])}
            {renderField('ui', 'compactMode', section.compactMode, 'Modo Compacto', 'boolean')}
            {renderField('ui', 'animations', section.animations, 'Animaciones', 'boolean')}
            {renderField('ui', 'fontSize', section.fontSize, 'Tamaño de Fuente', 'select', ['small', 'medium', 'large'])}
          </div>
        );

      case 'server':
        return (
          <div className="space-y-6">
            {renderField('server', 'port', section.port, 'Puerto', 'number')}
            {renderField('server', 'host', section.host, 'Host')}
            {renderField('server', 'cors', section.cors, 'CORS', 'boolean')}
            {renderField('server', 'rateLimit', section.rateLimit, 'Rate Limit (req/min)', 'number')}
          </div>
        );

      default:
        return <p className="text-gray-400">Sección no implementada</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">⚙️ Configuración</h2>
          <p className="text-gray-400 text-sm mt-1">
            Personaliza JARVIS según tus necesidades
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleBackup}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            💾 Backup
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            ⬇️ Exportar
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeSection === section.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-xl">{section.icon}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="col-span-3">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {sections.find(s => s.id === activeSection)?.icon} {sections.find(s => s.id === activeSection)?.name}
              </h3>

              <button
                onClick={() => handleReset(activeSection)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm font-semibold"
              >
                🔄 Reiniciar
              </button>
            </div>

            {renderSection(activeSection)}
          </div>

          {/* Save button */}
          {hasChanges && (
            <div className="mt-4 bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4 flex items-center justify-between">
              <p className="text-yellow-400 font-semibold">
                ⚠️ Tienes cambios sin guardar
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 font-semibold disabled:opacity-50"
              >
                {saving ? '💾 Guardando...' : '✓ Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
