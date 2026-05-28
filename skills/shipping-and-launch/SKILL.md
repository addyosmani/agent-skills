---
name: shipping-and-launch
description: 准备 production launches。用于准备 deploy 到 production。也用于需要 pre-launch checklist、设置 monitoring、规划 staged rollout，或需要 rollback strategy 时。
---

# Shipping and Launch

## Overview
带着信心 shipping。目标不只是 deploy，而是安全 deploy：monitoring 已就位，rollback plan 已准备，并清楚知道 success 长什么样。每次 launch 都应可逆、可观测、渐进。

## When to Use
- 第一次将 feature deploy 到 production
- 向 users 发布重要 change
- 迁移 data 或 infrastructure
- 开放 beta 或 early access program
- 任何带风险的 deployment（也就是所有 deployment）

## The Pre-Launch Checklist（发布前检查清单）

### Code Quality（代码质量）

- [ ] 所有 tests 通过（unit、integration、e2e）
- [ ] Build 成功且无 warnings
- [ ] Lint 和 type checking 通过
- [ ] Code 已 review 并 approve
- [ ] 没有 launch 前应解决的 TODO comments
- [ ] Production code 中没有 `console.log` debugging statements
- [ ] Error handling 覆盖预期 failure modes

### Security（安全）

- [ ] Code 或 version control 中没有 secrets
- [ ] `npm audit` 没有 critical 或 high vulnerabilities
- [ ] 所有 user-facing endpoints 都有 input validation
- [ ] Authentication 和 authorization checks 已就位
- [ ] Security headers 已配置（CSP、HSTS 等）
- [ ] Authentication endpoints 有 rate limiting
- [ ] CORS 配置为 specific origins（不是 wildcard）

### Performance（性能）

- [ ] Core Web Vitals 在 "Good" thresholds 内
- [ ] Critical paths 中没有 N+1 queries
- [ ] Images 已优化（compression、responsive sizes、lazy loading）
- [ ] Bundle size 在 budget 内
- [ ] Database queries 有合适 indexes
- [ ] Static assets 和 repeated queries 已配置 caching

### Accessibility（可访问性）

- [ ] 所有 interactive elements 的 keyboard navigation 可用
- [ ] Screen reader 可以传达 page content 和 structure
- [ ] Color contrast 满足 WCAG 2.1 AA（text 4.5:1）
- [ ] Modals 和 dynamic content 的 focus management 正确
- [ ] Error messages 描述清晰，并与 form fields 关联
- [ ] axe-core 或 Lighthouse 中没有 accessibility warnings

### Infrastructure（基础设施）

- [ ] Environment variables 已在 production 设置
- [ ] Database migrations 已应用（或 ready to apply）
- [ ] DNS 和 SSL 已配置
- [ ] CDN 已为 static assets 配置
- [ ] Logging 和 error reporting 已配置
- [ ] Health check endpoint 存在并响应

### Documentation（文档）

- [ ] README 已更新任何新 setup requirements
- [ ] API documentation 是 current
- [ ] 任何 architectural decisions 都已写 ADRs
- [ ] Changelog 已更新
- [ ] User-facing documentation 已更新（如适用）

## Feature Flag Strategy（Feature Flag 策略）

通过 feature flags shipping，把 deployment 与 release 解耦：

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
1. DEPLOY with flag OFF     → Code 已在 production 但 inactive
2. ENABLE for team/beta     → 在 production environment 做 internal testing
3. GRADUAL ROLLOUT          → 5% → 25% → 50% → 100% users
4. MONITOR at each stage    → 观察 error rates、performance、user feedback
5. CLEAN UP                 → Full rollout 后移除 flag 和 dead code path
```

**规则：**
- 每个 feature flag 都有 owner 和 expiration date
- Full rollout 后 2 周内清理 flags
- 不要嵌套 feature flags（会产生指数级 combinations）
- 在 CI 中测试 flag on 和 off 两种状态

## Staged Rollout（分阶段发布）

### The Rollout Sequence（发布顺序）

```
1. DEPLOY to staging
   └── 在 staging environment 运行 full test suite
   └── 对 critical flows 做 manual smoke test

2. DEPLOY to production (feature flag OFF)
   └── 验证 deployment succeeded（health check）
   └── 检查 error monitoring（无 new errors）

3. ENABLE for team（internal users 的 flag ON）
   └── Team 在 production 中使用 feature
   └── 24-hour monitoring window

