/**
 * Pruebas Unitarias - Config Manager
 * @jest-environment node
 */

const configManager = require('../../src/services/config-manager');
const fs = require('fs').promises;
const path = require('path');

describe('Config Manager', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/test-config.json');
  const testConfig = {
    app: {
      name: 'Test App',
      port: 3000,
      environment: 'test'
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db'
    }
  };

  beforeAll(async () => {
    // Crear directorio de fixtures si no existe
    const fixturesDir = path.join(__dirname, '../fixtures');
    try {
      await fs.mkdir(fixturesDir, { recursive: true });
    } catch (error) {
      // Directorio ya existe
    }

    // Crear archivo de configuración de prueba
    await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterAll(async () => {
    // Limpiar archivos de prueba
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Archivo ya eliminado
    }

    await configManager.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await configManager.initialize();
      expect(result).toBe(true);
    });

    test('should have default configuration', () => {
      expect(configManager.config).toBeDefined();
      expect(typeof configManager.config).toBe('object');
    });

    test('should load from environment variables', () => {
      const nodeEnv = configManager.get('NODE_ENV');
      expect(nodeEnv).toBeDefined();
    });
  });

  describe('Configuration Loading', () => {
    test('should load config from file', async () => {
      const config = await configManager.loadFromFile(testConfigPath);

      expect(config).toBeDefined();
      expect(config.app.name).toBe('Test App');
      expect(config.database.host).toBe('localhost');
    });

    test('should handle non-existent file', async () => {
      const config = await configManager.loadFromFile('/non/existent/path.json');
      expect(config).toBeNull();
    });

    test('should validate loaded config', async () => {
      const config = await configManager.loadFromFile(testConfigPath);
      const isValid = configManager.validateConfig(config);

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Get/Set Operations', () => {
    test('should get nested value with dot notation', () => {
      configManager.config = { ...testConfig };
      const value = configManager.get('app.name');

      expect(value).toBe('Test App');
    });

    test('should get with default value', () => {
      const value = configManager.get('non.existent.key', 'default-value');
      expect(value).toBe('default-value');
    });

    test('should set nested value', () => {
      configManager.set('app.version', '2.1.0');
      const value = configManager.get('app.version');

      expect(value).toBe('2.1.0');
    });

    test('should set deep nested value', () => {
      configManager.set('new.nested.deep.value', 'test');
      const value = configManager.get('new.nested.deep.value');

      expect(value).toBe('test');
    });

    test('should return entire config when no key provided', () => {
      const config = configManager.get();

      expect(typeof config).toBe('object');
      expect(config).toBeDefined();
    });
  });

  describe('Hot Reload', () => {
    test('should enable hot reload', () => {
      const result = configManager.enableHotReload(testConfigPath);
      expect(result).toBe(true);
    });

    test('should disable hot reload', () => {
      configManager.enableHotReload(testConfigPath);
      const result = configManager.disableHotReload();

      expect(result).toBe(true);
      expect(configManager.watcher).toBeNull();
    });

    test('should detect file changes', (done) => {
      configManager.enableHotReload(testConfigPath);

      configManager.on('config:changed', (newConfig) => {
        expect(newConfig).toBeDefined();
        configManager.disableHotReload();
        done();
      });

      // Simular cambio en archivo
      setTimeout(async () => {
        const updatedConfig = { ...testConfig, app: { ...testConfig.app, version: '2.1.1' } };
        await fs.writeFile(testConfigPath, JSON.stringify(updatedConfig, null, 2));
      }, 100);
    }, 10000);
  });

  describe('Versioning', () => {
    test('should create config snapshot', () => {
      const version = configManager.createSnapshot('test-snapshot');

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });

    test('should list snapshots', () => {
      configManager.createSnapshot('snapshot-1');
      configManager.createSnapshot('snapshot-2');

      const snapshots = configManager.listSnapshots();

      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBeGreaterThanOrEqual(2);
    });

    test('should restore from snapshot', () => {
      const originalValue = 'original';
      configManager.set('test.value', originalValue);

      const version = configManager.createSnapshot('before-change');

      configManager.set('test.value', 'changed');
      expect(configManager.get('test.value')).toBe('changed');

      const restored = configManager.restoreSnapshot(version);
      expect(restored).toBe(true);
      expect(configManager.get('test.value')).toBe(originalValue);
    });

    test('should delete snapshot', () => {
      const version = configManager.createSnapshot('to-delete');
      const deleted = configManager.deleteSnapshot(version);

      expect(deleted).toBe(true);
    });
  });

  describe('Encryption', () => {
    test('should encrypt sensitive value', () => {
      const plaintext = 'my-secret-password';
      const encrypted = configManager.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    test('should decrypt encrypted value', () => {
      const plaintext = 'my-secret-password';
      const encrypted = configManager.encrypt(plaintext);
      const decrypted = configManager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle encryption of complex objects', () => {
      const obj = { user: 'admin', password: 'secret123' };
      const encrypted = configManager.encrypt(JSON.stringify(obj));
      const decrypted = JSON.parse(configManager.decrypt(encrypted));

      expect(decrypted.user).toBe(obj.user);
      expect(decrypted.password).toBe(obj.password);
    });
  });

  describe('Hashing', () => {
    test('should hash value with SHA256', () => {
      const value = 'test-value';
      const hash = configManager.hash(value);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 64 char hex string
    });

    test('should produce consistent hashes', () => {
      const value = 'test-value';
      const hash1 = configManager.hash(value);
      const hash2 = configManager.hash(value);

      expect(hash1).toBe(hash2);
    });

    test('should verify hash', () => {
      const value = 'test-value';
      const hash = configManager.hash(value);
      const isValid = configManager.verifyHash(value, hash);

      expect(isValid).toBe(true);
    });

    test('should reject invalid hash', () => {
      const value = 'test-value';
      const wrongHash = configManager.hash('wrong-value');
      const isValid = configManager.verifyHash(value, wrongHash);

      expect(isValid).toBe(false);
    });
  });

  describe('Validation', () => {
    test('should validate config structure', () => {
      const validConfig = {
        app: { name: 'Test', port: 3000 },
        database: { host: 'localhost' }
      };

      const isValid = configManager.validateConfig(validConfig);
      expect(typeof isValid).toBe('boolean');
    });

    test('should validate required fields', () => {
      const schema = {
        required: ['app.name', 'database.host']
      };

      configManager.setValidationSchema(schema);

      const validConfig = {
        app: { name: 'Test' },
        database: { host: 'localhost' }
      };

      const invalidConfig = {
        app: {}
      };

      expect(configManager.validateConfig(validConfig)).toBe(true);
      expect(configManager.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Merge Configurations', () => {
    test('should merge configs', () => {
      const base = { a: 1, b: { c: 2 } };
      const override = { b: { d: 3 }, e: 4 };

      const merged = configManager.merge(base, override);

      expect(merged.a).toBe(1);
      expect(merged.b.c).toBe(2);
      expect(merged.b.d).toBe(3);
      expect(merged.e).toBe(4);
    });

    test('should deep merge nested objects', () => {
      const base = {
        level1: {
          level2: {
            value1: 'a',
            value2: 'b'
          }
        }
      };

      const override = {
        level1: {
          level2: {
            value2: 'c',
            value3: 'd'
          }
        }
      };

      const merged = configManager.merge(base, override);

      expect(merged.level1.level2.value1).toBe('a');
      expect(merged.level1.level2.value2).toBe('c');
      expect(merged.level1.level2.value3).toBe('d');
    });
  });

  describe('Environment-specific Config', () => {
    test('should load environment-specific config', () => {
      const env = configManager.get('NODE_ENV') || 'test';
      expect(['development', 'test', 'production']).toContain(env);
    });

    test('should override with environment variables', () => {
      process.env.TEST_CONFIG_VALUE = 'from-env';
      const value = configManager.getEnv('TEST_CONFIG_VALUE');

      expect(value).toBe('from-env');
      delete process.env.TEST_CONFIG_VALUE;
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const stats = configManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.snapshotCount).toBeDefined();
      expect(typeof stats.snapshotCount).toBe('number');
      expect(stats.configSize).toBeDefined();
    });

    test('should track config changes', () => {
      configManager.set('test.tracking', 'value1');
      configManager.set('test.tracking', 'value2');

      const stats = configManager.getStats();
      expect(stats.changeCount).toBeDefined();
    });
  });

  describe('Export/Import', () => {
    test('should export config to JSON', () => {
      const exported = configManager.export('json');

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(typeof parsed).toBe('object');
    });

    test('should import config from JSON', () => {
      const testData = { imported: { value: 'test' } };
      const json = JSON.stringify(testData);

      const result = configManager.import(json, 'json');
      expect(result).toBe(true);

      const value = configManager.get('imported.value');
      expect(value).toBe('test');
    });
  });

  describe('Middleware', () => {
    test('should create middleware function', () => {
      const middleware = configManager.middleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('should attach config to request', () => {
      const middleware = configManager.middleware();
      const req = {};
      const res = { locals: {} };
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.config).toBeDefined();
      expect(typeof req.config).toBe('object');
      expect(next).toHaveBeenCalled();
    });
  });
});
