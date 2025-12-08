/**
 * =====================================================
 * SYSME POS - Loyalty Program Management Page
 * =====================================================
 * Página de gestión del programa de fidelización (Tailwind CSS)
 *
 * @module LoyaltyPage
 * @date 2025-12-08
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ============================================
// INTERFACES
// ============================================

interface LoyaltyTier {
  id: number;
  name: string;
  code: string;
  color: string;
  min_points: number;
  points_multiplier: number;
  discount_percentage: number;
  total_members?: number;
}

interface LoyaltyMember {
  id: number;
  membership_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  current_points: number;
  lifetime_points: number;
  total_visits: number;
  total_spent: number;
  tier_name?: string;
  tier_color?: string;
  engagement_status?: 'active' | 'at_risk' | 'inactive';
  status: 'active' | 'suspended' | 'cancelled';
}

interface LoyaltyReward {
  id: number;
  code: string;
  name: string;
  description?: string;
  reward_type: string;
  points_cost: number;
  min_tier_name?: string;
  featured: boolean;
  is_active: boolean;
  total_redemptions?: number;
}

interface DashboardStats {
  member_stats: Array<{ status: string; count: number }>;
  points_stats: {
    total_earned: number;
    total_redeemed: number;
    total_expired: number;
  };
  engagement_stats: {
    active_last_30_days: number;
    at_risk: number;
    inactive: number;
  };
}

const LoyaltyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'rewards' | 'tiers'>('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [topMembers, setTopMembers] = useState<LoyaltyMember[]>([]);

  // Members state
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [membersPage, setMembersPage] = useState(0);
  const [membersTotalCount, setMembersTotalCount] = useState(0);
  const [memberFilter, setMemberFilter] = useState('active');

  // Rewards state
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [rewardsPage, setRewardsPage] = useState(0);
  const [rewardsTotalCount, setRewardsTotalCount] = useState(0);

  // Tiers state
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeTab, membersPage, rewardsPage, memberFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        await Promise.all([fetchDashboard(), fetchTiers()]);
      } else if (activeTab === 'members') {
        await fetchMembers();
      } else if (activeTab === 'rewards') {
        await fetchRewards();
      } else if (activeTab === 'tiers') {
        await fetchTiers();
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const [statsRes, topRes] = await Promise.all([
        axios.get(`${API_URL}/loyalty/dashboard/stats`),
        axios.get(`${API_URL}/loyalty/members/top?sort_by=lifetime_points&limit=10`)
      ]);
      setDashboardStats(statsRes.data.data);
      setTopMembers(topRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/loyalty/members`, {
        params: {
          status: memberFilter === 'all' ? undefined : memberFilter,
          limit: 10,
          offset: membersPage * 10
        }
      });
      setMembers(res.data.data);
      setMembersTotalCount(res.data.pagination.total);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchRewards = async () => {
    try {
      const res = await axios.get(`${API_URL}/loyalty/rewards`, {
        params: {
          is_active: '1',
          limit: 12,
          offset: rewardsPage * 12
        }
      });
      setRewards(res.data.data);
      setRewardsTotalCount(res.data.pagination.total);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const fetchTiers = async () => {
    try {
      const res = await axios.get(`${API_URL}/loyalty/tiers`);
      setTiers(res.data.data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const formatPoints = (points: number): string => {
    return points.toLocaleString('es-CL') + ' pts';
  };

  const formatCLP = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getEngagementColor = (status?: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementLabel = (status?: string): string => {
    switch (status) {
      case 'active': return 'Activo';
      case 'at_risk': return 'En Riesgo';
      case 'inactive': return 'Inactivo';
      default: return 'N/A';
    }
  };

  const getRewardTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      discount: 'Descuento',
      free_item: 'Item Gratis',
      cashback: 'Cashback',
      upgrade: 'Mejora',
      gift: 'Regalo'
    };
    return labels[type] || type;
  };

  // ============================================
  // DASHBOARD TAB
  // ============================================
  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Miembros Activos</p>
              <p className="text-3xl font-bold">
                {dashboardStats?.member_stats.find(s => s.status === 'active')?.count || 0}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Puntos Ganados (30d)</p>
              <p className="text-3xl font-bold text-green-600">
                {formatPoints(dashboardStats?.points_stats.total_earned || 0)}
              </p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Puntos Canjeados (30d)</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatPoints(dashboardStats?.points_stats.total_redeemed || 0)}
              </p>
            </div>
            <div className="text-4xl">🎁</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Engagement</p>
              <p className="text-3xl font-bold text-blue-600">
                {dashboardStats?.engagement_stats.active_last_30_days || 0}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Tiers Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">🏆 Distribución por Niveles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="border rounded-lg p-4" style={{ borderColor: tier.color }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.name}
                </span>
              </div>
              <p className="text-3xl font-bold mb-1">{tier.total_members || 0}</p>
              <p className="text-sm text-gray-600 mb-2">miembros</p>
              <div className="text-xs space-y-1">
                <p>✨ Multiplicador: {tier.points_multiplier}x</p>
                <p>💰 Descuento: {tier.discount_percentage}%</p>
                <p>🎯 Min. puntos: {formatPoints(tier.min_points)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Members */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">🏅 Top 10 Miembros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Miembro</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nivel</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Puntos Lifetime</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Gasto Total</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Visitas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topMembers.map((member, index) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index < 3 ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-gray-500">{member.membership_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: member.tier_color || '#6B7280' }}
                    >
                      {member.tier_name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-purple-600">{formatPoints(member.lifetime_points)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCLP(member.total_spent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.total_visits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MEMBERS TAB
  // ============================================
  const renderMembersTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
        <label className="font-semibold">Estado:</label>
        <select
          value={memberFilter}
          onChange={(e) => {
            setMemberFilter(e.target.value);
            setMembersPage(0);
          }}
          className="border rounded-lg px-4 py-2"
        >
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="cancelled">Cancelados</option>
          <option value="all">Todos</option>
        </select>
        <button
          onClick={fetchMembers}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Membresía</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Miembro</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nivel</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Puntos</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Gasto</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Visitas</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Engagement</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{member.membership_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: member.tier_color || '#6B7280' }}
                    >
                      {member.tier_name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-purple-600">{formatPoints(member.current_points)}</p>
                    <p className="text-xs text-gray-500">Lifetime: {formatPoints(member.lifetime_points)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCLP(member.total_spent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.total_visits}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEngagementColor(member.engagement_status)}`}>
                      {getEngagementLabel(member.engagement_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-blue-600 hover:text-blue-800 mr-2" title="Ver detalles">
                      👁️
                    </button>
                    <button className="text-green-600 hover:text-green-800" title="Otorgar puntos">
                      ⭐
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {membersPage * 10 + 1} - {Math.min((membersPage + 1) * 10, membersTotalCount)} de {membersTotalCount}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setMembersPage(Math.max(0, membersPage - 1))}
              disabled={membersPage === 0}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setMembersPage(membersPage + 1)}
              disabled={(membersPage + 1) * 10 >= membersTotalCount}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // REWARDS TAB
  // ============================================
  const renderRewardsTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <h2 className="text-xl font-bold">🎁 Recompensas Disponibles</h2>
        <button
          onClick={fetchRewards}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                {getRewardTypeLabel(reward.reward_type)}
              </span>
              {reward.featured && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                  ⭐ Destacado
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold mb-2">{reward.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-2xl font-bold text-purple-600">{formatPoints(reward.points_cost)}</p>
                <p className="text-xs text-gray-500">Min. nivel: {reward.min_tier_name}</p>
              </div>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Canjear
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Canjeados: {reward.total_redemptions || 0} veces
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {rewardsPage * 12 + 1} - {Math.min((rewardsPage + 1) * 12, rewardsTotalCount)} de {rewardsTotalCount}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setRewardsPage(Math.max(0, rewardsPage - 1))}
            disabled={rewardsPage === 0}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setRewardsPage(rewardsPage + 1)}
            disabled={(rewardsPage + 1) * 12 >= rewardsTotalCount}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // TIERS TAB
  // ============================================
  const renderTiersTab = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <h2 className="text-xl font-bold">🏆 Gestión de Niveles</h2>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          + Nuevo Nivel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div key={tier.id} className="bg-white rounded-lg shadow p-6" style={{ borderLeft: `4px solid ${tier.color}` }}>
            <div className="flex items-center justify-between mb-4">
              <span
                className="px-4 py-2 rounded-lg text-lg font-bold text-white"
                style={{ backgroundColor: tier.color }}
              >
                {tier.name}
              </span>
              <span className="text-3xl font-bold text-gray-600">{tier.total_members || 0} miembros</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Código:</span>
                <span className="font-mono font-semibold">{tier.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Puntos mínimos:</span>
                <span className="font-semibold">{formatPoints(tier.min_points)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Multiplicador de puntos:</span>
                <span className="font-semibold text-green-600">{tier.points_multiplier}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Descuento:</span>
                <span className="font-semibold text-blue-600">{tier.discount_percentage}%</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex space-x-2">
              <button className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                ✏️ Editar
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                📊 Analytics
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">💎 Programa de Fidelización</h1>
          <p className="text-gray-600">Gestión de miembros, puntos, recompensas y niveles</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Miembros
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rewards'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎁 Recompensas
              </button>
              <button
                onClick={() => setActiveTab('tiers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tiers'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏆 Niveles
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'dashboard' && renderDashboardTab()}
            {activeTab === 'members' && renderMembersTab()}
            {activeTab === 'rewards' && renderRewardsTab()}
            {activeTab === 'tiers' && renderTiersTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default LoyaltyPage;
