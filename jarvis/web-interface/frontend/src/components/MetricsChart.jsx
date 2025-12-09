// web-interface/frontend/src/components/MetricsChart.jsx
// Componente de gráficos para visualizar métricas del Autonomous Agent

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MetricsChart = ({ type, data, title, height = 300 }) => {
  // Configuración común
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        color: '#f3f4f6',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        },
        beginAtZero: true
      }
    } : undefined
  };

  // Renderizar según tipo
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <div style={{ height: `${height}px` }}>
            <Line data={data} options={commonOptions} />
          </div>
        );

      case 'bar':
        return (
          <div style={{ height: `${height}px` }}>
            <Bar data={data} options={commonOptions} />
          </div>
        );

      case 'doughnut':
        return (
          <div style={{ height: `${height}px` }} className="flex items-center justify-center">
            <Doughnut
              data={data}
              options={{
                ...commonOptions,
                cutout: '60%'
              }}
            />
          </div>
        );

      default:
        return <p className="text-gray-400 text-center py-8">Tipo de gráfico no soportado</p>;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      {renderChart()}
    </div>
  );
};

// Helper functions para crear datos de gráficos

export const createScoreHistoryData = (sessions) => {
  if (!sessions || sessions.length === 0) {
    return {
      labels: ['Sin datos'],
      datasets: [{
        label: 'Score Promedio',
        data: [0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  // Últimas 10 sesiones
  const recentSessions = sessions.slice(-10);

  return {
    labels: recentSessions.map((s, i) => `Sesión ${i + 1}`),
    datasets: [{
      label: 'Score Promedio (%)',
      data: recentSessions.map(s => s.summary?.averageScore || 0),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }]
  };
};

export const createSuccessRateData = (stats) => {
  const successful = stats?.successfulSessions || 0;
  const failed = (stats?.totalSessions || 0) - successful;

  return {
    labels: ['Exitosas', 'Fallidas'],
    datasets: [{
      data: [successful, failed],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  };
};

export const createSubtasksByTypeData = (sessions) => {
  if (!sessions || sessions.length === 0) {
    return {
      labels: ['Sin datos'],
      datasets: [{
        label: 'Sub-tareas',
        data: [0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }]
    };
  }

  // Contar sub-tareas por tipo
  const typeCounts = {};

  sessions.forEach(session => {
    const plan = session.content?.plan;
    if (plan && plan.subtasks) {
      plan.subtasks.forEach(subtask => {
        const type = subtask.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
    }
  });

  const types = Object.keys(typeCounts);
  const counts = Object.values(typeCounts);

  const colors = {
    research: 'rgba(251, 191, 36, 0.8)',
    code: 'rgba(59, 130, 246, 0.8)',
    test: 'rgba(34, 197, 94, 0.8)',
    document: 'rgba(168, 85, 247, 0.8)',
    deploy: 'rgba(239, 68, 68, 0.8)',
    unknown: 'rgba(156, 163, 175, 0.8)'
  };

  return {
    labels: types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    datasets: [{
      label: 'Sub-tareas por Tipo',
      data: counts,
      backgroundColor: types.map(t => colors[t] || colors.unknown),
      borderColor: types.map(t => colors[t]?.replace('0.8', '1') || colors.unknown.replace('0.8', '1')),
      borderWidth: 2
    }]
  };
};

export const createTimelineData = (sessions) => {
  if (!sessions || sessions.length === 0) {
    return {
      labels: ['Sin datos'],
      datasets: [{
        label: 'Duración (s)',
        data: [0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }]
    };
  }

  // Últimas 10 sesiones
  const recentSessions = sessions.slice(-10);

  return {
    labels: recentSessions.map((s, i) => `S${i + 1}`),
    datasets: [
      {
        label: 'Exitosas',
        data: recentSessions.map(s =>
          s.content?.summary?.successful || 0
        ),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      },
      {
        label: 'Fallidas',
        data: recentSessions.map(s =>
          s.content?.summary?.failed || 0
        ),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      },
      {
        label: 'Corregidas',
        data: recentSessions.map(s =>
          s.content?.summary?.corrected || 0
        ),
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 1
      }
    ]
  };
};

export const createKnowledgeGrowthData = (stats) => {
  // Datos simulados de crecimiento (en producción vendría del backend)
  const totalKnowledge = stats?.webIntelligenceStats?.totalKnowledge || 0;
  const totalSearches = stats?.webIntelligenceStats?.totalSearches || 0;

  return {
    labels: ['Búsquedas', 'Conocimientos', 'Conceptos'],
    datasets: [{
      label: 'Web Intelligence',
      data: [
        totalSearches,
        totalKnowledge,
        stats?.webIntelligenceStats?.totalConcepts || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)',
        'rgb(34, 197, 94)'
      ],
      borderWidth: 2
    }]
  };
};

export const createMemoryDistributionData = (stats) => {
  const memoryStats = stats?.memoryStats || {};

  return {
    labels: ['Corto Plazo', 'Largo Plazo', 'Episódica'],
    datasets: [{
      data: [
        memoryStats.shortTermCount || 0,
        memoryStats.longTermCount || 0,
        memoryStats.episodicCount || 0
      ],
      backgroundColor: [
        'rgba(251, 191, 36, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)'
      ],
      borderColor: [
        'rgb(251, 191, 36)',
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)'
      ],
      borderWidth: 2
    }]
  };
};

export default MetricsChart;
