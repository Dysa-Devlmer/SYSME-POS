/**
 * 🔄 JARVIS AUTO-UPDATER
 * Sistema de actualización automática
 *
 * Features:
 * - Check for updates from GitHub
 * - Download and install updates
 * - Backup before update
 * - Rollback on failure
 * - Update channels (stable, beta, nightly)
 * - Auto-restart after update
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getLogger } = require('./logger');

class AutoUpdater {
  constructor(config = {}) {
    this.config = {
      repository: config.repository || 'Soyelijah/jarvis-mark-vii',
      channel: config.channel || 'stable', // stable, beta, nightly
      checkInterval: config.checkInterval || 86400000, // 24 hours
      autoInstall: config.autoInstall || false,
      ...config
    };

    this.logger = getLogger();
    this.currentVersion = this.getCurrentVersion();
    this.checkTimer = null;
  }

  /**
   * Obtiene versión actual
   */
  getCurrentVersion() {
    try {
      const pkg = require('../package.json');
      return pkg.version;
    } catch (error) {
      this.logger.error('Failed to get current version', { error: error.message });
      return '0.0.0';
    }
  }

  /**
   * Inicia verificación automática
   */
  start() {
    if (this.checkTimer) {
      this.logger.warn('Auto-updater already running');
      return;
    }

    this.logger.info('Starting auto-updater', {
      currentVersion: this.currentVersion,
      channel: this.config.channel
    });

    // Verificar inmediatamente
    this.checkForUpdates();

    // Verificar periódicamente
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);
  }

  /**
   * Detiene verificación automática
   */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.logger.info('Auto-updater stopped');
    }
  }

  /**
   * Verifica actualizaciones disponibles
   */
  async checkForUpdates() {
    try {
      this.logger.debug('Checking for updates...');

      const latestVersion = await this.getLatestVersion();

      if (!latestVersion) {
        this.logger.warn('Could not fetch latest version');
        return null;
      }

      const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;

      if (updateAvailable) {
        this.logger.info(`Update available: ${this.currentVersion} → ${latestVersion}`);

        const update = {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion,
          releaseNotes: await this.getReleaseNotes(latestVersion)
        };

        // Auto-install si está habilitado
        if (this.config.autoInstall) {
          await this.installUpdate(latestVersion);
        }

        return update;

      } else {
        this.logger.debug('No updates available');
        return { available: false, currentVersion: this.currentVersion };
      }

    } catch (error) {
      this.logger.error('Failed to check for updates', { error: error.message });
      return null;
    }
  }

  /**
   * Obtiene última versión de GitHub
   */
  async getLatestVersion() {
    try {
      const url = `https://api.github.com/repos/${this.config.repository}/releases`;

      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'JARVIS-Auto-Updater'
        },
        timeout: 10000
      });

      const releases = response.data;

      // Filtrar por canal
      const filtered = releases.filter(release => {
        if (this.config.channel === 'nightly') {
          return true; // Incluir todas
        } else if (this.config.channel === 'beta') {
          return !release.tag_name.includes('nightly');
        } else {
          // stable: solo releases sin pre-release
          return !release.prerelease && !release.draft;
        }
      });

      if (filtered.length === 0) {
        return null;
      }

      // Obtener el más reciente
      const latest = filtered[0];
      return latest.tag_name.replace(/^v/, '');

    } catch (error) {
      this.logger.error('Failed to fetch latest version', { error: error.message });
      return null;
    }
  }

  /**
   * Obtiene release notes
   */
  async getReleaseNotes(version) {
    try {
      const url = `https://api.github.com/repos/${this.config.repository}/releases/tags/v${version}`;

      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'JARVIS-Auto-Updater'
        },
        timeout: 10000
      });

      return response.data.body || 'No release notes available';

    } catch (error) {
      this.logger.error('Failed to fetch release notes', { error: error.message });
      return 'Error fetching release notes';
    }
  }

  /**
   * Compara versiones (semver)
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Instala actualización
   */
  async installUpdate(version) {
    try {
      this.logger.info(`Installing update: v${version}`);

      // 1. Crear backup
      await this.createBackup();

      // 2. Descargar actualización
      const updatePath = await this.downloadUpdate(version);

      // 3. Instalar
      await this.applyUpdate(updatePath);

      // 4. Verificar instalación
      const success = await this.verifyInstallation(version);

      if (success) {
        this.logger.success(`Successfully updated to v${version}`);

        // Restart si está configurado
        if (this.config.autoRestart) {
          this.restart();
        }

        return true;

      } else {
        this.logger.error('Update verification failed, rolling back...');
        await this.rollback();
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to install update', { error: error.message });

      // Rollback en caso de error
      await this.rollback();

      return false;
    }
  }

  /**
   * Crea backup antes de actualizar
   */
  async createBackup() {
    this.logger.info('Creating backup...');

    const backupPath = path.join(__dirname, '../backups', `pre-update-${Date.now()}`);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Backup de archivos críticos
    const criticalFiles = [
      'package.json',
      'package-lock.json',
      '.env',
      'memory',
      'config'
    ];

    for (const file of criticalFiles) {
      const src = path.join(__dirname, '..', file);
      if (fs.existsSync(src)) {
        const dest = path.join(backupPath, file);

        if (fs.statSync(src).isDirectory()) {
          fs.cpSync(src, dest, { recursive: true });
        } else {
          fs.copyFileSync(src, dest);
        }
      }
    }

    this.logger.success('Backup created');
    this.lastBackupPath = backupPath;
  }

  /**
   * Descarga actualización
   */
  async downloadUpdate(version) {
    this.logger.info('Downloading update...');

    // En producción, descargaría el tarball/zip de GitHub
    // Por ahora, usar npm update como fallback

    try {
      execSync('npm update', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });

      return path.join(__dirname, '..');

    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Aplica actualización
   */
  async applyUpdate(updatePath) {
    this.logger.info('Applying update...');

    try {
      // Instalar dependencias
      execSync('npm install --production', {
        cwd: updatePath,
        stdio: 'inherit'
      });

      this.logger.success('Update applied');

    } catch (error) {
      throw new Error(`Failed to apply update: ${error.message}`);
    }
  }

  /**
   * Verifica instalación
   */
  async verifyInstallation(expectedVersion) {
    try {
      // Recargar package.json
      delete require.cache[require.resolve('../package.json')];
      const pkg = require('../package.json');

      return pkg.version === expectedVersion;

    } catch (error) {
      this.logger.error('Verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Rollback de actualización
   */
  async rollback() {
    if (!this.lastBackupPath) {
      this.logger.warn('No backup available for rollback');
      return false;
    }

    try {
      this.logger.info('Rolling back update...');

      // Restaurar desde backup
      const criticalFiles = fs.readdirSync(this.lastBackupPath);

      for (const file of criticalFiles) {
        const src = path.join(this.lastBackupPath, file);
        const dest = path.join(__dirname, '..', file);

        if (fs.statSync(src).isDirectory()) {
          fs.rmSync(dest, { recursive: true, force: true });
          fs.cpSync(src, dest, { recursive: true });
        } else {
          fs.copyFileSync(src, dest);
        }
      }

      this.logger.success('Rollback completed');
      return true;

    } catch (error) {
      this.logger.error('Rollback failed', { error: error.message });
      return false;
    }
  }

  /**
   * Reinicia la aplicación
   */
  restart() {
    this.logger.info('Restarting application...');

    setTimeout(() => {
      process.exit(0); // PM2 or similar will restart
    }, 1000);
  }

  /**
   * Obtiene información de actualización
   */
  async getUpdateInfo() {
    const latest = await this.getLatestVersion();

    return {
      currentVersion: this.currentVersion,
      latestVersion: latest,
      updateAvailable: latest ? this.compareVersions(latest, this.currentVersion) > 0 : false,
      channel: this.config.channel
    };
  }
}

module.exports = AutoUpdater;
