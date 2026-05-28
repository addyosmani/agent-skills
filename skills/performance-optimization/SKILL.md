---
name: performance-optimization
description: 优化应用性能。当存在性能要求、怀疑性能回归，或需要改进 Core Web Vitals、加载时间时使用。当 profiling 发现需要修复的瓶颈时使用。
---

# 性能优化

## Overview
先测量，再优化。没有测量的性能工作就是猜测，猜测会导致过早优化：增加复杂度，却没有改善真正重要的指标。先 profile，识别真实瓶颈，修复它，再次测量。只优化测量证明重要的部分。

## When to Use
- spec 中存在性能要求（加载时间预算、响应时间 SLA）
- 用户或 monitoring 报告行为缓慢
- Core Web Vitals 分数低于阈值
- 怀疑某个变更引入了回归
- 构建处理大数据集或高流量的功能

**何时不要使用:** 没有问题证据前不要优化。过早优化会增加复杂度，其成本通常高于获得的性能收益。

## Core Web Vitals 目标

| 指标 | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## 优化流程

```
1. MEASURE  → 用真实数据建立 baseline
2. IDENTIFY → 找到真实瓶颈（不是假设）
3. FIX      → 处理这个具体瓶颈
4. VERIFY   → 再次测量，确认改进
5. GUARD    → 添加 monitoring 或 tests，防止回归
```

### Step 1: 测量

两种互补方法，都要使用：

- **Synthetic (Lighthouse, DevTools Performance tab):** 条件受控，可复现。最适合 CI 回归检测和隔离具体问题。
- **RUM (web-vitals library, CrUX):** 真实条件下的真实用户数据。用于验证修复是否真正改善了用户体验。

**Frontend:**
```bash
# Synthetic: Chrome DevTools 中的 Lighthouse（或 CI）
# Chrome DevTools → Performance tab → Record
# Chrome DevTools MCP → Performance trace

# RUM: 代码中的 Web Vitals library
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

**Backend:**
```bash
# 响应时间 logging
# Application Performance Monitoring (APM)
# 带 timing 的 database query logging

# 简单 timing
console.time('db-query');
const result = await db.query(...);
console.timeEnd('db-query');
```

### 从哪里开始测量

根据症状决定先测量什么：

```
哪里慢？
├── 首次页面加载
│   ├── bundle 过大？ --> 测量 bundle size，检查 code splitting
│   ├── server response 慢？ --> 在 DevTools Network waterfall 中测量 TTFB
│   │   ├── DNS 长？ --> 为已知 origins 添加 dns-prefetch / preconnect
│   │   ├── TCP/TLS 长？ --> 启用 HTTP/2，检查 edge deployment、keep-alive
│   │   └── Waiting (server) 长？ --> Profile backend，检查 queries 和 caching
│   └── Render-blocking resources？ --> 检查 network waterfall 中阻塞的 CSS/JS
├── 交互感觉卡顿
│   ├── 点击时 UI 冻结？ --> Profile main thread，查找 long tasks (>50ms)
│   ├── 表单输入延迟？ --> 检查 re-renders、controlled component 开销
│   └── 动画卡顿？ --> 检查 layout thrashing、forced reflows
├── 导航后的页面
│   ├── 数据加载？ --> 测量 API response times，检查 waterfalls
│   └── Client rendering？ --> Profile component render time，检查 N+1 fetches
└── Backend / API
    ├── 单个 endpoint 慢？ --> Profile database queries，检查 indexes
    ├── 所有 endpoints 慢？ --> 检查 connection pool、memory、CPU
    └── 间歇性变慢？ --> 检查 lock contention、GC pauses、external deps
```

### Step 2: 识别瓶颈

按类别列出的常见瓶颈：

**Frontend:**

| 症状 | 可能原因 | 排查 |
|---------|-------------|---------------|
| LCP 慢 | 图片过大、render-blocking resources、server 慢 | 检查 network waterfall、图片尺寸 |
| CLS 高 | 图片缺少尺寸、内容延迟加载、字体位移 | 检查 layout shift attribution |
| INP 差 | main thread 上 JavaScript 过重、DOM 更新过大 | 检查 Performance trace 中的 long tasks |
| 初始加载慢 | bundle 过大、network requests 过多 | 检查 bundle size、code splitting |

**Backend:**

| 症状 | 可能原因 | 排查 |
|---------|-------------|---------------|
| API 响应慢 | N+1 queries、缺少 indexes、queries 未优化 | 检查 database query log |
| Memory 增长 | 泄漏的 references、无界 caches、大 payloads | Heap snapshot analysis |
| CPU spikes | 同步重计算、regex backtracking | CPU profiling |
| Latency 高 | 缺少 caching、重复计算、network hops | 跟踪 requests 穿过整个 stack 的路径 |

### Step 3: 修复常见 Anti-Patterns

#### N+1 Queries (Backend)

```typescript
// BAD: N+1 — 每个 task 都为 owner 发起一次 query
const tasks = await db.tasks.findMany();
for (const task of tasks) {
  task.owner = await db.users.findUnique({ where: { id: task.ownerId } });
}

