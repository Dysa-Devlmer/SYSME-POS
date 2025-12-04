// web-interface/frontend/src/components/BackupManager.jsx
// Sistema de Backup y Disaster Recovery

import React, { useState, useEffect } from 'react';

const BackupManager = ({ socket }) => {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeView, setActiveView] = useState('backups'); // 'backups', 'create', 'restore'
  const [loading, setLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  // Create backup form state
  const [backupType, setBackupType] = useState('full');
  const [backupDescription, setBackupDescription] = useState('');
  const [includeMemory, setIncludeMemory] = useState(true);
  const [includeConfig, setIncludeConfig] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(false);
  const [includeData, setIncludeData] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);

  // Restore form state
  const [restoreMemory, setRestoreMemory] = useState(true);
  const [restoreConfig, setRestoreConfig] = useState(true);
  const [restoreLogs, setRestoreLogs] = useState(false);
  const [restoreData, setRestoreData] = useState(true);
  const [restoreDocs, setRestoreDocs] = useState(true);

  useEffect(() => {
    if (!socket) return;

    // Event listeners
    socket.on('backup:list', (data) => {
      setBackups(data);
      setLoading(false);
    });

    socket.on('backup:stats', (data) => {
      setStats(data);
    });

    socket.on('backup:created', (backup) => {
      setLoading(false);
      setActiveView('backups');
      setBackupDescription('');
      // Refresh list
      socket.emit('backup:get-list');
      socket.emit('backup:get-stats');
    });

    socket.on('backup:verified', (data) => {
      alert(data.valid ? '✅ Backup verificado correctamente' : '❌ Backup corrupto');
    });

    socket.on('backup:restored', (data) => {
      setLoading(false);
      alert(`✅ Backup restaurado correctamente\n\n⚠️ Se recomienda reiniciar JARVIS para aplicar todos los cambios`);
      setSelectedBackup(null);
      setActiveView('backups');
    });

    socket.on('backup:deleted', () => {
      setLoading(false);
      setSelectedBackup(null);
      socket.emit('backup:get-list');
      socket.emit('backup:get-stats');
    });

    socket.on('backup:exported', (data) => {
      setLoading(false);
      alert(`✅ Backup exportado a:\n${data.path}`);
    });

    socket.on('backup:error', (data) => {
      setLoading(false);
      alert(`❌ Error: ${data.message}`);
    });

    // Initial load
    socket.emit('backup:get-list');
    socket.emit('backup:get-stats');

    return () => {
      socket.off('backup:list');
      socket.off('backup:stats');
      socket.off('backup:created');
      socket.off('backup:verified');
      socket.off('backup:restored');
      socket.off('backup:deleted');
      socket.off('backup:exported');
      socket.off('backup:error');
    };
  }, [socket]);

  const handleCreateBackup = () => {
    if (!socket) return;

    setLoading(true);
    socket.emit('backup:create', {
      type: backupType,
      description: backupDescription,
      includeMemory,
      includeConfig,
      includeLogs,
      includeData,
      includeDocs
    });
  };

  const handleVerifyBackup = (backupId) => {
    if (!socket) return;
    setLoading(true);
    socket.emit('backup:verify', backupId);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleRestoreBackup = (backupId) => {
    if (!socket || !confirm('⚠️ ¿Estás seguro de restaurar este backup?\n\nSe creará un backup del estado actual antes de restaurar.')) return;

    setLoading(true);
    socket.emit('backup:restore', {
      backupId,
      restoreMemory,
      restoreConfig,
      restoreLogs,
      restoreData,
      restoreDocs
    });
  };

  const handleDeleteBackup = (backupId) => {
    if (!socket || !confirm('¿Eliminar este backup permanentemente?')) return;

    setLoading(true);
    socket.emit('backup:delete', backupId);
  };

  const handleExportBackup = (backupId) => {
    if (!socket) return;

    const exportPath = prompt('Ruta de exportación:', 'C:\\jarvis-exports');
    if (!exportPath) return;

    setLoading(true);
    socket.emit('backup:export', { backupId, targetPath: exportPath });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderBackupsList = () => {
    return (
      <div className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Backups</div>
              <div className="text-2xl font-bold text-white">{stats.totalBackups}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Tamaño Total</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalSizeMB} MB</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Máximo</div>
              <div className="text-2xl font-bold text-purple-400">{stats.maxBackups}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Último Backup</div>
              <div className="text-sm font-semibold text-green-400">
                {stats.latestBackup ? formatDate(stats.latestBackup.timestamp) : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Backups list */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">📦 Backups Disponibles</h3>

          {backups.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay backups disponibles</p>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className={`bg-gray-700 rounded-lg p-4 border-2 transition-all ${
                    selectedBackup?.id === backup.id
                      ? 'border-cyan-500'
                      : 'border-transparent hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-bold text-white">{backup.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          backup.type === 'full'
                            ? 'bg-blue-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}>
                          {backup.type === 'full' ? '🔵 Completo' : '🟣 Incremental'}
                        </span>
                      </div>

                      {backup.description && (
                        <p className="text-gray-400 text-sm mb-2">{backup.description}</p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>📅 {formatDate(backup.timestamp)}</span>
                        <span>💾 {formatBytes(backup.size)}</span>
                        <span title={backup.checksum}>🔒 {backup.checksum?.substring(0, 8)}...</span>
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        {backup.sources.memory && <span className="px-2 py-1 bg-gray-600 rounded text-xs">🧠 Memory</span>}
                        {backup.sources.config && <span className="px-2 py-1 bg-gray-600 rounded text-xs">⚙️ Config</span>}
                        {backup.sources.logs && <span className="px-2 py-1 bg-gray-600 rounded text-xs">📝 Logs</span>}
                        {backup.sources.data && <span className="px-2 py-1 bg-gray-600 rounded text-xs">💿 Data</span>}
                        {backup.sources.docs && <span className="px-2 py-1 bg-gray-600 rounded text-xs">📚 Docs</span>}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => setSelectedBackup(backup)}
                        className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm font-semibold"
                      >
                        📋 Detalles
                      </button>
                      <button
                        onClick={() => handleVerifyBackup(backup.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                      >
                        🔍 Verificar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setActiveView('restore');
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                      >
                        ♻️ Restaurar
                      </button>
                      <button
                        onClick={() => handleExportBackup(backup.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold"
                      >
                        📤 Exportar
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCreateBackup = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">💾 Crear Nuevo Backup</h3>

        <div className="space-y-6">
          {/* Tipo de backup */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Backup</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setBackupType('full')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  backupType === 'full'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🔵 Completo
              </button>
              <button
                onClick={() => setBackupType('incremental')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  backupType === 'incremental'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🟣 Incremental
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción (Opcional)</label>
            <input
              type="text"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              placeholder="Ej: Backup antes de actualización"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Directorios a incluir */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Directorios a Incluir</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMemory}
                  onChange={(e) => setIncludeMemory(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">🧠 Memory (Base de datos de memoria)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConfig}
                  onChange={(e) => setIncludeConfig(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">⚙️ Config (Archivos de configuración)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLogs}
                  onChange={(e) => setIncludeLogs(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">📝 Logs (Archivos de log)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">💿 Data (Datos de aplicación)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDocs}
                  onChange={(e) => setIncludeDocs(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">📚 Docs (Documentación generada)</span>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={() => setActiveView('backups')}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              ← Cancelar
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={loading || (!includeMemory && !includeConfig && !includeLogs && !includeData && !includeDocs)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 font-semibold disabled:opacity-50"
            >
              {loading ? '⏳ Creando...' : '💾 Crear Backup'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRestoreBackup = () => {
    if (!selectedBackup) {
      setActiveView('backups');
      return null;
    }

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">♻️ Restaurar Backup</h3>

        <div className="space-y-6">
          {/* Información del backup */}
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
            <p className="text-yellow-400 font-semibold mb-2">⚠️ Advertencia</p>
            <p className="text-yellow-300 text-sm">
              Se creará un backup del estado actual antes de restaurar. Se recomienda verificar el backup antes de restaurar.
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-2">{selectedBackup.name}</h4>
            <div className="text-sm text-gray-400 space-y-1">
              <p>📅 {formatDate(selectedBackup.timestamp)}</p>
              <p>💾 {formatBytes(selectedBackup.size)}</p>
              <p>🔒 {selectedBackup.checksum?.substring(0, 16)}...</p>
              {selectedBackup.description && <p>📝 {selectedBackup.description}</p>}
            </div>
          </div>

          {/* Directorios a restaurar */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Directorios a Restaurar</label>
            <div className="space-y-2">
              {selectedBackup.sources.memory && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreMemory}
                    onChange={(e) => setRestoreMemory(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white">🧠 Memory</span>
                </label>
              )}

              {selectedBackup.sources.config && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreConfig}
                    onChange={(e) => setRestoreConfig(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white">⚙️ Config</span>
                </label>
              )}

              {selectedBackup.sources.logs && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreLogs}
                    onChange={(e) => setRestoreLogs(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white">📝 Logs</span>
                </label>
              )}

              {selectedBackup.sources.data && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreData}
                    onChange={(e) => setRestoreData(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white">💿 Data</span>
                </label>
              )}

              {selectedBackup.sources.docs && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreDocs}
                    onChange={(e) => setRestoreDocs(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white">📚 Docs</span>
                </label>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={() => {
                setSelectedBackup(null);
                setActiveView('backups');
              }}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              ← Cancelar
            </button>
            <button
              onClick={() => handleRestoreBackup(selectedBackup.id)}
              disabled={loading || (!restoreMemory && !restoreConfig && !restoreLogs && !restoreData && !restoreDocs)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-semibold disabled:opacity-50"
            >
              {loading ? '⏳ Restaurando...' : '♻️ Restaurar Ahora'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">💾 Backup & Recovery</h2>
          <p className="text-gray-400 text-sm mt-1">
            Sistema de backup automático y disaster recovery
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('backups')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeView === 'backups'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📦 Backups
          </button>
          <button
            onClick={() => setActiveView('create')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeView === 'create'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ➕ Crear Backup
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-4">
          <p className="text-blue-400 font-semibold text-center">⏳ Procesando...</p>
        </div>
      )}

      {/* Content */}
      {activeView === 'backups' && renderBackupsList()}
      {activeView === 'create' && renderCreateBackup()}
      {activeView === 'restore' && renderRestoreBackup()}
    </div>
  );
};

export default BackupManager;
