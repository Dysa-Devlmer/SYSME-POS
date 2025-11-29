import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const PerformanceMonitor = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState({
    cpu: [],
    memory: [],
    requests: []
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Actualizar cada 3s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/performance/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching stats');

      const data = await response.json();
      setStats(data.stats);
      updateHistory(data.stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateHistory = (newStats) => {
    const timestamp = new Date().toLocaleTimeString();

    setHistory(prev => ({
      cpu: [...prev.cpu.slice(-19), { time: timestamp, value: newStats.cpu.current }],
      memory: [...prev.memory.slice(-19), { time: timestamp, value: newStats.memory.usagePercent }],
      requests: [...prev.requests.slice(-19), { time: timestamp, value: newStats.requests.total }]
    }));
  };

  const getColorByValue = (value, warning = 70, critical = 90) => {
    if (value >= critical) return 'error';
    if (value >= warning) return 'warning';
    return 'success';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Performance Monitor
        </Typography>
        <IconButton onClick={fetchStats}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Métricas Principales */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">CPU</Typography>
                  </Box>
                  <Typography variant="h3">
                    {stats.cpu.current?.toFixed(1) || 0}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.cpu.current || 0}
                    color={getColorByValue(stats.cpu.current)}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Chip label={`Avg: ${stats.cpu.avg?.toFixed(1)}%`} size="small" />
                    <Chip label={`Max: ${stats.cpu.max?.toFixed(1)}%`} size="small" color="error" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Memoria</Typography>
                  </Box>
                  <Typography variant="h3">
                    {stats.memory.usagePercent?.toFixed(1) || 0}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.memory.usagePercent || 0}
                    color={getColorByValue(stats.memory.usagePercent)}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Chip label={formatBytes(stats.memory.heapUsed)} size="small" />
                    <Chip label={`/${formatBytes(stats.memory.heapTotal)}`} size="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Requests</Typography>
                  </Box>
                  <Typography variant="h3">
                    {stats.requests.total || 0}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Chip label={`${stats.requests.rps?.toFixed(1)} req/s`} size="small" color="info" />
                    <Chip
                      label={`${formatDuration(stats.requests.avgDuration)}`}
                      size="small"
                      color={stats.requests.avgDuration > 1000 ? 'warning' : 'success'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TimeIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Uptime</Typography>
                  </Box>
                  <Typography variant="h3">
                    {Math.floor((stats.uptime || 0) / 3600)}h
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {Math.floor(((stats.uptime || 0) % 3600) / 60)} minutos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Gráficos" />
              <Tab label="Operaciones" />
              <Tab label="Bottlenecks" />
              <Tab label="Alertas" />
            </Tabs>
          </Paper>

          {/* Tab: Gráficos */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={history.cpu}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={history.memory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Request Rate</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={history.requests}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#ffc658" name="Total Requests" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Tab: Operaciones */}
          {activeTab === 1 && stats.operations && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Operations</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Operación</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Avg Duration</TableCell>
                      <TableCell align="right">Min</TableCell>
                      <TableCell align="right">Max</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.operations.slice(0, 10).map((op) => (
                      <TableRow key={op.name}>
                        <TableCell>{op.name}</TableCell>
                        <TableCell align="right">{op.count}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatDuration(op.avgDuration)}
                            size="small"
                            color={op.avgDuration > 1000 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{formatDuration(op.minDuration)}</TableCell>
                        <TableCell align="right">{formatDuration(op.maxDuration)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab: Bottlenecks */}
          {activeTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Bottlenecks Detectados
                </Typography>
                {stats.bottlenecks && stats.bottlenecks.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Severidad</TableCell>
                        <TableCell>Detectado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.bottlenecks.map((bottleneck, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{bottleneck.type}</TableCell>
                          <TableCell>{bottleneck.description}</TableCell>
                          <TableCell>
                            <Chip
                              label={bottleneck.severity}
                              size="small"
                              color={
                                bottleneck.severity === 'critical' ? 'error' :
                                bottleneck.severity === 'high' ? 'warning' : 'info'
                              }
                            />
                          </TableCell>
                          <TableCell>{new Date(bottleneck.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity="success">No se detectaron bottlenecks</Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Alertas */}
          {activeTab === 3 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <WarningIcon color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Alertas Activas
                </Typography>
                {stats.alerts && stats.alerts.length > 0 ? (
                  stats.alerts.map((alert, idx) => (
                    <Alert key={idx} severity={alert.level} sx={{ mb: 1 }}>
                      <Typography variant="subtitle1">{alert.message}</Typography>
                      <Typography variant="caption">{alert.details}</Typography>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="info">No hay alertas activas</Alert>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default PerformanceMonitor;
