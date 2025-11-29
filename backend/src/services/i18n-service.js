/**
 * Sistema de Internacionalización (i18n)
 * Soporte multi-idioma con detección automática y traducciones dinámicas
 *
 * @module I18nService
 * @version 2.1.0
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

/**
 * Servicio de internacionalización
 */
class I18nService extends EventEmitter {
  constructor() {
    super();

    this.config = {
      localesPath: path.join(__dirname, '../locales'),
      defaultLocale: 'es',
      supportedLocales: ['es', 'en', 'pt', 'fr'],
      fallbackLocale: 'es',
      autoDetect: true,
      cacheEnabled: true,
      hotReload: true,
      watchInterval: 10000 // 10 segundos
    };

    this.translations = new Map(); // locale -> translations object
    this.cache = new Map(); // Cache de traducciones interpoladas
    this.watchers = new Map();
    this.stats = {
      translationsLoaded: 0,
      cachehits: 0,
      cacheMisses: 0,
      missingKeys: new Set()
    };
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      console.log('🌍 Iniciando servicio de internacionalización...');

      // Crear directorio de locales si no existe
      await fs.mkdir(this.config.localesPath, { recursive: true });

      // Cargar traducciones
      await this.loadAllTranslations();

      // Crear traducciones por defecto si no existen
      await this.createDefaultTranslations();

      // Iniciar hot reload
      if (this.config.hotReload) {
        this.startHotReload();
      }

      console.log('✅ Servicio de internacionalización inicializado');
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicio i18n:', error);
      throw error;
    }
  }

  /**
   * Carga todas las traducciones
   */
  async loadAllTranslations() {
    try {
      const files = await fs.readdir(this.config.localesPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const locale = file.replace('.json', '');
          await this.loadTranslations(locale);
        }
      }

      console.log(`✅ ${this.translations.size} idiomas cargados`);
    } catch (error) {
      console.error('Error cargando traducciones:', error);
    }
  }

  /**
   * Carga traducciones de un idioma específico
   */
  async loadTranslations(locale) {
    try {
      const filePath = path.join(this.config.localesPath, `${locale}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const translations = JSON.parse(fileContent);

      this.translations.set(locale, translations);
      this.stats.translationsLoaded++;

      console.log(`✅ Traducciones cargadas: ${locale}`);
      this.emit('translations:loaded', { locale, count: Object.keys(translations).length });

      return true;
    } catch (error) {
      console.error(`Error cargando traducciones de ${locale}:`, error);
      return false;
    }
  }

  /**
   * Crea traducciones por defecto
   */
  async createDefaultTranslations() {
    const defaultTranslations = {
      es: {
        // Común
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.edit': 'Editar',
        'common.create': 'Crear',
        'common.search': 'Buscar',
        'common.filter': 'Filtrar',
        'common.export': 'Exportar',
        'common.import': 'Importar',
        'common.yes': 'Sí',
        'common.no': 'No',
        'common.loading': 'Cargando...',
        'common.error': 'Error',
        'common.success': 'Éxito',
        'common.warning': 'Advertencia',
        'common.info': 'Información',

        // Autenticación
        'auth.login': 'Iniciar Sesión',
        'auth.logout': 'Cerrar Sesión',
        'auth.email': 'Correo Electrónico',
        'auth.password': 'Contraseña',
        'auth.forgotPassword': '¿Olvidaste tu contraseña?',
        'auth.invalidCredentials': 'Credenciales inválidas',
        'auth.sessionExpired': 'Sesión expirada',

        // Menú
        'menu.dashboard': 'Panel Principal',
        'menu.orders': 'Órdenes',
        'menu.products': 'Productos',
        'menu.inventory': 'Inventario',
        'menu.customers': 'Clientes',
        'menu.reports': 'Reportes',
        'menu.analytics': 'Analíticas',
        'menu.settings': 'Configuración',
        'menu.users': 'Usuarios',

        // Órdenes
        'orders.title': 'Órdenes',
        'orders.new': 'Nueva Orden',
        'orders.pending': 'Pendientes',
        'orders.completed': 'Completadas',
        'orders.cancelled': 'Canceladas',
        'orders.total': 'Total',
        'orders.subtotal': 'Subtotal',
        'orders.tax': 'Impuesto',
        'orders.discount': 'Descuento',
        'orders.status.pending': 'Pendiente',
        'orders.status.preparing': 'Preparando',
        'orders.status.ready': 'Lista',
        'orders.status.delivered': 'Entregada',

        // Productos
        'products.title': 'Productos',
        'products.name': 'Nombre',
        'products.price': 'Precio',
        'products.category': 'Categoría',
        'products.stock': 'Stock',
        'products.description': 'Descripción',
        'products.available': 'Disponible',
        'products.outOfStock': 'Sin Stock',

        // Inventario
        'inventory.title': 'Inventario',
        'inventory.lowStock': 'Stock Bajo',
        'inventory.reorder': 'Reordenar',
        'inventory.adjust': 'Ajustar',
        'inventory.currentStock': 'Stock Actual',
        'inventory.minStock': 'Stock Mínimo',

        // Clientes
        'customers.title': 'Clientes',
        'customers.name': 'Nombre',
        'customers.email': 'Email',
        'customers.phone': 'Teléfono',
        'customers.orders': 'Órdenes',
        'customers.totalSpent': 'Total Gastado',

        // Reportes
        'reports.title': 'Reportes',
        'reports.sales': 'Ventas',
        'reports.daily': 'Diario',
        'reports.weekly': 'Semanal',
        'reports.monthly': 'Mensual',
        'reports.yearly': 'Anual',
        'reports.dateRange': 'Rango de Fechas',

        // Mensajes
        'messages.saveSuccess': '¡Guardado exitosamente!',
        'messages.deleteSuccess': '¡Eliminado exitosamente!',
        'messages.error': 'Ha ocurrido un error',
        'messages.confirmDelete': '¿Estás seguro de eliminar este elemento?',
        'messages.noData': 'No hay datos disponibles',

        // Validaciones
        'validation.required': 'Este campo es requerido',
        'validation.email': 'Email inválido',
        'validation.minLength': 'Longitud mínima: {{min}}',
        'validation.maxLength': 'Longitud máxima: {{max}}',
        'validation.number': 'Debe ser un número',
        'validation.positive': 'Debe ser positivo'
      },

      en: {
        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.export': 'Export',
        'common.import': 'Import',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Information',

        // Authentication
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgotPassword': 'Forgot Password?',
        'auth.invalidCredentials': 'Invalid credentials',
        'auth.sessionExpired': 'Session expired',

        // Menu
        'menu.dashboard': 'Dashboard',
        'menu.orders': 'Orders',
        'menu.products': 'Products',
        'menu.inventory': 'Inventory',
        'menu.customers': 'Customers',
        'menu.reports': 'Reports',
        'menu.analytics': 'Analytics',
        'menu.settings': 'Settings',
        'menu.users': 'Users',

        // Orders
        'orders.title': 'Orders',
        'orders.new': 'New Order',
        'orders.pending': 'Pending',
        'orders.completed': 'Completed',
        'orders.cancelled': 'Cancelled',
        'orders.total': 'Total',
        'orders.subtotal': 'Subtotal',
        'orders.tax': 'Tax',
        'orders.discount': 'Discount',
        'orders.status.pending': 'Pending',
        'orders.status.preparing': 'Preparing',
        'orders.status.ready': 'Ready',
        'orders.status.delivered': 'Delivered',

        // Products
        'products.title': 'Products',
        'products.name': 'Name',
        'products.price': 'Price',
        'products.category': 'Category',
        'products.stock': 'Stock',
        'products.description': 'Description',
        'products.available': 'Available',
        'products.outOfStock': 'Out of Stock',

        // Inventory
        'inventory.title': 'Inventory',
        'inventory.lowStock': 'Low Stock',
        'inventory.reorder': 'Reorder',
        'inventory.adjust': 'Adjust',
        'inventory.currentStock': 'Current Stock',
        'inventory.minStock': 'Min Stock',

        // Customers
        'customers.title': 'Customers',
        'customers.name': 'Name',
        'customers.email': 'Email',
        'customers.phone': 'Phone',
        'customers.orders': 'Orders',
        'customers.totalSpent': 'Total Spent',

        // Reports
        'reports.title': 'Reports',
        'reports.sales': 'Sales',
        'reports.daily': 'Daily',
        'reports.weekly': 'Weekly',
        'reports.monthly': 'Monthly',
        'reports.yearly': 'Yearly',
        'reports.dateRange': 'Date Range',

        // Messages
        'messages.saveSuccess': 'Saved successfully!',
        'messages.deleteSuccess': 'Deleted successfully!',
        'messages.error': 'An error occurred',
        'messages.confirmDelete': 'Are you sure you want to delete this item?',
        'messages.noData': 'No data available',

        // Validations
        'validation.required': 'This field is required',
        'validation.email': 'Invalid email',
        'validation.minLength': 'Minimum length: {{min}}',
        'validation.maxLength': 'Maximum length: {{max}}',
        'validation.number': 'Must be a number',
        'validation.positive': 'Must be positive'
      }
    };

    for (const [locale, translations] of Object.entries(defaultTranslations)) {
      const filePath = path.join(this.config.localesPath, `${locale}.json`);

      try {
        await fs.access(filePath);
        // Archivo ya existe, cargar
        await this.loadTranslations(locale);
      } catch {
        // Crear archivo
        await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8');
        this.translations.set(locale, translations);
        console.log(`✅ Traducciones por defecto creadas: ${locale}`);
      }
    }
  }

  /**
   * Traduce una clave
   *
   * @param {string} key - Clave de traducción (ej: 'common.save')
   * @param {Object} params - Parámetros para interpolación
   * @param {string} locale - Idioma (opcional, usa el por defecto)
   * @returns {string} Texto traducido
   */
  t(key, params = {}, locale = this.config.defaultLocale) {
    // Verificar cache
    const cacheKey = `${locale}:${key}:${JSON.stringify(params)}`;
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    this.stats.cacheMisses++;

    // Obtener traducciones del idioma
    let translations = this.translations.get(locale);

    // Si no existe el idioma, usar fallback
    if (!translations) {
      console.warn(`⚠️  Idioma no encontrado: ${locale}, usando fallback`);
      translations = this.translations.get(this.config.fallbackLocale);
    }

    // Obtener traducción
    let translation = this.getNestedValue(translations, key);

    // Si no existe la clave, usar fallback
    if (!translation && locale !== this.config.fallbackLocale) {
      const fallbackTranslations = this.translations.get(this.config.fallbackLocale);
      translation = this.getNestedValue(fallbackTranslations, key);
    }

    // Si aún no existe, usar la clave
    if (!translation) {
      this.stats.missingKeys.add(key);
      console.warn(`⚠️  Clave de traducción no encontrada: ${key}`);
      translation = key;
    }

    // Interpolar parámetros
    const result = this.interpolate(translation, params);

    // Guardar en cache
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Obtiene valor anidado de un objeto
   */
  getNestedValue(obj, key) {
    if (!obj) return null;

    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Interpola parámetros en una cadena
   */
  interpolate(text, params) {
    if (!params || Object.keys(params).length === 0) {
      return text;
    }

    let result = text;

    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Detecta idioma del usuario
   */
  detectLocale(req) {
    if (!this.config.autoDetect) {
      return this.config.defaultLocale;
    }

    // 1. Verificar parámetro de query
    if (req.query && req.query.locale) {
      const locale = req.query.locale;
      if (this.config.supportedLocales.includes(locale)) {
        return locale;
      }
    }

    // 2. Verificar header personalizado
    if (req.headers && req.headers['x-locale']) {
      const locale = req.headers['x-locale'];
      if (this.config.supportedLocales.includes(locale)) {
        return locale;
      }
    }

    // 3. Verificar Accept-Language header
    if (req.headers && req.headers['accept-language']) {
      const languages = req.headers['accept-language'].split(',');

      for (const lang of languages) {
        const locale = lang.split(';')[0].split('-')[0].trim();
        if (this.config.supportedLocales.includes(locale)) {
          return locale;
        }
      }
    }

    // 4. Verificar cookie
    if (req.cookies && req.cookies.locale) {
      const locale = req.cookies.locale;
      if (this.config.supportedLocales.includes(locale)) {
        return locale;
      }
    }

    // 5. Usar idioma por defecto
    return this.config.defaultLocale;
  }

  /**
   * Middleware para Express
   */
  middleware() {
    return (req, res, next) => {
      // Detectar idioma
      const locale = this.detectLocale(req);

      // Agregar función de traducción al request
      req.t = (key, params = {}) => this.t(key, params, locale);
      req.locale = locale;

      // Agregar helper al response
      res.locals.t = req.t;
      res.locals.locale = locale;

      next();
    };
  }

  /**
   * Inicia hot reload de traducciones
   */
  startHotReload() {
    console.log('🔄 Hot reload de traducciones activado');

    const watcher = setInterval(async () => {
      await this.checkForChanges();
    }, this.config.watchInterval);

    this.watchers.set('main', watcher);
  }

  /**
   * Detiene hot reload
   */
  stopHotReload() {
    for (const [name, watcher] of this.watchers) {
      clearInterval(watcher);
    }
    this.watchers.clear();
    console.log('⏸️  Hot reload desactivado');
  }

  /**
   * Verifica cambios en archivos de traducciones
   */
  async checkForChanges() {
    try {
      const files = await fs.readdir(this.config.localesPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const locale = file.replace('.json', '');
          const filePath = path.join(this.config.localesPath, file);

          const content = await fs.readFile(filePath, 'utf-8');
          const newTranslations = JSON.parse(content);

          const currentTranslations = this.translations.get(locale);

          // Comparar
          if (JSON.stringify(currentTranslations) !== JSON.stringify(newTranslations)) {
            console.log(`🔄 Cambios detectados en: ${locale}`);
            this.translations.set(locale, newTranslations);
            this.cache.clear(); // Invalidar cache
            this.emit('translations:updated', { locale });
          }
        }
      }
    } catch (error) {
      console.error('Error verificando cambios:', error);
    }
  }

  /**
   * Agrega o actualiza traducción
   */
  async setTranslation(locale, key, value) {
    let translations = this.translations.get(locale);

    if (!translations) {
      translations = {};
      this.translations.set(locale, translations);
    }

    // Establecer valor anidado
    this.setNestedValue(translations, key, value);

    // Guardar a disco
    const filePath = path.join(this.config.localesPath, `${locale}.json`);
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8');

    // Invalidar cache
    this.cache.clear();

    console.log(`✅ Traducción actualizada: ${locale}.${key}`);
    this.emit('translation:set', { locale, key, value });

    return true;
  }

  /**
   * Establece valor anidado en un objeto
   */
  setNestedValue(obj, key, value) {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Exporta traducciones
   */
  async exportTranslations(locale, outputPath) {
    const translations = this.translations.get(locale);

    if (!translations) {
      throw new Error(`Idioma no encontrado: ${locale}`);
    }

    await fs.writeFile(outputPath, JSON.stringify(translations, null, 2), 'utf-8');

    console.log(`📤 Traducciones exportadas: ${locale} -> ${outputPath}`);
    return true;
  }

  /**
   * Importa traducciones
   */
  async importTranslations(locale, inputPath) {
    const content = await fs.readFile(inputPath, 'utf-8');
    const translations = JSON.parse(content);

    this.translations.set(locale, translations);

    // Guardar a disco
    const filePath = path.join(this.config.localesPath, `${locale}.json`);
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8');

    // Invalidar cache
    this.cache.clear();

    console.log(`📥 Traducciones importadas: ${locale} <- ${inputPath}`);
    return true;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      locales: this.translations.size,
      cacheSize: this.cache.size,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: this.stats.cacheHits > 0
        ? ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2)
        : 0,
      missingKeys: Array.from(this.stats.missingKeys)
    };
  }

  /**
   * Lista idiomas soportados
   */
  getSupportedLocales() {
    return this.config.supportedLocales.map(locale => ({
      code: locale,
      name: this.getLocaleName(locale),
      loaded: this.translations.has(locale)
    }));
  }

  /**
   * Obtiene nombre del idioma
   */
  getLocaleName(locale) {
    const names = {
      es: 'Español',
      en: 'English',
      pt: 'Português',
      fr: 'Français'
    };

    return names[locale] || locale;
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.stopHotReload();
    this.cache.clear();
    console.log('✅ Servicio i18n limpiado');
  }
}

// Singleton
const i18nService = new I18nService();

module.exports = i18nService;
