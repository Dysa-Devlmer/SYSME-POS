// core/git-integration.js
// J.A.R.V.I.S. Git & GitHub Integration Module
// Proporciona control total sobre repositorios locales y remotos

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class GitIntegration {
  constructor() {
    this.currentRepo = null;
    this.repos = [];
    this.githubToken = process.env.GITHUB_TOKEN || null;
    this.githubUsername = process.env.GITHUB_USERNAME || null;
    this.initialized = false;
  }

  /**
   * Inicializa el módulo Git detectando repositorios
   */
  async initialize() {
    console.log('🔧 [Git Integration] Inicializando módulo Git...');

    try {
      // Detectar si estamos en un repositorio Git
      const isRepo = await this.isGitRepository(process.cwd());

      if (isRepo) {
        this.currentRepo = process.cwd();
        console.log(`✅ [Git Integration] Repositorio detectado: ${this.currentRepo}`);
      } else {
        console.log('⚠️  [Git Integration] No hay repositorio Git en el directorio actual');
      }

      // Validar credenciales GitHub
      if (this.githubToken) {
        const isValid = await this.validateGitHubToken();
        if (isValid) {
          console.log('✅ [Git Integration] GitHub token válido');
        } else {
          console.log('⚠️  [Git Integration] GitHub token inválido o expirado');
          this.githubToken = null;
        }
      } else {
        console.log('⚠️  [Git Integration] GitHub token no configurado (funcionalidad limitada)');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ [Git Integration] Error durante inicialización:', error.message);
      return false;
    }
  }

  /**
   * Verifica si un directorio es un repositorio Git
   */
  async isGitRepository(dir) {
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd: dir });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Valida el token de GitHub
   */
  async validateGitHubToken() {
    if (!this.githubToken) return false;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.githubUsername = data.login;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // COMANDOS GIT LOCAL
  // ═════════════════════════════════════════════════════════════

  /**
   * git status - Obtiene el estado del repositorio
   */
  async getStatus(options = {}) {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.currentRepo || process.cwd()
      });

      const files = {
        staged: [],
        modified: [],
        untracked: [],
        deleted: []
      };

      const lines = stdout.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const status = line.substring(0, 2);
        const filename = line.substring(3).trim();

        if (status.includes('M')) {
          if (status[0] === 'M') {
            files.staged.push(filename);
          } else {
            files.modified.push(filename);
          }
        } else if (status.includes('A')) {
          files.staged.push(filename);
        } else if (status.includes('D')) {
          files.deleted.push(filename);
        } else if (status.includes('?')) {
          files.untracked.push(filename);
        }
      }

      // Obtener rama actual
      const { stdout: branch } = await execAsync('git branch --show-current', {
        cwd: this.currentRepo || process.cwd()
      });

      // Verificar si hay commits pendientes de push
      let unpushedCommits = 0;
      try {
        const { stdout: unpushed } = await execAsync(
          'git log @{u}.. --oneline 2>nul || echo ""',
          { cwd: this.currentRepo || process.cwd(), shell: 'cmd.exe' }
        );
        unpushedCommits = unpushed.trim().split('\n').filter(l => l).length;
      } catch {
        unpushedCommits = 0;
      }

      return {
        clean: lines.length === 0,
        branch: branch.trim(),
        files,
        unpushedCommits,
        totalChanges: files.modified.length + files.untracked.length + files.deleted.length + files.staged.length
      };
    } catch (error) {
      throw new Error(`Error obteniendo estado Git: ${error.message}`);
    }
  }

  /**
   * git log - Obtiene el historial de commits
   */
  async getLog(limit = 10) {
    try {
      const { stdout } = await execAsync(
        `git log -${limit} --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`,
        { cwd: this.currentRepo || process.cwd() }
      );

      const commits = stdout.split('\n').map(line => {
        const [hash, author, email, date, message] = line.split('|');
        return {
          hash: hash.substring(0, 7),
          fullHash: hash,
          author,
          email,
          date: new Date(date),
          message
        };
      });

      return commits;
    } catch (error) {
      throw new Error(`Error obteniendo log Git: ${error.message}`);
    }
  }

  /**
   * git add - Agrega archivos al staging area
   */
  async add(files = '.') {
    try {
      const filesArray = Array.isArray(files) ? files.join(' ') : files;
      await execAsync(`git add ${filesArray}`, {
        cwd: this.currentRepo || process.cwd()
      });
      return true;
    } catch (error) {
      throw new Error(`Error agregando archivos: ${error.message}`);
    }
  }

  /**
   * git commit - Crea un nuevo commit
   */
  async commit(message, options = {}) {
    try {
      // Validar que hay cambios staged
      const status = await this.getStatus();
      if (status.files.staged.length === 0 && !options.allowEmpty) {
        throw new Error('No hay cambios en staging area para commit');
      }

      // Crear commit
      const commitMessage = options.addSignature
        ? `${message}\n\n🤖 Generated by J.A.R.V.I.S.\nCo-Authored-By: JARVIS <jarvis@stark-industries.com>`
        : message;

      const { stdout } = await execAsync(
        `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
        { cwd: this.currentRepo || process.cwd() }
      );

      return {
        success: true,
        output: stdout.trim()
      };
    } catch (error) {
      throw new Error(`Error creando commit: ${error.message}`);
    }
  }

  /**
   * git push - Sube cambios al remoto
   */
  async push(remote = 'origin', branch = null) {
    try {
      // Si no se especifica rama, usar la actual
      if (!branch) {
        const status = await this.getStatus();
        branch = status.branch;
      }

      const { stdout, stderr } = await execAsync(
        `git push ${remote} ${branch}`,
        { cwd: this.currentRepo || process.cwd() }
      );

      return {
        success: true,
        output: stdout || stderr
      };
    } catch (error) {
      // Git push a veces usa stderr para mensajes normales
      if (error.stderr && error.stderr.includes('up-to-date')) {
        return {
          success: true,
          output: 'Ya está actualizado'
        };
      }
      throw new Error(`Error haciendo push: ${error.message}`);
    }
  }

  /**
   * git pull - Baja cambios del remoto
   */
  async pull(remote = 'origin', branch = null) {
    try {
      if (!branch) {
        const status = await this.getStatus();
        branch = status.branch;
      }

      const { stdout } = await execAsync(
        `git pull ${remote} ${branch}`,
        { cwd: this.currentRepo || process.cwd() }
      );

      return {
        success: true,
        output: stdout.trim()
      };
    } catch (error) {
      throw new Error(`Error haciendo pull: ${error.message}`);
    }
  }

  /**
   * git branch - Manejo de ramas
   */
  async branch(action = 'list', branchName = null) {
    try {
      switch (action) {
        case 'list':
          const { stdout: listOut } = await execAsync('git branch -a', {
            cwd: this.currentRepo || process.cwd()
          });
          return listOut.split('\n')
            .filter(b => b.trim())
            .map(b => ({
              name: b.replace(/^\*?\s+/, '').trim(),
              current: b.startsWith('*'),
              remote: b.includes('remotes/')
            }));

        case 'create':
          if (!branchName) throw new Error('Se requiere nombre de rama');
          await execAsync(`git branch ${branchName}`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: `Rama ${branchName} creada` };

        case 'checkout':
          if (!branchName) throw new Error('Se requiere nombre de rama');
          await execAsync(`git checkout ${branchName}`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: `Cambiado a rama ${branchName}` };

        case 'delete':
          if (!branchName) throw new Error('Se requiere nombre de rama');
          await execAsync(`git branch -d ${branchName}`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: `Rama ${branchName} eliminada` };

        default:
          throw new Error(`Acción desconocida: ${action}`);
      }
    } catch (error) {
      throw new Error(`Error en operación de rama: ${error.message}`);
    }
  }

  /**
   * git diff - Muestra diferencias
   */
  async diff(file = null, options = {}) {
    try {
      let cmd = 'git diff';

      if (options.staged) {
        cmd += ' --staged';
      }

      if (file) {
        cmd += ` ${file}`;
      }

      if (options.stat) {
        cmd += ' --stat';
      }

      const { stdout } = await execAsync(cmd, {
        cwd: this.currentRepo || process.cwd()
      });

      return stdout;
    } catch (error) {
      throw new Error(`Error obteniendo diff: ${error.message}`);
    }
  }

  /**
   * git stash - Guarda cambios temporalmente
   */
  async stash(action = 'save', message = 'Work in progress') {
    try {
      switch (action) {
        case 'save':
          await execAsync(`git stash save "${message}"`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: 'Cambios guardados en stash' };

        case 'pop':
          await execAsync('git stash pop', {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: 'Cambios restaurados desde stash' };

        case 'list':
          const { stdout } = await execAsync('git stash list', {
            cwd: this.currentRepo || process.cwd()
          });
          return stdout.split('\n').filter(l => l.trim());

        default:
          throw new Error(`Acción de stash desconocida: ${action}`);
      }
    } catch (error) {
      throw new Error(`Error en stash: ${error.message}`);
    }
  }

  /**
   * git remote - Gestión de remotos
   */
  async remote(action = 'list', name = null, url = null) {
    try {
      switch (action) {
        case 'list':
          const { stdout } = await execAsync('git remote -v', {
            cwd: this.currentRepo || process.cwd()
          });
          return stdout;

        case 'add':
          if (!name || !url) throw new Error('Se requiere nombre y URL');
          await execAsync(`git remote add ${name} ${url}`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: `Remoto ${name} agregado` };

        case 'remove':
          if (!name) throw new Error('Se requiere nombre de remoto');
          await execAsync(`git remote remove ${name}`, {
            cwd: this.currentRepo || process.cwd()
          });
          return { success: true, message: `Remoto ${name} eliminado` };

        default:
          throw new Error(`Acción de remote desconocida: ${action}`);
      }
    } catch (error) {
      throw new Error(`Error en remote: ${error.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // GITHUB API INTEGRATION
  // ═════════════════════════════════════════════════════════════

  /**
   * Realiza request a GitHub API
   */
  async githubRequest(endpoint, options = {}) {
    if (!this.githubToken) {
      throw new Error('GitHub token no configurado. Configura GITHUB_TOKEN en variables de entorno.');
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `https://api.github.com${endpoint}`;

    const defaultOptions = {
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Lista todos los repositorios del usuario
   */
  async listRepositories(options = {}) {
    try {
      const params = new URLSearchParams({
        per_page: options.limit || 30,
        sort: options.sort || 'updated',
        direction: 'desc'
      });

      const repos = await this.githubRequest(`/user/repos?${params}`);

      return repos.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        updatedAt: new Date(repo.updated_at),
        createdAt: new Date(repo.created_at)
      }));
    } catch (error) {
      throw new Error(`Error listando repositorios: ${error.message}`);
    }
  }

  /**
   * Obtiene información de un repositorio específico
   */
  async getRepository(owner, repo) {
    try {
      const data = await this.githubRequest(`/repos/${owner}/${repo}`);

      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        url: data.html_url,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      throw new Error(`Error obteniendo repositorio: ${error.message}`);
    }
  }

  /**
   * Lista issues de un repositorio
   */
  async listIssues(owner, repo, options = {}) {
    try {
      const params = new URLSearchParams({
        state: options.state || 'open',
        per_page: options.limit || 30,
        sort: options.sort || 'created',
        direction: 'desc'
      });

      if (options.labels) {
        params.append('labels', options.labels);
      }

      const issues = await this.githubRequest(`/repos/${owner}/${repo}/issues?${params}`);

      return issues
        .filter(issue => !issue.pull_request) // Filtrar PRs
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          author: issue.user.login,
          labels: issue.labels.map(l => l.name),
          comments: issue.comments,
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
          url: issue.html_url
        }));
    } catch (error) {
      throw new Error(`Error listando issues: ${error.message}`);
    }
  }

  /**
   * Crea un nuevo issue
   */
  async createIssue(owner, repo, title, body, options = {}) {
    try {
      const issueData = {
        title,
        body,
        labels: options.labels || [],
        assignees: options.assignees || []
      };

      const issue = await this.githubRequest(`/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        body: JSON.stringify(issueData)
      });

      return {
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state
      };
    } catch (error) {
      throw new Error(`Error creando issue: ${error.message}`);
    }
  }

  /**
   * Lista pull requests
   */
  async listPullRequests(owner, repo, options = {}) {
    try {
      const params = new URLSearchParams({
        state: options.state || 'open',
        per_page: options.limit || 30,
        sort: options.sort || 'created',
        direction: 'desc'
      });

      const prs = await this.githubRequest(`/repos/${owner}/${repo}/pulls?${params}`);

      return prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        author: pr.user.login,
        head: pr.head.ref,
        base: pr.base.ref,
        mergeable: pr.mergeable,
        merged: pr.merged,
        comments: pr.comments,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        url: pr.html_url
      }));
    } catch (error) {
      throw new Error(`Error listando pull requests: ${error.message}`);
    }
  }

  /**
   * Crea un pull request
   */
  async createPullRequest(owner, repo, title, head, base, body = '', options = {}) {
    try {
      const prData = {
        title,
        head,
        base,
        body,
        draft: options.draft || false
      };

      const pr = await this.githubRequest(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify(prData)
      });

      return {
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state
      };
    } catch (error) {
      throw new Error(`Error creando pull request: ${error.message}`);
    }
  }

  /**
   * Obtiene información del usuario autenticado
   */
  async getAuthenticatedUser() {
    try {
      const user = await this.githubRequest('/user');

      return {
        username: user.login,
        name: user.name,
        email: user.email,
        bio: user.bio,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        createdAt: new Date(user.created_at),
        url: user.html_url
      };
    } catch (error) {
      throw new Error(`Error obteniendo usuario: ${error.message}`);
    }
  }

  /**
   * Busca repositorios en GitHub
   */
  async searchRepositories(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        per_page: options.limit || 30,
        sort: options.sort || 'stars',
        order: 'desc'
      });

      const result = await this.githubRequest(`/search/repositories?${params}`);

      return {
        total: result.total_count,
        items: result.items.map(repo => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count
        }))
      };
    } catch (error) {
      throw new Error(`Error buscando repositorios: ${error.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // ACCIONES PROACTIVAS
  // ═════════════════════════════════════════════════════════════

  /**
   * Detecta cambios sin commit
   */
  async detectUncommittedChanges() {
    try {
      const status = await this.getStatus();

      if (status.totalChanges > 0) {
        return {
          hasChanges: true,
          files: status.files,
          totalChanges: status.totalChanges,
          branch: status.branch,
          recommendation: this.totalChanges > 5
            ? 'Recomiendo hacer commit - hay bastantes cambios acumulados'
            : 'Hay cambios pendientes de commit'
        };
      }

      return { hasChanges: false };
    } catch (error) {
      return { hasChanges: false, error: error.message };
    }
  }

  /**
   * Alerta sobre branches desactualizadas
   */
  async detectOutdatedBranches() {
    try {
      // Obtener rama actual
      const status = await this.getStatus();
      const currentBranch = status.branch;

      // Fetch cambios remotos
      await execAsync('git fetch', { cwd: this.currentRepo || process.cwd() });

      // Verificar si hay commits en remoto que no están en local
      const { stdout } = await execAsync(
        `git log ${currentBranch}..origin/${currentBranch} --oneline 2>nul || echo ""`,
        { cwd: this.currentRepo || process.cwd(), shell: 'cmd.exe' }
      );

      const behindCommits = stdout.trim().split('\n').filter(l => l).length;

      if (behindCommits > 0) {
        return {
          outdated: true,
          branch: currentBranch,
          behindBy: behindCommits,
          recommendation: 'Recomiendo hacer git pull para actualizar'
        };
      }

      return { outdated: false };
    } catch (error) {
      return { outdated: false, error: error.message };
    }
  }

  /**
   * Crea commit automático inteligente
   */
  async smartAutoCommit(options = {}) {
    try {
      const status = await this.getStatus();

      // No hacer commit si no hay cambios
      if (status.totalChanges === 0) {
        return { committed: false, reason: 'No hay cambios para commit' };
      }

      // No hacer commit automático si hay demasiados cambios (posible refactor grande)
      if (status.totalChanges > 20 && !options.force) {
        return {
          committed: false,
          reason: 'Demasiados cambios - requiere commit manual',
          totalChanges: status.totalChanges
        };
      }

      // Agregar todos los archivos modificados
      await this.add('.');

      // Generar mensaje de commit automático
      const fileTypes = this.analyzeFileTypes(status.files);
      const message = this.generateCommitMessage(fileTypes, status.totalChanges);

      // Crear commit
      const result = await this.commit(message, { addSignature: true });

      return {
        committed: true,
        message,
        filesChanged: status.totalChanges,
        output: result.output
      };
    } catch (error) {
      return {
        committed: false,
        error: error.message
      };
    }
  }

  /**
   * Analiza tipos de archivos modificados
   */
  analyzeFileTypes(files) {
    const types = {
      code: 0,
      config: 0,
      docs: 0,
      tests: 0,
      other: 0
    };

    const allFiles = [
      ...files.modified,
      ...files.staged,
      ...files.untracked
    ];

    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();

      if (['.js', '.ts', '.py', '.java', '.cpp', '.cs', '.go'].includes(ext)) {
        types.code++;
      } else if (['.json', '.yaml', '.yml', '.env', '.config'].includes(ext)) {
        types.config++;
      } else if (['.md', '.txt', '.pdf'].includes(ext)) {
        types.docs++;
      } else if (file.includes('test') || file.includes('spec')) {
        types.tests++;
      } else {
        types.other++;
      }
    }

    return types;
  }

  /**
   * Genera mensaje de commit automático
   */
  generateCommitMessage(fileTypes, totalChanges) {
    const messages = [];

    if (fileTypes.code > 0) {
      messages.push(`Update ${fileTypes.code} code file${fileTypes.code > 1 ? 's' : ''}`);
    }
    if (fileTypes.config > 0) {
      messages.push(`Update configuration`);
    }
    if (fileTypes.docs > 0) {
      messages.push(`Update documentation`);
    }
    if (fileTypes.tests > 0) {
      messages.push(`Update tests`);
    }

    const mainMessage = messages.length > 0
      ? messages.join(', ')
      : `Update ${totalChanges} file${totalChanges > 1 ? 's' : ''}`;

    return `Auto-commit: ${mainMessage}`;
  }

  /**
   * Extrae owner/repo del remoto actual
   */
  async getCurrentRepoInfo() {
    try {
      const { stdout } = await execAsync('git remote get-url origin', {
        cwd: this.currentRepo || process.cwd()
      });

      const url = stdout.trim();

      // Parsear GitHub URL (https o SSH)
      let match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);

      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}

export default GitIntegration;
