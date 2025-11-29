import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Paper
} from '@mui/material';
import {
  Email as EmailIcon,
  Speed as SpeedIcon,
  Webhook as WebhookIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

// Import all service components
import EmailSMSPanel from './EmailSMSPanel';
import PerformanceMonitor from './PerformanceMonitor';
import WebhookManager from './WebhookManager';
import RBACManager from './RBACManager';
import I18nManager from './I18nManager';

const ServicesHub = () => {
  const [activeService, setActiveService] = useState(null);

  const services = [
    {
      id: 'email-sms',
      name: 'Email & SMS',
      icon: <EmailIcon fontSize="large" />,
      color: '#1976d2',
      description: 'Gestión de notificaciones por email y SMS',
      component: EmailSMSPanel,
      features: ['Templates', 'Scheduling', 'Queue Management', 'Statistics']
    },
    {
      id: 'performance',
      name: 'Performance Monitor',
      icon: <SpeedIcon fontSize="large" />,
      color: '#2e7d32',
      description: 'Monitoreo en tiempo real del rendimiento del sistema',
      component: PerformanceMonitor,
      features: ['CPU Tracking', 'Memory Profiling', 'Bottleneck Detection', 'Auto-Optimization']
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      icon: <WebhookIcon fontSize="large" />,
      color: '#ed6c02',
      description: 'Gestión de webhooks para integración con sistemas externos',
      component: WebhookManager,
      features: ['HMAC Signatures', 'Retry Logic', 'Event Filtering', 'Rate Limiting']
    },
    {
      id: 'rbac',
      name: 'RBAC',
      icon: <SecurityIcon fontSize="large" />,
      color: '#d32f2f',
      description: 'Control de acceso basado en roles y permisos',
      component: RBACManager,
      features: ['Role Management', 'Permission Assignment', 'Wildcard Support', 'Cache System']
    },
    {
      id: 'i18n',
      name: 'Internationalization',
      icon: <LanguageIcon fontSize="large" />,
      color: '#9c27b0',
      description: 'Sistema de internacionalización multi-idioma',
      component: I18nManager,
      features: ['Multi-language', 'Locale Detection', 'Parameter Interpolation', 'Fallbacks']
    }
  ];

  if (activeService) {
    const service = services.find(s => s.id === activeService);
    const ServiceComponent = service.component;

    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => setActiveService(null)}
          >
            Volver al Hub
          </Button>
          <Typography variant="h5">
            {service.icon} {service.name}
          </Typography>
        </Box>
        <ServiceComponent />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Services Hub
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Panel de control centralizado para los servicios enterprise v2.1
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {services.map((service) => (
          <Grid item xs={12} md={6} lg={4} key={service.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                borderTop: `4px solid ${service.color}`
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    color: service.color
                  }}
                >
                  {service.icon}
                  <Typography variant="h5" sx={{ ml: 1 }}>
                    {service.name}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {service.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary" gutterBottom>
                    Características:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {service.features.map((feature) => (
                      <Chip
                        key={feature}
                        label={feature}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setActiveService(service.id)}
                  sx={{
                    mt: 'auto',
                    bgcolor: service.color,
                    '&:hover': {
                      bgcolor: service.color,
                      filter: 'brightness(0.9)'
                    }
                  }}
                >
                  Abrir {service.name}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats Overview */}
      <Paper sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          Servicios Enterprise v2.1
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              <strong>6 Servicios Integrados:</strong> Email/SMS, Performance, Config, Webhooks, RBAC, i18n
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              <strong>Características:</strong> Real-time monitoring, Auto-optimization, Event-driven
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              <strong>APIs:</strong> REST + WebSocket, JWT Auth, Rate Limiting
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ServicesHub;
