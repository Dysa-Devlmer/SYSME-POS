/**
 * MÓDULO 6: SMART HOME INTEGRATION
 * Control de dispositivos IoT, automatización del hogar inteligente
 */

class SmartHomeIntegration {
  constructor(options = {}) {
    this.devices = {};
    this.scenes = {};
    this.automationRules = [];
    this.homeStatus = 'home';
    this.platform = options.platform || 'home-assistant'; // home-assistant, smartthings, google-home
    this.apiUrl = options.apiUrl || 'http://localhost:8123';
    this.apiToken = options.apiToken || '';
    
    console.log('🏠 Smart Home Integration inicializando...');
  }

  /**
   * AGREGA DISPOSITIVO INTELIGENTE
   */
  addDevice(deviceId, config) {
    this.devices[deviceId] = {
      id: deviceId,
      name: config.name,
      type: config.type, // 'light', 'thermostat', 'lock', 'camera', 'plug', etc.
      status: config.status || 'off',
      platform: config.platform || this.platform,
      settings: config.settings || {},
      createdAt: new Date()
    };

    console.log(`✅ Dispositivo agregado: ${config.name}`);
    return { success: true, device: this.devices[deviceId] };
  }

  /**
   * OBTIENE ESTADO DE DISPOSITIVO
   */
  getDeviceStatus(deviceId) {
    const device = this.devices[deviceId];
    if (!device) return { error: 'Dispositivo no encontrado' };

    return {
      success: true,
      device: {
        id: device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        settings: device.settings
      }
    };
  }

  /**
   * CONTROLA LUZ
   */
  async controlLight(lightId, action, brightness = null) {
    const light = this.devices[lightId];
    if (!light || light.type !== 'light') {
      return { error: 'Luz no encontrada' };
    }

    const newStatus = action === 'on' ? 'on' : 'off';
    light.status = newStatus;

    if (brightness && action === 'on') {
      light.brightness = Math.min(100, Math.max(0, brightness));
    }

    console.log(`💡 Luz ${light.name}: ${newStatus}${brightness ? ` (${brightness}%)` : ''}`);
    return { success: true, light };
  }

  /**
   * CONTROLA TERMOSTATO
   */
  async setTemperature(thermostatId, temperature, mode = 'heat') {
    const thermostat = this.devices[thermostatId];
    if (!thermostat || thermostat.type !== 'thermostat') {
      return { error: 'Termostato no encontrado' };
    }

    thermostat.targetTemp = temperature;
    thermostat.mode = mode; // heat, cool, auto, off
    thermostat.status = 'on';

    console.log(`🌡️ Termostato ${thermostat.name}: ${temperature}°C en modo ${mode}`);
    return { success: true, thermostat };
  }

  /**
   * CONTROLA CERRADURA
   */
  async controlLock(lockId, action) {
    const lock = this.devices[lockId];
    if (!lock || lock.type !== 'lock') {
      return { error: 'Cerradura no encontrada' };
    }

    const newStatus = action === 'lock' ? 'locked' : 'unlocked';
    lock.status = newStatus;

    console.log(`🔒 Cerradura ${lock.name}: ${newStatus}`);
    return { success: true, lock };
  }

  /**
   * CONTROLA ENCHUFE INTELIGENTE
   */
  async controlPlug(plugId, action) {
    const plug = this.devices[plugId];
    if (!plug || plug.type !== 'plug') {
      return { error: 'Enchufe no encontrado' };
    }

    const newStatus = action === 'on' ? 'on' : 'off';
    plug.status = newStatus;

    console.log(`🔌 Enchufe ${plug.name}: ${newStatus}`);
    return { success: true, plug };
  }

  /**
   * CREA ESCENA (Combinación de dispositivos)
   */
  createScene(sceneName, devices) {
    const scene = {
      id: Date.now(),
      name: sceneName,
      devices: devices, // [{ deviceId, action, params }]
      createdAt: new Date()
    };

    this.scenes[sceneName] = scene;
    console.log(`🎬 Escena creada: ${sceneName}`);
    return { success: true, scene };
  }

  /**
   * ACTIVA UNA ESCENA
   */
  async activateScene(sceneName) {
    const scene = this.scenes[sceneName];
    if (!scene) return { error: 'Escena no encontrada' };

    console.log(`🎬 Activando escena: ${sceneName}`);

    for (const deviceAction of scene.devices) {
      const device = this.devices[deviceAction.deviceId];
      if (!device) continue;

      if (device.type === 'light') {
        await this.controlLight(deviceAction.deviceId, deviceAction.action, deviceAction.brightness);
      } else if (device.type === 'thermostat') {
        await this.setTemperature(deviceAction.deviceId, deviceAction.temp);
      } else if (device.type === 'lock') {
        await this.controlLock(deviceAction.deviceId, deviceAction.action);
      }
    }

    return { success: true, scene };
  }

