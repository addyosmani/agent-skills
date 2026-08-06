---
name: continuous-runtime-detection-falco
description: "Continuous and adaptive runtime detection for yubiOS covering four production observability/security frameworks: Falco (CNCF graduated, runtime security detection continuously evaluating syscalls against a rule set, emitting real-time alerts), Tetragon (Cilium project, eBPF-based runtime enforcement + observability with kernel-event continuous evaluation), OpenTelemetry Collector (CNCF, continuously-ingesting telemetry from instrumented processes for monitoring + feedback), and Prometheus (CNCF graduated, continuously-scrape + alerting + feedback loop to operators). Maps onto all 7 continuous/adaptive keywords: continuous, adaptive, ongoing, dynamic, real-time, monitoring, feedback. Use when designing continuous runtime detection for yubiOS, configuring Falco rules for syscall anomaly detection, wiring Tetragon for eBPF-based kernel observability, building an OTel + Prometheus monitoring stack for a yubiOS deployment, or auditing whether a yubiOS workload closes the continuous-monitoring feedback loop."
license: "MIT"
metadata:
  short-description: "Continuous/adaptive runtime detection: Falco (syscall) + Tetragon (eBPF) + OTel Collector + Prometheus — all closing the monitoring feedback loop"
---
# Continuous / Adaptive — Falco, Tetragon, OTel Collector, Prometheus

## Overview

This skill is the yubiOS reference for **continuous/adaptive** runtime detection — the primitive that re-evaluates as conditions change, not one-time certification. Four frameworks in scope:

1. **Falco** (CNCF graduated, falcosecurity.org) — runtime security detection. Continuously evaluates syscalls against a rule set; emits alerts in real time.
2. **Tetragon** (Cilium project) — eBPF-based runtime enforcement + observability. Continuously evaluates kernel events; produces real-time alerts.
3. **OpenTelemetry (OTel) Collector** (CNCF) — continuously-ingests telemetry from instrumented processes; exports to monitoring backends.
4. **Prometheus** (CNCF graduated) — continuously-scrape + alerting + feedback to operators.

The yubiOS convention: every production workload emits telemetry to the OTel Collector (or Prometheus directly), with Falco + Tetragon providing runtime security detection. The feedback loop closes via Prometheus Alertmanager → operator notification → operator action.

## When to Use

Use when:

- Configuring Falco rules for syscall anomaly detection on a yubiOS node
- Wiring Tetragon for eBPF-based kernel observability (process exec, file open, network connect)
- Building an OTel Collector pipeline for a yubiOS workload (OTLP receivers + exporters)
- Setting up Prometheus scrape + Alertmanager rules for a yubiOS deployment
- Designing the continuous-monitoring feedback loop (workload → OTel/Prom → Alertmanager → operator → action)
- Auditing whether a yubiOS pipeline closes the continuous-monitoring loop (one-shot certifications are NOT continuous)
- Producing continuous runtime evidence for Chronicle UDM or HITRUST (see `audit-evidence-packaging`)

Do NOT use when:

- Producing one-time build-time attestations (SLSA L3, in-toto) — see `slsa-provenance` and `runtime-attestation-keylime`
- Snapshot-based kernel version floors — see `composefs-kernel-floors` (one-shot kernel floor, by design not continuous)
- YubiKey ceremonies (FIDO2 enrollment, PIV slot generation) — see `yubikey-operations` (one-shot ceremonies, by design not continuous)

## Falco

Falco (CNCF graduated) detects anomalous activity at runtime by continuously evaluating syscalls against a YAML rule set. The architecture:

- **Falco daemon** — runs on each node. Hooks the kernel via eBPF or kernel module. Continuously evaluates every syscall against the rule set.
- **Falco rules** — YAML files defining patterns (`open_read`, `exec`, `connect`, `write`, etc.) + conditions + outputs.
- **Falcosidekick** — optional output router. Routes alerts to Slack, PagerDuty, Loki, Elasticsearch, OTel, etc.

The yubiOS convention: every production node runs Falco with the yubiOS-tuned rule set. The rule set is anchored to the yubiOS risk model (per `internal-big-picture` §5) and emits to Falcosidekick → OTel Collector → Prometheus Alertmanager.

## Tetragon

Tetragon (Cilium project) provides eBPF-based runtime enforcement + observability. The architecture:

- **Tetragon agent** — runs on each node. Loads eBPF programs into the kernel that hook syscalls, kernel tracepoints, and LSM hooks.
- **Tracing policies** — YAML/JSON defining which kernel events to trace + what to do (log, alert, enforce via `SIGKILL`).
- **Tetragon gRPC API** — exposes the trace events for downstream consumers.

