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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const EmailSMSPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('email');

  // Form states
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    template: '',
    data: '{}'
  });

  const [smsForm, setSmsForm] = useState({
    to: '',
    message: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    schedule: '0 0 * * *',
    channel: 'email',
    notification: '{}'
  });

  const templates = [
    'welcome-email',
    'order-confirmation',
    'payment-receipt',
    'low-stock-alert',
    'daily-report'
  ];

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching stats');

      const data = await response.json();
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          template: emailForm.template,
          data: JSON.parse(emailForm.data)
        })
      });

      if (!response.ok) throw new Error('Error sending email');

      alert('Email enviado exitosamente');
      setSendDialogOpen(false);
      setEmailForm({ to: '', subject: '', template: '', data: '{}' });
      fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/notifications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: smsForm.to,
          message: smsForm.message
        })
      });

      if (!response.ok) throw new Error('Error sending SMS');

      alert('SMS enviado exitosamente');
      setSendDialogOpen(false);
      setSmsForm({ to: '', message: '' });
      fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleNotification = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...scheduleForm,
          notification: JSON.parse(scheduleForm.notification)
        })
      });

      if (!response.ok) throw new Error('Error scheduling notification');

      alert('Notificación programada exitosamente');
      setScheduleDialogOpen(false);
      setScheduleForm({ name: '', schedule: '0 0 * * *', channel: 'email', notification: '{}' });
      fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Email & SMS Service
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSendDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Enviar
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScheduleIcon />}
            onClick={() => setScheduleDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Programar
          </Button>
          <IconButton onClick={fetchStats}>
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
                  Emails Enviados
                </Typography>
                <Typography variant="h4">
                  {stats.email?.sent || 0}
                </Typography>
                <Chip
                  label={`${stats.email?.failureRate?.toFixed(1) || 0}% fallos`}
                  color={stats.email?.failureRate > 10 ? 'error' : 'success'}
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
                  SMS Enviados
                </Typography>
                <Typography variant="h4">
                  {stats.sms?.sent || 0}
                </Typography>
                <Chip
                  label={`${stats.sms?.failureRate?.toFixed(1) || 0}% fallos`}
                  color={stats.sms?.failureRate > 10 ? 'error' : 'success'}
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
                  {stats.queue?.pending || 0}
                </Typography>
                <Chip
                  label={`${stats.queue?.total || 0} total`}
                  color="info"
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
                  Templates
                </Typography>
                <Typography variant="h4">
                  {stats.templates || 0}
                </Typography>
                <Chip
                  label="Disponibles"
                  color="primary"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Notificaciones Programadas */}
      {stats?.scheduled && stats.scheduled.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notificaciones Programadas
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Canal</TableCell>
                  <TableCell>Horario (Cron)</TableCell>
                  <TableCell>Próxima Ejecución</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.scheduled.map((job) => (
                  <TableRow key={job.name}>
                    <TableCell>{job.name}</TableCell>
                    <TableCell>
                      <Chip
                        icon={job.channel === 'email' ? <EmailIcon /> : <SmsIcon />}
                        label={job.channel.toUpperCase()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <code>{job.schedule}</code>
                    </TableCell>
                    <TableCell>{job.nextRun || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Enviar Notificación */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Enviar Notificación</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Canal</InputLabel>
            <Select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </Select>
          </FormControl>

          {selectedChannel === 'email' ? (
            <>
              <TextField
                fullWidth
                label="Destinatario(s)"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                placeholder="email@ejemplo.com o email1@ejemplo.com,email2@ejemplo.com"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Asunto"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={emailForm.template}
                  onChange={(e) => setEmailForm({ ...emailForm, template: e.target.value })}
                >
                  {templates.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Datos (JSON)"
                value={emailForm.data}
                onChange={(e) => setEmailForm({ ...emailForm, data: e.target.value })}
                multiline
                rows={4}
                placeholder='{"name": "Usuario", "total": 100}'
              />
            </>
          ) : (
            <>
              <TextField
                fullWidth
                label="Número de Teléfono"
                value={smsForm.to}
                onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                placeholder="+1234567890"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Mensaje"
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                multiline
                rows={4}
                inputProps={{ maxLength: 160 }}
                helperText={`${smsForm.message.length}/160 caracteres`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={selectedChannel === 'email' ? handleSendEmail : handleSendSMS}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Programar Notificación */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Programar Notificación</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre del Job"
            value={scheduleForm.name}
            onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Expresión Cron"
            value={scheduleForm.schedule}
            onChange={(e) => setScheduleForm({ ...scheduleForm, schedule: e.target.value })}
            helperText="Ej: 0 0 * * * = Todos los días a medianoche"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Canal</InputLabel>
            <Select
              value={scheduleForm.channel}
              onChange={(e) => setScheduleForm({ ...scheduleForm, channel: e.target.value })}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Configuración de Notificación (JSON)"
            value={scheduleForm.notification}
            onChange={(e) => setScheduleForm({ ...scheduleForm, notification: e.target.value })}
            multiline
            rows={6}
            placeholder='{"to": "email@ejemplo.com", "subject": "Reporte", "template": "daily-report"}'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleScheduleNotification}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ScheduleIcon />}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailSMSPanel;
