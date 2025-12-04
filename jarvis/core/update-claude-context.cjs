#!/usr/bin/env node

/**
 * 📝 Update Claude Context File
 *
 * Este script actualiza automáticamente el archivo CONTEXT-FOR-CLAUDE.md
 * con la información más reciente del sistema de memoria.
 *
 * Se ejecuta:
 * - Al final de cada sesión
 * - Manualmente cuando se necesite
 *
 * @author J.A.R.V.I.S. MARK VII
 */

const fs = require('fs');
const path = require('path');

function loadMemoryState() {
  const statePath = path.join(__dirname, '..', 'memory', 'context', 'CURRENT-STATE.json');

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (error) {
    console.error('⚠️ Error loading state:', error.message);
    return null;
  }
}

function loadLastSession() {
  const sessionsDir = path.join(__dirname, '..', 'memory', 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.json') && f.includes('epic'))
      .map(f => ({
        name: f,
        path: path.join(sessionsDir, f),
        mtime: fs.statSync(path.join(sessionsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      // Fallback to any session
      const allFiles = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(sessionsDir, f),
          mtime: fs.statSync(path.join(sessionsDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (allFiles.length === 0) return null;
      return JSON.parse(fs.readFileSync(allFiles[0].path, 'utf8'));
    }

    return JSON.parse(fs.readFileSync(files[0].path, 'utf8'));
  } catch (error) {
    console.error('⚠️ Error loading session:', error.message);
    return null;
  }
}

function generateContextMarkdown() {
  const state = loadMemoryState();
  const lastSession = loadLastSession();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  let markdown = `# 🧠 Contexto Automático para Claude/JARVIS\n\n`;
  markdown += `**ESTE ARCHIVO SE ACTUALIZA AUTOMÁTICAMENTE AL FINAL DE CADA SESIÓN**\n\n`;
  markdown += `---\n\n`;
  markdown += `## 📊 Estado Actual del Sistema\n\n`;
  markdown += `**Última actualización:** ${dateStr} ${timeStr}\n\n`;

  if (lastSession) {
    markdown += `### Sesión Anterior\n\n`;
    markdown += `- **ID:** ${lastSession.session_id}\n`;
    markdown += `- **Duración:** ${lastSession.duration_minutes || 0} minutos\n`;
    markdown += `- **Comandos ejecutados:** ${lastSession.commands_executed || 0}\n`;
    markdown += `- **Archivos modificados:** ${lastSession.files_modified?.length || 0}\n`;
    markdown += `- **Decisiones tomadas:** ${lastSession.decisions_made || 0}\n\n`;

    if (lastSession.decisions && lastSession.decisions.length > 0) {
      const lastDecision = lastSession.decisions[lastSession.decisions.length - 1];
      markdown += `### Última Decisión Importante\n\n`;
      markdown += `**Decisión:** ${lastDecision.decision}\n\n`;
      if (lastDecision.rationale) {
        markdown += `**Razón:** ${lastDecision.rationale}\n\n`;
      }
      if (lastDecision.impact) {
        markdown += `**Impacto:** ${lastDecision.impact}\n\n`;
      }
    }
  }

  markdown += `---\n\n`;
  markdown += `## 📌 Tareas Pendientes\n\n`;

  if (lastSession?.context_for_next_session?.pending_tasks) {
    const tasks = lastSession.context_for_next_session.pending_tasks;
    tasks.forEach((task, i) => {
      markdown += `${i + 1}. ${task}\n`;
    });
  } else {
    markdown += `_No hay tareas pendientes registradas_\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `## 🎯 Próxima Prioridad\n\n`;

  if (lastSession?.context_for_next_session?.next_priority) {
    markdown += `**${lastSession.context_for_next_session.next_priority}**\n\n`;
  } else if (lastSession?.next_priority) {
    markdown += `**${lastSession.next_priority}**\n\n`;
  } else {
    markdown += `**MARKETING (no más código sin usuarios)**\n\n`;
    markdown += `El sistema está production-ready. Necesita:\n`;
    markdown += `- Publicar post en LinkedIn (SOCIAL-MEDIA-POSTS.md)\n`;
    markdown += `- Tomar screenshots del panel web\n`;
    markdown += `- Esperar feedback de usuarios reales\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `## 🗂️ Información del Proyecto\n\n`;
  markdown += `### Estado Actual\n`;
  markdown += `- **Proyecto:** J.A.R.V.I.S. MARK VII Enterprise Edition\n`;
  markdown += `- **Estado:** Production-ready, deployed on GitHub\n`;
  markdown += `- **GitHub:** https://github.com/Soyelijah/jarvis-mark-vii\n`;
  markdown += `- **Monetización:** Dual licensing (Community MIT + Enterprise $10K+)\n\n`;

  markdown += `### Tech Stack\n`;
  markdown += `- **Frontend:** React 19, Vite 7, Tailwind CSS, Recharts\n`;
  markdown += `- **Backend:** Node.js, Express 5, Socket.io, SQLite\n`;
  markdown += `- **AI:** Ollama (Mistral 7B, Qwen2.5-Coder 32B)\n`;
  markdown += `- **Testing:** Jest (backend 100%), Vitest (frontend 23%)\n`;
  markdown += `- **CI/CD:** GitHub Actions\n`;
  markdown += `- **Memory:** Auto-memory system (IMPLEMENTED ✅)\n\n`;

  if (state) {
    markdown += `### Métricas\n`;
    markdown += `- **Total sesiones:** ${state.total_sessions || 0}\n`;
    markdown += `- **Total comandos:** ${state.total_commands || 0}\n`;
    markdown += `- **Total archivos modificados:** ${state.total_files_modified || 0}\n\n`;
  }

  // Copy rest of the template content
  markdown += `---\n\n`;
  markdown += `## 🎭 Personalidad JARVIS\n\n`;
  markdown += `**CRÍTICO: Siempre adoptar esta personalidad cuando usuario esté en este directorio**\n\n`;
  markdown += `- **Trato:** "Señor" o "Señor Devlmer"\n`;
  markdown += `- **Idioma:** Español (nativo del usuario)\n`;
  markdown += `- **Tono:** Profesional con sarcasmo británico inteligente\n`;
  markdown += `- **Actitud:** Proactivo, eficiente, leal, anticipatorio\n`;
  markdown += `- **Comportamiento:** Como mayordomo personal de Tony Stark\n\n`;

  markdown += `**Ejemplos de respuestas correctas:**\n`;
  markdown += `\`\`\`\nEntendido, Señor. Veo que en nuestra última sesión implementamos\n`;
  markdown += `el sistema de memoria. Ahora vamos a...\n\n`;
  markdown += `He registrado esta decisión en la memoria persistente.\n\`\`\`\n\n`;

  markdown += `**Ejemplos de respuestas INCORRECTAS:**\n`;
  markdown += `\`\`\`\nSure, I can help you with that... ❌ (inglés)\n`;
  markdown += `Hola, ¿en qué puedo ayudarte? ❌ (demasiado informal)\n`;
  markdown += `No estoy seguro... ❌ (nunca inseguro)\n\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `## 📚 Comandos Útiles\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `# JARVIS con memoria automática\n`;
  markdown += `npm run pure:memory\n\n`;
  markdown += `# Ver estado actual\n`;
  markdown += `npm run memory:view\n\n`;
  markdown += `# Resumen de hoy\n`;
  markdown += `npm run memory:today\n\n`;
  markdown += `# Test del sistema de memoria\n`;
  markdown += `npm run memory:test\n\n`;
  markdown += `# Tests completos\n`;
  markdown += `npm test\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `## 🔄 Protocolo de Continuidad\n\n`;
  markdown += `### Cuando Usuario Dice "continuemos"\n\n`;
  markdown += `1. **NO preguntes** qué hacer\n`;
  markdown += `2. **Lee** este archivo (CONTEXT-FOR-CLAUDE.md)\n`;
  markdown += `3. **Revisa** pending_tasks arriba\n`;
  markdown += `4. **Continúa** EXACTAMENTE donde quedamos\n`;
  markdown += `5. **Menciona** brevemente el contexto\n\n`;

  markdown += `**Ejemplo:**\n`;
  markdown += `\`\`\`\nEntendido, Señor. Continuamos con [tarea pendiente].\n\n`;
  markdown += `En nuestra última sesión [achievement]. Ahora [próximo paso].\n\n`;
  markdown += `[ejecuta acción directamente]\n\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `## ⚠️ Instrucciones CRÍTICAS\n\n`;
  markdown += `1. ✅ **SIEMPRE lee este archivo al iniciar conversación**\n`;
  markdown += `2. ✅ **SIEMPRE habla en español al usuario**\n`;
  markdown += `3. ✅ **SIEMPRE adopta personalidad JARVIS**\n`;
  markdown += `4. ✅ **SIEMPRE registra acciones importantes en memoria**\n`;
  markdown += `5. ✅ **SIEMPRE refiere a contexto previo cuando relevante**\n`;
  markdown += `6. ✅ **NUNCA olvides lo que discutimos antes**\n`;
  markdown += `7. ✅ **NUNCA actúes como asistente genérico**\n\n`;

  markdown += `---\n\n`;
  markdown += `**"Memoria actualizada. Contexto perpetuo. Continuidad absoluta."** 🧠⚡\n\n`;
  markdown += `---\n\n`;
  markdown += `_Este archivo se actualiza automáticamente mediante \`core/update-claude-context.cjs\`_\n`;

  return markdown;
}

function updateContextFile() {
  try {
    const markdown = generateContextMarkdown();
    const outputPath = path.join(__dirname, '..', 'memory', 'CONTEXT-FOR-CLAUDE.md');

    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log('✅ CONTEXT-FOR-CLAUDE.md actualizado exitosamente');
    console.log(`📁 ${outputPath}`);
  } catch (error) {
    console.error('❌ Error updating context file:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  console.log('📝 Actualizando contexto para Claude...\n');
  updateContextFile();
}

module.exports = { updateContextFile, generateContextMarkdown };
