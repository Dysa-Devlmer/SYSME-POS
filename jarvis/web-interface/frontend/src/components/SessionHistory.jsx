// web-interface/frontend/src/components/SessionHistory.jsx
// Componente para mostrar historial de sesiones autónomas

import React, { useState } from 'react';
import './SessionHistory.css';

const SessionHistory = ({ sessions }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">📜 Historial de Sesiones</h2>
        <p className="text-gray-400 text-center py-8">No hay sesiones registradas aún</p>
      </div>
    );
  }

  const toggleExpand = (sessionId) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const getSessionIcon = (session) => {
    const summary = session.content?.summary;
    if (!summary) return '❓';
    if (summary.failed === 0) return '✅';
    if (summary.successful === 0) return '❌';
    return '⚠️';
  };

  const getSessionColor = (session) => {
    const summary = session.content?.summary;
    if (!summary) return 'text-gray-400';
    if (summary.failed === 0) return 'text-green-400';
    if (summary.successful === 0) return 'text-red-400';
    return 'text-yellow-400';
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">📜 Historial de Sesiones</h2>
        <span className="text-sm text-gray-400">{sessions.length} sesiones</span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {sessions.map((session, index) => {
          const isExpanded = expandedSessions.has(session.id);
          const summary = session.content?.summary;
          const plan = session.content?.plan;
          const task = session.content?.task;

          return (
            <div
              key={session.id || index}
              className="bg-gray-700 rounded-lg overflow-hidden transition-all hover:bg-gray-650"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand(session.id || index)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className={`text-2xl ${getSessionColor(session)}`}>
                    {getSessionIcon(session)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {task || 'Sesión sin título'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatDate(session.timestamp || Date.now())}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 ml-4">
                  {summary && (
                    <>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Score</p>
                        <p className="text-lg font-bold text-cyan-400">
                          {summary.averageScore}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Sub-tareas</p>
                        <p className="text-lg font-bold text-white">
                          {summary.successful}/{summary.total}
                        </p>
                      </div>
                    </>
                  )}
                  <button className="text-gray-400 hover:text-white transition-colors">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-600">
                  {/* Summary Stats */}
                  {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-xs text-gray-400">Exitosas</p>
                        <p className="text-xl font-bold text-green-400">{summary.successful}</p>
                      </div>
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-xs text-gray-400">Fallidas</p>
                        <p className="text-xl font-bold text-red-400">{summary.failed}</p>
                      </div>
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-xs text-gray-400">Corregidas</p>
                        <p className="text-xl font-bold text-yellow-400">{summary.corrected || 0}</p>
                      </div>
                      <div className="bg-gray-600 rounded p-3">
                        <p className="text-xs text-gray-400">Saltadas</p>
                        <p className="text-xl font-bold text-gray-400">{summary.skipped || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Plan Details */}
                  {plan && (
                    <div className="bg-gray-600 rounded p-3">
                      <h4 className="font-semibold text-white mb-2">📋 Plan de Ejecución</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Complejidad:</span>
                          <span className="text-white capitalize">{plan.estimation?.overallComplexity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tiempo estimado:</span>
                          <span className="text-white">{plan.estimation?.estimatedTimeMinutes}min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sub-tareas:</span>
                          <span className="text-white">{plan.subtasks?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtasks List */}
                  {plan?.subtasks && plan.subtasks.length > 0 && (
                    <div className="bg-gray-600 rounded p-3">
                      <h4 className="font-semibold text-white mb-2">🔧 Sub-tareas</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar-small">
                        {plan.subtasks.map((subtask, i) => {
                          const result = session.content?.results?.find(r => r.subtask === subtask.id);
                          const isSuccess = result?.success;

                          return (
                            <div
                              key={subtask.id || i}
                              className="flex items-start space-x-2 text-sm p-2 bg-gray-700 rounded"
                            >
                              <span className="text-lg">
                                {isSuccess ? '✅' : result ? '❌' : '⏳'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium">{subtask.title}</p>
                                <div className="flex items-center space-x-2 mt-1 text-xs">
                                  <span className="text-cyan-400">{subtask.type}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-purple-400">{subtask.complexity}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-yellow-400">{subtask.estimatedTime}min</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  {session.content?.duration && (
                    <div className="text-sm text-gray-400 text-center">
                      ⏱️ Duración: {formatDuration(session.content.duration)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionHistory;
