// ============================================
// PROJECT CREATOR - MOTOR DE SCAFFOLDING
// ============================================
// Crea proyectos desde templates con configuración automática

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import ncpPkg from 'ncp';
const { ncp } = ncpPkg;
import { mkdirp } from 'mkdirp';

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectCreator {
  constructor(logger) {
    this.logger = logger || console;
    this.baseDir = path.join(__dirname, '../templates');
    this.projectsDir = path.join(__dirname, '../projects');
  }

  // ===== TEMPLATES DISPONIBLES =====
  getAvailableTemplates() {
    return {
      'nodejs-backend': {
        name: 'Node.js Backend (Express.js)',
        description: 'API REST con Node.js + Express',
        author: 'JARVIS',
        version: '1.0.0',
        deps: ['express', 'dotenv', 'cors', 'body-parser'],
        devDeps: ['nodemon', 'jest'],
        port: 3000
      },
      'react-frontend': {
        name: 'React Frontend (Vite)',
        description: 'SPA moderna con React + Vite',
        author: 'JARVIS',
        version: '1.0.0',
        deps: ['react', 'react-dom', 'axios'],
        devDeps: ['vite', '@vitejs/plugin-react', 'vitest'],
        port: 5173
      },
      'python-cli': {
        name: 'Python CLI (Click)',
        description: 'Herramienta CLI con Python Click',
        author: 'JARVIS',
        version: '1.0.0',
        deps: ['click', 'requests'],
        devDeps: ['pytest', 'black']
      },
      'nodejs-cli': {
        name: 'Node.js CLI (Commander)',
        description: 'Herramienta CLI con Node.js',
        author: 'JARVIS',
        version: '1.0.0',
        deps: ['commander', 'chalk'],
        devDeps: ['jest'],
        binary: 'cli'
      },
      'web-static': {
        name: 'Static Website (HTML5)',
        description: 'Sitio web estático responsive',
        author: 'JARVIS',
        version: '1.0.0',
        deps: [],
        devDeps: ['http-server']
      }
    };
  }

  // ===== CREAR PROYECTO =====
  async createProject(projectName, templateType, options = {}) {
    try {
      // Validar template
      const templates = this.getAvailableTemplates();
      if (!templates[templateType]) {
        return {
          success: false,
          message: `❌ Template no encontrado. Disponibles: ${Object.keys(templates).join(', ')}`
        };
      }

      const template = templates[templateType];
      const projectPath = path.join(this.projectsDir, projectName);

      // Validar que no exista
      if (fs.existsSync(projectPath)) {
        return {
          success: false,
          message: `❌ Proyecto "${projectName}" ya existe en ${projectPath}`
        };
      }

      this.logger.info(`📦 Creando proyecto: ${projectName} (${templateType})`);

      // Crear directorio
      await mkdirp(projectPath);

      // Copiar template (si existe)
      const templatePath = path.join(this.baseDir, templateType);
      if (fs.existsSync(templatePath)) {
        await this.copyTemplate(templatePath, projectPath);
      } else {
        this.logger.warn(`⚠️  Template ${templateType} no tiene archivos base, creando estructura mínima`);
      }

      // Generar package.json / requirements.txt
      await this.generateConfigFiles(projectPath, projectName, template, templateType);

      // Generar README
      await this.generateReadme(projectPath, projectName, template);

      // Generar .env.example
      await this.generateEnvExample(projectPath, templateType);

      // Generar .gitignore
      await this.generateGitignore(projectPath, templateType);

      // Inicializar Git
      await this.initializeGit(projectPath);

      // Instalar dependencias (solo si se solicita)
      if (options.install) {
        await this.installDependencies(projectPath, templateType);
      }

      const message = `✅ Proyecto "${projectName}" creado exitosamente en:\n${projectPath}`;
      this.logger.info(message);

      return {
        success: true,
        message: message,
        projectPath: projectPath,
        template: templateType,
        nextSteps: this.getNextSteps(projectName, templateType)
      };

    } catch (error) {
      this.logger.error('Error creando proyecto:', error);
      return {
        success: false,
        message: `❌ Error: ${error.message}`
      };
    }
  }

  // ===== COPIAR TEMPLATE =====
  async copyTemplate(src, dest) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(src)) {
        resolve(); // No hay template, continuar
        return;
      }

      ncp(src, dest, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ===== GENERAR package.json / requirements.txt =====
  async generateConfigFiles(projectPath, projectName, template, type) {
    if (type.includes('python')) {
      // requirements.txt
      const requirementsContent = template.deps.join('\n') + '\n';
      await fs.writeFile(
        path.join(projectPath, 'requirements.txt'),
        requirementsContent
      );
    } else {
      // package.json
      const packageJson = {
        name: projectName,
        version: template.version,
        description: template.description,
        author: template.author,
        license: 'MIT',
        main: type === 'nodejs-cli' ? `bin/${template.binary}.js` : 'src/index.js',
        scripts: this.getScripts(type),
        dependencies: {},
        devDependencies: {}
      };

      // Llenar dependencias con versiones específicas
      const depVersions = {
        'express': '^4.18.2',
        'dotenv': '^16.0.3',
        'cors': '^2.8.5',
        'body-parser': '^1.20.2',
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'axios': '^1.4.0',
        'commander': '^11.0.0',
        'chalk': '^5.3.0',
        'nodemon': '^3.0.1',
        'jest': '^29.6.1',
        'vite': '^4.4.5',
        '@vitejs/plugin-react': '^4.0.3',
        'vitest': '^0.34.1',
        'http-server': '^14.1.1'
      };

      template.deps.forEach(dep => {
        packageJson.dependencies[dep] = depVersions[dep] || '^1.0.0';
      });
      template.devDeps.forEach(dep => {
        packageJson.devDependencies[dep] = depVersions[dep] || '^1.0.0';
      });

      await fs.writeJSON(
        path.join(projectPath, 'package.json'),
        packageJson,
        { spaces: 2 }
      );

      // .npmrc para React
      if (type === 'react-frontend') {
        const npmrc = 'legacy-peer-deps=true\n';
        await fs.writeFile(path.join(projectPath, '.npmrc'), npmrc);
      }
    }
  }

  // ===== SCRIPTS POR TIPO =====
  getScripts(type) {
    const scripts = {
      'nodejs-backend': {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest',
        build: 'echo "No build needed"'
      },
      'react-frontend': {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest'
      },
      'nodejs-cli': {
        start: 'node bin/cli.js',
        test: 'jest'
      },
      'web-static': {
        serve: 'http-server .',
        build: 'echo "No build needed"'
      }
    };

    return scripts[type] || { start: 'echo "No script defined"' };
  }

  // ===== GENERAR README =====
  async generateReadme(projectPath, projectName, template) {
    const readmeContent = `# ${projectName}

${template.description}

Creado con **JARVIS** - Motor de Scaffolding Automático

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Estructura

\`\`\`
${projectName}/
├── src/              # Código fuente
├── tests/            # Tests
├── .env.example      # Variables de entorno
└── package.json      # Dependencias
\`\`\`

## Autor

Creado por: **JARVIS MARK VII** 🤖
Generado: ${new Date().toLocaleString('es-ES')}

## Licencia

MIT
`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
  }

  // ===== GENERAR .env.example =====
  async generateEnvExample(projectPath, type) {
    let envContent = '# Variables de Entorno\n\n';

    if (type === 'nodejs-backend') {
      envContent += `NODE_ENV=development
PORT=3000
DATABASE_URL=
API_KEY=
SECRET_KEY=
`;
    } else if (type === 'react-frontend') {
      envContent += `VITE_API_URL=http://localhost:3000
VITE_DEBUG=false
`;
    }

    await fs.writeFile(path.join(projectPath, '.env.example'), envContent);
  }

  // ===== GENERAR .gitignore =====
  async generateGitignore(projectPath, type) {
    let gitignoreContent = `# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# Environment
.env
.env.local

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
*.min.js
*.min.css
`;

    if (type === 'react-frontend') {
      gitignoreContent += `
# React/Vite specific
dist/
.vite/
`;
    }

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
  }

  // ===== INICIALIZAR GIT =====
  async initializeGit(projectPath) {
    try {
      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
      execSync('git config user.email "jarvis@ulmer.dev"', { cwd: projectPath, stdio: 'ignore' });
      execSync('git config user.name "JARVIS"', { cwd: projectPath, stdio: 'ignore' });

      // Commit inicial
      execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit - Scaffolding generado por JARVIS MARK VII"', {
        cwd: projectPath,
        stdio: 'ignore'
      });

      this.logger.info(`✅ Git inicializado en ${projectPath}`);
    } catch (error) {
      this.logger.warn(`⚠️  Error inicializando Git: ${error.message}`);
    }
  }

  // ===== INSTALAR DEPENDENCIAS =====
  async installDependencies(projectPath, type) {
    try {
      this.logger.info('📦 Instalando dependencias...');

      if (type.includes('python')) {
        execSync('pip install -r requirements.txt', { cwd: projectPath, stdio: 'inherit' });
      } else {
        execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
      }

      this.logger.info('✅ Dependencias instaladas');
    } catch (error) {
      this.logger.warn(`⚠️  Error instalando dependencias: ${error.message}`);
    }
  }

  // ===== PRÓXIMOS PASOS =====
  getNextSteps(projectName, type) {
    const steps = {
      'nodejs-backend': [
        `cd projects/${projectName}`,
        'npm install',
        'npm run dev',
        'Visitar: http://localhost:3000'
      ],
      'react-frontend': [
        `cd projects/${projectName}`,
        'npm install',
        'npm run dev',
        'Se abrirá http://localhost:5173'
      ],
      'python-cli': [
        `cd projects/${projectName}`,
        'pip install -r requirements.txt',
        'python -m src.main --help'
      ],
      'nodejs-cli': [
        `cd projects/${projectName}`,
        'npm install',
        'node bin/cli.js --help'
      ],
      'web-static': [
        `cd projects/${projectName}`,
        'npm install http-server -g',
        'npx http-server .',
        'Visitar: http://localhost:8080'
      ]
    };

    return steps[type] || [];
  }

  // ===== LISTAR PROYECTOS =====
  async listProjects() {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return {
          success: true,
          data: [],
          message: 'No hay proyectos creados aún'
        };
      }

      const projects = fs.readdirSync(this.projectsDir)
        .filter(f => {
          const fullPath = path.join(this.projectsDir, f);
          return fs.statSync(fullPath).isDirectory();
        })
        .map(name => {
          const fullPath = path.join(this.projectsDir, name);
          const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
          const hasRequirements = fs.existsSync(path.join(fullPath, 'requirements.txt'));

          let type = 'unknown';
          if (hasPackageJson) {
            const pkg = fs.readJSONSync(path.join(fullPath, 'package.json'));
            if (pkg.dependencies?.react) type = 'react-frontend';
            else if (pkg.dependencies?.express) type = 'nodejs-backend';
            else if (pkg.dependencies?.commander) type = 'nodejs-cli';
            else type = 'nodejs';
          } else if (hasRequirements) {
            type = 'python';
          }

          return {
            name,
            path: fullPath,
            type
          };
        });

      return {
        success: true,
        data: projects,
        message: `Se encontraron ${projects.length} proyecto(s)`
      };
    } catch (error) {
      this.logger.error('Error listando proyectos:', error);
      return {
        success: false,
        data: [],
        message: `Error: ${error.message}`
      };
    }
  }

  // ===== EXPORTAR =====
  async initialize() {
    // Asegurar que exista directorio projects
    await mkdirp(this.projectsDir);
    this.logger.info('✅ ProjectCreator inicializado');
  }
}

export default ProjectCreator;
