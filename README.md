# 🔐 CI/CD Pipeline Security Gate — NexBlogger

An automated DevSecOps security gate built on top of an existing Docker + Kubernetes + Jenkins pipeline. Every push and pull request is automatically scanned for hardcoded secrets and infrastructure misconfigurations — blocking merges before vulnerable code reaches production.

---

## 📌 Project Overview

| | |
|---|---|
| **Type** | DevSecOps / CI/CD Security |
| **Base Repo** | NexBlogger (Node.js, Docker, Kubernetes, Jenkins) |
| **Tools Added** | GitHub Actions, Gitleaks v3, Checkov 3.3 |
| **Findings** | 16 real misconfigurations detected and remediated |
| **Final State** | 0 Checkov failures across Dockerfile, Kubernetes, and GitHub Actions layers |

---

## 🏗️ Architecture

```
Developer pushes code / opens Pull Request
              │
              ▼
     GitHub Actions triggers
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
Gitleaks            Checkov
Secret Scan      IaC & Dockerfile Scan
(full git        (Kubernetes YAML,
 history)         Dockerfile, Workflows)
    │                    │
    ▼                    ▼
Exit code 0?        Exit code 0?
    │                    │
    └─────────┬──────────┘
              │
         Both pass?
         /         \
       YES           NO
        │             │
   Merge allowed   Merge BLOCKED
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Application | Node.js |
| Containerization | Docker |
| Orchestration | Kubernetes |
| CI/CD Pipeline | Jenkins + GitHub Actions |
| Secret Scanning | Gitleaks v3 |
| IaC Scanning | Checkov 3.3 (Bridgecrew / Palo Alto) |
| Config Format | YAML |

---

## 🔍 Tools Explained

### Gitleaks
Gitleaks is an open-source secret scanning tool that detects hardcoded secrets — API keys, passwords, tokens — using 150+ regex-based detection rules. Unlike basic scanners that only check the latest commit, this pipeline uses `fetch-depth: 0` to scan the **entire git history**, catching secrets that were committed and later deleted but still exist in the commit log.

### Checkov
Checkov is a static analysis tool for Infrastructure as Code (IaC). It checks Dockerfiles, Kubernetes manifests, Terraform, and CI/CD workflow files against 1000+ security policies including CIS Benchmarks. With `soft_fail: false`, any failed check causes a non-zero exit code — directly failing the GitHub Actions job and blocking the merge.

---


## 🔴 Security Findings — Before Hardening

### Scan Summary

| Scanner | File | Passed | Failed |
|---|---|---|---|
| Gitleaks | Full repo + git history | ✅ No leaks | — |
| Checkov | `Dockerfile` | 43 | 0 |
| Checkov | `k8s/deployment.yaml` | 75 | 15 |
| Checkov | `.github/workflows/security-gate.yml` | 27 | 1 |
| **Total** | | **145** | **16** |

### Kubernetes Violations (CIS Benchmark)

| Check ID | Finding | Security Risk |
|---|---|---|
| CKV_K8S_20 | `allowPrivilegeEscalation` not disabled | Process can gain root access mid-run |
| CKV_K8S_23 | `runAsNonRoot` not set | Container runs as root — full access if exploited |
| CKV_K8S_29 | No pod-level `securityContext` | No pod-wide security baseline |
| CKV_K8S_30 | No container-level `securityContext` | Container has no explicit security restrictions |
| CKV_K8S_22 | `readOnlyRootFilesystem` not set | Attacker can write malicious files inside container |
| CKV_K8S_28 | `NET_RAW` capability not dropped | Container can craft raw network packets — enables ARP spoofing |
| CKV_K8S_37 | Capabilities not minimized | Container has unnecessary OS-level permissions |
| CKV_K8S_40 | Low UID user | Low UID can conflict with host system users |
| CKV_K8S_38 | Service account token auto-mounted | Token exposed — can be used to access Kubernetes API |
| CKV_K8S_31 | No seccomp profile | Container can make any Linux system call |
| CKV_K8S_14 | Image using `:latest` tag | Non-reproducible builds — image can silently change |
| CKV_K8S_21 | Default namespace used (Deployment) | No workload isolation between environments |
| CKV_K8S_21 | Default namespace used (Service) | Service also in default namespace |
| CKV2_K8S_6 | No NetworkPolicy defined | Pod can communicate freely with any pod in cluster |

### GitHub Actions Violation

| Check ID | Finding | Risk |
|---|---|---|
| CKV2_GHA_1 | Top-level permissions not explicitly restricted | Workflow token defaults to write-all — over-permissioned |

---

## 🟢 Fixes Applied — After Hardening

### 1. Kubernetes Deployment — securityContext Added


### 2. Namespace Isolation

Moved all resources from `default` namespace to dedicated `nexblogger` namespace.

### 3. NetworkPolicy Added

Restricted pod-to-pod communication — only allows ingress on port 3000 and egress on port 53 (DNS).

### 4. GitHub Actions Permissions

Replaced implicit write-all token with explicit read-only permissions for every permission scope.


## ✅ Scan Results — After Hardening

| Scanner | Passed | Failed |
|---|---|---|
| Gitleaks | ✅ No leaks | — |
| Checkov (Dockerfile) | 43 | 0 |
| Checkov (Kubernetes) | 89 | 0 |
| Checkov (GitHub Actions) | 27 | 0 |
| **Total** | **159** | **0** |

---

## 🚦 Gate in Action

### Secret Detected — Merge Blocked
When a secret (Stripe API key) was introduced on a test branch, Gitleaks caught it immediately and blocked the merge automatically. The **"Merge pull request"** button was greyed out until the secret was removed.

```
❌ Security Gate / Gitleaks Secret Scan     — Failing  [Required]
✅ Security Gate / Checkov IaC & Dockerfile — Passing  [Required]

