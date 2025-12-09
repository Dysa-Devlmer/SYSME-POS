// core/cicd-manager.js
// J.A.R.V.I.S. MARK VII - FASE 6
// CI/CD Pipeline Manager

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class CICDManager {
  constructor(logger) {
    this.logger = logger;
    this.pipelines = [];
    this.builds = [];
  }

  /**
   * Crear pipeline
   */
  createPipeline(name, stages) {
    const pipeline = {
      id: `pipe_${Date.now()}`,
      name,
      stages,
      created: new Date().toISOString(),
      runs: 0,
      status: 'idle',
      lastBuild: null
    };

    this.pipelines.push(pipeline);
    this.logger.info(`✅ Pipeline creado: ${name} (${pipeline.id})`);

    return pipeline;
  }

  /**
   * Ejecutar pipeline
   */
  async runPipeline(pipelineId, options = {}) {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);

    if (!pipeline) {
      return { success: false, error: 'Pipeline not found' };
    }

    this.logger.info(`🚀 Iniciando pipeline: ${pipeline.name}`);
    pipeline.status = 'running';

    const build = {
      id: `build_${Date.now()}`,
      pipelineId,
      status: 'running',
      stages: [],
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null
    };

    try {
      for (let i = 0; i < pipeline.stages.length; i++) {
        const stage = pipeline.stages[i];
        this.logger.info(`  ▶️ Stage ${i + 1}/${pipeline.stages.length}: ${stage.name}`);

        const stageResult = await this.runStage(stage, options);
        build.stages.push(stageResult);

        if (!stageResult.success) {
          this.logger.error(`  ❌ Stage failed: ${stage.name}`);
          build.status = 'failed';
          break;
        }

        this.logger.info(`  ✅ Stage completado: ${stage.name} (${stageResult.duration}ms)`);
      }

      if (build.status === 'running') {
        build.status = 'success';
        this.logger.info(`✅ Pipeline completado: ${pipeline.name}`);
      }

      build.endTime = new Date().toISOString();
      build.duration = new Date(build.endTime) - new Date(build.startTime);

      pipeline.runs++;
      pipeline.status = 'idle';
      pipeline.lastBuild = build.id;

      this.builds.push(build);

      return { success: build.status === 'success', build };
    } catch (error) {
      build.status = 'error';
      build.endTime = new Date().toISOString();
      build.duration = new Date(build.endTime) - new Date(build.startTime);
      this.builds.push(build);

      this.logger.error(`❌ Error en pipeline: ${error.message}`);
      return { success: false, error: error.message, build };
    }
  }

  /**
   * Ejecutar stage
   */
  async runStage(stage, options = {}) {
    const startTime = Date.now();

    try {
      let output = '';

      // Simular ejecución de comando si está definido
      if (stage.command) {
        try {
          const { stdout, stderr } = await execPromise(stage.command);
          output = stdout || stderr;
        } catch (cmdError) {
          return {
            name: stage.name,
            success: false,
            duration: Date.now() - startTime,
            output: cmdError.message,
            error: cmdError.message
          };
        }
      } else {
        // Simular stage genérico
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
        output = `Stage ${stage.name} completed successfully`;
      }

      return {
        name: stage.name,
        success: true,
        duration: Date.now() - startTime,
        output: output.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: stage.name,
        success: false,
        duration: Date.now() - startTime,
        output: error.message,
        error: error.message
      };
    }
  }

  /**
   * Obtener status del CI/CD
   */
  getStatus() {
    const totalBuilds = this.builds.length;
    const successfulBuilds = this.builds.filter(b => b.status === 'success').length;
    const failedBuilds = this.builds.filter(b => b.status === 'failed').length;
    const errorBuilds = this.builds.filter(b => b.status === 'error').length;

    const successRate = totalBuilds > 0
      ? ((successfulBuilds / totalBuilds) * 100).toFixed(2) + '%'
      : 'N/A';

    return {
      pipelines: this.pipelines.length,
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      errorBuilds,
      successRate,
      lastBuild: this.builds[this.builds.length - 1] || null,
      runningPipelines: this.pipelines.filter(p => p.status === 'running').length
    };
  }

  /**
   * Obtener pipelines
   */
  getPipelines() {
    return this.pipelines.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      stageCount: p.stages.length,
      runs: p.runs,
      lastBuild: p.lastBuild,
      created: p.created
    }));
  }

  /**
   * Obtener pipeline por ID
   */
  getPipeline(pipelineId) {
    return this.pipelines.find(p => p.id === pipelineId);
  }

  /**
   * Obtener builds
   */
  getBuilds(limit = 10) {
    return this.builds.slice(-limit).reverse();
  }

  /**
   * Obtener build por ID
   */
  getBuild(buildId) {
    return this.builds.find(b => b.id === buildId);
  }

  /**
   * Cancelar pipeline en ejecución
   */
  cancelPipeline(pipelineId) {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);

    if (pipeline && pipeline.status === 'running') {
      pipeline.status = 'cancelled';
      this.logger.info(`🛑 Pipeline cancelado: ${pipeline.name}`);
      return true;
    }

    return false;
  }

  /**
   * Eliminar pipeline
   */
  deletePipeline(pipelineId) {
    const index = this.pipelines.findIndex(p => p.id === pipelineId);

    if (index !== -1) {
      const pipeline = this.pipelines[index];
      this.pipelines.splice(index, 1);
      this.logger.info(`🗑️ Pipeline eliminado: ${pipeline.name}`);
      return true;
    }

    return false;
  }

  /**
   * Generar reporte de builds
   */
  generateReport() {
    const status = this.getStatus();
    const recentBuilds = this.getBuilds(5);

    return {
      summary: `Total de ${status.totalBuilds} builds ejecutados`,
      successRate: status.successRate,
      pipelines: status.pipelines,
      recentBuilds: recentBuilds.map(b => ({
        id: b.id,
        status: b.status,
        duration: b.duration,
        timestamp: b.startTime
      })),
      health: this.calculateHealth()
    };
  }

  /**
   * Calcular salud del CI/CD
   */
  calculateHealth() {
    const status = this.getStatus();

    if (status.totalBuilds === 0) {
      return 'unknown';
    }

    const successPercentage = (status.successfulBuilds / status.totalBuilds) * 100;

    if (successPercentage >= 90) return 'excellent';
    if (successPercentage >= 70) return 'good';
    if (successPercentage >= 50) return 'fair';
    return 'poor';
  }
}

module.exports = CICDManager;
