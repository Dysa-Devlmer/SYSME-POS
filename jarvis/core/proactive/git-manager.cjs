// core/proactive/git-manager.cjs
// Sistema de commits automáticos inteligentes para fixes de JARVIS

const { exec } = require('child_process');
const { promisify } = require('util');
const { EventEmitter } = require('events');

const execAsync = promisify(exec);

class GitManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.autoCommit = options.autoCommit !== false;
    this.requireApproval = options.requireApproval !== false; // Por defecto pide aprobación

    // Batch de fixes pendientes
    this.pendingFixes = [];
    this.batchTimeout = null;
    this.batchDelay = options.batchDelay || 5000; // 5 segundos para agrupar fixes

    // Stats
    this.stats = {
      totalCommits: 0,
      totalFixesCommitted: 0,
      lastCommit: null
    };
  }

  /**
   * Registra un fix aplicado para commit posterior
   */
  registerFix(fixData) {
    console.log(`📝 [Git Manager] Fix registrado: ${fixData.filePath}:${fixData.issue.line}`);

    this.pendingFixes.push({
      filePath: fixData.filePath,
      issue: fixData.issue,
      changes: fixData.changes,
      timestamp: Date.now()
    });

    // Clear timeout anterior
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set nuevo timeout para batch commit
    this.batchTimeout = setTimeout(() => {
      this.processPendingFixes();
    }, this.batchDelay);

    this.emit('fix:registered', {
      count: this.pendingFixes.length,
      latest: fixData
    });
  }

  /**
   * Procesa fixes pendientes y crea commit
   */
  async processPendingFixes() {
    if (this.pendingFixes.length === 0) {
      return;
    }

    console.log(`\n🔄 [Git Manager] Procesando ${this.pendingFixes.length} fixes pendientes...`);

    try {
      // Verificar que estamos en un repo git
      const isGitRepo = await this.checkGitRepo();
      if (!isGitRepo) {
        console.log('⚠️ [Git Manager] No es un repositorio git, saltando commit');
        this.pendingFixes = [];
        return;
      }

      // Generar mensaje de commit inteligente
      const commitMessage = this.generateCommitMessage(this.pendingFixes);

      // Si requiere aprobación, emitir evento y esperar
      if (this.requireApproval) {
        console.log('⏳ [Git Manager] Esperando aprobación del usuario...');

        this.emit('commit:approval-required', {
          fixes: this.pendingFixes,
          message: commitMessage,
          filesAffected: [...new Set(this.pendingFixes.map(f => f.filePath))]
        });

        // No limpiar pendingFixes, esperar aprobación manual
        return;
      }

      // Auto-commit sin aprobación
      await this.createCommit(commitMessage);

    } catch (error) {
      console.error('❌ [Git Manager] Error procesando fixes:', error.message);

      this.emit('commit:error', {
        error: error.message,
        fixes: this.pendingFixes
      });
    }
  }

  /**
   * Crea commit con los fixes pendientes
   */
  async createCommit(message) {
    try {
      // Add archivos modificados
      const files = [...new Set(this.pendingFixes.map(f => f.filePath))];

      for (const file of files) {
        await execAsync(`git add "${file}"`, { cwd: this.projectRoot });
      }

      // Commit
      const escapedMessage = message.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${escapedMessage}"`, { cwd: this.projectRoot });

      console.log('✅ [Git Manager] Commit creado exitosamente');
      console.log(`   Mensaje: ${message.split('\n')[0]}`);

      this.stats.totalCommits++;
      this.stats.totalFixesCommitted += this.pendingFixes.length;
      this.stats.lastCommit = {
        message,
        fixes: this.pendingFixes.length,
        timestamp: Date.now()
      };

      this.emit('commit:created', {
        message,
        fixes: this.pendingFixes,
        files
      });

      // Limpiar batch
      this.pendingFixes = [];

    } catch (error) {
      // Si el error es "nothing to commit", no es un error real
      if (error.message.includes('nothing to commit')) {
        console.log('ℹ️ [Git Manager] Sin cambios para commit');
        this.pendingFixes = [];
        return;
      }

      throw error;
    }
  }

  /**
   * Aprueba y ejecuta commit pendiente
   */
  async approveCommit() {
    if (this.pendingFixes.length === 0) {
      console.log('⚠️ [Git Manager] No hay fixes pendientes para commit');
      return { success: false, reason: 'No pending fixes' };
    }

    const message = this.generateCommitMessage(this.pendingFixes);

    try {
      await this.createCommit(message);
      return { success: true, message };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  /**
   * Rechaza commit pendiente
   */
  rejectCommit() {
    console.log(`❌ [Git Manager] Commit rechazado, descartando ${this.pendingFixes.length} fixes`);

    this.emit('commit:rejected', {
      fixes: this.pendingFixes
    });

    this.pendingFixes = [];
  }

  /**
   * Genera mensaje de commit inteligente
   */
  generateCommitMessage(fixes) {
    const fileCount = new Set(fixes.map(f => f.filePath)).size;
    const fixCount = fixes.length;

    // Categorizar fixes
    const categories = {
      security: [],
      bugs: [],
      performance: [],
      quality: []
    };

    fixes.forEach(fix => {
      const type = fix.issue.type || 'quality';
      const issueText = fix.issue.description || fix.issue.issue || fix.issue.problem || '';

      if (issueText.toLowerCase().includes('security') ||
          issueText.toLowerCase().includes('eval') ||
          issueText.toLowerCase().includes('sql') ||
          issueText.toLowerCase().includes('xss')) {
        categories.security.push(fix);
      } else if (issueText.toLowerCase().includes('bug') ||
                 issueText.toLowerCase().includes('null') ||
                 issueText.toLowerCase().includes('undefined')) {
        categories.bugs.push(fix);
      } else if (issueText.toLowerCase().includes('performance') ||
                 issueText.toLowerCase().includes('loop')) {
        categories.performance.push(fix);
      } else {
        categories.quality.push(fix);
      }
    });

    // Determinar emoji y título principal
    let emoji = '🔧';
    let title = 'Auto-fix code issues';

    if (categories.security.length > 0) {
      emoji = '🔒';
      title = 'Fix security vulnerabilities';
    } else if (categories.bugs.length > 0) {
      emoji = '🐛';
      title = 'Fix bugs detected by JARVIS';
    } else if (categories.performance.length > 0) {
      emoji = '⚡';
      title = 'Optimize performance';
    }

    // Construir mensaje
    let message = `${emoji} ${title}\n\n`;
    message += `Applied ${fixCount} automated fix${fixCount > 1 ? 'es' : ''} across ${fileCount} file${fileCount > 1 ? 's' : ''}:\n\n`;

    // Detalles por categoría
    if (categories.security.length > 0) {
      message += `🔒 Security (${categories.security.length}):\n`;
      categories.security.forEach(fix => {
        const desc = fix.changes[0]?.description || 'Security fix applied';
        message += `  • ${fix.filePath}:${fix.issue.line} - ${desc}\n`;
      });
      message += '\n';
    }

    if (categories.bugs.length > 0) {
      message += `🐛 Bugs (${categories.bugs.length}):\n`;
      categories.bugs.forEach(fix => {
        const desc = fix.changes[0]?.description || 'Bug fix applied';
        message += `  • ${fix.filePath}:${fix.issue.line} - ${desc}\n`;
      });
      message += '\n';
    }

    if (categories.performance.length > 0) {
      message += `⚡ Performance (${categories.performance.length}):\n`;
      categories.performance.forEach(fix => {
        const desc = fix.changes[0]?.description || 'Performance optimization';
        message += `  • ${fix.filePath}:${fix.issue.line} - ${desc}\n`;
      });
      message += '\n';
    }

    if (categories.quality.length > 0) {
      message += `💡 Code Quality (${categories.quality.length}):\n`;
      categories.quality.forEach(fix => {
        const desc = fix.changes[0]?.description || 'Code improvement';
        message += `  • ${fix.filePath}:${fix.issue.line} - ${desc}\n`;
      });
      message += '\n';
    }

    message += `🤖 Auto-fixed by JARVIS Proactive Mode\n`;
    message += `\nCo-Authored-By: JARVIS <noreply@jarvis.ai>`;

    return message;
  }

  /**
   * Verifica si es un repo git
   */
  async checkGitRepo() {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene status de git
   */
  async getGitStatus() {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.projectRoot });
      return stdout;
    } catch (error) {
      return '';
    }
  }

  /**
   * Obtiene branch actual
   */
  async getCurrentBranch() {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.projectRoot });
      return stdout.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Obtiene fixes pendientes
   */
  getPendingFixes() {
    return {
      count: this.pendingFixes.length,
      fixes: this.pendingFixes,
      message: this.pendingFixes.length > 0 ? this.generateCommitMessage(this.pendingFixes) : null
    };
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = GitManager;
