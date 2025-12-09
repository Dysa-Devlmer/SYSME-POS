// web-interface/frontend/src/components/Login.jsx
// Pantalla de Login

import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full p-4 mb-4">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">JARVIS v2.0</h1>
          <p className="text-gray-400">Autonomous AI Assistant System</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                required
                disabled={loading}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                disabled={loading}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg hover:from-cyan-700 hover:to-purple-700 font-semibold disabled:opacity-50 transition-all"
            >
              {loading ? '⏳ Iniciando sesión...' : '🔐 Iniciar Sesión'}
            </button>
          </form>

          {/* Credentials por defecto */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-xs text-center mb-2">Credenciales por defecto:</p>
            <div className="bg-gray-700 rounded p-3 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Usuario:</span>
                <span className="text-cyan-400 font-mono">admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Contraseña:</span>
                <span className="text-cyan-400 font-mono">jarvis2024</span>
              </div>
            </div>
            <p className="text-yellow-400 text-xs text-center mt-2">⚠️ Se recomienda cambiar la contraseña</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Powered by <span className="text-cyan-400 font-semibold">Claude AI</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
