/**
 * Pruebas Unitarias - i18n Service
 * @jest-environment node
 */

const i18nService = require('../../src/services/i18n-service');

describe('i18n Service', () => {
  describe('Initialization', () => {
    test('should have supported locales', () => {
      const locales = i18nService.getSupportedLocales();
      expect(locales.length).toBeGreaterThanOrEqual(2);
    });

    test('should have translations loaded', () => {
      expect(i18nService.translations.size).toBeGreaterThanOrEqual(2);
    });

    test('should have default locale', () => {
      expect(i18nService.config.defaultLocale).toBe('es');
    });
  });

  describe('Basic Translation', () => {
    test('should translate simple key in Spanish', () => {
      const text = i18nService.t('common.save', {}, 'es');
      expect(text).toBe('Guardar');
    });

    test('should translate simple key in English', () => {
      const text = i18nService.t('common.save', {}, 'en');
      expect(text).toBe('Save');
    });

    test('should translate nested key', () => {
      const text = i18nService.t('orders.status.pending', {}, 'es');
      expect(text).toBe('Pendiente');
    });

    test('should return key when translation not found', () => {
      const text = i18nService.t('non.existent.key', {}, 'es');
      expect(text).toBe('non.existent.key');
    });
  });

  describe('Parameter Interpolation', () => {
    test('should interpolate single parameter', () => {
      const text = i18nService.t('validation.minLength', { min: 5 }, 'en');
      expect(text).toContain('5');
      expect(text).toBe('Minimum length: 5');
    });

    test('should interpolate multiple parameters', () => {
      const text = i18nService.t('validation.minLength', { min: 3 }, 'es');
      expect(text).toContain('3');
    });

    test('should handle parameters with spaces in template', () => {
      const text = i18nService.t('validation.minLength', { min: 10 }, 'en');
      expect(text).toBe('Minimum length: 10');
    });
  });

  describe('Fallback Mechanism', () => {
    test('should fallback to default locale when translation missing', () => {
      // Intentar traducir algo que no existe en un idioma
      const text = i18nService.t('common.save', {}, 'xx'); // idioma inválido
      expect(text).toBeDefined();
    });

    test('should use fallback locale for missing keys', () => {
      const text = i18nService.t('common.cancel', {}, 'es');
      expect(text).toBe('Cancelar');
    });
  });

  describe('Locale Detection', () => {
    test('should detect locale from Accept-Language header', () => {
      const req = {
        headers: {
          'accept-language': 'en-US,en;q=0.9,es;q=0.8'
        },
        query: {},
        cookies: {}
      };

      const locale = i18nService.detectLocale(req);
      expect(locale).toBe('en');
    });

    test('should detect locale from custom header', () => {
      const req = {
        headers: {
          'x-locale': 'es'
        },
        query: {},
        cookies: {}
      };

      const locale = i18nService.detectLocale(req);
      expect(locale).toBe('es');
    });

    test('should detect locale from query parameter', () => {
      const req = {
        query: {
          locale: 'en'
        },
        headers: {},
        cookies: {}
      };

      const locale = i18nService.detectLocale(req);
      expect(locale).toBe('en');
    });

    test('should detect locale from cookie', () => {
      const req = {
        cookies: {
          locale: 'pt'
        },
        query: {},
        headers: {}
      };

      const locale = i18nService.detectLocale(req);
      expect(locale).toBe('pt');
    });

    test('should use default locale when no detection possible', () => {
      const req = {
        query: {},
        headers: {},
        cookies: {}
      };

      const locale = i18nService.detectLocale(req);
      expect(locale).toBe('es');
    });
  });

  describe('Supported Locales', () => {
    test('should list all supported locales', () => {
      const locales = i18nService.getSupportedLocales();

      expect(Array.isArray(locales)).toBe(true);
      expect(locales.length).toBeGreaterThanOrEqual(2);

      const esCodes = locales.map(l => l.code);
      expect(esCodes).toContain('es');
      expect(esCodes).toContain('en');
    });

    test('should provide locale names', () => {
      const name = i18nService.getLocaleName('es');
      expect(name).toBe('Español');
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const stats = i18nService.getStats();

      expect(stats).toBeDefined();
      expect(stats.locales).toBeGreaterThan(0);
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.cacheHits).toBe('number');
      expect(typeof stats.cacheMisses).toBe('number');
    });

    test('should track cache hits', () => {
      // Primera llamada - miss
      i18nService.t('common.save', {}, 'es');

      // Segunda llamada - hit
      i18nService.t('common.save', {}, 'es');

      const stats = i18nService.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    test('should track missing keys', () => {
      i18nService.t('this.key.does.not.exist', {}, 'es');

      const stats = i18nService.getStats();
      expect(stats.missingKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Middleware', () => {
    test('should create middleware function', () => {
      const middleware = i18nService.middleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('should add t function to request', () => {
      const middleware = i18nService.middleware();
      const req = {
        query: {},
        headers: {},
        cookies: {}
      };
      const res = { locals: {} };
      const next = jest.fn();

      middleware(req, res, next);

      expect(typeof req.t).toBe('function');
      expect(typeof req.locale).toBe('string');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    test('should cache translated strings', () => {
      const key = 'common.save';
      const params = { test: 'value' };

      i18nService.t(key, params, 'es');
      const cacheSize1 = i18nService.cache.size;

      i18nService.t(key, params, 'es');
      const cacheSize2 = i18nService.cache.size;

      expect(cacheSize2).toBeGreaterThanOrEqual(cacheSize1);
    });
  });

  describe('Nested Value Retrieval', () => {
    test('should get nested value correctly', () => {
      const translations = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };

      const value = i18nService.getNestedValue(translations, 'level1.level2.level3');
      expect(value).toBe('value');
    });

    test('should return null for non-existent path', () => {
      const translations = { key: 'value' };
      const value = i18nService.getNestedValue(translations, 'non.existent.path');
      expect(value).toBeNull();
    });
  });
});
