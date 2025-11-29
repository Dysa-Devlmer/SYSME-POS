/**
 * Jest Setup File
 * Configuración global para todas las pruebas
 */

// Suprimir console.log en tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock de variables de entorno
process.env.NODE_ENV = 'test';
process.env.DEFAULT_LOCALE = 'es';
process.env.CONFIG_PATH = './tests/fixtures/config';

// Timeout global
jest.setTimeout(10000);
