---
name: shipping-and-launch
description: Prepara lanzamientos a producción. Úsalo cuando te prepares para desplegar a producción. Úsalo cuando necesites un checklist pre-lanzamiento, al configurar monitoreo, al planificar un rollout escalonado o cuando necesites una estrategia de rollback.
---

# Shipping and Launch

## Overview

Despliega con confianza. El objetivo no es solo deployar: es desplegar de forma segura, con monitoreo en su lugar, un plan de rollback listo y una comprensión clara de qué significa el éxito. Cada lanzamiento debe ser reversible, observable e incremental.

## When to Use

- Desplegar un feature a producción por primera vez
- Liberar un cambio significativo a los usuarios
- Migrar datos o infraestructura
- Abrir un programa beta o de acceso temprano
- Cualquier despliegue que conlleve riesgo (todos ellos)

## The Pre-Launch Checklist

### Code Quality

- [ ] All tests pass (unit, integration, e2e)
- [ ] Build succeeds with no warnings
- [ ] Lint and type checking pass
- [ ] Code reviewed and approved
- [ ] No TODO comments that should be resolved before launch
- [ ] No `console.log` debugging statements in production code
- [ ] Error handling covers expected failure modes

### Security

- [ ] No secrets in code or version control
- [ ] `npm audit` shows no critical or high vulnerabilities
- [ ] Input validation on all user-facing endpoints
- [ ] Authentication and authorization checks in place
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configured to specific origins (not wildcard)

### Performance

- [ ] Core Web Vitals within "Good" thresholds
- [ ] No N+1 queries in critical paths
- [ ] Images optimized (compression, responsive sizes, lazy loading)
- [ ] Bundle size within budget
- [ ] Database queries have appropriate indexes
- [ ] Caching configured for static assets and repeated queries

### Accessibility

- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader can convey page content and structure
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Focus management correct for modals and dynamic content
- [ ] Error messages are descriptive and associated with form fields
- [ ] No accessibility warnings in axe-core or Lighthouse

### Infrastructure

- [ ] Environment variables set in production
- [ ] Database migrations applied (or ready to apply)
- [ ] DNS and SSL configured
- [ ] CDN configured for static assets
- [ ] Logging and error reporting configured
- [ ] Health check endpoint exists and responds

### Documentation

- [ ] README updated with any new setup requirements
- [ ] API documentation current
- [ ] ADRs written for any architectural decisions
- [ ] Changelog updated
- [ ] User-facing documentation updated (if applicable)

## Feature Flag Strategy

Despliega detrás de feature flags para desacoplar el despliegue de la liberación:

```typescript
// Feature flag check
const flags = await getFeatureFlags(userId);

if (flags.taskSharing) {
  // New feature: task sharing
  return <TaskSharingPanel task={task} />;
}

// Default: existing behavior
return null;
```

**Feature flag lifecycle:**

```
1. DEPLOY with flag OFF     → Code is in production but inactive
2. ENABLE for team/beta     → Internal testing in production environment
3. GRADUAL ROLLOUT          → 5% → 25% → 50% → 100% of users
4. MONITOR at each stage    → Watch error rates, performance, user feedback
5. CLEAN UP                 → Remove flag and dead code path after full rollout
```

**Rules:**
- Every feature flag has an owner and an expiration date
- Clean up flags within 2 weeks of full rollout
- Don't nest feature flags (creates exponential combinations)
- Test both flag states (on and off) in CI

## Staged Rollout

### The Rollout Sequence

```
1. DEPLOY to staging
   └── Full test suite in staging environment
   └── Manual smoke test of critical flows

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment succeeded (health check)
   └── Check error monitoring (no new errors)

3. ENABLE for team (flag ON for internal users)
   └── Team uses the feature in production
   └── 24-hour monitoring window

4. CANARY rollout (flag ON for 5% of users)
   └── Monitor error rates, latency, user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── Advance only if all thresholds pass (see table below)

5. GRADUAL increase (25% -> 50% -> 100%)
   └── Same monitoring at each step
   └── Ability to roll back to previous percentage at any point

6. FULL rollout (flag ON for all users)
   └── Monitor for 1 week
   └── Clean up feature flag
```

### Rollout Decision Thresholds

Usa estos umbrales para decidir si avanzar, mantener o hacer rollback en cada etapa:

| Metric | Advance (green) | Hold and investigate (yellow) | Roll back (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |

### When to Roll Back

Haz rollback inmediatamente si:
- La tasa de error aumenta más de 2x respecto al baseline
- La latencia P95 aumenta más del 50%
- Hay un pico de problemas reportados por usuarios
- Se detectan problemas de integridad de datos
- Se descubre una vulnerabilidad de seguridad

## Monitoring and Observability

### What to Monitor

```
Application metrics:
├── Error rate (total and by endpoint)
├── Response time (p50, p95, p99)
├── Request volume
├── Active users
└── Key business metrics (conversion, engagement)

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth (if applicable)

Client metrics:
├── Core Web Vitals (LCP, INP, CLS)
├── JavaScript errors
├── API error rates from client perspective
└── Page load time
```

### Error Reporting

```typescript
// Set up error boundary with reporting
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to error tracking service
    reportError(error, {
      componentStack: info.componentStack,
      userId: getCurrentUser()?.id,
      page: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Server-side error reporting
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  reportError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  });

  // Don't expose internals to users
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### Post-Launch Verification

En la primera hora después del lanzamiento:

```
1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)
```

## Rollback Strategy

Cada despliegue necesita un plan de rollback antes de que ocurra:

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```
## See Also

- Para checks de seguridad pre-lanzamiento, consulta `references/security-checklist.md`
- Para checklist de rendimiento pre-lanzamiento, consulta `references/performance-checklist.md`
- Para verificación de accesibilidad antes del lanzamiento, consulta `references/accessibility-checklist.md`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works in staging, it'll work in production" | Producción tiene datos diferentes, patrones de tráfico y casos límite. Monitorea después del deploy. |
| "We don't need feature flags for this" | Cada feature se beneficia de un kill switch. Incluso cambios "simples" pueden romper cosas. |
| "Monitoring is overhead" | No tener monitoreo significa descubrir problemas por quejas de usuarios en lugar de dashboards. |
| "We'll add monitoring later" | Agrégalo antes del lanzamiento. No puedes debuggear lo que no puedes ver. |
| "Rolling back is admitting failure" | Hacer rollback es ingeniería responsable. Desplegar un feature roto es el verdadero fallo. |

## Red Flags

- Desplegar sin un plan de rollback
- Sin monitoreo ni reporte de errores en producción
- Big-bang releases (todo a la vez, sin staging)
- Feature flags sin fecha de expiración ni dueño
- Nadie monitoreando el deploy durante la primera hora
- Configuración del entorno de producción hecha de memoria, no por código
- "Es viernes por la tarde, vamos a desplegar"

## Verification

Antes de desplegar:

- [ ] Pre-launch checklist completado (todas las secciones en verde)
- [ ] Feature flag configurada (si aplica)
- [ ] Rollback plan documentado
- [ ] Dashboards de monitoreo configurados
- [ ] Equipo notificado del despliegue

Después de desplegar:

- [ ] Health check retorna 200
- [ ] La tasa de error es normal
- [ ] La latencia es normal
- [ ] El flujo crítico de usuario funciona
- [ ] Los logs están fluyendo
- [ ] El rollback fue probado o verificado como listo
