const path = require('path');
const fs = require('fs-extra');

describe('JARVIS Bridge Integration', () => {
  it('should have jarvis-bridge.cjs file', () => {
    const bridgePath = path.join(__dirname, '../jarvis-bridge.cjs');
    expect(fs.existsSync(bridgePath)).toBe(true);
  });

  it('should export a class or function', () => {
    const JarvisBridge = require('../jarvis-bridge.cjs');
    expect(typeof JarvisBridge).toBe('function');
  });

  it('should be instantiable', () => {
    const JarvisBridge = require('../jarvis-bridge.cjs');
    const bridge = new JarvisBridge();
    expect(bridge).toBeDefined();
  });
});

describe('JARVIS Core Modules', () => {
  const corePath = path.join(__dirname, '../../../core');

  it('should have core directory', () => {
    expect(fs.existsSync(corePath)).toBe(true);
  });

  it('should have personality.js module', () => {
    const personalityPath = path.join(corePath, 'personality.js');
    expect(fs.existsSync(personalityPath)).toBe(true);
  });

  it('should have continuous-memory.js module', () => {
    const memoryPath = path.join(corePath, 'continuous-memory.js');
    expect(fs.existsSync(memoryPath)).toBe(true);
  });

  it('should have task-manager.js module', () => {
    const taskPath = path.join(corePath, 'task-manager.js');
    expect(fs.existsSync(taskPath)).toBe(true);
  });
});
