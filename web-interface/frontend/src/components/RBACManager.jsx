import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Group as GroupIcon
} from '@mui/icons-material';

const RBACManager = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const [assignForm, setAssignForm] = useState({
    userId: '',
    roleId: ''
  });

  const [roleForm, setRoleForm] = useState({
    id: '',
    name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchStats();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/rbac/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching roles');

      const data = await response.json();
      setRoles(data.roles || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/services/rbac/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching permissions');

      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/services/rbac/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching stats');

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleAssignRole = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/rbac/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assignForm)
      });

      if (!response.ok) throw new Error('Error assigning role');

      alert('Rol asignado exitosamente');
      setAssignDialogOpen(false);
      setAssignForm({ userId: '', roleId: '' });
      fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (userId, roleId) => {
    if (!confirm('¿Está seguro de remover este rol?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/services/rbac/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, roleId })
      });

      if (!response.ok) throw new Error('Error removing role');

      alert('Rol removido exitosamente');
      fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermissionToRole = async (roleId, resource, action) => {
    try {
      const response = await fetch('/api/services/rbac/role/permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roleId, resource, action })
      });

      if (!response.ok) throw new Error('Error adding permission');

      alert('Permiso agregado exitosamente');
      fetchRoles();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getRoleColor = (roleId) => {
    const colors = {
      'super_admin': 'error',
      'admin': 'warning',
      'manager': 'primary',
      'cashier': 'success',
      'waiter': 'info',
      'viewer': 'default'
    };
    return colors[roleId] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          RBAC Manager
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Asignar Rol
          </Button>
          <IconButton onClick={() => { fetchRoles(); fetchStats(); }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Roles</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.roles || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Roles definidos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <KeyIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Permisos</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.permissions || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Permisos únicos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Usuarios</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.users || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Con roles asignados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SecurityIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Cache</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.cacheSize || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.cacheHitRate?.toFixed(1) || 0}% hit rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Roles" />
          <Tab label="Permisos" />
          <Tab label="Usuarios" />
        </Tabs>
      </Paper>

      {/* Tab: Roles */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid item xs={12} md={6} key={role.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {role.name}
                      </Typography>
                      <Chip
                        label={role.id}
                        size="small"
                        color={getRoleColor(role.id)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {role.description}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Permisos ({role.permissions?.length || 0}):
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {role.permissions?.slice(0, 10).map((perm, idx) => (
                      <Chip
                        key={idx}
                        label={`${perm.resource}:${perm.action}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {role.permissions?.length > 10 && (
                      <Chip
                        label={`+${role.permissions.length - 10} más`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab: Permisos */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Permisos del Sistema
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Recurso</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Roles con este permiso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map((perm, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Chip label={perm.resource} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip label={perm.action} size="small" />
                    </TableCell>
                    <TableCell>{perm.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {roles
                          .filter(r => r.permissions?.some(p =>
                            (p.resource === perm.resource || p.resource === '*') &&
                            (p.action === perm.action || p.action === '*')
                          ))
                          .map(r => (
                            <Chip
                              key={r.id}
                              label={r.name}
                              size="small"
                              color={getRoleColor(r.id)}
                            />
                          ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Usuarios */}
      {activeTab === 2 && stats?.userRoles && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Roles de Usuarios
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Roles Asignados</TableCell>
                  <TableCell>Permisos Totales</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(stats.userRoles).map(([userId, userRoleIds]) => (
                  <TableRow key={userId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        {userId}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {userRoleIds.map((roleId) => {
                          const role = roles.find(r => r.id === roleId);
                          return role ? (
                            <Chip
                              key={roleId}
                              label={role.name}
                              size="small"
                              color={getRoleColor(roleId)}
                              onDelete={() => handleRemoveRole(userId, roleId)}
                            />
                          ) : null;
                        })}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {userRoleIds.reduce((total, roleId) => {
                        const role = roles.find(r => r.id === roleId);
                        return total + (role?.permissions?.length || 0);
                      }, 0)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setAssignForm({ userId, roleId: '' });
                          setAssignDialogOpen(true);
                        }}
                      >
                        Agregar Rol
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Asignar Rol */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar Rol a Usuario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="User ID"
            value={assignForm.userId}
            onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
            type="number"
            sx={{ mt: 2, mb: 2 }}
            disabled={!!assignForm.userId}
          />

          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select
              value={assignForm.roleId}
              onChange={(e) => setAssignForm({ ...assignForm, roleId: e.target.value })}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Chip
                      label={role.name}
                      size="small"
                      color={getRoleColor(role.id)}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="caption">
                      ({role.permissions?.length || 0} permisos)
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleAssignRole}
            variant="contained"
            disabled={loading || !assignForm.userId || !assignForm.roleId}
          >
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RBACManager;
