# NexBlogger — CI/CD Pipeline Security Gate

Automated security pipeline built with GitHub Actions that scans every 
push and pull request for hardcoded secrets and infrastructure 
misconfigurations — blocking merges on critical findings.

---

## Tools Used

| Tool | Purpose |
|---|---|
| **Gitleaks** | Scans code + full git history for hardcoded secrets (API keys, passwords, tokens) |
| **Checkov** | Scans Dockerfile, Kubernetes YAML, and GitHub Actions workflows for misconfigurations |

---

## How It Works

1. Developer pushes code or opens a pull request
2. GitHub Actions triggers the Security Gate workflow automatically
3. Two jobs run **in parallel**:
   - Gitleaks scans the entire git history for leaked secrets
   - Checkov scans all infrastructure files for misconfigurations
4. If either job fails → **merge is blocked automatically**
5. Developer fixes the issue → re-pushes → gate re-runs

---

## Scan Results — Before Hardening

| Scanner | File Scanned | Passed | Failed |
|---|---|---|---|
| Gitleaks | Entire repo + git history | ✅ No leaks | — |
| Checkov | `Dockerfile` | 43 | 0 |
| Checkov | `k8s/deployment.yaml` | 75 | 15 |
| Checkov | `.github/workflows/security-gate.yml` | 27 | 1 |
| **Total** | | **145** | **16** |

---

## Findings — Kubernetes (`k8s/deployment.yaml`)

| Check ID | Finding | Risk |
|---|---|---|
| CKV_K8S_20 | `allowPrivilegeEscalation` not disabled | Process inside container can gain root-level access mid-run |
| CKV_K8S_23 | Root containers not minimized (`runAsNonRoot` missing) | Container runs as root — full system access if exploited |
| CKV_K8S_29 | No pod-level `securityContext` | No pod-wide security baseline set |
| CKV_K8S_30 | No container-level `securityContext` | Container has no explicit security restrictions |
| CKV_K8S_22 | No read-only filesystem | Attacker can write malicious files inside container |
| CKV_K8S_28 | `NET_RAW` capability not dropped | Container can craft raw network packets — enables ARP spoofing |
| CKV_K8S_37 | Capabilities not minimized | Container has unnecessary OS-level permissions |
| CKV_K8S_40 | Container not running as high UID | Low UID users can conflict with host system users |
| CKV_K8S_38 | Service account token auto-mounted | Token exposed unnecessarily — can be used to talk to Kubernetes API |
| CKV_K8S_31 | No seccomp profile set | Container can make any Linux system call — increases attack surface |
| CKV_K8S_14 | Image using `:latest` tag | Non-reproducible builds — image can silently change between deployments |
| CKV_K8S_43 | Image not pinned to digest | No cryptographic guarantee of which image version runs |
| CKV_K8S_21 | Default namespace used (Deployment) | All workloads mixed together — no isolation between environments |
| CKV_K8S_21 | Default namespace used (Service) | Service also in default namespace — same isolation issue |
| CKV2_K8S_6 | No NetworkPolicy defined | Pod can communicate with any other pod in the cluster freely |

---

## Findings — GitHub Actions (`.github/workflows/security-gate.yml`)

| Check ID | Finding | Risk |
|---|---|---|
| CKV2_GHA_1 | Top-level permissions not explicitly restricted | Workflow token defaults to write-all — over-permissioned |

---

## What Was Already Secure

- ✅ No hardcoded secrets or API keys anywhere in the codebase (Gitleaks)
- ✅ Dockerfile fully hardened — 43 checks passed, 0 failed
- ✅ Workflow runs on `pull_request` — gate fires before merge, not after
- ✅ `fetch-depth: 0` configured — full git history scanned, not just latest commit
- ✅ `soft_fail: false` enforced — findings actually block the build, not just report

---

## Fixes Applied (After Hardening)

### 1. `k8s/deployment.yaml` — Added securityContext

Added pod-level and container-level security context covering:
- `runAsNonRoot: true` + `runAsUser: 10001`
- `allowPrivilegeEscalation: false`
- `readOnlyRootFilesystem: true`
- `capabilities: drop: [ALL]`
- `automountServiceAccountToken: false`
- `seccompProfile: RuntimeDefault`
- Moved to dedicated `nexblogger` namespace

### 2. `.github/workflows/security-gate.yml` — Added explicit permissions

Added `permissions: read-all` at top level to fix CKV2_GHA_1.

### 3. Image tag pinned

Changed `nexus-app:latest` to a specific version tag for reproducible builds.

---

## Scan Results — After Hardening

| Scanner | Passed | Failed |
|---|---|---|
| Gitleaks | ✅ No leaks | — |
| Checkov (Dockerfile) | 43 | 0 |
| Checkov (k8s) | 90 | 0 |
| Checkov (GitHub Actions) | 28 | 0 |
| **Total** | **161** | **0** |

---

## Tech Stack

- GitHub Actions — CI/CD pipeline
- Gitleaks — Secret scanning
- Checkov (Bridgecrew) — IaC misconfiguration scanning  
- Docker — Containerization
- Kubernetes — Container orchestration
- Node.js — Application runtime

---


