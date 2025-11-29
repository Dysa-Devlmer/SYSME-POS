# Guía de Contribución - SYSME POS v2.1

## 🎯 Bienvenido

¡Gracias por tu interés en contribuir a SYSME POS! Esta guía te ayudará a entender cómo puedes contribuir al proyecto de manera efectiva.

## 📋 Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [¿Cómo Puedo Contribuir?](#cómo-puedo-contribuir)
3. [Configuración del Entorno](#configuración-del-entorno)
4. [Proceso de Desarrollo](#proceso-de-desarrollo)
5. [Estándares de Código](#estándares-de-código)
6. [Proceso de Pull Request](#proceso-de-pull-request)
7. [Reporte de Bugs](#reporte-de-bugs)
8. [Solicitud de Features](#solicitud-de-features)

## 📜 Código de Conducta

### Nuestro Compromiso

Nos comprometemos a hacer de la participación en nuestro proyecto una experiencia libre de acoso para todos, independientemente de edad, tamaño corporal, discapacidad, etnia, identidad de género, nivel de experiencia, nacionalidad, apariencia personal, raza, religión o identidad y orientación sexual.

### Estándares

**Comportamientos que contribuyen a crear un ambiente positivo:**

- ✅ Usar lenguaje acogedor e inclusivo
- ✅ Respetar diferentes puntos de vista y experiencias
- ✅ Aceptar críticas constructivas con gracia
- ✅ Enfocarse en lo que es mejor para la comunidad
- ✅ Mostrar empatía hacia otros miembros

**Comportamientos inaceptables:**

- ❌ Uso de lenguaje o imágenes sexualizadas
- ❌ Trolling, comentarios insultantes o despectivos
- ❌ Acoso público o privado
- ❌ Publicar información privada de otros sin permiso
- ❌ Otras conductas consideradas inapropiadas profesionalmente

## 🤝 ¿Cómo Puedo Contribuir?

### Reportar Bugs

Antes de crear un reporte de bug:

1. **Verifica** que no sea un duplicado buscando en Issues
2. **Determina** qué repositorio debe recibir el reporte
3. **Recolecta** información sobre el bug:
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Capturas de pantalla si aplica
   - Versión de SYSME POS
   - Sistema operativo
   - Versión de Node.js

### Sugerir Mejoras

Las sugerencias de mejoras son bienvenidas. Para sugerir:

1. **Usa** el template de Feature Request
2. **Explica** claramente el problema que resuelve
3. **Describe** la solución que te gustaría ver
4. **Considera** alternativas
5. **Adjunta** mockups o ejemplos si es posible

### Contribuir con Código

1. **Fork** el repositorio
2. **Crea** una rama desde `develop`
3. **Desarrolla** tu feature/fix
4. **Escribe** tests
5. **Asegúrate** que los tests pasen
6. **Commit** siguiendo convenciones
7. **Push** a tu fork
8. **Abre** un Pull Request

## 🔧 Configuración del Entorno

### Prerequisitos

```bash
Node.js >= 18.0.0
npm >= 9.0.0
MySQL >= 8.0 (o SQLite para desarrollo)
Redis >= 7.0 (opcional)
Git >= 2.30
```

### Instalación

```bash
# 1. Fork y clone el repositorio
git clone https://github.com/tu-usuario/sysme-pos.git
cd sysme-pos

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Instalar dependencias del frontend
cd ../web-interface/frontend
npm install

# 4. Copiar archivo de configuración
cd ../../backend
cp .env.example .env

# 5. Configurar variables de entorno
# Editar .env con tus credenciales

# 6. Inicializar base de datos
npm run init-db

# 7. Ejecutar migraciones
npm run migrate

# 8. Seed de datos (opcional)
npm run seed
```

### Ejecutar en Desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd web-interface/frontend
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

## 💻 Proceso de Desarrollo

### Workflow de Git

Usamos **Git Flow** simplificado:

```
master (producción)
  ↓
develop (desarrollo)
  ↓
feature/nombre-feature (nuevas características)
bugfix/nombre-bug (correcciones)
hotfix/nombre-hotfix (correcciones urgentes)
```

### Crear una Nueva Feature

```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear rama de feature
git checkout -b feature/mi-nueva-feature

# 3. Desarrollar y commitear
git add .
git commit -m "feat: agregar nueva funcionalidad"

# 4. Push a tu fork
git push origin feature/mi-nueva-feature

# 5. Crear Pull Request en GitHub
```

### Convenciones de Commits

Usamos **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan código)
- `refactor`: Refactorización de código
- `perf`: Mejoras de performance
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento
- `ci`: Cambios en CI/CD

**Examples:**

```bash
feat(auth): agregar autenticación con JWT
fix(orders): corregir cálculo de total
docs(api): actualizar documentación de endpoints
style(ui): mejorar espaciado en dashboard
refactor(services): simplificar email service
perf(db): optimizar queries de productos
test(auth): agregar tests de login
chore(deps): actualizar dependencias
ci(github): agregar workflow de deployment
```

### Scopes Comunes

- `auth` - Autenticación
- `orders` - Órdenes
- `products` - Productos
- `inventory` - Inventario
- `payments` - Pagos
- `users` - Usuarios
- `reports` - Reportes
- `api` - API
- `ui` - Interfaz de usuario
- `db` - Base de datos
- `services` - Servicios
- `middleware` - Middleware
- `tests` - Tests

## 📏 Estándares de Código

### JavaScript/Node.js

```javascript
// ✅ Buenas prácticas

// 1. Usar const/let, no var
const MAX_ITEMS = 100;
let currentCount = 0;

// 2. Arrow functions cuando sea apropiado
const multiply = (a, b) => a * b;

// 3. Async/await en lugar de callbacks
async function fetchData() {
  const data = await api.get('/data');
  return data;
}

// 4. Destructuring
const { name, email } = user;

// 5. Template literals
const message = `Hello, ${name}!`;

// 6. Optional chaining
const street = user?.address?.street;

// 7. Nullish coalescing
const count = items?.length ?? 0;

// ❌ Evitar

// 1. Callbacks anidados (callback hell)
getData(function(a) {
  getMoreData(a, function(b) {
    getMoreData(b, function(c) {
      // ...
    });
  });
});

// 2. Variables sin declarar
x = 5; // ❌

// 3. console.log en producción
console.log('debug'); // ❌ Usar logger
```

### React/JSX

```jsx
// ✅ Buenas prácticas

// 1. Componentes funcionales
const MyComponent = ({ title, data }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Efectos secundarios
  }, [dependencies]);

  return <div>{title}</div>;
};

// 2. PropTypes o TypeScript
MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.array
};

// 3. Nombres descriptivos
const UserProfileCard = () => { /* ... */ };

// 4. Hooks personalizados
const useAuth = () => {
  const [user, setUser] = useState(null);
  // ...
  return { user, login, logout };
};

// ❌ Evitar

// 1. Componentes de clase (preferir funcionales)
class MyComponent extends React.Component { /* ... */ }

// 2. Manipular DOM directamente
document.getElementById('element').innerHTML = 'text';

// 3. Estado innecesario
const [data, setData] = useState(props.data); // Usar props directamente
```

### Testing

```javascript
// ✅ Estructura AAA (Arrange-Act-Assert)

describe('UserService', () => {
  describe('createUser', () => {
    test('should create user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(userData.name);
    });

    test('should throw error with invalid email', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'invalid-email'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email');
    });
  });
});

// Nombres descriptivos
test('should return 401 when token is missing')
test('should calculate total with discount correctly')
test('should prevent SQL injection in search query')

// Mock apropiado
jest.mock('../services/email-service');
```

### SQL/Database

```sql
-- ✅ Buenas prácticas

-- 1. Usar parámetros preparados (prevenir SQL injection)
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);

-- 2. Índices en columnas frecuentes
CREATE INDEX idx_users_email ON users(email);

-- 3. Transacciones para operaciones múltiples
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- ❌ Evitar

-- 1. Concatenación de strings (SQL injection)
const query = `SELECT * FROM users WHERE email = '${email}'`;

-- 2. SELECT * (especificar columnas)
SELECT * FROM users; -- ❌
SELECT id, name, email FROM users; -- ✅

-- 3. N+1 queries (usar JOINs)
```

### Estructura de Archivos

```
backend/
├── src/
│   ├── config/          # Configuración
│   ├── controllers/     # Controladores
│   ├── middleware/      # Middleware
│   ├── models/          # Modelos de datos
│   ├── routes/          # Rutas API
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades
│   └── server.js        # Entry point
├── tests/
│   ├── unit/            # Tests unitarios
│   ├── integration/     # Tests de integración
│   └── setup.js         # Setup de tests
├── .env.example
├── package.json
└── README.md

web-interface/frontend/
├── src/
│   ├── components/      # Componentes React
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Páginas
│   ├── services/        # API services
│   ├── utils/           # Utilidades
│   └── App.jsx          # App principal
├── public/
├── package.json
└── vite.config.js
```

## 🔍 Code Review Checklist

Antes de enviar un PR, verifica:

### Funcionalidad
- [ ] El código hace lo que se supone que debe hacer
- [ ] Se manejan casos edge
- [ ] Se validan inputs
- [ ] Se manejan errores apropiadamente

### Tests
- [ ] Tests unitarios agregados/actualizados
- [ ] Tests pasan localmente
- [ ] Cobertura >= 70%
- [ ] Tests son claros y mantenibles

### Código
- [ ] Sigue convenciones de estilo
- [ ] No hay código comentado
- [ ] No hay console.logs
- [ ] Variables y funciones tienen nombres descriptivos
- [ ] Código está documentado (JSDoc si es necesario)

### Seguridad
- [ ] No hay secrets hardcodeados
- [ ] Inputs son validados/sanitizados
- [ ] Se previene SQL injection
- [ ] Se previene XSS
- [ ] Se usa HTTPS

### Performance
- [ ] No hay queries N+1
- [ ] Se usan índices apropiados
- [ ] No hay memory leaks
- [ ] Assets están optimizados

### Documentación
- [ ] README actualizado si es necesario
- [ ] API docs actualizadas
- [ ] Comentarios en código complejo
- [ ] CHANGELOG actualizado

## 📝 Proceso de Pull Request

### 1. Antes de Crear el PR

```bash
# Actualizar develop
git checkout develop
git pull origin develop

# Rebase tu rama
git checkout feature/mi-feature
git rebase develop

# Ejecutar tests
npm test

# Ejecutar linter
npm run lint

# Verificar build
npm run build
```

### 2. Crear el PR

**Título del PR:**
```
feat(scope): descripción breve

Ejemplo:
feat(auth): agregar autenticación con Google OAuth
```

**Descripción del PR:**

```markdown
## 📋 Descripción

Breve descripción de los cambios realizados.

## 🎯 Tipo de Cambio

- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione como antes)
- [ ] Requiere actualización de documentación

## 🧪 Cómo se ha Testeado

Describe los tests que ejecutaste para verificar tus cambios.

- [ ] Test A
- [ ] Test B

## 📸 Screenshots (si aplica)

Agregar screenshots de UI changes.

## ✅ Checklist

- [ ] Mi código sigue las guías de estilo del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente
- [ ] Cualquier cambio dependiente ha sido mergeado y publicado

## 📚 Issues Relacionados

Fixes #123
Closes #456
Related to #789
```

### 3. Proceso de Review

1. **Automated Checks** - CI/CD ejecuta tests automáticamente
2. **Code Review** - Al menos 1 reviewer aprueba
3. **Cambios Solicitados** - Implementar feedback
4. **Aprobación Final** - Reviewer aprueba
5. **Merge** - Maintainer hace merge

### 4. Después del Merge

```bash
# Actualizar tu fork
git checkout develop
git pull upstream develop
git push origin develop

# Eliminar rama local
git branch -d feature/mi-feature

# Eliminar rama remota
git push origin --delete feature/mi-feature
```

## 🐛 Reporte de Bugs

### Template de Bug Report

```markdown
**Describe el bug**
Una descripción clara y concisa del bug.

**Pasos para Reproducir**
1. Ve a '...'
2. Click en '....'
3. Scroll down a '....'
4. Ver error

**Comportamiento Esperado**
Descripción clara de lo que esperabas que pasara.

**Comportamiento Actual**
Descripción clara de lo que realmente pasa.

**Screenshots**
Si aplica, agrega screenshots.

**Entorno:**
 - OS: [ej. Windows 11]
 - Browser [ej. Chrome, Firefox]
 - Versión [ej. 2.1.0]
 - Node.js [ej. 18.17.0]
 - Database [ej. MySQL 8.0]

**Información Adicional**
Cualquier contexto adicional sobre el problema.

**Logs**
```
Agregar logs relevantes aquí
```

**Posible Solución**
Si tienes una idea de cómo arreglarlo.
```

## 💡 Solicitud de Features

### Template de Feature Request

```markdown
**¿Tu feature request está relacionada a un problema?**
Una descripción clara del problema. Ej. "Siempre me frustra cuando [...]"

**Describe la solución que te gustaría**
Una descripción clara y concisa de lo que quieres que pase.

**Describe alternativas que has considerado**
Una descripción clara y concisa de soluciones alternativas que has considerado.

**Contexto Adicional**
Agrega cualquier contexto o screenshots sobre el feature request aquí.

**Impacto**
- [ ] Alta prioridad
- [ ] Prioridad media
- [ ] Baja prioridad

**Beneficiarios**
¿Quién se beneficiaría de esta feature?
- [ ] Usuarios finales
- [ ] Administradores
- [ ] Desarrolladores
- [ ] Todos
```

## 🎓 Recursos para Contribuidores

### Documentación

- [README.md](./README.md) - Introducción al proyecto
- [API Documentation](./docs/API.md) - Referencia de API
- [Architecture Guide](./docs/ARCHITECTURE.md) - Arquitectura del sistema
- [Deployment Guide](./DEPLOYMENT-GUIDE.md) - Guía de deployment

### Tutoriales

- [Crear tu primera feature](./docs/tutorials/first-feature.md)
- [Escribir tests efectivos](./docs/tutorials/testing.md)
- [Optimización de queries](./docs/tutorials/database-optimization.md)

### Comunidad

- GitHub Discussions - Preguntas y discusiones
- GitHub Issues - Bugs y features
- Discord Server - Chat en tiempo real (si existe)

## 🏆 Reconocimiento de Contribuidores

Todos los contribuidores son reconocidos en:

- [CONTRIBUTORS.md](./CONTRIBUTORS.md)
- Release notes
- GitHub contributors page

## 📞 ¿Necesitas Ayuda?

Si tienes preguntas:

1. Revisa la [documentación](./docs/)
2. Busca en [Issues](../../issues) existentes
3. Crea un nuevo [Issue](../../issues/new) con la etiqueta `question`
4. Contacta a los maintainers

## 📄 Licencia

Al contribuir a SYSME POS, aceptas que tus contribuciones serán licenciadas bajo la misma licencia del proyecto.

---

**¡Gracias por contribuir a SYSME POS! 🎉**

Tu tiempo y esfuerzo son muy apreciados.
