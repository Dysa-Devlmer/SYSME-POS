// web-interface/frontend/src/components/ProactiveAlerts.jsx
// Panel de alertas proactivas en tiempo real

import React, { useState, useEffect } from 'react';

export default function ProactiveAlerts({ socket }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    filesMonitored: 0,
    alertsSent: 0,
    issuesDetected: 0
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [recentChanges, setRecentChanges] = useState([]);
  const [fixingIssues, setFixingIssues] = useState(new Set());
  const [pendingCommit, setPendingCommit] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Listen: Proactive ready
    socket.on('proactive:ready', (data) => {
      setStats(prev => ({ ...prev, filesMonitored: data.filesWatched }));
      console.log('✅ Proactive Mode ready:', data.filesWatched, 'files');
    });

    // Listen: File changed
    socket.on('proactive:file-changed', (data) => {
      setRecentChanges(prev => [
        {
          path: data.path,
          changeType: data.changeType,
          complexity: data.complexity,
          timestamp: data.timestamp
        },
        ...prev
      ].slice(0, 5)); // Keep last 5
    });

    // Listen: Analysis complete
    socket.on('proactive:analysis-complete', (data) => {
      console.log('📊 Analysis complete:', data);

      if (data.issueCount > 0) {
        // Agregar como notificación informativa
        addInfoNotification(data);
      }
    });

    // Listen: Alert (importante)
    socket.on('proactive:alert', (data) => {
      console.log('🔔 PROACTIVE ALERT:', data);

      const newAlert = {
        id: `alert-${Date.now()}`,
        path: data.path,
        priority: data.priority,
        message: data.message,
        analysis: data.analysis,
        timestamp: data.timestamp,
        dismissed: false
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep last 10
      setStats(prev => ({ ...prev, alertsSent: prev.alertsSent + 1 }));
    });

    // Listen: Stats update
    socket.on('proactive:stats', (data) => {
      setStats({
        filesMonitored: data.filesMonitored || 0,
        alertsSent: data.alertsSent || 0,
        issuesDetected: data.issuesDetected || 0
      });
    });

    // Listen: Git commit pending (requires approval)
    socket.on('git:commit-pending', (data) => {
      console.log('📝 Git commit pending approval:', data);
      setPendingCommit(data);
    });

    // Listen: Git commit created
    socket.on('git:commit-created', (data) => {
      console.log('✅ Git commit created:', data);
      setPendingCommit(null);
      alert(`✅ Commit creado exitosamente!\n\n${data.fixes} fixes aplicados en ${data.files.length} archivos.`);
    });

    // Listen: Git commit rejected
    socket.on('git:commit-rejected', (data) => {
      console.log('❌ Git commit rejected');
      setPendingCommit(null);
    });

    // Cleanup
    return () => {
      socket.off('proactive:ready');
      socket.off('proactive:file-changed');
      socket.off('proactive:analysis-complete');
      socket.off('proactive:alert');
      socket.off('proactive:stats');
      socket.off('git:commit-pending');
      socket.off('git:commit-created');
      socket.off('git:commit-rejected');
    };
  }, [socket]);

  const addInfoNotification = (data) => {
    const infoAlert = {
      id: `info-${Date.now()}`,
      path: data.path,
      priority: 'info',
      message: `📊 Análisis completado: ${data.issueCount} issues detectados`,
      analysis: {
        summary: data.summary,
        bugs: data.bugs,
        security: data.security,
        performance: data.performance
      },
      timestamp: data.timestamp,
      dismissed: false
    };

    setAlerts(prev => [infoAlert, ...prev].slice(0, 10));
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));

    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }, 300);
  };

  const handleApproveCommit = () => {
    console.log('✅ Aprobando commit...');
    socket.emit('git:approve-commit');

    // Listen for result
    socket.once('git:commit-result', (result) => {
      if (result.success) {
        console.log('✅ Commit creado exitosamente');
      } else {
        console.error('❌ Error creando commit:', result.reason);
        alert(`❌ Error creando commit:\n${result.reason}`);
      }
    });
  };

  const handleRejectCommit = () => {
    console.log('❌ Rechazando commit...');
    socket.emit('git:reject-commit');
  };

  const handleFixIt = async (filePath, issue, analysis) => {
    const issueKey = `${filePath}:${issue.line}`;

    // Evitar múltiples clicks
    if (fixingIssues.has(issueKey)) {
      console.log('Fix ya en progreso...');
      return;
    }

    setFixingIssues(prev => new Set(prev).add(issueKey));

    console.log('🔧 Solicitando fix:', issueKey);

    // Solicitar fix al backend
    socket.emit('proactive:apply-fix', {
      filePath,
      issue: {
        ...issue,
        type: determineIssueType(issue)
      },
      analysis
    });

    // Listener temporal para el resultado
    const handleResult = (result) => {
      if (result.success) {
        console.log('✅ Fix aplicado:', result.changes);
        alert(`✅ Fix aplicado exitosamente!\n\nCambios:\n${result.changes.map(c => `• Línea ${c.line}: ${c.description}`).join('\n')}`);
      } else {
        console.error('❌ Fix falló:', result.reason);
        alert(`❌ No se pudo aplicar el fix:\n${result.reason}`);
      }

      setFixingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueKey);
        return newSet;
      });

      socket.off('proactive:fix-result', handleResult);
    };

    socket.on('proactive:fix-result', handleResult);

    // Timeout de 10 segundos
    setTimeout(() => {
      if (fixingIssues.has(issueKey)) {
        setFixingIssues(prev => {
          const newSet = new Set(prev);
          newSet.delete(issueKey);
          return newSet;
        });
        socket.off('proactive:fix-result', handleResult);
      }
    }, 10000);
  };

  const determineIssueType = (issue) => {
    const text = (issue.description || issue.issue || issue.problem || '').toLowerCase();

    if (text.includes('eval')) return 'eval-usage';
    if (text.includes('sql')) return 'sql-injection';
    if (text.includes('xss') || text.includes('innerhtml')) return 'xss-vulnerability';
    if (text.includes('loop') || text.includes('o(n')) return 'inefficient-loop';
    if (text.includes('null') || text.includes('undefined')) return 'null-reference';
    if (text.includes('await')) return 'missing-await';
    if (text.includes('error') || text.includes('catch')) return 'missing-error-handling';

    return 'generic';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 border-red-400';
      case 'high': return 'bg-orange-600 border-orange-400';
      case 'medium': return 'bg-yellow-600 border-yellow-400';
      case 'low': return 'bg-blue-600 border-blue-400';
      case 'info': return 'bg-gray-700 border-gray-500';
      default: return 'bg-gray-700 border-gray-500';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      case 'info': return '📊';
      default: return '🔔';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es-AR');
  };

  if (!socket) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400 text-center">
          🔌 Esperando conexión con servidor...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con stats */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-4 border border-blue-500 border-opacity-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h3 className="text-xl font-bold text-white">Proactive Mode</h3>
              <p className="text-sm text-gray-300">Monitoreo en tiempo real</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-blue-300 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black bg-opacity-30 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Archivos</div>
              <div className="text-2xl font-bold text-blue-400">{stats.filesMonitored.toLocaleString()}</div>
            </div>
            <div className="bg-black bg-opacity-30 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Issues</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.issuesDetected}</div>
            </div>
            <div className="bg-black bg-opacity-30 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Alertas</div>
              <div className="text-2xl font-bold text-red-400">{stats.alertsSent}</div>
            </div>
          </div>
        )}
      </div>

      {/* Recent changes (live feed) */}
      {recentChanges.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <span>📝</span>
            <span>Cambios recientes</span>
          </div>
          <div className="space-y-1">
            {recentChanges.map((change, idx) => (
              <div
                key={idx}
                className="text-xs text-gray-400 flex items-center gap-2 py-1 border-b border-gray-700 last:border-0"
              >
                <span className={change.complexity === 'high' ? 'text-orange-400' : 'text-gray-500'}>
                  {change.path}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-500">{change.changeType}</span>
                <span className="ml-auto text-gray-600">{formatTimestamp(change.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.filter(a => !a.dismissed).length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span>🔔</span>
            <span>Alertas Activas</span>
          </div>

          {alerts
            .filter(alert => !alert.dismissed)
            .map(alert => (
              <div
                key={alert.id}
                className={`${getPriorityColor(alert.priority)} rounded-lg p-4 border-l-4 shadow-lg animate-slide-in-right`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getPriorityIcon(alert.priority)}</span>
                      <div className="flex-1">
                        <div className="text-white font-bold text-sm uppercase">{alert.priority}</div>
                        <div className="text-white text-opacity-80 text-xs">{alert.path}</div>
                      </div>
                      <div className="text-white text-opacity-60 text-xs">
                        {formatTimestamp(alert.timestamp)}
                      </div>
                    </div>

                    {/* Analysis summary */}
                    {alert.analysis && (
                      <div className="bg-black bg-opacity-30 rounded p-3 text-sm text-white space-y-2">
                        {alert.analysis.security && alert.analysis.security.length > 0 && (
                          <div>
                            <div className="font-bold text-red-300">🔒 Security ({alert.analysis.security.length})</div>
                            {alert.analysis.security.slice(0, 2).map((issue, idx) => (
                              <div key={idx} className="ml-4 mt-1">
                                <div className="text-xs text-gray-300 flex items-center justify-between gap-2">
                                  <span>• Línea {issue.line}: {issue.issue}</span>
                                  <button
                                    onClick={() => handleFixIt(alert.path, issue, alert.analysis)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    🔧 Fix It
                                  </button>
                                </div>
                                {issue.fix && (
                                  <div className="text-xs text-gray-400 ml-4 mt-0.5">➜ {issue.fix}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {alert.analysis.bugs && alert.analysis.bugs.length > 0 && (
                          <div>
                            <div className="font-bold text-orange-300">🐛 Bugs ({alert.analysis.bugs.length})</div>
                            {alert.analysis.bugs.slice(0, 2).map((bug, idx) => (
                              <div key={idx} className="ml-4 mt-1">
                                <div className="text-xs text-gray-300 flex items-center justify-between gap-2">
                                  <span>• Línea {bug.line}: {bug.description}</span>
                                  <button
                                    onClick={() => handleFixIt(alert.path, bug, alert.analysis)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    🔧 Fix It
                                  </button>
                                </div>
                                {bug.suggestion && (
                                  <div className="text-xs text-gray-400 ml-4 mt-0.5">➜ {bug.suggestion}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {alert.analysis.performance && alert.analysis.performance.length > 0 && (
                          <div>
                            <div className="font-bold text-yellow-300">⚡ Performance ({alert.analysis.performance.length})</div>
                            {alert.analysis.performance.slice(0, 2).map((perf, idx) => (
                              <div key={idx} className="ml-4 mt-1">
                                <div className="text-xs text-gray-300 flex items-center justify-between gap-2">
                                  <span>• Línea {perf.line}: {perf.problem}</span>
                                  <button
                                    onClick={() => handleFixIt(alert.path, perf, alert.analysis)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    🔧 Fix It
                                  </button>
                                </div>
                                {perf.solution && (
                                  <div className="text-xs text-gray-400 ml-4 mt-0.5">➜ {perf.solution}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {alert.analysis.summary && (
                          <div className="text-xs text-gray-400 italic mt-2 pt-2 border-t border-gray-600">
                            {alert.analysis.summary}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-white text-opacity-70 hover:text-opacity-100 transition-opacity flex-shrink-0 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {alerts.filter(a => !a.dismissed).length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-gray-400">No hay alertas activas</div>
          <div className="text-gray-600 text-sm mt-1">Tu código se ve bien, Señor</div>
        </div>
      )}

      {/* Git Commit Approval Modal */}
      {pendingCommit && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-lg border-2 border-green-500 shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-900 to-blue-900 p-4 border-b border-green-600">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                <div>
                  <h3 className="text-xl font-bold text-white">Aprobación de Commit Requerida</h3>
                  <p className="text-sm text-gray-300">Fixes automáticos listos para commit</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Summary */}
              <div className="bg-blue-900 bg-opacity-40 rounded-lg p-4 mb-4 border border-blue-600">
                <div className="text-sm text-blue-200 mb-2">
                  📊 <strong>{pendingCommit.fixes.length}</strong> fixes aplicados en{' '}
                  <strong>{pendingCommit.filesAffected.length}</strong> archivo{pendingCommit.filesAffected.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Commit Message Preview */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
                <div className="text-xs text-gray-400 mb-2 uppercase font-semibold">Mensaje de commit:</div>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                  {pendingCommit.message}
                </pre>
              </div>

              {/* Files Affected */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="text-xs text-gray-400 mb-2 uppercase font-semibold">
                  Archivos modificados:
                </div>
                <div className="space-y-1">
                  {pendingCommit.filesAffected.map((file, idx) => (
                    <div key={idx} className="text-sm text-green-400 font-mono">
                      📄 {file}
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Fixes */}
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-2">
                  Detalles de fixes ({pendingCommit.fixes.length}):
                </div>
                {pendingCommit.fixes.map((fix, idx) => (
                  <div key={idx} className="bg-gray-900 rounded p-3 border border-gray-700 text-xs">
                    <div className="text-gray-300 mb-1">
                      <span className="text-blue-400 font-mono">{fix.filePath}</span>
                      <span className="text-gray-600"> : </span>
                      <span className="text-yellow-400">línea {fix.issue.line}</span>
                    </div>
                    <div className="text-gray-400 ml-4">
                      {fix.issue.description || fix.issue.issue || fix.issue.problem || 'Fix aplicado'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - Actions */}
            <div className="bg-gray-900 p-4 border-t border-gray-700 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Los cambios ya están aplicados en los archivos. ¿Crear commit?
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRejectCommit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-colors"
                >
                  ❌ Rechazar
                </button>
                <button
                  onClick={handleApproveCommit}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-semibold transition-colors shadow-lg"
                >
                  ✅ Aprobar y Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
