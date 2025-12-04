/**
 * 🗂️ PROJECT MEMORY MANAGER
 * Sistema de memoria persistente para gestionar múltiples proyectos en JARVIS
 *
 * Funcionalidades:
 * - Registrar proyectos en desarrollo
 * - Recordar último estado de cada proyecto
 * - Recuperar contexto al retomar un proyecto
 * - Sugerir próximos pasos basados en historial
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectMemoryManager {
  constructor() {
    this.projectsDir = path.join(__dirname, '..', 'Proyectos');
    this.registryFile = path.join(this.projectsDir, 'PROYECTO_REGISTRY.json');
    this.memoryDir = path.join(__dirname, '..', 'memory');
  }

  /**
   * Cargar el registro de proyectos
   */
  async loadRegistry() {
    try {
      const data = await fs.readFile(this.registryFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error al cargar registro de proyectos:', error.message);
      return { projects: {}, metadata: {} };
    }
  }

  /**
   * Guardar el registro de proyectos
   */
  async saveRegistry(registry) {
    try {
      await fs.writeFile(
        this.registryFile,
        JSON.stringify(registry, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      console.error('Error al guardar registro:', error.message);
      return false;
    }
  }

  /**
   * Listar todos los proyectos
   */
  async listProjects() {
    const registry = await this.loadRegistry();
    return Object.entries(registry.projects || {}).map(([key, project]) => ({
      id: key,
      name: project.name,
      status: project.status,
      priority: project.priority,
      progress: project.lastSession?.progress || '0%',
      lastUpdate: project.lastSession?.date || 'N/A'
    }));
  }

  /**
   * Obtener información detallada de un proyecto
   */
  async getProject(projectId) {
    const registry = await this.loadRegistry();
    return registry.projects?.[projectId] || null;
  }

  /**
   * Actualizar último estado de un proyecto
   */
  async updateProjectSession(projectId, sessionData) {
    const registry = await this.loadRegistry();

    if (!registry.projects[projectId]) {
      throw new Error(`Proyecto ${projectId} no encontrado`);
    }

    registry.projects[projectId].lastSession = {
      date: new Date().toISOString().split('T')[0],
      topic: sessionData.topic || 'Sesión de trabajo',
      progress: sessionData.progress || registry.projects[projectId].lastSession?.progress || '0%',
      nextSteps: sessionData.nextSteps || []
    };

    registry.lastUpdated = new Date().toISOString().split('T')[0];

    await this.saveRegistry(registry);
    return registry.projects[projectId];
  }

  /**
   * Obtener contexto para retomar un proyecto
   */
  async getProjectContext(projectId) {
    const project = await this.getProject(projectId);

    if (!project) {
      return null;
    }

    const context = {
      projectName: project.name,
      description: project.description,
      currentProgress: project.lastSession?.progress || '0%',
      lastSession: project.lastSession?.topic || 'Sin sesiones previas',
      lastUpdate: project.lastSession?.date || 'N/A',
      nextSteps: project.lastSession?.nextSteps || [],
      keyDocuments: project.keyDocuments || [],
      workingDirectory: project.localPath,
      technologies: project.technologies || [],
      ports: project.ports || {},
      status: project.status
    };

    return context;
  }

  /**
   * Crear resumen para el usuario sobre qué proyecto continuar
   */
  async getProjectSelectionPrompt() {
    const projects = await this.listProjects();

    if (projects.length === 0) {
      return 'No hay proyectos registrados.';
    }

    let prompt = '🗂️ **PROYECTOS EN JARVIS**\n\n';
    prompt += 'Selecciona un proyecto para continuar:\n\n';

    projects.forEach((proj, index) => {
      const statusEmoji = {
        'in-development': '🔄',
        'production-ready': '✅',
        'planning': '📋',
        'on-hold': '⏸️'
      }[proj.status] || '📁';

      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[proj.priority] || '⚪';

      prompt += `${index + 1}. ${statusEmoji} **${proj.name}**\n`;
      prompt += `   ${priorityEmoji} Prioridad: ${proj.priority} | Progreso: ${proj.progress}\n`;
      prompt += `   Última actualización: ${proj.lastUpdate}\n\n`;
    });

    return prompt;
  }

  /**
   * Registrar nuevo proyecto
   */
  async registerProject(projectData) {
    const registry = await this.loadRegistry();

    const projectId = projectData.id;

    registry.projects[projectId] = {
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      type: projectData.type || 'application',
      status: projectData.status || 'planning',
      priority: projectData.priority || 'medium',
      localPath: projectData.localPath,
      originalPath: projectData.originalPath || projectData.localPath,
      technologies: projectData.technologies || [],
      lastSession: {
        date: new Date().toISOString().split('T')[0],
        topic: 'Proyecto registrado',
        progress: '0%',
        nextSteps: []
      },
      keyDocuments: projectData.keyDocuments || [],
      mainFeatures: projectData.mainFeatures || {},
      teamMembers: projectData.teamMembers || []
    };

    registry.metadata = registry.metadata || {};
    registry.metadata.totalProjects = Object.keys(registry.projects).length;
    registry.lastUpdated = new Date().toISOString().split('T')[0];

    await this.saveRegistry(registry);
    return registry.projects[projectId];
  }

  /**
   * Generar informe de estado de todos los proyectos
   */
  async generateStatusReport() {
    const projects = await this.listProjects();
    const registry = await this.loadRegistry();

    let report = '# 📊 REPORTE DE ESTADO DE PROYECTOS\n\n';
    report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n`;
    report += `**Total de proyectos:** ${projects.length}\n\n`;
    report += '---\n\n';

    for (const [projectId, project] of Object.entries(registry.projects)) {
      report += `## ${project.name}\n\n`;
      report += `**ID:** ${projectId}\n`;
      report += `**Estado:** ${project.status}\n`;
      report += `**Prioridad:** ${project.priority}\n`;
      report += `**Progreso:** ${project.lastSession?.progress || '0%'}\n`;
      report += `**Ubicación:** \`${project.localPath}\`\n\n`;

      if (project.lastSession) {
        report += `**Última sesión:**\n`;
        report += `- Fecha: ${project.lastSession.date}\n`;
        report += `- Tema: ${project.lastSession.topic}\n`;

        if (project.lastSession.nextSteps?.length > 0) {
          report += `\n**Próximos pasos:**\n`;
          project.lastSession.nextSteps.forEach(step => {
            report += `- ${step}\n`;
          });
        }
      }

      report += '\n---\n\n';
    }

    return report;
  }
}

// Export singleton
module.exports = new ProjectMemoryManager();
