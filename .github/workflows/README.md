# CI/CD Pipeline - SYSME POS v2.1

## 📋 Descripción

Pipeline completo de CI/CD con GitHub Actions para SYSME POS v2.1. Automatiza testing, building, deployment y notificaciones.

## 🎯 Características

- ✅ **Linting** - Verificación de código con ESLint
- ✅ **Security Audit** - npm audit + OWASP Dependency Check
- ✅ **Unit Tests** - Jest con cobertura mínima del 70%
- ✅ **Frontend Tests** - Tests y build de React
- ✅ **Integration Tests** - Con MySQL y Redis
- ✅ **Docker Build** - Multi-platform (amd64, arm64)
- ✅ **Database Migrations** - Verificación automática
- ✅ **Staging Deployment** - Deploy automático a staging
- ✅ **Production Deployment** - Deploy con aprobación manual
- ✅ **Performance Tests** - Lighthouse CI + Load testing
- ✅ **Release Notes** - Generación automática de changelog
- ✅ **Notifications** - Slack + Email

## 🔄 Workflow Triggers

### Push Events
```yaml
on:
  push:
    branches: [ master, main, develop, feature/* ]
```
- Se ejecuta en cada push a las ramas especificadas
- Ejecuta: lint, security, tests, build

### Pull Request Events
```yaml
on:
  pull_request:
    branches: [ master, main ]
```
- Se ejecuta en PRs hacia master/main
- Ejecuta: lint, tests, integration tests

### Release Events
```yaml
on:
  release:
    types: [ created, published ]
```
- Se ejecuta al crear un release
- Ejecuta: todo el pipeline + deployment a producción

## 📊 Pipeline Jobs

### 1. Lint (🔍)
**Duración:** ~2 min

Verificación de calidad de código:
- ESLint
- Code formatting check
- Ejecuta en: ubuntu-latest

### 2. Security (🔒)
**Duración:** ~3 min

Auditoría de seguridad:
- npm audit (moderate level)
- OWASP Dependency Check
- Ejecuta en: ubuntu-latest

### 3. Unit Tests (🧪)
**Duración:** ~5 min

Testing unitario con Jest:
- Ejecuta en: ubuntu-latest, windows-latest
- Node versions: 18.x, 20.x
- Genera reporte de cobertura (Codecov)
- Threshold: 70% mínimo

**Matriz:**
```
OS: ubuntu-latest, windows-latest
Node: 18.x, 20.x
Total combinaciones: 4
```

### 4. Frontend Tests (🎨)
**Duración:** ~4 min

Testing y build del frontend:
- Tests con Jest/Vitest
- Build de producción con Vite
- Upload de artifacts

### 5. Integration Tests (🔗)
**Duración:** ~6 min

Tests de integración con servicios:

**Services:**
- MySQL 8.0 (port 3306)
- Redis 7 (port 6379)

**Tests:**
- API endpoints
- Database operations
- Cache operations
- Service integration

### 6. Build Backend (📦)
**Duración:** ~3 min

Build del backend:
- Install production dependencies
- Create artifacts
- Upload para deployment

### 7. Docker Build (🐳)
**Duración:** ~8 min

Build de imagen Docker:
- Multi-platform: linux/amd64, linux/arm64
- Push a Docker Hub (solo en releases)
- Cache con GitHub Actions cache

**Tags generados:**
- `sysme/pos:latest`
- `sysme/pos:2.1.0`
- `sysme/pos:2.1`
- `sysme/pos:develop-abc1234`

### 8. Migration Check (🗄️)
**Duración:** ~4 min

Verificación de migraciones:
- Ejecuta migraciones en base de datos test
- Verifica que no hay errores
- Rollback automático si falla

### 9. Deploy Staging (🚀)
**Duración:** ~5 min

Deploy automático a staging:
- Trigger: push a `develop`
- Environment: staging
- URL: https://staging.sysme.com
- Smoke tests post-deployment

### 10. Deploy Production (🚀)
**Duración:** ~7 min

Deploy a producción con aprobación:
- Trigger: release created
- Environment: production (requiere aprobación)
- URL: https://sysme.com
- Health checks post-deployment

### 11. Performance Tests (⚡)
**Duración:** ~10 min

Tests de performance en staging:
- Lighthouse CI
  - Performance score
  - Accessibility
  - Best practices
  - SEO
- Artillery load testing
  - 100 RPS por 5 minutos
  - Response time < 500ms
  - Error rate < 1%

### 12. Release Notes (📝)
**Duración:** ~2 min

Generación automática de changelog:
- Changelog desde último release
- Instrucciones de instalación
- Links a documentación
- Test coverage summary

### 13. Notifications (📢)
**Duración:** ~1 min

Notificaciones de deployment:
- Slack (success/failure)
- Email (solo failure)
- Include: version, author, URL, logs

## 🔐 Secrets Required

Configure estos secrets en GitHub:

### Docker Hub
```
DOCKER_USERNAME      # Docker Hub username
DOCKER_PASSWORD      # Docker Hub password/token
```

### Slack
```
SLACK_WEBHOOK        # Slack webhook URL
```

### Email (opcional)
```
MAIL_USERNAME        # SMTP username
MAIL_PASSWORD        # SMTP password
```

### NPM (opcional)
```
NPM_TOKEN           # NPM publish token
```

## 🎛️ Environments

### Staging
- **Name:** staging
- **URL:** https://staging.sysme.com
- **Protection:** None
- **Secrets:**
  - `STAGING_SERVER`
  - `STAGING_SSH_KEY`

### Production
- **Name:** production
- **URL:** https://sysme.com
- **Protection:**
  - Required reviewers: 2
  - Wait timer: 5 minutes
- **Secrets:**
  - `PROD_SERVER`
  - `PROD_SSH_KEY`

## 📈 Pipeline Flow

```
┌─────────────┐
│   PUSH      │
└──────┬──────┘
       │
       ├─────> Lint
       ├─────> Security
       └─────> Tests (Matrix)
              │
              ├─────> Unit Tests (4 combinations)
              ├─────> Frontend Tests
              └─────> Integration Tests
                     │
                     ├─────> Build Backend
                     ├─────> Build Frontend
                     └─────> Docker Build
                            │
                            ├─> Migration Check
                            │
                            ├─> Deploy Staging (if develop)
                            │   └─> Performance Tests
                            │
                            └─> Deploy Production (if release)
                                ├─> Release Notes
                                └─> Notifications
```

## 🚀 Usage

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/my-feature
   ```

3. **CI runs automatically**
   - Lint ✓
   - Security ✓
   - Tests ✓

4. **Create Pull Request**
   - PR triggers full pipeline
   - Review required before merge

5. **Merge to develop**
   - Auto-deploy to staging
   - Performance tests run

6. **Create Release**
   - Tag version: `v2.1.0`
   - Create release on GitHub
   - Triggers production deployment

### Manual Triggers

Re-run failed jobs:
```bash
# En GitHub UI: Actions > Select workflow run > Re-run failed jobs
```

Deploy to staging manually:
```bash
git push origin develop
```

## 📊 Monitoring

### GitHub Actions Dashboard
- View all workflows: https://github.com/your-org/sysme-pos/actions
- Filter by branch, workflow, status

### Coverage Reports
- Codecov: Uploaded after unit tests
- View at: https://codecov.io/gh/your-org/sysme-pos

### Performance Reports
- Lighthouse CI: Artifacts uploaded
- Download from workflow runs

## 🐛 Troubleshooting

### Tests Failing

```bash
# Run tests locally first
cd backend
npm test

# Check coverage
npm run test:coverage
```

### Docker Build Failing

```bash
# Test Docker build locally
docker build -t sysme/pos:test .

# Check Dockerfile syntax
docker build --no-cache -t sysme/pos:test .
```

### Migration Errors

```bash
# Test migrations locally
cd backend
npm run migrate

# Rollback if needed
npm run migrate:rollback
```

### Deployment Failures

1. Check server status
2. Verify SSH keys
3. Check environment variables
4. Review deployment logs

## 📝 Best Practices

1. **Commit Messages**
   - Use conventional commits
   - Format: `type(scope): message`
   - Examples:
     - `feat: add user authentication`
     - `fix: resolve database connection issue`
     - `docs: update API documentation`

2. **Branch Protection**
   - Require PR reviews
   - Require status checks to pass
   - No direct pushes to master

3. **Testing**
   - Write tests for new features
   - Maintain 70%+ coverage
   - Run tests locally before pushing

4. **Deployments**
   - Test in staging first
   - Review release notes
   - Monitor production after deploy

## 🔄 Continuous Improvement

### Weekly
- Review failed builds
- Update dependencies
- Check security advisories

### Monthly
- Optimize pipeline performance
- Update actions versions
- Review test coverage

### Quarterly
- Audit security configuration
- Review deployment strategy
- Update documentation

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Jest Documentation](https://jestjs.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Última actualización:** Enero 2025
**Versión:** 2.1.0
**Autor:** SYSME Development Team
