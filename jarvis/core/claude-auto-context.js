/**
 * 🤖 CLAUDE CODE AUTO-CONTEXT LOADER
 * Sistema que carga automáticamente el contexto para Claude Code
 * al inicio de cada sesión
 */

import fs from 'fs/promises';
import path from 'path';

class ClaudeAutoContext {
  constructor() {
    this.contextDir = path.join(process.cwd(), 'memory', 'context');
    this.sessionsDir = path.join(process.cwd(), 'memory', 'sessions');
  }

  /**
   * 📖 GENERAR CONTEXTO DE INICIO
   * Este archivo se debe leer SIEMPRE al iniciar Claude Code
   */
  async generateStartupContext() {
    const context = {
      sections: []
    };

    // 1. Cargar estado actual
    const currentState = await this.loadCurrentState();
    if (currentState) {
      context.sections.push({
        title: '📊 ESTADO ACTUAL',
        content: currentState
      });
    }

    // 2. Cargar última sesión
    const lastSession = await this.loadLastSession();
    if (lastSession) {
      context.sections.push({
        title: '📅 ÚLTIMA SESIÓN',
        content: lastSession
      });
    }

    // 3. Cargar tareas pendientes
    const pendingTasks = await this.loadPendingTasks();
    if (pendingTasks && pendingTasks.length > 0) {
      context.sections.push({
        title: '✅ TAREAS PENDIENTES',
        content: pendingTasks
      });
    }

    // 4. Cargar preferencias del usuario
    const preferences = await this.loadUserPreferences();
    if (preferences) {
      context.sections.push({
        title: '⚙️ PREFERENCIAS DEL USUARIO',
        content: preferences
      });
    }

    // 5. Generar markdown para Claude
    const markdown = this.generateContextMarkdown(context);

    // Guardar en archivo que Claude debe leer
    const contextPath = path.join(this.contextDir, 'CLAUDE-START-HERE.md');
    await fs.writeFile(contextPath, markdown);

    console.log(`✅ Contexto de inicio generado: ${contextPath}`);
    return contextPath;
  }

  /**
   * 📊 CARGAR ESTADO ACTUAL
   */
  async loadCurrentState() {
    try {
      const statePath = path.join(this.contextDir, 'CURRENT-STATE.json');
      const data = await fs.readFile(statePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * 📅 CARGAR ÚLTIMA SESIÓN
   */
  async loadLastSession() {
    try {
      const lastSessionPath = path.join(this.contextDir, 'last-session.json');
      const data = await fs.readFile(lastSessionPath, 'utf8');
      const lastSession = JSON.parse(data);

      // Cargar el archivo completo de la sesión
      const sessionDate = lastSession.date;
      const sessionPath = path.join(this.sessionsDir, `${sessionDate}.json`);
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      return JSON.parse(sessionData);
    } catch {
      return null;
    }
  }

  /**
   * ✅ CARGAR TAREAS PENDIENTES
   */
  async loadPendingTasks() {
    try {
      const tasksPath = path.join(this.contextDir, 'pending-tasks.json');
      const data = await fs.readFile(tasksPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * ⚙️ CARGAR PREFERENCIAS
   */
  async loadUserPreferences() {
    try {
      const prefsPath = path.join(process.cwd(), 'memory', 'knowledge', 'user-preferences.json');
      const data = await fs.readFile(prefsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * 📝 GENERAR MARKDOWN DE CONTEXTO
   */
  generateContextMarkdown(context) {
    let md = `# 🧠 CONTEXTO AUTOMÁTICO PARA CLAUDE CODE\n\n`;
    md += `**IMPORTANTE:** Claude, lee esto PRIMERO al iniciar cualquier sesión.\n\n`;
    md += `---\n\n`;

    for (const section of context.sections) {
      md += `## ${section.title}\n\n`;

      if (typeof section.content === 'string') {
        md += section.content + '\n\n';
      } else if (Array.isArray(section.content)) {
        section.content.forEach((item, i) => {
          md += `${i + 1}. ${JSON.stringify(item, null, 2)}\n`;
        });
        md += '\n';
      } else {
        md += '```json\n' + JSON.stringify(section.content, null, 2) + '\n```\n\n';
      }

      md += `---\n\n`;
    }

    md += `## 🎯 PROTOCOLO DE INICIO\n\n`;
    md += `Claude Code, cuando el usuario te abra, SIEMPRE debes:\n\n`;
    md += `1. ✅ Leer este archivo (CLAUDE-START-HERE.md)\n`;
    md += `2. ✅ Revisar el estado actual del sistema\n`;
    md += `3. ✅ Cargar la última sesión en tu memoria de trabajo\n`;
    md += `4. ✅ Identificar tareas pendientes\n`;
    md += `5. ✅ Saludar al usuario con contexto completo\n\n`;

    md += `**Ejemplo de saludo correcto:**\n\n`;
    md += `> "Buenas noches, Señor. He revisado nuestro progreso del [fecha última sesión].\n`;
    md += `> Completamos [X] tareas, resolvimos [Y] problemas.\n`;
    md += `> Servicios activos: [lista].\n`;
    md += `> Tareas pendientes: [lista].\n`;
    md += `> ¿En qué continuamos hoy?"\n\n`;

    md += `---\n\n`;
    md += `**J.A.R.V.I.S. MARK VII - Auto-Context System** ⚡\n`;
    md += `**Generado:** ${new Date().toISOString()}\n`;

    return md;
  }

  /**
   * 📋 GUARDAR TAREAS PENDIENTES
   */
  async savePendingTasks(tasks) {
    const tasksPath = path.join(this.contextDir, 'pending-tasks.json');
    await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
  }

  /**
   * 💾 GUARDAR PREFERENCIAS
   */
  async saveUserPreference(key, value) {
    const prefsPath = path.join(process.cwd(), 'memory', 'knowledge', 'user-preferences.json');

    let prefs = {};
    try {
      const data = await fs.readFile(prefsPath, 'utf8');
      prefs = JSON.parse(data);
    } catch {
      // Archivo no existe, crear nuevo
    }

    prefs[key] = {
      value,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(prefsPath, JSON.stringify(prefs, null, 2));
  }
}

export default ClaudeAutoContext;
