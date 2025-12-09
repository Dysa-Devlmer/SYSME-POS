// web-interface/frontend/src/components/LearningAnalytics.jsx
// Panel de Analytics del Learning System

import React, { useState, useEffect } from 'react';

export default function LearningAnalytics({ socket }) {
  const [analytics, setAnalytics] = useState({
    totalPatterns: 0,
    byIssueType: [],
    topPatterns: [],
    fixesStats: {
      total_fixes: 0,
      successful_fixes: 0,
      success_percentage: 0
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    // Solicitar analytics al conectar
    socket.emit('learning:get-analytics');

    // Listen: Analytics response
    socket.on('learning:analytics', (data) => {
      console.log('📊 Learning Analytics:', data);
      setAnalytics(data);
      setLoading(false);
    });

    // Refresh cada 30 segundos
    const interval = setInterval(() => {
      socket.emit('learning:get-analytics');
    }, 30000);

    return () => {
      socket.off('learning:analytics');
      clearInterval(interval);
    };
  }, [socket]);

  if (!socket) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400 text-center">
          🔌 Esperando conexión con servidor...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg border border-gray-700 text-center">
        <div className="text-4xl mb-2">🧠</div>
        <div className="text-gray-400">Cargando analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6 border border-purple-500 border-opacity-30">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🧠</span>
          <div>
            <h2 className="text-2xl font-bold text-white">Learning System Analytics</h2>
            <p className="text-sm text-gray-300">JARVIS está aprendiendo y mejorando con cada fix</p>
          </div>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-black bg-opacity-30 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">Patrones Aprendidos</div>
            <div className="text-3xl font-bold text-purple-400">{analytics.totalPatterns || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Patrones en memoria</div>
          </div>

          <div className="bg-black bg-opacity-30 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">Fixes Aplicados</div>
            <div className="text-3xl font-bold text-green-400">{analytics.fixesStats?.total_fixes || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{analytics.fixesStats?.successful_fixes || 0} exitosos</div>
          </div>

          <div className="bg-black bg-opacity-30 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">Tasa de Éxito</div>
            <div className="text-3xl font-bold text-blue-400">
              {(analytics.fixesStats?.success_percentage || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Fixes exitosos</div>
          </div>
        </div>
      </div>

      {/* Patterns by Issue Type */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Patrones por Tipo de Issue</span>
        </h3>

        {analytics.byIssueType && analytics.byIssueType.length > 0 ? (
          <div className="space-y-3">
            {analytics.byIssueType.map((item, idx) => {
              const percentage = analytics.totalPatterns > 0
                ? (item.count / analytics.totalPatterns) * 100
                : 0;

              return (
                <div key={idx} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold">{item.issue_type}</div>
                    <div className="text-gray-400 text-sm">{item.count} patrones</div>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{percentage.toFixed(1)}% del total</span>
                    <span className="text-gray-500">
                      Confianza promedio: {(item.avg_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No hay patrones aprendidos aún
          </div>
        )}
      </div>

      {/* Top Patterns */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>🔥</span>
          <span>Patrones Más Detectados</span>
        </h3>

        {analytics.topPatterns && analytics.topPatterns.length > 0 ? (
          <div className="space-y-3">
            {analytics.topPatterns.map((pattern, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">#{idx + 1}</span>
                      <div>
                        <div className="text-white font-semibold">{pattern.issue_type}</div>
                        <div className="text-xs text-gray-500">
                          Detectado {pattern.times_detected} veces | Fijado {pattern.times_fixed} veces
                        </div>
                      </div>
                    </div>

                    <div className="bg-black bg-opacity-40 rounded p-2 mb-2">
                      <code className="text-xs text-gray-300 font-mono">
                        {pattern.code_pattern.substring(0, 80)}
                        {pattern.code_pattern.length > 80 ? '...' : ''}
                      </code>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Confianza:</span>
                        <span className="text-green-400 font-bold">
                          {(pattern.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Éxito:</span>
                        <span className="text-blue-400 font-bold">
                          {(pattern.success_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No hay patrones detectados aún
          </div>
        )}
      </div>

      {/* Learning Progress */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-6 border border-green-500 border-opacity-30">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h3 className="text-lg font-bold text-white">Estado del Aprendizaje</h3>
            <p className="text-sm text-gray-300">JARVIS mejora con cada fix aplicado</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-gray-300 text-sm mb-1">Velocidad de Aprendizaje</div>
            <div className="text-2xl font-bold text-green-400">
              {analytics.totalPatterns > 0 ? '🚀 Activo' : '⏳ Esperando'}
            </div>
          </div>

          <div>
            <div className="text-gray-300 text-sm mb-1">Próximo Objetivo</div>
            <div className="text-lg font-bold text-emerald-400">
              {analytics.totalPatterns < 10 ? '10 patrones' :
               analytics.totalPatterns < 50 ? '50 patrones' :
               analytics.totalPatterns < 100 ? '100 patrones' : '🏆 Experto'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