// GOOD: 使用 join/include 的单次 query
const tasks = await db.tasks.findMany({
  include: { owner: true },
});
```

#### Unbounded Data Fetching

```typescript
// BAD: 获取所有 records
const allTasks = await db.tasks.findMany();

// GOOD: 带 limits 的 pagination
const tasks = await db.tasks.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

#### Missing Image Optimization (Frontend)

```html
<!-- BAD: 无 dimensions，无 format optimization -->
<img src="/hero.jpg" />

<!-- GOOD: Hero / LCP image — art direction + resolution switching，高优先级 -->
<!--
  组合使用两种技术：
  - Art direction (media): 每个 breakpoint 使用不同裁剪/构图
  - Resolution switching (srcset + sizes): 根据屏幕密度选择合适文件大小
-->
<picture>
  <!-- Mobile: portrait crop (8:10) -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: landscape crop (2:1) -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Hero 图片描述"
  />
</picture>

<!-- GOOD: 首屏以下图片 — lazy loaded + async decoding -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="内容图片描述"
/>
```

#### Unnecessary Re-renders (React)

```tsx
// BAD: 每次 render 都创建新 object，导致 children re-render
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// GOOD: 稳定 reference
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// 对昂贵 components 使用 React.memo
const TaskItem = React.memo(function TaskItem({ task }: Props) {
  return <div>{/* 昂贵 render */}</div>;
});

// 对昂贵 computations 使用 useMemo
function TaskStats({ tasks }: Props) {
  const stats = useMemo(() => calculateStats(tasks), [tasks]);
  return <div>{stats.completed} / {stats.total}</div>;
}
```

#### Large Bundle Size

```typescript
// Modern bundlers (Vite, webpack 5+) 会通过 tree-shaking 自动处理 named imports，
// 前提是 dependency 发布 ESM，并在 package.json 中标记 `sideEffects: false`。
// 修改 import styles 前先 profile — 真正的收益来自 splitting 和 lazy loading。

// GOOD: 对重型、低频功能使用 dynamic import
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// GOOD: Suspense 包裹的 route-level code splitting
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

#### Missing Caching (Backend)

```typescript
// Cache 高频读取、低频变更的数据
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// 静态 assets 的 HTTP caching headers
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache 1 年
  immutable: true,        // 不重新验证（在文件名中使用 content hashing）
}));

// API responses 的 Cache-Control
res.set('Cache-Control', 'public, max-age=300'); // 5 分钟
```

## Performance Budget

设置并强制执行 budgets：

```
JavaScript bundle: < 200KB gzipped (initial load)
CSS: < 50KB gzipped
Images: < 200KB per image (above the fold)
Fonts: < 100KB total
API response time: < 200ms (p95)
Time to Interactive: < 3.5s on 4G
Lighthouse Performance score: ≥ 90
```

**在 CI 中强制执行:**
```bash
# Bundle size 检查
npx bundlesize --config bundlesize.config.json

# Lighthouse CI
npx lhci autorun
```

## 参见

更多性能 checklist、优化 commands 和 anti-pattern reference，见 `references/performance-checklist.md`。


## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “以后再优化” | 性能债会复利增长。现在修复明显 anti-patterns，把 micro-optimizations 留到以后。 |
| “在我机器上很快” | 你的机器不是用户的机器。要在代表性的硬件和网络上 profile。 |
| “这个优化显而易见” | 没测量，就不知道。先 profile。 |
| “用户不会注意 100ms” | 研究表明 100ms 延迟会影响转化率。用户比你想的更敏感。 |
| “framework 会处理性能” | Frameworks 能避免部分问题，但无法修复 N+1 queries 或过大的 bundles。 |

## Red Flags
- 没有 profiling 数据支撑的优化
- data fetching 中存在 N+1 query patterns
- list endpoints 没有 pagination
- 图片缺少 dimensions、lazy loading 或 responsive sizes
- Bundle size 增长但没有 review
- 生产环境没有 performance monitoring
- 到处使用 `React.memo` 和 `useMemo`（过度使用和使用不足一样糟）

## Verification
任何性能相关变更后：

- [ ] 存在前后测量数据（具体数字）
- [ ] 已识别并处理具体瓶颈
- [ ] Core Web Vitals 在 “Good” 阈值内
- [ ] Bundle size 没有显著增加
- [ ] 新 data fetching 代码中没有 N+1 queries
- [ ] Performance budget 在 CI 中通过（如果已配置）
- [ ] 现有 tests 仍通过（优化没有破坏行为）
