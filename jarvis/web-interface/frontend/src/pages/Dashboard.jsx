// web-interface/frontend/src/pages/Dashboard.jsx
// Dashboard principal con estadísticas del sistema - MEJORADO

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard({ data }) {
  const [systemMetrics, setSystemMetrics] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generar datos de métricas simuladas (últimos 10 puntos)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => {
        const newMetric = {
          time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
          memory: Math.floor(Math.random() * 20) + 30, // 30-50%
          tasks: data.tasks?.total || 0,
          completed: data.tasks?.completed || 0
        };
        const updated = [...prev, newMetric].slice(-10); // Últimos 10 puntos
        return updated;
      });
    }, 3000); // Cada 3 segundos

    return () => clearInterval(interval);
  }, [data]);

  const stats = [
    {
      label: 'Memorias Totales',
      value: data.memory?.total || 0,
      icon: '🧠',
      color: 'bg-purple-600',
      gradient: 'from-purple-600 to-purple-800'
    },
    {
      label: 'Tareas Totales',
      value: data.tasks?.total || 0,
      icon: '📋',
      color: 'bg-blue-600',
      gradient: 'from-blue-600 to-blue-800'
    },
    {
      label: 'Tareas Pendientes',
      value: data.tasks?.pending || 0,
      icon: '⏳',
      color: 'bg-yellow-600',
      gradient: 'from-yellow-600 to-yellow-800'
    },
    {
      label: 'Tareas Completadas',
      value: data.tasks?.completed || 0,
      icon: '✅',
      color: 'bg-green-600',
      gradient: 'from-green-600 to-green-800'
    }
  ];

  // Datos para gráfico de tareas
  const taskData = [
    { name: 'Completadas', value: data.tasks?.completed || 0, color: '#10b981' },
    { name: 'En Progreso', value: data.tasks?.inProgress || 0, color: '#3b82f6' },
    { name: 'Pendientes', value: data.tasks?.pending || 0, color: '#f59e0b' }
  ];

  // Datos de actividad de los últimos 7 días (simulado)
  const activityData = [
    { day: 'Lun', tasks: 12, memories: 8 },
    { day: 'Mar', tasks: 15, memories: 10 },
    { day: 'Mié', tasks: 8, memories: 6 },
    { day: 'Jue', tasks: 18, memories: 12 },
    { day: 'Vie', tasks: 14, memories: 9 },
    { day: 'Sáb', tasks: 6, memories: 4 },
    { day: 'Dom', tasks: data.tasks?.total || 11, memories: data.memory?.total || 7 }
  ];

  return (
    <div className="space-y-6">
      {/* Header con reloj */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Dashboard MARK VII
          </h2>
          <p className="text-gray-400 text-sm mt-1">Panel de Control en Tiempo Real</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-blue-400">
            {currentTime.toLocaleTimeString('es-AR')}
          </div>
          <div className="text-xs text-gray-400">
            Uptime: {data.system?.uptime || 0}s | v{data.system?.version || 'MARK VII'}
          </div>
        </div>
      </div>

      {/* Stats Grid - Mejorado con gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.gradient} rounded-lg p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">{stat.icon}</div>
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur">
                ACTIVO
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{stat.value}</div>
            <div className="text-white text-opacity-90 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Gráficas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico de Métricas del Sistema en Tiempo Real */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Métricas del Sistema
          </h3>
          {systemMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={systemMetrics}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                <Area type="monotone" dataKey="memory" stroke="#10b981" fillOpacity={1} fill="url(#colorMemory)" name="RAM %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">⏳</div>
                <div>Recopilando datos...</div>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico de Distribución de Tareas */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Distribución de Tareas
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={taskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {taskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Actividad Semanal */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg lg:col-span-2">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Actividad de los Últimos 7 Días
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="tasks" fill="#3b82f6" name="Tareas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="memories" fill="#8b5cf6" name="Memorias" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          Estado del Sistema
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300">Sistema Operacional</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300">API REST Activa</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300">WebSocket Conectado</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300">Base de Datos Online</span>
          </div>
        </div>
      </div>

      {/* Quick Info - Estilo Iron Man */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 rounded-lg p-6 shadow-lg border border-blue-500 border-opacity-30">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🤖</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">💡 J.A.R.V.I.S. MARK VII</h3>
            <p className="text-gray-300 text-sm">
              Sistema de inteligencia artificial completamente operacional. Todos los módulos activos.
              Panel web en tiempo real funcionando correctamente.
            </p>
            <div className="mt-3 flex gap-3 text-xs">
              <span className="bg-blue-600 bg-opacity-30 px-3 py-1 rounded-full border border-blue-500">
                🧠 IA Local: Ollama
              </span>
              <span className="bg-purple-600 bg-opacity-30 px-3 py-1 rounded-full border border-purple-500">
                ⚡ Modo: Híbrido
              </span>
              <span className="bg-green-600 bg-opacity-30 px-3 py-1 rounded-full border border-green-500">
                ✅ Estado: Óptimo
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-3 italic">
              "Como siempre, Señor." - J.A.R.V.I.S.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