4. CANARY rollout（5% users 的 flag ON）
   └── Monitor error rates、latency、user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── 仅当所有 thresholds 通过才推进（见下表）

5. GRADUAL increase (25% -> 50% -> 100%)
   └── 每一步做相同 monitoring
   └── 随时能 rollback 到前一个 percentage

6. FULL rollout（所有 users 的 flag ON）
   └── Monitor 1 week
   └── 清理 feature flag
```

### Rollout Decision Thresholds（发布决策阈值）

用这些 thresholds 决定每个 stage 是 advance、hold 还是 roll back：

| Metric | 推进 (green) | 暂停并调查 (yellow) | 回滚 (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | baseline 10% 以内 | baseline 以上 10-100% | >2x baseline |
| P95 latency | baseline 20% 以内 | baseline 以上 20-50% | baseline 以上 >50% |
| Client JS errors | 无 new error types | New errors 影响 <0.1% sessions | New errors 影响 >0.1% sessions |
| Business metrics | Neutral or positive | Decline <5%（可能是 noise） | Decline >5% |

### When to Roll Back（何时回滚）

出现以下情况立即 roll back：
- Error rate 超过 baseline 2x
- P95 latency 增加超过 50%
- User-reported issues 激增
- 检测到 data integrity issues
- 发现 security vulnerability

## Monitoring and Observability（监控和可观测性）

### What to Monitor（监控内容）

```
Application metrics:
├── Error rate（total 和 by endpoint）
├── Response time（p50、p95、p99）
├── Request volume
├── Active users
└── Key business metrics（conversion、engagement）

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth（如适用）

Client metrics:
├── Core Web Vitals（LCP、INP、CLS）
├── JavaScript errors
├── Client 视角的 API error rates
└── Page load time
```

### Error Reporting（错误上报）

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

  // 不要向 users 暴露 internals
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### Post-Launch Verification（发布后验证）

Launch 后第一小时：

```
1. 检查 health endpoint 返回 200
2. 检查 error monitoring dashboard（无 new error types）
3. 检查 latency dashboard（无 regression）
4. 手动测试 critical user flow
5. 验证 logs 正在流动且可读
6. 确认 rollback mechanism 可用（可行时 dry run）
```

## Rollback Strategy（回滚策略）

每次 deployment 前都需要 rollback plan：

```markdown
## Rollback Plan for [Feature/Release]（回滚计划）

### Trigger Conditions（触发条件）
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports 出现 [specific issue]

### Rollback Steps（回滚步骤）
1. Disable feature flag（如适用）
   OR
1. Deploy previous version：`git revert <commit> && git push`
2. Verify rollback：health check、error monitoring
3. Communicate：通知 team rollback

### Database Considerations（数据库注意事项）
- Migration [X] has a rollback: `npx prisma migrate rollback`
- New feature 插入的数据：[preserved / cleaned up]

### Time to Rollback（回滚时间）
- Feature flag：< 1 minute
- Redeploy previous version：< 5 minutes
- Database rollback：< 15 minutes
```
## See Also（另见）

- Security pre-launch checks 见 `references/security-checklist.md`
- Performance pre-launch checklist 见 `references/performance-checklist.md`
- Launch 前 accessibility verification 见 `references/accessibility-checklist.md`

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “Staging 能用，production 也会能用” | Production 有不同 data、traffic patterns 和 edge cases。deploy 后要 monitor。 |
| “这个不需要 feature flags” | 每个 feature 都受益于 kill switch。即使“简单” changes 也可能破坏东西。 |
| “Monitoring 是 overhead” | 没有 monitoring，就只能从 user complaints 而不是 dashboards 发现问题。 |
| “以后再加 monitoring” | Launch 前加。看不见就 debug 不了。 |
| “Rollback 是承认失败” | Rollback 是负责任的 engineering。Shipping broken feature 才是失败。 |

## Red Flags
- 没有 rollback plan 就 deploy
- Production 没有 monitoring 或 error reporting
- Big-bang releases（一次性全部发布，无 staging）
- Feature flags 没有 expiration 或 owner
- Deploy 后第一小时无人 monitoring
- Production environment configuration 靠记忆完成，而不是 code
- “周五下午了，ship 吧”

## Verification
Deploy 前确认：

- [ ] Pre-launch checklist completed（所有 sections green）
- [ ] Feature flag configured（如适用）
- [ ] Rollback plan documented
- [ ] Monitoring dashboards set up
- [ ] Team notified of deployment

Deploy 后确认：

- [ ] Health check 返回 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready
