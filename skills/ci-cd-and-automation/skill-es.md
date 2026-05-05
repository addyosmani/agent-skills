---
name: ci-cd-and-automation
description: Automatiza la configuración de pipelines CI/CD. Usar al configurar o modificar build y deployment pipelines. Usar cuando necesites automatizar quality gates, configurar test runners en CI o establecer deployment strategies.
---

# CI/CD and Automation

## Visión general

Automatiza los quality gates para que ningún cambio llegue a producción sin pasar tests, lint, type checking y build. CI/CD es el mecanismo de ejecución para cada otra skill —detecta lo que humanos y agents omiten, y lo hace de forma consistente en cada cambio.

**Shift Left:** Detecta problemas lo más temprano posible en el pipeline. Un bug detectado en linting cuesta minutos; el mismo bug detectado en producción cuesta horas. Mueve los checks hacia arriba —static analysis antes de tests, tests antes de staging, staging antes de producción.

**Faster is Safer:** Batches más pequeños y releases más frecuentes reducen el riesgo, no lo aumentan. Un deployment con 3 cambios es más fácil de depurar que uno con 30. Los releases frecuentes generan confianza en el proceso de release mismo.

## Cuándo usar

- Configurar el CI pipeline de un proyecto nuevo
- Agregar o modificar checks automatizados
- Configurar deployment pipelines
- Cuando un cambio debería disparar verificación automatizada
- Depurar fallas de CI

## The Quality Gate Pipeline

Cada cambio pasa por estos gates antes del merge:

```
Pull Request Opened
    │
    ▼
┌─────────────────┐
│   LINT CHECK     │  eslint, prettier
│   ↓ pass         │
│   TYPE CHECK     │  tsc --noEmit
│   ↓ pass         │
│   UNIT TESTS     │  jest/vitest
│   ↓ pass         │
│   BUILD          │  npm run build
│   ↓ pass         │
│   INTEGRATION    │  API/DB tests
│   ↓ pass         │
│   E2E (optional) │  Playwright/Cypress
│   ↓ pass         │
│   SECURITY AUDIT │  npm audit
│   ↓ pass         │
│   BUNDLE SIZE    │  bundlesize check
└─────────────────┘
    │
    ▼
  Ready for review
```

**Ningún gate puede omitirse.** Si el lint falla, corrige el lint —no deshabilites la regla. Si un test falla, corrige el código —no saltes el test.

## GitHub Actions Configuration

### Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
```

### With Database Integration Tests

```yaml
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: ci_user
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
```

> **Nota:** Incluso para bases de datos de test exclusivas de CI, usa GitHub Secrets para las credenciales en lugar de hardcodear valores. Esto construye buenos hábitos y evita el reuso accidental de credenciales de test en otros contextos.

### E2E Tests

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Build
        run: npm run build
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Alimentar las fallas de CI de vuelta a los agents

El poder de CI con agents de IA es el feedback loop. Cuando CI falla:

```
CI fails
    │
    ▼
Copy the failure output
    │
    ▼
Feed it to the agent:
"The CI pipeline failed with this error:
[paste specific error]
Fix the issue and verify locally before pushing again."
    │
    ▼
Agent fixes → pushes → CI runs again
```

**Patrones clave:**

```
Lint failure → Agent runs `npm run lint --fix` and commits
Type error  → Agent reads the error location and fixes the type
Test failure → Agent follows debugging-and-error-recovery skill
Build error → Agent checks config and dependencies
```

## Deployment Strategies

### Preview Deployments

Cada PR obtiene un preview deployment para pruebas manuales:

```yaml
# Deploy preview on PR (Vercel/Netlify/etc.)
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy preview
      run: npx vercel --token=${{ secrets.VERCEL_TOKEN }}
```

### Feature Flags

Los feature flags desacoplan el deployment del release. Deploya features incompletos o riesgosos detrás de flags para que puedas:

- **Hacer shipping de código sin habilitarlo.** Haz merge a main temprano, habilita cuando estés listo.
- **Hacer rollback sin redeployar.** Deshabilita el flag en lugar de revertir código.
- **Canary de nuevas features.** Habilita para el 1% de usuarios, luego el 10%, luego el 100%.
- **Ejecutar A/B tests.** Compara comportamiento con y sin la feature.

```typescript
// Simple feature flag pattern
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

**Ciclo de vida del flag:** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Los flags que viven para siempre se convierten en deuda técnica —establece una fecha de limpieza cuando lo creas.

### Staged Rollouts

```
PR merged to main
    │
    ▼
  Staging deployment (auto)
    │ Manual verification
    ▼
  Production deployment (manual trigger or auto after staging)
    │
    ▼
  Monitor for errors (15-minute window)
    │
    ├── Errors detected → Rollback
    └── Clean → Done
```

### Rollback Plan

Cada deployment debe ser reversible:

```yaml
# Manual rollback workflow
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          # Deploy the specified previous version
          npx vercel rollback ${{ inputs.version }}
```

## Environment Management

```
.env.example       → Committed (template para desarrolladores)
.env                → NO commited (desarrollo local)
.env.test           → Committed (entorno de test, sin secretos reales)
CI secrets          → Almacenados en GitHub Secrets / vault
Production secrets  → Almacenados en deployment platform / vault
```

CI nunca debe tener secretos de producción. Usa secretos separados para testing en CI.

## Automation Beyond CI

### Dependabot / Renovate

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

### Build Cop Role

Designa a alguien responsable de mantener CI en verde. Cuando el build se rompe, el trabajo del Build Cop es corregir o revertir —no la persona cuyo cambio causó la ruptura. Esto evita que los builds rotos se acumulen mientras todos asumen que alguien más lo arreglará.

### PR Checks

- **Required reviews:** Al menos 1 aprobación antes del merge
- **Required status checks:** CI debe pasar antes del merge
- **Branch protection:** No force-pushes a main
- **Auto-merge:** Si todos los checks pasan y está aprobado, merge automático

## CI Optimization

Cuando el pipeline excede 10 minutos, aplica estas estrategias en orden de impacto:

```
¿CI pipeline lento?
├── Cache dependencies
│   └── Usa actions/cache o la opción de cache de setup-node para node_modules
├── Run jobs in parallel
│   └── Divide lint, typecheck, test, build en jobs paralelos separados
├── Only run what changed
│   └── Usa path filters para saltar jobs no relacionados (por ejemplo, saltar e2e para PRs solo de docs)
├── Use matrix builds
│   └── Shard test suites entre múltiples runners
├── Optimize the test suite
│   └── Quita tests lentos del critical path, ejecútalos en schedule en su lugar
└── Use larger runners
    └── GitHub-hosted larger runners o self-hosted para builds con alta carga de CPU
```

**Ejemplo: caching y paralelismo**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
```

## Justificaciones comunes

| Justificación | Realidad |
|---|---|
| "CI es demasiado lento" | Optimiza el pipeline (ver CI Optimization abajo), no lo omitas. Un pipeline de 5 minutos evita horas de debugging. |
| "Este cambio es trivial, saltemos CI" | Los cambios triviales rompen builds. CI es rápido para cambios triviales de todos modos. |
| "El test es flaky, solo re-ejecútalo" | Los flaky tests enmascaran bugs reales y hacen perder el tiempo de todos. Corrige la inestabilidad. |
| "Agregaremos CI más tarde" | Los proyectos sin CI acumulan estados rotos. Configúralo desde el día uno. |
| "Las pruebas manuales son suficientes" | Las pruebas manuales no escalan ni son repetibles. Automatiza lo que puedas. |

## Señales de alerta

- No hay CI pipeline en el proyecto
- Las fallas de CI se ignoran o silencian
- Los tests se deshabilitan en CI para hacer pasar el pipeline
- Los deploys a producción ocurren sin verificación en staging
- No hay mecanismo de rollback
- Secretos almacenados en código o archivos de config de CI (no en secrets manager)
- Tiempos de CI largos sin esfuerzo de optimización

## Verificación

Después de configurar o modificar CI:

- [ ] Todos los quality gates están presentes (lint, types, tests, build, audit)
- [ ] El pipeline se ejecuta en cada PR y push a main
- [ ] Las fallas bloquean el merge (branch protection configurado)
- [ ] Los resultados de CI se retroalimentan al loop de desarrollo
- [ ] Los secretos están almacenados en el secrets manager, no en código
- [ ] El deployment tiene un mecanismo de rollback
- [ ] El pipeline se ejecuta en menos de 10 minutos para el test suite
