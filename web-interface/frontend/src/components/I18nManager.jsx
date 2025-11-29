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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Language as LanguageIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

const I18nManager = () => {
  const [locales, setLocales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedLocale, setSelectedLocale] = useState('es');
  const [testKey, setTestKey] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetchLocales();
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchLocales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/i18n/locales', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching locales');

      const data = await response.json();
      setLocales(data.locales || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/services/i18n/stats', {
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

  const handleTestTranslation = async () => {
    if (!testKey) return;

    try {
      const response = await fetch('/api/services/i18n/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          key: testKey,
          locale: selectedLocale,
          params: {}
        })
      });

      if (!response.ok) throw new Error('Error translating');

      const data = await response.json();
      setTestResult(data.text);
    } catch (err) {
      setTestResult('Error: ' + err.message);
    }
  };

  const getLocaleFlag = (code) => {
    const flags = {
      'es': '🇪🇸',
      'en': '🇺🇸',
      'pt': '🇧🇷',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹'
    };
    return flags[code] || '🌐';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <LanguageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          i18n Manager
        </Typography>
        <IconButton onClick={() => { fetchLocales(); fetchStats(); }}>
          <RefreshIcon />
        </IconButton>
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
                  <LanguageIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Locales</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.locales || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Idiomas soportados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <StorageIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Cache</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.cacheSize || 0}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                  <Chip label={`${stats.cacheHits || 0} hits`} size="small" color="success" />
                  <Chip label={`${stats.cacheMisses || 0} misses`} size="small" color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Hit Rate</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.cacheHitRate?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cache efficiency
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Missing Keys</Typography>
                </Box>
                <Typography variant="h3">
                  {stats.missingKeys?.length || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Traducciones no encontradas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Locales" />
          <Tab label="Missing Keys" />
          <Tab label="Test Translation" />
        </Tabs>
      </Paper>

      {/* Tab: Locales */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {locales.map((locale) => (
            <Grid item xs={12} md={4} key={locale.code}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h3" sx={{ mr: 1 }}>
                      {getLocaleFlag(locale.code)}
                    </Typography>
                    <Box>
                      <Typography variant="h6">
                        {locale.name}
                      </Typography>
                      <Chip
                        label={locale.code.toUpperCase()}
                        size="small"
                        color={locale.code === 'es' ? 'primary' : 'default'}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Nativo: {locale.nativeName}
                  </Typography>

                  {locale.isDefault && (
                    <Chip
                      label="Default"
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Total Keys: {locale.totalKeys || 'N/A'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab: Missing Keys */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Claves de Traducción Faltantes
            </Typography>

            {stats?.missingKeys && stats.missingKeys.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell>Locale</TableCell>
                    <TableCell>Veces Solicitada</TableCell>
                    <TableCell>Primera Vez</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.missingKeys.slice(0, 50).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <code>{item.key}</code>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.locale} size="small" />
                      </TableCell>
                      <TableCell>{item.count || 1}</TableCell>
                      <TableCell>
                        {item.firstSeen ? new Date(item.firstSeen).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="success">
                No hay claves de traducción faltantes
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Test Translation */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Probar Traducción
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Locale</InputLabel>
                  <Select
                    value={selectedLocale}
                    onChange={(e) => setSelectedLocale(e.target.value)}
                  >
                    {locales.map((locale) => (
                      <MenuItem key={locale.code} value={locale.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>
                            {getLocaleFlag(locale.code)}
                          </Typography>
                          {locale.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Translation Key</InputLabel>
                    <Select
                      value={testKey}
                      onChange={(e) => setTestKey(e.target.value)}
                    >
                      <MenuItem value="common.save">common.save</MenuItem>
                      <MenuItem value="common.cancel">common.cancel</MenuItem>
                      <MenuItem value="common.delete">common.delete</MenuItem>
                      <MenuItem value="orders.status.pending">orders.status.pending</MenuItem>
                      <MenuItem value="orders.status.completed">orders.status.completed</MenuItem>
                      <MenuItem value="validation.required">validation.required</MenuItem>
                      <MenuItem value="validation.minLength">validation.minLength</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleTestTranslation}
                    disabled={!testKey}
                  >
                    Traducir
                  </Button>
                </Box>
              </Grid>
            </Grid>

            {testResult && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Resultado:</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {testResult}
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Ejemplos de Claves Comunes
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="common.*"
                    secondary="Acciones comunes: save, cancel, delete, edit, create, etc."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="orders.*"
                    secondary="Relacionado con órdenes: status, actions, fields"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="validation.*"
                    secondary="Mensajes de validación: required, minLength, email, etc."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="errors.*"
                    secondary="Mensajes de error del sistema"
                  />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default I18nManager;