  /**
   * ESCENAS PREDEFINIDAS
   */
  async activatePredefinedScene(sceneName) {
    const scenes = {
      'modo_trabajo': async () => {
        await this.controlLight('light1', 'on', 100);
        await this.setTemperature('thermostat1', 21, 'auto');
        await this.controlPlug('enchufe_cafetera', 'on');
        console.log('💼 Modo Trabajo: Activado');
      },
      'modo_noche': async () => {
        await this.controlLight('light1', 'off');
        await this.controlLight('light_dormitorio', 'on', 30);
        await this.setTemperature('thermostat1', 18, 'heat');
        await this.controlLock('lock_puerta', 'lock');
        console.log('🌙 Modo Noche: Activado');
      },
      'salir_de_casa': async () => {
        // Apaga todas las luces
        for (const [id, device] of Object.entries(this.devices)) {
          if (device.type === 'light') {
            await this.controlLight(id, 'off');
          }
        }
        // Cierra todas las puertas
        for (const [id, device] of Object.entries(this.devices)) {
          if (device.type === 'lock') {
            await this.controlLock(id, 'lock');
          }
        }
        console.log('🏠 Salir de Casa: Todas las puertas cerradas y luces apagadas');
      },
      'modo_fiesta': async () => {
        await this.controlLight('light1', 'on', 80);
        await this.controlPlug('altavoz', 'on');
        await this.setTemperature('thermostat1', 22, 'auto');
        console.log('🎉 Modo Fiesta: Activado');
      }
    };

    if (scenes[sceneName]) {
      return await scenes[sceneName]();
    }

    return { error: 'Escena no encontrada' };
  }

  /**
   * CREA REGLA DE AUTOMATIZACIÓN
   */
  createAutomationRule(name, trigger, action) {
    const rule = {
      id: Date.now(),
      name,
      trigger, // { type: 'time', value: '18:00' } o { type: 'sensor', value: 'motion' }
      action,  // { deviceId, action, params }
      enabled: true,
      createdAt: new Date()
    };

    this.automationRules.push(rule);
    console.log(`🤖 Regla de automatización: "${name}"`);
    return { success: true, rule };
  }

  /**
   * OBTIENE TODAS LAS ESCENAS
   */
  getScenes() {
    return {
      success: true,
      scenes: Object.values(this.scenes),
      predefinedScenes: ['modo_trabajo', 'modo_noche', 'salir_de_casa', 'modo_fiesta']
    };
  }

  /**
   * OBTIENE TODOS LOS DISPOSITIVOS
   */
  getAllDevices() {
    return {
      success: true,
      total: Object.keys(this.devices).length,
      devices: Object.values(this.devices)
    };
  }

  /**
   * OBTIENE ESTADO GENERAL DEL HOGAR
   */
  getHomeStatus() {
    const summary = {
      lightsOn: Object.values(this.devices).filter(d => d.type === 'light' && d.status === 'on').length,
      locksLocked: Object.values(this.devices).filter(d => d.type === 'lock' && d.status === 'locked').length,
      thermostatTemp: Object.values(this.devices).find(d => d.type === 'thermostat')?.targetTemp || null,
      homeMode: this.homeStatus
    };

    return {
      success: true,
      status: summary
    };
  }

  /**
   * ESTABLECE MODO DE HOGAR
   */
  setHomeMode(mode) {
    // 'home', 'away', 'night', 'vacation'
    this.homeStatus = mode;
    console.log(`🏠 Modo hogar: ${mode}`);
    return { success: true, mode };
  }

  /**
   * RESPONDE A VOZ NATURAL
   */
  async handleVoiceCommand(command) {
    const cmd = command.toLowerCase();

    // Luces
    if (cmd.includes('apag') && cmd.includes('luz')) {
      return await this.controlLight('light1', 'off');
    }
    if (cmd.includes('enciend') && cmd.includes('luz')) {
      return await this.controlLight('light1', 'on', 100);
    }

    // Temperatura
    if (cmd.includes('temperatur') || cmd.includes('calentar')) {
      const temp = parseInt(cmd.match(/\d+/)?.[0]) || 21;
      return await this.setTemperature('thermostat1', temp);
    }

    // Escenas
    if (cmd.includes('trabajo')) {
      return await this.activatePredefinedScene('modo_trabajo');
    }
    if (cmd.includes('noche')) {
      return await this.activatePredefinedScene('modo_noche');
    }
    if (cmd.includes('salir')) {
      return await this.activatePredefinedScene('salir_de_casa');
    }
    if (cmd.includes('fiesta')) {
      return await this.activatePredefinedScene('modo_fiesta');
    }

    // Puertas
    if (cmd.includes('cierra') && cmd.includes('puerta')) {
      return await this.controlLock('lock_puerta', 'lock');
    }
    if (cmd.includes('abre') && cmd.includes('puerta')) {
      return await this.controlLock('lock_puerta', 'unlock');
    }

    return { error: 'Comando no reconocido' };
  }
}

export default SmartHomeIntegration;
