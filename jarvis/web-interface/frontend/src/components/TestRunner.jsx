// web-interface/frontend/src/components/TestRunner.jsx
// Sistema de Testing Automatizado - UI

import React, { useState, useEffect } from 'react';

const TestRunner = ({ socket }) => {
  const [tests, setTests] = useState([]);
  const [suites, setSuites] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'tests', 'history', 'coverage'
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [output, setOutput] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Event listeners
    socket.on('test:list', (data) => {
      setTests(data);
    });

    socket.on('test:suites', (data) => {
      setSuites(data);
    });

    socket.on('test:history', (data) => {
      setHistory(data);
    });

    socket.on('test:stats', (data) => {
      setStats(data);
    });

    socket.on('test:status', (data) => {
      setStatus(data);
      setIsRunning(data.isRunning);
      setCurrentRun(data.currentRun);
    });

    socket.on('test:run-started', (data) => {
      setIsRunning(true);
      setCurrentRun(data.run);
      setOutput([]);
    });

    socket.on('test:run-completed', (data) => {
      setIsRunning(false);
      setCurrentRun(null);
      // Refrescar datos
      socket.emit('test:get-history');
      socket.emit('test:get-stats');
      socket.emit('test:get-status');
    });

    socket.on('test:run-error', (data) => {
      setIsRunning(false);
      setCurrentRun(null);
      alert(`❌ Error en tests: ${data.error}`);
    });

    socket.on('test:output', (data) => {
      setOutput(prev => [...prev, data]);
    });

    socket.on('test:error', (data) => {
      alert(`❌ Error: ${data.message}`);
    });

    // Initial load
    socket.emit('test:discover');
    socket.emit('test:get-suites');
    socket.emit('test:get-history');
    socket.emit('test:get-stats');
    socket.emit('test:get-status');

    return () => {
      socket.off('test:list');
      socket.off('test:suites');
      socket.off('test:history');
      socket.off('test:stats');
      socket.off('test:status');
      socket.off('test:run-started');
      socket.off('test:run-completed');
      socket.off('test:run-error');
      socket.off('test:output');
      socket.off('test:error');
    };
  }, [socket]);

  const handleRunAll = () => {
    if (!socket || isRunning) return;
    socket.emit('test:run-all', { coverage: true });
  };

  const handleRunSuite = (suiteName) => {
    if (!socket || isRunning) return;
    socket.emit('test:run-suite', { suiteName, coverage: true });
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      case 'skipped': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  };

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Runs</div>
              <div className="text-2xl font-bold text-white">{stats.totalRuns}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Tests</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalTests}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Passed</div>
              <div className="text-2xl font-bold text-green-400">{stats.totalPassed}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-400">{stats.totalFailed}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Pass Rate</div>
              <div className="text-2xl font-bold text-purple-400">{stats.passRate}%</div>
            </div>
          </div>
        )}

        {/* Current Run */}
        {isRunning && currentRun && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
            <h3 className="text-yellow-400 font-bold mb-2">⏳ Ejecutando Tests...</h3>
            <div className="text-sm text-gray-300">
              <p>Run ID: {currentRun.id}</p>
              <p>Inicio: {formatDate(currentRun.startTime)}</p>
            </div>
          </div>
        )}

        {/* Test Suites */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">📦 Test Suites</h3>

          {suites.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay suites de tests</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {suites.map((suite) => (
                <div
                  key={suite.name}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedSuite(suite.name);
                    setActiveView('tests');
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-white">{suite.name}</h4>
                    <span className="px-2 py-1 bg-cyan-600 text-white rounded text-xs font-semibold">
                      {suite.tests.length} tests
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunSuite(suite.name);
                    }}
                    disabled={isRunning}
                    className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold disabled:opacity-50 text-sm"
                  >
                    ▶️ Ejecutar Suite
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Run */}
        {history.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">🕐 Última Ejecución</h3>

            {(() => {
              const latest = history[0];
              return (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getStatusIcon(latest.status)}</span>
                      <div>
                        <div className="font-bold text-white">{latest.id}</div>
                        <div className="text-sm text-gray-400">{formatDate(latest.startTime)}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-400">Duración</div>
                      <div className="font-bold text-cyan-400">{formatDuration(latest.duration)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-gray-400 text-xs">Total</div>
                      <div className="font-bold text-white">{latest.summary.total}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Passed</div>
                      <div className="font-bold text-green-400">{latest.summary.passed}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Failed</div>
                      <div className="font-bold text-red-400">{latest.summary.failed}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Coverage</div>
                      <div className="font-bold text-purple-400">
                        {latest.coverage ? `${latest.coverage.overall}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderTests = () => {
    const filteredTests = selectedSuite
      ? tests.filter(t => t.suite === selectedSuite)
      : tests;

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            🧪 Tests {selectedSuite && `- ${selectedSuite}`}
          </h3>

          {selectedSuite && (
            <button
              onClick={() => setSelectedSuite(null)}
              className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm font-semibold"
            >
              ← Ver Todos
            </button>
          )}
        </div>

        {filteredTests.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay tests</p>
        ) : (
          <div className="space-y-2">
            {filteredTests.map((test) => (
              <div key={test.id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{test.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{test.path}</div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      test.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {test.enabled ? 'Enabled' : 'Disabled'}
                    </span>

                    <span className="px-2 py-1 bg-cyan-600 text-white rounded text-xs font-semibold">
                      {test.suite}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">📜 Historial de Ejecuciones</h3>

        {history.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay ejecuciones en el historial</p>
        ) : (
          <div className="space-y-3">
            {history.map((run) => (
              <div key={run.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(run.status)}</span>
                    <div>
                      <div className="font-bold text-white">{run.id}</div>
                      <div className="text-sm text-gray-400">{formatDate(run.startTime)}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-400">Duración</div>
                    <div className="font-bold text-cyan-400">{formatDuration(run.duration)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3 mt-3 text-center">
                  <div className="bg-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs">Total</div>
                    <div className="font-bold text-white">{run.summary.total}</div>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs">Passed</div>
                    <div className="font-bold text-green-400">{run.summary.passed}</div>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs">Failed</div>
                    <div className="font-bold text-red-400">{run.summary.failed}</div>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs">Skipped</div>
                    <div className="font-bold text-gray-400">{run.summary.skipped}</div>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs">Coverage</div>
                    <div className="font-bold text-purple-400">
                      {run.coverage ? `${run.coverage.overall}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {run.errors.length > 0 && (
                  <div className="mt-3 bg-red-900 bg-opacity-20 border border-red-500 rounded p-2">
                    <p className="text-red-400 text-xs font-semibold">Errores:</p>
                    {run.errors.map((err, idx) => (
                      <p key={idx} className="text-red-300 text-xs mt-1">{err.message}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCoverage = () => {
    const latestWithCoverage = history.find(r => r.coverage);

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">📈 Coverage Report</h3>

        {!latestWithCoverage ? (
          <p className="text-gray-400 text-center py-8">No hay datos de coverage disponibles</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-bold text-white mb-3">Overall Coverage</h4>
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-400 mb-2">
                  {latestWithCoverage.coverage.overall}%
                </div>
                <div className="w-full bg-gray-600 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 h-4 rounded-full transition-all"
                    style={{ width: `${latestWithCoverage.coverage.overall}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Lines</div>
                <div className="text-2xl font-bold text-cyan-400">{latestWithCoverage.coverage.lines}%</div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full"
                    style={{ width: `${latestWithCoverage.coverage.lines}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Statements</div>
                <div className="text-2xl font-bold text-green-400">{latestWithCoverage.coverage.statements}%</div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${latestWithCoverage.coverage.statements}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Functions</div>
                <div className="text-2xl font-bold text-yellow-400">{latestWithCoverage.coverage.functions}%</div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${latestWithCoverage.coverage.functions}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Branches</div>
                <div className="text-2xl font-bold text-orange-400">{latestWithCoverage.coverage.branches}%</div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${latestWithCoverage.coverage.branches}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🧪 Test Runner</h2>
          <p className="text-gray-400 text-sm mt-1">
            Sistema de testing automatizado y quality assurance
          </p>
        </div>

        <button
          onClick={handleRunAll}
          disabled={isRunning}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 font-semibold disabled:opacity-50"
        >
          {isRunning ? '⏳ Ejecutando...' : '▶️ Ejecutar Todos los Tests'}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'overview'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveView('tests')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'tests'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🧪 Tests
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'history'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📜 Historial
        </button>
        <button
          onClick={() => setActiveView('coverage')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'coverage'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📈 Coverage
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'tests' && renderTests()}
      {activeView === 'history' && renderHistory()}
      {activeView === 'coverage' && renderCoverage()}

      {/* Output Console (cuando hay ejecución) */}
      {isRunning && output.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-2">📟 Console Output</h3>
          <div className="bg-black rounded p-3 max-h-64 overflow-y-auto font-mono text-xs">
            {output.map((line, idx) => (
              <div key={idx} className={line.type === 'stderr' ? 'text-red-400' : 'text-green-400'}>
                {line.data}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestRunner;
