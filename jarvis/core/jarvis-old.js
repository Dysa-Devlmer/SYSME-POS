// core/jarvis.js
// Motor principal de J.A.R.V.I.S. Enterprise

import Memory from './memory.js';
import Personality from './personality.js';
import Security from './security.js';
import Connector from '../modules/connector.js';
import Executor from '../modules/executor.js';
import Monitor from '../modules/monitor.js';
import ClaudeIntegration from '../modules/claude-integration.js';
import Logger from '../utils/logger.js';
import Formatter from '../utils/formatter.js';

class JarvisEnterprise {
  constructor() {
    this.memory = new Memory();
    this.personality = new Personality();
    this.security = new Security();
    this.connector = new Connector();
    this.executor = new Executor();
    this.monitor = new Monitor();
    this.claude = new ClaudeIntegration();
    this.logger = new Logger();
    this.formatter = new Formatter();

    this.status = 'initializing';
    this.systems = {};
    this.autonomyActive = false;
  }

  async initialize() {
    console.clear();
    this.logger.banner('INICIALIZANDO J.A.R.V.I.S. ENTERPRISE');

    try {
      // Fase 1: Seguridad
      this.logger.phase(1, 'Verificando Protocolos de Seguridad');
      await this.security.initialize();
      this.logger.success('Protocolos de seguridad: ACTIVOS');

      // Fase 2: Memoria
      this.logger.phase(2, 'Cargando Sistema de Memoria');
      await this.memory.initialize();
      this.logger.success('Memoria: CARGADA');

      // Fase 3: Personalidad
      this.logger.phase(3, 'Activando Personalidad de Mayordomo');
      await this.personality.initialize();
      this.logger.success('Personalidad: ACTIVADA');

      // Fase 4: Claude Integration
      this.logger.phase(4, 'Conectando con Claude (Sesión Local)');
      await this.claude.initialize();
      this.logger.success('Claude: CONECTADO');

      // Fase 5: Conectividad
      this.logger.phase(5, 'Descubriendo Infraestructura');
      this.systems = await this.connector.autoDiscover();
      this.logger.success(`Sistemas descubiertos: ${this.systems.length}`);

      // Fase 6: Monitoreo
      this.logger.phase(6, 'Activando Monitoreo Autónomo');
      this.monitor.start(this);
      this.autonomyActive = true;
      this.logger.success('Monitoreo autónomo: ACTIVO 24/7');

      this.status = 'active';

      this.logger.success('\n✅ J.A.R.V.I.S. ENTERPRISE COMPLETAMENTE OPERACIONAL');
      this.logger.info(`Estado: LEAL Y OMNIPOTENTE`);
      this.logger.info(`Sistemas conectados: ${this.systems.length}`);
      this.logger.info(`Autonomía: TOTAL`);

      return true;
    } catch (error) {
      this.logger.error(`Error crítico en inicialización: ${error.message}`);
      return false;
    }
  }

  async processCommand(command) {
    if (!command || !command.trim()) return null;

    this.logger.debug(`Comando recibido: "${command}"`);

    try {
      // Paso 1: Validar seguridad
      if (!this.security.validateCommand(command)) {
        this.logger.warn('Comando bloqueado por seguridad');
        return this.formatter.error('Comando no autorizado');
      }

      // Paso 2: Enviar a Claude para análisis
      this.logger.debug('Enviando a Claude para análisis...');
      const analysis = await this.claude.analyze(command, this.personality.getSystemPrompt());

      // Paso 3: Parsear acciones
      const actions = this.parseActions(analysis);

      // Paso 4: Ejecutar acciones
      let results = null;
      if (actions.length > 0) {
        this.logger.debug(`Ejecutando ${actions.length} acciones`);
        results = await this.executor.executeActions(actions, this.systems);
      }

      // Paso 5: Guardar en memoria
      await this.memory.saveEpisode({
        command,
        analysis,
        actions: actions.length,
        results: results ? results.length : 0,
        timestamp: new Date(),
        success: true
      });

      // Paso 6: Formatear respuesta
      return this.formatter.response({
        analysis,
        actionsCount: actions.length,
        resultsCount: results ? results.length : 0
      });

    } catch (error) {
      this.logger.error(`Error procesando comando: ${error.message}`);
      return this.formatter.error(`Error: ${error.message}`);
    }
  }

  parseActions(text) {
    const regex = /\[ACTION: ([^\]]+)\]/g;
    const actions = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      actions.push(match[1]);
    }

    return actions;
  }

  shutdown() {
    this.logger.info('Cerrando sesión...');
    this.monitor.stop();
    this.autonomyActive = false;
    this.logger.success('Hasta la próxima, Señor. J.A.R.V.I.S. permanece vigilante.');
  }
}

export default JarvisEnterprise;