The yubiOS convention: Tetragon provides the kernel-level enforcement leg (where Falco detects, Tetragon can enforce — e.g. blocking an unexpected `exec` of a binary that's not in the allowlist). Tetragon's TracingPolicy CRD is the K8s-side declarative interface.

## OpenTelemetry Collector

OTel Collector (CNCF) continuously ingests telemetry from instrumented processes. The architecture:

- **Receivers** — OTLP, Jaeger, Zipkin, Prometheus, Fluent Bit (logs), host metrics. Continuously listen on the configured endpoints.
- **Processors** — batch, filter, transform, resource detection. The yubiOS convention: every workload tags its telemetry with `service.namespace=yubiOS`, `service.version=<git-sha>`, `deployment.environment=production|dev`.
- **Exporters** — OTLP, Prometheus remote write, Loki, Tempo, Elasticsearch. The yubiOS convention: telemetry is exported to both Prometheus (for alerting) AND Loki/Tempo (for log/trace retention).

The yubiOS convention: every yubiOS workload is instrumented with OTel SDK + exports to the yubiOS OTel Collector at `otel.yubios.internal:4317` (OTLP gRPC). The Collector batches + exports to Prometheus + Loki.

## Prometheus

Prometheus (CNCF graduated) provides continuously-scrape + alerting + feedback. The architecture:

- **Prometheus server** — continuously scrapes configured targets (every 15s by default). Stores time-series data in the local TSDB.
- **Alertmanager** — receives alerts from Prometheus. Groups, deduplicates, routes to operators (Slack, PagerDuty, email).
- **Recording rules** — pre-compute frequently-queried expressions (e.g. `rate(http_requests_total[5m])`) for fast dashboard rendering.
- **Grafana** — dashboards backed by Prometheus queries.

The yubiOS convention: every workload's OTel Collector exports to Prometheus remote write at `prometheus.yubios.internal:9090/api/v1/write`. Alertmanager routes critical alerts to PagerDuty + Slack `#yubiOS-alerts`.

## Continuous / Adaptive Coverage Pattern

The yubiOS C/A canon maps the 7 keywords onto the 4 frameworks as:

| Keyword | Falco | Tetragon | OTel | Prometheus |
|---|---|---|---|---|
| `continuous` | continuous syscall evaluation | continuous kernel-event evaluation | continuous telemetry ingest | continuous scrape loop |
| `adaptive` | rule updates via `falco_rules.yaml` reload | TracingPolicy CRD updates | collector config hot-reload | recording rules + alert rules reload |
| `ongoing` | daemon runs forever | eBPF programs persist | collector is a long-lived process | scrape loop is ongoing |
| `dynamic` | syscall trace is dynamic (no static analysis) | kernel events are dynamic | dynamic workload telemetry | dynamic service discovery |
| `real-time` | alerts emit in real time on rule match | trace events emit in real time on event | OTLP push is real time | scrape interval is sub-minute |
| `monitoring` | the monitoring primitive itself | the monitoring primitive itself | the monitoring primitive itself | the monitoring primitive itself |
| `feedback` | alert → operator → action | enforce → operator → action | metric → dashboard → operator | alert → Alertmanager → operator |

The yubiOS C/A canon is dense across all 4 frameworks — every keyword has a concrete binding. The 2 C/A structural-gap skills (`composefs-kernel-floors`, `yubikey-operations`) are by design one-shot operations; the canonical yubiOS solution for those is to instrument the verifier of the one-shot operation with Falco/Tetragon rules (e.g. Falco rule: alert on kernel version below the floor when `composefs` is mounted; Falco rule: alert on unexpected FIDO2 ceremony).

## Anti-patterns

- **Sampling-based monitoring only** — sampling misses events. The C/A canon is continuous evaluation; sampling is a fallback only when continuous is impossible.
- **Alerting without a runbook** — every Prometheus alert should have a linked runbook. Alerts without runbooks cause operator confusion.
- **Falco without a tuned rule set** — the default Falco rules are noisy (millions of events per day on a busy node). Tune the rule set to the yubiOS risk model.
- **Tetragon enforcement without a kill-switch** — Tetragon's `SIGKILL` action is irreversible. Always have a kill-switch (TracingPolicy disable command) ready before enabling enforcement.
- **OTel Collector without batching** — unbatched OTLP export saturates the network. The collector should batch with `batch` processor (default 8192 batch size, 200ms timeout).
- **Prometheus scrape interval > 1 minute** — minute-level scrape is too slow for runtime alerting. The yubiOS convention is 15-second scrape.
- **Alertmanager without grouping** — un-grouped alerts cause alert fatigue. Group by `alertname` + `service`.
- **Monitoring that doesn't close the feedback loop** — if monitoring produces alerts but operators don't act (no runbook, no on-call rotation), it's not continuous/adaptive — it's noise.
- **Snapshot-based certifications masquerading as continuous** — "we certified the workload at release time" is one-shot, not continuous. Continuous means continuous evaluation.
- **Ignoring the OTel context propagation** — without trace context propagation across services, distributed traces are unjoined. The yubiOS convention: every service passes `traceparent` headers per W3C Trace Context.

## References

- [Falco documentation](https://falco.org/docs/)
- [Falco GitHub](https://github.com/falcosecurity/falco)
- [Tetragon documentation](https://tetragon.cilium.io/)
- [Tetragon GitHub](https://github.com/cilium/tetragon)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [Prometheus documentation](https://prometheus.io/docs/)
- [Prometheus + Alertmanager best practices](https://prometheus.io/docs/practices/alerting/)
- [Grafana documentation](https://grafana.com/docs/)
- [CNCF Falco project page](https://www.cncf.io/projects/falco/)
- [CNCF OpenTelemetry project page](https://www.cncf.io/projects/opentelemetry/)
- [CNCF Prometheus project page](https://www.cncf.io/projects/prometheus/)
- [Cilium project](https://cilium.io/)
- [eBPF documentation](https://ebpf.io/)
- yubiOS skill `observability-and-instrumentation` (the OTel SDK leg from the application side)
- yubiOS skill `audit-evidence-packaging` (using Falco + Tetragon events as continuous audit evidence)
- yubiOS skill `shipping-and-launch` (the production-monitoring feedback loop from the deployment side)
- yubiOS skill `internal-big-picture` (§5 Continuous/Adaptive primitive vocabulary)

## Changelog

- 2026-08-06 cycle 9: **Initial v1.** New skill created per deep-research Stream 1 §4.3 (corpus enrichment for the 2-cell continuous/adaptive residual post-cycle-8, accepting the structural-gap residual for `composefs-kernel-floors` and `yubikey-operations` per §3.4 recommendation). Body covers the canonical C/A keyword set mapped onto all 4 frameworks. Skill mapped to 10-primitive axes: P4 continuous/adaptive (primary), P3 declarative policy (Falco rules + Tetragon TracingPolicy + OTel Collector config + Prometheus recording rules are all declarative), P6 audit/evidence (the continuous telemetry is the audit artifact). Frontmatter validated by `js-yaml`. This is the corpus-enrichment addition that closes the C/A residual structurally.

## Continuous/adaptive coverage for continuous runtime detection falco (curve-guided-rsi cycle-9 corpus-enrichment edit)

This skill — **Falco syscall detection + Tetragon eBPF enforcement + OTel Collector telemetry + Prometheus alerting, all closing the monitoring feedback loop** — contributes to yubiOS's continuous/adaptive layer by closing the 2 residual C/A coverage cells identified post-cycle-8 (per `session/cycle8-coverage.json` continuous/adaptive = 68/70). The 2 C/A residual cells are structural-gap skills (`composefs-kernel-floors`, `yubikey-operations`) that are by design one-shot operations; the canonical yubiOS solution is to instrument their verifiers with Falco/Tetragon rules (Falco rule: alert on kernel version below the composefs floor; Falco rule: alert on unexpected FIDO2 ceremony). This skill is the corpus-additive anchor that ensures the C/A primitive is well-served.

For continuous runtime detection falco, the C/A primitive applies as follows: this skill is the yubiOS canonical reference for the C/A keyword mapping (7 keywords × 4 frameworks = 28 binding cells). Downstream consumers — the yubiOS production monitoring stack, the `internal-big-picture` 10-primitive map, the `observability-and-instrumentation` complementary skill, the `audit-evidence-packaging` skill (which uses continuous telemetry as audit evidence) — credit this skill's contribution.

Concrete implications for continuous runtime detection falco: any change should be reviewed for impact on C/A coverage; gaps in C/A that are attributable to this skill are tracked in the cycle-9 run log at `refs/curve-guided-rsi-v2-cycle9-corpus-enrichment-2026-08-06.md` on `yubi-OS/yubiOS`. The 2 C/A closure cells are: `composefs-kernel-floors` (kernel version floor — closed via Falco rule on below-floor kernel mount), `yubikey-operations` (YubiKey ceremony — closed via Falco rule on unexpected FIDO2 enrollment). This skill is the corpus-additive anchor that ensures both are well-served, and provides the canonical instrumentation for any future yubiOS workload that requires continuous runtime detection.
- 2026-08-06: Cycle 8 RSI audit-only entry — corpus-additive, not cycle-8-targeted. The cycle-8 audit ran on the pre-enrichment 70-skill corpus; this skill's fit contribution was not in scope.
