# Preview Deployment Links

> Track all preview deployments before promoting to production.
> Only promote to production after testing and approval.

## Current Production
| Commit | Message | URL | Date |
|--------|---------|-----|------|
| `8acc047` | feat: brand token support + OxOtel fallback config (Sprint 6) | [Production](https://eazypg-chat-hlc941gx1-sanchayeazyapptechs-projects.vercel.app) | 2026-03-06 |

## Preview Deployments

### v1 — UX/UI Audit (latest)
| Field | Value |
|-------|-------|
| **Branch** | `claude/review-project-structure-xNNYP` |
| **Commit** | `55bf1a7` |
| **Message** | feat: holistic UX/UI audit — context-aware cards, parts-first chips, visual polish |
| **Preview URL** | https://eazypg-chat-l3t6dr79b-sanchayeazyapptechs-projects.vercel.app |
| **Branch Alias** | https://eazypg-chat-git-claude-revi-a1a90e-sanchayeazyapptechs-projects.vercel.app |
| **Status** | READY |
| **Approved** | Pending |

---

## How It Works
- Every push to a non-main branch auto-creates a **preview deployment** via Vercel Git integration.
- Preview URLs are unique per commit and never change.
- The **branch alias** URL always points to the latest deployment on that branch.
- Production deploys only happen on pushes to `main`.
- To promote a preview: merge the branch into `main` after testing.
