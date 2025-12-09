/**
 * ⚡ J.A.R.V.I.S. AI BRAIN DASHBOARD
 *
 * "I'm constantly evolving, sir. Each decision makes me smarter."
 * - JARVIS
 *
 * Dashboard visual completo de los sistemas de IA:
 * - Self-Improving AI
 * - Reinforcement Learning
 * - User Pattern Analyzer
 * - Predictive AI
 */

import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import VoiceControl from './VoiceControl';

const AIBrain = () => {
  // Estados para cada sistema de IA
  const [aiStatus, setAIStatus] = useState({
    initialized: false,
    uptime: 0,
    activeSystems: [],
    health: 'unknown'
  });

  const [learningProgress, setLearningProgress] = useState({
    totalInteractions: 0,
    successRate: 0,
    averageResponseTime: 0,
    learningIterations: 0
  });

  const [patterns, setPatterns] = useState({
    totalPatterns: 0,
    byType: {},
    topPatterns: []
  });

  const [predictions, setPredictions] = useState({
    total: 0,
    accurate: 0,
    accuracy: 0
  });

  const [resources, setResources] = useState({
    prepared: 0,
    used: 0,
    hitRate: 0
  });

  const [recentInteractions, setRecentInteractions] = useState([]);
  const [recentAnomalies, setRecentAnomalies] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Referencia para auto-scroll de eventos
  const eventsRef = useRef(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Cargar datos iniciales
    loadAIData();

    // Setup WebSocket listeners
    setupSocketListeners();

    // Solicitar actualizaciones cada 30s
    const interval = setInterval(() => {
      socket.emit('ai:request:stats');
      socket.emit('ai:request:insights');
    }, 30000);

    return () => {
      clearInterval(interval);
      socket.off('ai:stats');
      socket.off('ai:insights');
      socket.off('ai:interaction');
      socket.off('ai:learning');
      socket.off('ai:patterns');
      socket.off('ai:anomaly');
      socket.off('ai:resources');
    };
  }, []);

  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [liveEvents]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAIData = async () => {
    try {
      setIsLoading(true);

      // Cargar estado del sistema
      const statusRes = await fetch('/api/ai/status');
      const statusData = await statusRes.json();

      if (statusData.success) {
        setAIStatus(statusData.status);
      }

      // Cargar insights
      const insightsRes = await fetch('/api/ai/insights');
      const insightsData = await insightsRes.json();

      if (insightsData.success) {
        const { insights } = insightsData;

        setLearningProgress(insights.learningProgress || {});
        setPatterns(insights.patterns || {});
        setPredictions(insights.predictions || {});
        setResources(insights.resources || {});
        setRecentInteractions(insights.recentInteractions || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading AI data:', error);
      setIsLoading(false);
    }
  };

  // ============================================================================
  // WEBSOCKET SETUP
  // ============================================================================

  const setupSocketListeners = () => {
    // Conexión
    socket.on('connect', () => {
      setIsConnected(true);
      addLiveEvent('🟢 Connected to AI Systems', 'success');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addLiveEvent('🔴 Disconnected from AI Systems', 'error');
    });

    // Estadísticas actualizadas
    socket.on('ai:stats', (data) => {
      if (data.type === 'statistics_update') {
        setAIStatus(data.data);
      }
    });

    // Insights actualizados
    socket.on('ai:insights', (data) => {
      if (data && data.type === 'insights_response' && data.data) {
        const { insights } = data.data;
        if (insights) {
          setLearningProgress(insights.learningProgress || {});
          setPatterns(insights.patterns || {});
          setPredictions(insights.predictions || {});
          setResources(insights.resources || {});
        }
      }
    });

    // Interacción procesada
    socket.on('ai:interaction', (data) => {
      if (data.type === 'interaction_processed') {
        addLiveEvent(
          `🧠 Interaction: ${data.data.input?.substring(0, 40)}...`,
          'info',
          {
            action: data.data.action,
            responseTime: data.data.responseTime
          }
        );

        // Actualizar interacciones recientes
        setRecentInteractions(prev => {
          const updated = [data.data, ...prev];
          return updated.slice(0, 10);
        });

        // Actualizar métricas
        setLearningProgress(prev => ({
          ...prev,
          totalInteractions: prev.totalInteractions + 1
        }));
      }
    });

    // Aprendizaje actualizado
    socket.on('ai:learning', (data) => {
      if (data.type === 'learning_update') {
        addLiveEvent('📚 AI Learning Cycle Completed', 'success');

        setLearningProgress(prev => ({
          ...prev,
          learningIterations: prev.learningIterations + 1
        }));
      }
    });

    // Patrones detectados
    socket.on('ai:patterns', (data) => {
      if (data.type === 'patterns_detected') {
        addLiveEvent(
          `🔍 Patterns Detected: ${data.data.patterns.totalPatterns}`,
          'info'
        );

        setPatterns(data.data.patterns);
      }
    });

    // Anomalía detectada
    socket.on('ai:anomaly', (data) => {
      if (data.type === 'anomaly_detected') {
        addLiveEvent(
          `⚠️ Anomaly Detected: ${data.severity}`,
          'warning',
          data.data
        );

        setRecentAnomalies(prev => {
          const updated = [{ ...data, timestamp: Date.now() }, ...prev];
          return updated.slice(0, 5);
        });
      }
    });

    // Recursos preparados/usados
    socket.on('ai:resources', (data) => {
      if (data.type === 'resources_prepared') {
        addLiveEvent(
          `⚡ Resources Prepared: ${data.data.successful}`,
          'success'
        );

        setResources(prev => ({
          ...prev,
          prepared: prev.prepared + data.data.successful
        }));
      } else if (data.type === 'resource_used') {
        setResources(prev => ({
          ...prev,
          used: prev.used + 1,
          hitRate: (prev.used + 1) / (prev.prepared || 1)
        }));
      }
    });
  };

  const addLiveEvent = (message, type = 'info', data = null) => {
    const event = {
      id: Date.now() + Math.random(),
      message,
      type,
      data,
      timestamp: new Date().toLocaleTimeString()
    };

    setLiveEvents(prev => {
      const updated = [...prev, event];
      return updated.slice(-50); // Mantener solo últimos 50
    });
  };

  // ============================================================================
  // INTERACTIONS
  // ============================================================================

  const testAI = async () => {
    const testInput = "¿Cómo optimizar el rendimiento de mi aplicación?";

    addLiveEvent(`🧪 Testing AI with: "${testInput}"`, 'info');

    try {
      const res = await fetch('/api/ai/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: testInput,
          context: {
            domain: 'code',
            taskType: 'analysis',
            urgency: 0.7
          }
        })
      });

      const result = await res.json();

      if (result.success) {
        addLiveEvent(
          `✅ AI Response: ${result.output.substring(0, 50)}...`,
          'success',
          result
        );
      } else {
        addLiveEvent(`❌ AI Error: ${result.error}`, 'error');
      }
    } catch (error) {
      addLiveEvent(`❌ Request Error: ${error.message}`, 'error');
    }
  };

  const requestPredictions = () => {
    socket.emit('ai:request:predictions', {
      domain: 'code',
      taskType: 'development',
      timeOfDay: new Date().getHours()
    });

    addLiveEvent('🔮 Requesting predictions...', 'info');
  };

  const saveAIState = async () => {
    try {
      addLiveEvent('💾 Saving AI state...', 'info');

      const res = await fetch('/api/ai/save', {
        method: 'POST'
      });

      const result = await res.json();

      if (result.success) {
        addLiveEvent('✅ AI state saved successfully', 'success');
      }
    } catch (error) {
      addLiveEvent(`❌ Save error: ${error.message}`, 'error');
    }
  };

  const handleVoiceCommand = (command) => {
    addLiveEvent(`🎤 Voice Command: "${command.text}"`, 'info');

    switch (command.action) {
      case 'test':
        testAI();
        break;
      case 'predict':
        requestPredictions();
        break;
      case 'save':
        saveAIState();
        break;
      case 'status':
        socket.emit('ai:request:stats');
        addLiveEvent('📊 Requesting AI status...', 'info');
        break;
      case 'stats':
        socket.emit('ai:request:stats');
        addLiveEvent('📊 Requesting statistics...', 'info');
        break;
      default:
        addLiveEvent(`❓ Unknown voice command: ${command.text}`, 'warning');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🧠</div>
          <div className="text-blue-400 text-xl animate-pulse">
            Initializing AI Brain...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ⚡ J.A.R.V.I.S. AI BRAIN
            </h1>
            <p className="text-gray-400">
              "I'm constantly evolving, sir. Each decision makes me smarter."
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className={`text-sm ${getHealthColor(aiStatus.health)}`}>
              Health: <span className="font-bold uppercase">{aiStatus.health}</span>
            </div>

            <div className="text-sm text-gray-400">
              Uptime: {formatUptime(aiStatus.uptime)}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Control */}
      <div className="mb-8">
        <VoiceControl onCommand={handleVoiceCommand} enabled={true} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Systems */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Active Systems</div>
          <div className="text-3xl font-bold text-blue-400">
            {aiStatus.activeSystems.length} / 4
          </div>
          <div className="mt-3 space-y-1">
            {['self_improvement', 'reinforcement_learning', 'pattern_analyzer', 'predictive_ai'].map(sys => (
              <div key={sys} className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${aiStatus.activeSystems.includes(sys) ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                <span className={aiStatus.activeSystems.includes(sys) ? 'text-green-400' : 'text-gray-500'}>
                  {sys.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Progress */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Learning Progress</div>
          <div className="text-3xl font-bold text-purple-400">
            {learningProgress.totalInteractions}
          </div>
          <div className="text-sm text-gray-400">total interactions</div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Success Rate</span>
              <span className="text-green-400">
                {(learningProgress.successRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full transition-all"
                style={{ width: `${learningProgress.successRate * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Predictions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Predictions</div>
          <div className="text-3xl font-bold text-cyan-400">
            {predictions.total}
          </div>
          <div className="text-sm text-gray-400">predictions made</div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Accuracy</span>
              <span className="text-cyan-400">
                {(predictions.accuracy * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-cyan-400 h-1.5 rounded-full transition-all"
                style={{ width: `${predictions.accuracy * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Resources</div>
          <div className="text-3xl font-bold text-orange-400">
            {resources.prepared}
          </div>
          <div className="text-sm text-gray-400">prepared</div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Hit Rate</span>
              <span className="text-orange-400">
                {(resources.hitRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-orange-400 h-1.5 rounded-full transition-all"
                style={{ width: `${resources.hitRate * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Events */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Live Events</h2>
            <div className="flex space-x-2">
              <button
                onClick={testAI}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Test AI
              </button>
              <button
                onClick={requestPredictions}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                Predict
              </button>
              <button
                onClick={saveAIState}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                Save
              </button>
            </div>
          </div>

          <div
            ref={eventsRef}
            className="h-96 overflow-y-auto space-y-2 font-mono text-xs"
          >
            {liveEvents.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events yet. Waiting for AI activity...
              </div>
            ) : (
              liveEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-start space-x-2 p-2 bg-gray-900 rounded"
                >
                  <span className="text-gray-500">{event.timestamp}</span>
                  <span className={getEventColor(event.type)}>
                    {event.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recent Interactions</h2>

          <div className="space-y-3 h-96 overflow-y-auto">
            {recentInteractions.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No interactions yet
              </div>
            ) : (
              recentInteractions.map((interaction, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 rounded p-3 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm text-blue-400">
                      {interaction.input?.substring(0, 60)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {interaction.responseTime}ms
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Action:</span>
                      <span className="text-purple-400 font-mono">
                        {interaction.action}
                      </span>
                    </div>

                    {interaction.feedback?.confidence && (
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-green-400">
                          {(interaction.feedback.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {interaction.predictionsUsed > 0 && (
                    <div className="text-xs text-cyan-400 mt-2">
                      🔮 {interaction.predictionsUsed} predictions used
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Patterns & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Patterns */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Detected Patterns</h2>

          <div className="mb-4">
            <div className="text-3xl font-bold text-indigo-400">
              {patterns.totalPatterns || 0}
            </div>
            <div className="text-sm text-gray-400">total patterns detected</div>
          </div>

          {patterns.byType && Object.keys(patterns.byType).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-400 mb-2">By Type:</div>
              {Object.entries(patterns.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 capitalize">{type}</span>
                  <span className="text-indigo-400 font-mono">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recent Anomalies</h2>

          <div className="space-y-3">
            {recentAnomalies.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No anomalies detected ✅
              </div>
            ) : (
              recentAnomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`bg-gray-900 rounded p-3 border ${
                    anomaly.severity === 'critical' ? 'border-red-500' :
                    anomaly.severity === 'high' ? 'border-orange-500' :
                    'border-yellow-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-bold ${
                      anomaly.severity === 'critical' ? 'text-red-400' :
                      anomaly.severity === 'high' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      ⚠️ {anomaly.severity.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {anomaly.data && anomaly.data.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {anomaly.data[0].type}: {anomaly.data[0].metric}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>"I'm constantly evolving, sir. Each decision makes me smarter."</p>
        <p className="mt-2">⚡ Powered by Stark Industries - AI Division</p>
      </div>
    </div>
  );
};

export default AIBrain;