Merge pull request  [BLOCKED]
```

### After Fix — Checks Passing
After removing the secret and re-pushing, Gitleaks re-ran and passed. Merge was allowed.

```
✅ Security Gate / Gitleaks Secret Scan     — Passing  [Required]
✅ Security Gate / Checkov IaC & Dockerfile — Passing  [Required]

Merge pull request  [ACTIVE]
```

---

## 🔒 Branch Protection

Branch protection rules are configured on `main` requiring:
- ✅ Gitleaks Secret Scan must pass
- ✅ Checkov IaC & Dockerfile Scan must pass
- ✅ Branch must be up to date before merging
- ✅ No bypassing allowed

No code reaches `main` without clearing both security checks.

---

## 📈 Commit History

| Run | Commit | Result |
|---|---|---|
| #1 | Adding security gate | ❌ 16 findings detected |
| #2 | Adding README file | ❌ Findings still present |
| #3 | Fixing deployment.yaml | ❌ Partial fix |
| #4 | Added permissions | ❌ 2 findings remaining |
| #5 | Implement GitHub Actions for security scanning | ✅ 0 findings |

---

## 💡 Key Design Decisions

**Why Gitleaks over GitHub's built-in secret scanning?**
GitHub's native secret scanning requires GitHub Advanced Security — a paid feature for private repos. Gitleaks is free, open-source, and works on any repo. It also integrates directly as a workflow step, making it portable to Jenkins or GitLab if needed.

**Why `fetch-depth: 0`?**
By default, GitHub Actions only checks out the latest commit. A secret committed 3 months ago and then deleted still exists in git history and is still exploitable. Full history scanning ensures nothing is missed.

**Why `soft_fail: false`?**
`soft_fail: true` would report findings but let the build pass — making the gate completely useless. `soft_fail: false` causes Checkov to exit with code 1 on any failure, which GitHub Actions treats as a job failure, which blocks the merge. This is the mechanism that makes it a real gate, not just a report.

**Why explicit permissions?**
By default, GitHub Actions tokens have write access to the entire repo. Explicitly setting read-only permissions for every scope follows the principle of least privilege — if the workflow is ever compromised, the blast radius is minimized.

---

## 🔮 Future Improvements

- **Trivy** — container image CVE scanning for known vulnerabilities in dependencies
- **SARIF output** — Checkov findings displayed inline in PR diff for easier review
- **Commit SHA pinning** — pin `checkov-action` to a specific commit SHA instead of `@master` for fully reproducible pipeline
- **Slack notifications** — alert security team channel on any gate failure

---

## 👩‍💻 Author

**Sneha Choudhary**
B.Tech Computer Science (Cybersecurity) — Lovely Professional University
