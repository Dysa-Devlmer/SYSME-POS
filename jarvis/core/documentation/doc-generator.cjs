// core/documentation/doc-generator.cjs
// Generador Automático de Documentación con IA

const fs = require('fs');
const path = require('path');

/**
 * Documentation Generator
 *
 * Genera documentación automática del código usando IA
 *
 * Características:
 * - Análisis de funciones y clases
 * - Generación de descripciones con IA
 * - README automáticos por directorio
 * - Documentación de APIs
 * - Diagramas de arquitectura (texto)
 * - Exportación a Markdown
 */
class DocumentationGenerator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.codeIndexer = options.codeIndexer;
    this.aiAnalyzer = options.aiAnalyzer;
    this.outputDir = options.outputDir || path.join(this.projectRoot, 'docs', 'generated');

    // Asegurar que existe el directorio de salida
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Genera documentación para un archivo específico
   */
  async generateFileDocumentation(filePath) {
    console.log(`📝 [Doc Generator] Generando documentación para: ${filePath}`);

    const metadata = this.codeIndexer.getFileMetadata(filePath);
    if (!metadata) {
      throw new Error(`Archivo no encontrado en el índice: ${filePath}`);
    }

    const doc = {
      file: filePath,
      generated: new Date().toISOString(),
      summary: await this.generateFileSummary(metadata),
      functions: [],
      classes: [],
      exports: metadata.exports || [],
      imports: metadata.imports || []
    };

    // Documentar funciones
    if (metadata.functions && metadata.functions.length > 0) {
      for (const functionName of metadata.functions) {
        const functionDoc = await this.generateFunctionDoc(filePath, functionName, metadata);
        doc.functions.push(functionDoc);
      }
    }

    // Documentar clases
    if (metadata.classes && metadata.classes.length > 0) {
      for (const className of metadata.classes) {
        const classDoc = await this.generateClassDoc(filePath, className, metadata);
        doc.classes.push(classDoc);
      }
    }

    return doc;
  }

  /**
   * Genera un resumen del archivo usando IA
   */
  async generateFileSummary(metadata) {
    const fileName = metadata.path.split(/[\/\\]/).pop();
    const ext = metadata.extension;

    // Construir descripción básica sin IA primero
    let summary = {
      description: this.generateBasicDescription(metadata),
      purpose: this.inferPurpose(metadata),
      complexity: this.calculateComplexity(metadata),
      lines: metadata.lines,
      size: metadata.size
    };

    // Si hay IA disponible, mejorar la descripción
    if (this.aiAnalyzer) {
      try {
        const aiDescription = await this.getAIDescription(metadata);
        if (aiDescription) {
          summary.description = aiDescription;
        }
      } catch (error) {
        console.warn('⚠️ [Doc Generator] No se pudo generar descripción con IA:', error.message);
      }
    }

    return summary;
  }

  /**
   * Genera descripción básica sin IA
   */
  generateBasicDescription(metadata) {
    const fileName = metadata.path.split(/[\/\\]/).pop();
    const parts = [];

    if (metadata.classes && metadata.classes.length > 0) {
      parts.push(`Define ${metadata.classes.length} clase(s): ${metadata.classes.join(', ')}`);
    }

    if (metadata.functions && metadata.functions.length > 0) {
      parts.push(`Contiene ${metadata.functions.length} función(es)`);
    }

    if (metadata.exports && metadata.exports.length > 0) {
      parts.push(`Exporta: ${metadata.exports.join(', ')}`);
    }

    if (parts.length === 0) {
      parts.push(`Archivo ${metadata.extension}`);
    }

    return parts.join('. ');
  }

  /**
   * Infiere el propósito del archivo basándose en su contenido
   */
  inferPurpose(metadata) {
    const path = metadata.path.toLowerCase();
    const fileName = path.split(/[\/\\]/).pop();

    // Patrones comunes
    if (path.includes('test')) return 'Testing';
    if (path.includes('component')) return 'UI Component';
    if (path.includes('integration')) return 'Integration';
    if (path.includes('backend') || path.includes('server')) return 'Backend';
    if (path.includes('frontend') || path.includes('client')) return 'Frontend';
    if (path.includes('core')) return 'Core Logic';
    if (path.includes('util') || path.includes('helper')) return 'Utilities';
    if (path.includes('config')) return 'Configuration';
    if (path.includes('agent')) return 'AI Agent';
    if (path.includes('search')) return 'Search System';
    if (path.includes('notification')) return 'Notifications';
    if (fileName.includes('index')) return 'Entry Point';
    if (fileName.includes('manager')) return 'Manager/Controller';

    return 'General Purpose';
  }

  /**
   * Calcula la complejidad del archivo
   */
  calculateComplexity(metadata) {
    let score = 0;

    // Basado en líneas
    if (metadata.lines > 500) score += 3;
    else if (metadata.lines > 200) score += 2;
    else if (metadata.lines > 100) score += 1;

    // Basado en funciones
    const functionCount = metadata.functions ? metadata.functions.length : 0;
    if (functionCount > 20) score += 3;
    else if (functionCount > 10) score += 2;
    else if (functionCount > 5) score += 1;

    // Basado en clases
    const classCount = metadata.classes ? metadata.classes.length : 0;
    if (classCount > 3) score += 2;
    else if (classCount > 0) score += 1;

    // Basado en imports
    const importCount = metadata.imports ? metadata.imports.length : 0;
    if (importCount > 15) score += 2;
    else if (importCount > 5) score += 1;

    if (score >= 8) return 'Very High';
    if (score >= 6) return 'High';
    if (score >= 3) return 'Medium';
    if (score >= 1) return 'Low';
    return 'Very Low';
  }

  /**
   * Obtiene descripción mejorada con IA
   */
  async getAIDescription(metadata) {
    if (!this.aiAnalyzer) return null;

    const prompt = `Analiza este archivo de código y proporciona una descripción técnica concisa (1-2 oraciones):

Archivo: ${metadata.path}
Funciones: ${metadata.functions ? metadata.functions.join(', ') : 'ninguna'}
Clases: ${metadata.classes ? metadata.classes.join(', ') : 'ninguna'}
Líneas: ${metadata.lines}

Descripción técnica:`;

    try {
      const response = await this.aiAnalyzer.analyze(prompt);
      return response.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Genera documentación para una función
   */
  async generateFunctionDoc(filePath, functionName, metadata) {
    return {
      name: functionName,
      description: `Función ${functionName} definida en ${filePath}`,
      file: filePath,
      parameters: [], // TODO: extraer parámetros del código
      returns: null, // TODO: inferir tipo de retorno
      complexity: 'Medium'
    };
  }

  /**
   * Genera documentación para una clase
   */
  async generateClassDoc(filePath, className, metadata) {
    return {
      name: className,
      description: `Clase ${className} definida en ${filePath}`,
      file: filePath,
      methods: [], // TODO: extraer métodos
      properties: [], // TODO: extraer propiedades
      extends: null, // TODO: detectar herencia
      complexity: 'Medium'
    };
  }

  /**
   * Genera README para un directorio
   */
  async generateDirectoryReadme(directoryPath) {
    console.log(`📁 [Doc Generator] Generando README para: ${directoryPath}`);

    const files = this.getFilesInDirectory(directoryPath);

    const readme = {
      directory: directoryPath,
      generated: new Date().toISOString(),
      files: files.length,
      summary: '',
      fileList: []
    };

    // Analizar cada archivo
    for (const file of files) {
      const metadata = this.codeIndexer.getFileMetadata(file);
      if (metadata) {
        readme.fileList.push({
          name: file.split(/[\/\\]/).pop(),
          path: file,
          purpose: this.inferPurpose(metadata),
          lines: metadata.lines,
          functions: metadata.functions ? metadata.functions.length : 0,
          classes: metadata.classes ? metadata.classes.length : 0
        });
      }
    }

    // Generar resumen del directorio
    readme.summary = this.generateDirectorySummary(directoryPath, readme.fileList);

    return readme;
  }

  /**
   * Obtiene archivos en un directorio
   */
  getFilesInDirectory(directoryPath) {
    const allFiles = this.codeIndexer.getAllFiles();
    const normalizedDir = directoryPath.replace(/\\/g, '/');

    return allFiles
      .filter(file => {
        const fileDir = file.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        return fileDir === normalizedDir;
      })
      .map(file => file.path);
  }

  /**
   * Genera resumen de un directorio
   */
  generateDirectorySummary(directoryPath, fileList) {
    const dirName = directoryPath.split(/[\/\\]/).pop();
    const totalFiles = fileList.length;
    const totalFunctions = fileList.reduce((sum, f) => sum + f.functions, 0);
    const totalClasses = fileList.reduce((sum, f) => sum + f.classes, 0);

    const purposes = {};
    fileList.forEach(f => {
      purposes[f.purpose] = (purposes[f.purpose] || 0) + 1;
    });

    const mainPurpose = Object.entries(purposes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

    return `Directorio "${dirName}" contiene ${totalFiles} archivo(s) relacionados con ${mainPurpose}. ` +
           `Define ${totalFunctions} función(es) y ${totalClasses} clase(s).`;
  }

  /**
   * Exporta documentación a Markdown
   */
  exportToMarkdown(documentation, type = 'file') {
    if (type === 'file') {
      return this.generateFileMarkdown(documentation);
    } else if (type === 'directory') {
      return this.generateDirectoryMarkdown(documentation);
    } else if (type === 'project') {
      return this.generateProjectMarkdown(documentation);
    }
  }

  /**
   * Genera Markdown para un archivo
   */
  generateFileMarkdown(doc) {
    const lines = [];

    lines.push(`# ${doc.file}`);
    lines.push('');
    lines.push(`> Generado automáticamente el ${new Date(doc.generated).toLocaleString()}`);
    lines.push('');

    // Resumen
    lines.push('## 📋 Resumen');
    lines.push('');
    lines.push(`**Descripción:** ${doc.summary.description}`);
    lines.push('');
    lines.push(`**Propósito:** ${doc.summary.purpose}`);
    lines.push('');
    lines.push(`**Complejidad:** ${doc.summary.complexity}`);
    lines.push('');
    lines.push(`**Tamaño:** ${doc.summary.lines} líneas, ${(doc.summary.size / 1024).toFixed(2)} KB`);
    lines.push('');

    // Funciones
    if (doc.functions.length > 0) {
      lines.push('## ⚡ Funciones');
      lines.push('');
      doc.functions.forEach(fn => {
        lines.push(`### \`${fn.name}\``);
        lines.push('');
        lines.push(fn.description);
        lines.push('');
      });
    }

    // Clases
    if (doc.classes.length > 0) {
      lines.push('## 📦 Clases');
      lines.push('');
      doc.classes.forEach(cls => {
        lines.push(`### \`${cls.name}\``);
        lines.push('');
        lines.push(cls.description);
        lines.push('');
      });
    }

    // Exports
    if (doc.exports.length > 0) {
      lines.push('## 📤 Exports');
      lines.push('');
      doc.exports.forEach(exp => {
        lines.push(`- \`${exp}\``);
      });
      lines.push('');
    }

    // Imports
    if (doc.imports.length > 0) {
      lines.push('## 📥 Imports');
      lines.push('');
      doc.imports.slice(0, 10).forEach(imp => {
        lines.push(`- \`${imp}\``);
      });
      if (doc.imports.length > 10) {
        lines.push(`- ... y ${doc.imports.length - 10} más`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Genera Markdown para un directorio
   */
  generateDirectoryMarkdown(doc) {
    const lines = [];

    lines.push(`# 📁 ${doc.directory}`);
    lines.push('');
    lines.push(`> Generado automáticamente el ${new Date(doc.generated).toLocaleString()}`);
    lines.push('');

    // Resumen
    lines.push('## 📋 Resumen');
    lines.push('');
    lines.push(doc.summary);
    lines.push('');

    // Tabla de archivos
    lines.push('## 📄 Archivos');
    lines.push('');
    lines.push('| Archivo | Propósito | Líneas | Funciones | Clases |');
    lines.push('|---------|-----------|--------|-----------|--------|');

    doc.fileList.forEach(file => {
      lines.push(`| ${file.name} | ${file.purpose} | ${file.lines} | ${file.functions} | ${file.classes} |`);
    });
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Genera documentación completa del proyecto
   */
  async generateProjectDocumentation() {
    console.log('📚 [Doc Generator] Generando documentación completa del proyecto...');

    const allFiles = this.codeIndexer.getAllFiles();
    const stats = this.codeIndexer.getStats();

    const projectDoc = {
      project: path.basename(this.projectRoot),
      generated: new Date().toISOString(),
      stats: {
        files: stats.totalFiles,
        lines: stats.totalLines,
        functions: stats.totalFunctions,
        classes: stats.totalClasses
      },
      directories: [],
      topFiles: []
    };

    // Agrupar por directorios
    const directories = new Set();
    allFiles.forEach(file => {
      const dir = file.path.split(/[\/\\]/).slice(0, -1).join('/');
      if (dir) directories.add(dir);
    });

    // Top archivos por tamaño
    projectDoc.topFiles = allFiles
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10)
      .map(f => ({
        path: f.path,
        lines: f.lines,
        functions: f.functions ? f.functions.length : 0,
        classes: f.classes ? f.classes.length : 0
      }));

    return projectDoc;
  }

  /**
   * Genera Markdown para el proyecto completo
   */
  generateProjectMarkdown(doc) {
    const lines = [];

    lines.push(`# 📚 ${doc.project} - Documentación`);
    lines.push('');
    lines.push(`> Generado automáticamente el ${new Date(doc.generated).toLocaleString()}`);
    lines.push('');

    // Estadísticas
    lines.push('## 📊 Estadísticas del Proyecto');
    lines.push('');
    lines.push(`- **Archivos:** ${doc.stats.files}`);
    lines.push(`- **Líneas de código:** ${doc.stats.lines.toLocaleString()}`);
    lines.push(`- **Funciones:** ${doc.stats.functions}`);
    lines.push(`- **Clases:** ${doc.stats.classes}`);
    lines.push('');

    // Top archivos
    lines.push('## 📄 Archivos Principales (por tamaño)');
    lines.push('');
    lines.push('| Archivo | Líneas | Funciones | Clases |');
    lines.push('|---------|--------|-----------|--------|');

    doc.topFiles.forEach(file => {
      lines.push(`| ${file.path} | ${file.lines} | ${file.functions} | ${file.classes} |`);
    });
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Guarda documentación en archivo
   */
  saveDocumentation(markdown, fileName) {
    const filePath = path.join(this.outputDir, fileName);
    fs.writeFileSync(filePath, markdown, 'utf8');
    console.log(`✅ [Doc Generator] Documentación guardada: ${filePath}`);
    return filePath;
  }
}

module.exports = DocumentationGenerator;
