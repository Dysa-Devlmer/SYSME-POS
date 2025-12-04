// code-generator.cjs
// Motor de Generación de Código para JARVIS
// Genera componentes React, APIs Node.js, scripts Python y más

const fs = require('fs').promises;
const path = require('path');

class CodeGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../generated-code');
  }

  /**
   * Inicializa directorio de código generado
   */
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log('✅ Code Generator: Inicializado');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando Code Generator:', error);
      return false;
    }
  }

  /**
   * Genera código basado en tipo y especificaciones
   */
  async generate(type, specs) {
    const generators = {
      'react-component': this.generateReactComponent.bind(this),
      'react-form': this.generateReactForm.bind(this),
      'node-api': this.generateNodeAPI.bind(this),
      'node-middleware': this.generateNodeMiddleware.bind(this),
      'python-script': this.generatePythonScript.bind(this),
      'python-class': this.generatePythonClass.bind(this)
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Tipo de generación no soportado: ${type}`);
    }

    return await generator(specs);
  }

  // =====================================================
  // GENERADORES REACT
  // =====================================================

  /**
   * Genera componente React funcional
   */
  async generateReactComponent(specs) {
    const { name, props = [], useState: useStateVars = [], useEffect: useEffectCode = null } = specs;

    const componentName = this.toPascalCase(name);
    const propsInterface = props.length > 0 ? this.generatePropsInterface(componentName, props) : '';
    const propsDestructure = props.length > 0 ? `{ ${props.map(p => p.name).join(', ')} }` : '';
    const stateDeclarations = useStateVars.map(v =>
      `  const [${v.name}, set${this.toPascalCase(v.name)}] = useState(${v.initial});`
    ).join('\n');

    const effectCode = useEffectCode ? `
  useEffect(() => {
    ${useEffectCode}
  }, []);
` : '';

    const code = `import React, { useState${useEffectCode ? ', useEffect' : ''} } from 'react';

${propsInterface}

export default function ${componentName}(${propsDestructure}${propsInterface ? `: ${componentName}Props` : ''}) {
${stateDeclarations ? stateDeclarations + '\n' : ''}${effectCode}
  return (
    <div className="${this.toKebabCase(name)}-container">
      <h2>${componentName}</h2>
      {/* TODO: Implementar UI del componente */}
    </div>
  );
}
`;

    const fileName = `${componentName}.jsx`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      fileName,
      filePath,
      code,
      type: 'react-component'
    };
  }

  /**
   * Genera formulario React con validación
   */
  async generateReactForm(specs) {
    const { name, fields = [] } = specs;

    const componentName = this.toPascalCase(name);
    const stateObject = fields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue || '';
      return acc;
    }, {});

    const fieldInputs = fields.map(field => `
      <div className="form-group">
        <label htmlFor="${field.name}">${field.label || this.toTitleCase(field.name)}:</label>
        <input
          type="${field.type || 'text'}"
          id="${field.name}"
          name="${field.name}"
          value={formData.${field.name}}
          onChange={handleChange}
          ${field.required ? 'required' : ''}
          placeholder="${field.placeholder || ''}"
          className="form-control"
        />
        {errors.${field.name} && <span className="error">{errors.${field.name}}</span>}
      </div>`).join('\n');

    const validationRules = fields.map(field => {
      if (field.required) {
        return `    if (!formData.${field.name}) {
      newErrors.${field.name} = '${field.label || this.toTitleCase(field.name)} es requerido';
    }`;
      }
      return '';
    }).filter(Boolean).join('\n');

    const code = `import React, { useState } from 'react';
import './${componentName}.css';

export default function ${componentName}() {
  const [formData, setFormData] = useState(${JSON.stringify(stateObject, null, 4).replace(/\n/g, '\n  ')});
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error al cambiar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
${validationRules}
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // TODO: Implementar lógica de envío
    console.log('Datos del formulario:', formData);

    // Reset form
    setFormData(${JSON.stringify(stateObject, null, 4).replace(/\n/g, '\n    ')});
    setErrors({});
  };

  return (
    <div className="${this.toKebabCase(name)}-container">
      <h2>${this.toTitleCase(name)}</h2>
      <form onSubmit={handleSubmit} className="${this.toKebabCase(name)}-form">
${fieldInputs}

        <button type="submit" className="btn btn-primary">
          Enviar
        </button>
      </form>
    </div>
  );
}
`;

    const cssCode = `/* ${componentName}.css */

.${this.toKebabCase(name)}-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.${this.toKebabCase(name)}-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.form-control {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.error {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 2px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background-color: #357ab8;
}
`;

    const jsFileName = `${componentName}.jsx`;
    const cssFileName = `${componentName}.css`;
    const jsFilePath = path.join(this.outputDir, jsFileName);
    const cssFilePath = path.join(this.outputDir, cssFileName);

    await fs.writeFile(jsFilePath, code, 'utf8');
    await fs.writeFile(cssFilePath, cssCode, 'utf8');

    return {
      success: true,
      files: [
        { name: jsFileName, path: jsFilePath, code },
        { name: cssFileName, path: cssFilePath, code: cssCode }
      ],
      type: 'react-form'
    };
  }

  // =====================================================
  // GENERADORES NODE.JS
  // =====================================================

  /**
   * Genera API REST con Express
   */
  async generateNodeAPI(specs) {
    const { name, endpoints = [] } = specs;

    const routeName = this.toKebabCase(name);
    const endpointHandlers = endpoints.map(ep => this.generateEndpointHandler(ep)).join('\n\n');

    const code = `// ${routeName}-routes.js
// API REST para ${name}

const express = require('express');
const router = express.Router();

${endpointHandlers}

module.exports = router;
`;

    const fileName = `${routeName}-routes.js`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    // Generar también el controlador
    const controllerCode = this.generateController(name, endpoints);
    const controllerFileName = `${routeName}-controller.js`;
    const controllerFilePath = path.join(this.outputDir, controllerFileName);
    await fs.writeFile(controllerFilePath, controllerCode, 'utf8');

    return {
      success: true,
      files: [
        { name: fileName, path: filePath, code },
        { name: controllerFileName, path: controllerFilePath, code: controllerCode }
      ],
      type: 'node-api'
    };
  }

  generateEndpointHandler(endpoint) {
    const { method = 'get', path, description } = endpoint;

    return `// ${description || `${method.toUpperCase()} ${path}`}
router.${method.toLowerCase()}('${path}', async (req, res) => {
  try {
    // TODO: Implementar lógica del endpoint
    res.json({
      success: true,
      message: '${description || 'Endpoint funcionando'}'
    });
  } catch (error) {
    console.error('Error en ${path}:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});`;
  }

  generateController(name, endpoints) {
    const controllerName = this.toPascalCase(name) + 'Controller';

    const methods = endpoints.map(ep => {
      const methodName = this.toCamelCase(ep.description || ep.path.replace(/[^a-zA-Z0-9]/g, '_'));

      return `  async ${methodName}(req, res) {
    try {
      // TODO: Implementar lógica
      res.json({
        success: true,
        message: '${ep.description || methodName}'
      });
    } catch (error) {
      console.error('Error en ${methodName}:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }`;
    }).join('\n\n');

    return `// ${this.toKebabCase(name)}-controller.js
// Controlador para ${name}

class ${controllerName} {
${methods}
}

module.exports = new ${controllerName}();
`;
  }

  /**
   * Genera middleware Express
   */
  async generateNodeMiddleware(specs) {
    const { name, type = 'generic' } = specs;

    const templates = {
      auth: this.getAuthMiddlewareTemplate(name),
      validation: this.getValidationMiddlewareTemplate(name),
      logger: this.getLoggerMiddlewareTemplate(name),
      generic: this.getGenericMiddlewareTemplate(name)
    };

    const code = templates[type] || templates.generic;
    const fileName = `${this.toKebabCase(name)}.middleware.js`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      fileName,
      filePath,
      code,
      type: 'node-middleware'
    };
  }

  getAuthMiddlewareTemplate(name) {
    return `// ${this.toKebabCase(name)}.middleware.js
// Middleware de autenticación

const jwt = require('jsonwebtoken');

const ${this.toCamelCase(name)}Middleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

module.exports = ${this.toCamelCase(name)}Middleware;
`;
  }

  getValidationMiddlewareTemplate(name) {
    return `// ${this.toKebabCase(name)}.middleware.js
// Middleware de validación

const ${this.toCamelCase(name)}Middleware = (req, res, next) => {
  const errors = [];

  // TODO: Implementar reglas de validación
  // Ejemplo:
  // if (!req.body.email) {
  //   errors.push('Email es requerido');
  // }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

module.exports = ${this.toCamelCase(name)}Middleware;
`;
  }

  getLoggerMiddlewareTemplate(name) {
    return `// ${this.toKebabCase(name)}.middleware.js
// Middleware de logging

const ${this.toCamelCase(name)}Middleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip;

  console.log(\`[\${timestamp}] \${method} \${url} - IP: \${ip}\`);

  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`[\${timestamp}] \${method} \${url} - \${res.statusCode} - \${duration}ms\`);
  });

  next();
};

module.exports = ${this.toCamelCase(name)}Middleware;
`;
  }

  getGenericMiddlewareTemplate(name) {
    return `// ${this.toKebabCase(name)}.middleware.js
// Middleware genérico

const ${this.toCamelCase(name)}Middleware = (req, res, next) => {
  // TODO: Implementar lógica del middleware

  console.log('Middleware ejecutado:', '${name}');
  next();
};

module.exports = ${this.toCamelCase(name)}Middleware;
`;
  }

  // =====================================================
  // GENERADORES PYTHON
  // =====================================================

  /**
   * Genera script Python
   */
  async generatePythonScript(specs) {
    const { name, imports = [], functions = [] } = specs;

    const importLines = imports.map(imp => `import ${imp}`).join('\n');
    const functionDefs = functions.map(fn => this.generatePythonFunction(fn)).join('\n\n');

    const code = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${name}.py
${specs.description || 'Script generado por JARVIS'}
"""

${importLines}

${functionDefs}

if __name__ == "__main__":
    # TODO: Implementar lógica principal
    print("Script ejecutándose...")
`;

    const fileName = `${this.toSnakeCase(name)}.py`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      fileName,
      filePath,
      code,
      type: 'python-script'
    };
  }

  generatePythonFunction(fn) {
    const { name, params = [], docstring = '' } = fn;
    const paramStr = params.join(', ');

    return `def ${this.toSnakeCase(name)}(${paramStr}):
    """${docstring || `Función ${name}`}"""
    # TODO: Implementar lógica
    pass`;
  }

  /**
   * Genera clase Python
   */
  async generatePythonClass(specs) {
    const { name, methods = [], attributes = [] } = specs;

    const className = this.toPascalCase(name);
    const initParams = attributes.map(a => a.name).join(', ');
    const initBody = attributes.map(a => `        self.${a.name} = ${a.name}`).join('\n');
    const methodDefs = methods.map(m => this.generatePythonMethod(m)).join('\n\n');

    const code = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${className}
${specs.description || 'Clase generada por JARVIS'}
"""

class ${className}:
    """Clase ${className}"""

    def __init__(self, ${initParams}):
        """Inicializa ${className}"""
${initBody}

${methodDefs}
`;

    const fileName = `${this.toSnakeCase(name)}.py`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      fileName,
      filePath,
      code,
      type: 'python-class'
    };
  }

  generatePythonMethod(method) {
    const { name, params = [], docstring = '' } = method;
    const paramStr = ['self', ...params].join(', ');

    return `    def ${this.toSnakeCase(name)}(${paramStr}):
        """${docstring || `Método ${name}`}"""
        # TODO: Implementar lógica
        pass`;
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  toPascalCase(str) {
    return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase())
              .replace(/[^a-zA-Z0-9]/g, '');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/[\s_]+/g, '-')
              .toLowerCase();
  }

  toSnakeCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2')
              .replace(/[\s-]+/g, '_')
              .toLowerCase();
  }

  toTitleCase(str) {
    return str.replace(/([A-Z])/g, ' $1')
              .replace(/^./, (s) => s.toUpperCase())
              .trim();
  }

  generatePropsInterface(componentName, props) {
    const propsLines = props.map(p => `  ${p.name}: ${p.type || 'any'};`).join('\n');
    return `interface ${componentName}Props {\n${propsLines}\n}\n`;
  }
}

module.exports = CodeGenerator;
