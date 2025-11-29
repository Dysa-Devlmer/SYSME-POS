import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Webhook as WebhookIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  const [webhookForm, setWebhookForm] = useState({
    id: '',
    url: '',
    events: [],
    secret: '',
    active: true,
    retryAttempts: 3,
    timeout: 5000,
    metadata: '{}'
  });

  const [testForm, setTestForm] = useState({
    webhookId: '',
    event: '',
    data: '{}'
  });

  const availableEvents = [
    'order.created',
    'order.updated',
    'order.cancelled',
    'payment.completed',
    'payment.failed',
    'product.created',
    'product.updated',
    'product.deleted',
    'inventory.low_stock',
    'user.created',
    'user.updated'
  ];

  useEffect(() => {
    fetchWebhooks();
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/webhooks/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching webhooks');

      const data = await response.json();
      setWebhooks(data.webhooks || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/services/webhooks/stats', {
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

  const handleCreateWebhook = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/webhooks/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...webhookForm,
          metadata: JSON.parse(webhookForm.metadata)
        })
      });

      if (!response.ok) throw new Error('Error creating webhook');

      alert('Webhook creado exitosamente');
      setDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWebhook = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services/webhooks/${webhookForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...webhookForm,
          metadata: JSON.parse(webhookForm.metadata)
        })
      });

      if (!response.ok) throw new Error('Error updating webhook');

      alert('Webhook actualizado exitosamente');
      setDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('¿Está seguro de eliminar este webhook?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/services/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error deleting webhook');

      alert('Webhook eliminado exitosamente');
      fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          webhookId: testForm.webhookId,
          event: testForm.event,
          data: JSON.parse(testForm.data)
        })
      });

      if (!response.ok) throw new Error('Error testing webhook');

      const result = await response.json();
      alert(`Test exitoso!\nStatus: ${result.statusCode}\nTiempo: ${result.duration}ms`);
      setTestDialogOpen(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWebhookForm({
      id: '',
      url: '',
      events: [],
      secret: '',
      active: true,
      retryAttempts: 3,
      timeout: 5000,
      metadata: '{}'
    });
    setSelectedWebhook(null);
  };

  const openEditDialog = (webhook) => {
    setSelectedWebhook(webhook);
    setWebhookForm({
      ...webhook,
      metadata: JSON.stringify(webhook.metadata || {}, null, 2)
    });
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <WebhookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Webhook Manager
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { resetForm(); setDialogOpen(true); }}
            sx={{ mr: 1 }}
          >
            Nuevo Webhook
          </Button>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setTestDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Test
          </Button>
          <IconButton onClick={() => { fetchWebhooks(); fetchStats(); }}>
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
                <Typography color="textSecondary" gutterBottom>
                  Total Webhooks
                </Typography>
                <Typography variant="h4">
                  {stats.totalWebhooks || 0}
                </Typography>
                <Chip
                  label={`${stats.activeWebhooks || 0} activos`}
                  color="success"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Deliveries Exitosos
                </Typography>
                <Typography variant="h4">
                  {stats.successfulDeliveries || 0}
                </Typography>
                <Chip
                  label={`${stats.successRate?.toFixed(1) || 0}% rate`}
                  color={stats.successRate > 95 ? 'success' : 'warning'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Deliveries Fallidos
                </Typography>
                <Typography variant="h4" color="error">
                  {stats.failedDeliveries || 0}
                </Typography>
                <Chip
                  label={`${stats.retryRate?.toFixed(1) || 0}% retries`}
                  color="error"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  En Cola
                </Typography>
                <Typography variant="h4">
                  {stats.queueSize || 0}
                </Typography>
                <Chip
                  label="Pendientes"
                  color="info"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Webhooks" />
          <Tab label="Historial de Deliveries" />
        </Tabs>
      </Paper>

      {/* Tab: Lista de Webhooks */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Eventos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Reintentos</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {webhook.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {webhook.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {webhook.events.slice(0, 3).map((event) => (
                          <Chip key={event} label={event} size="small" />
                        ))}
                        {webhook.events.length > 3 && (
                          <Chip label={`+${webhook.events.length - 3}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={webhook.active ? <CheckIcon /> : <ErrorIcon />}
                        label={webhook.active ? 'Activo' : 'Inactivo'}
                        color={webhook.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{webhook.retryAttempts || 3}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEditDialog(webhook)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteWebhook(webhook.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {webhooks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No hay webhooks configurados</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Historial */}
      {activeTab === 1 && stats?.deliveryHistory && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Últimos Deliveries</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Webhook</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duración</TableCell>
                  <TableCell>Intentos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.deliveryHistory.slice(0, 50).map((delivery, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(delivery.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {delivery.webhookId.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{delivery.event}</TableCell>
                    <TableCell>
                      <Chip
                        label={delivery.success ? 'Success' : 'Failed'}
                        color={delivery.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{delivery.duration}ms</TableCell>
                    <TableCell>{delivery.attempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Crear/Editar Webhook */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
        </DialogTitle>
        <DialogContent>
          {!selectedWebhook && (
            <TextField
              fullWidth
              label="ID (opcional)"
              value={webhookForm.id}
              onChange={(e) => setWebhookForm({ ...webhookForm, id: e.target.value })}
              helperText="Dejar vacío para auto-generar"
              sx={{ mt: 2, mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            label="URL"
            value={webhookForm.url}
            onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            placeholder="https://example.com/webhook"
            required
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Eventos</InputLabel>
            <Select
              multiple
              value={webhookForm.events}
              onChange={(e) => setWebhookForm({ ...webhookForm, events: e.target.value })}
              input={<OutlinedInput label="Eventos" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableEvents.map((event) => (
                <MenuItem key={event} value={event}>
                  {event}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Secret (HMAC)"
            value={webhookForm.secret}
            onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
            type="password"
            helperText="Usado para firmar los payloads"
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Reintentos"
                type="number"
                value={webhookForm.retryAttempts}
                onChange={(e) => setWebhookForm({ ...webhookForm, retryAttempts: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 5 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Timeout (ms)"
                type="number"
                value={webhookForm.timeout}
                onChange={(e) => setWebhookForm({ ...webhookForm, timeout: parseInt(e.target.value) })}
                inputProps={{ min: 1000, max: 30000 }}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={webhookForm.active}
                onChange={(e) => setWebhookForm({ ...webhookForm, active: e.target.checked })}
              />
            }
            label="Activo"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Metadata (JSON)"
            value={webhookForm.metadata}
            onChange={(e) => setWebhookForm({ ...webhookForm, metadata: e.target.value })}
            multiline
            rows={4}
            placeholder='{"customer": "acme-corp", "environment": "production"}'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={selectedWebhook ? handleUpdateWebhook : handleCreateWebhook}
            variant="contained"
            disabled={loading || !webhookForm.url || webhookForm.events.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : (selectedWebhook ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Test Webhook */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Webhook</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Webhook</InputLabel>
            <Select
              value={testForm.webhookId}
              onChange={(e) => setTestForm({ ...testForm, webhookId: e.target.value })}
            >
              {webhooks.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.url}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Evento"
            value={testForm.event}
            onChange={(e) => setTestForm({ ...testForm, event: e.target.value })}
            placeholder="order.created"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Datos (JSON)"
            value={testForm.data}
            onChange={(e) => setTestForm({ ...testForm, data: e.target.value })}
            multiline
            rows={6}
            placeholder='{"orderId": 123, "total": 99.99}'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleTestWebhook}
            variant="contained"
            disabled={loading || !testForm.webhookId || !testForm.event}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Enviar Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebhookManager;
