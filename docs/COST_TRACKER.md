# COST_TRACKER.md — Financial Overview
## CFO Document: Hosting, APIs, and AI Tool Costs

**Last Updated:** May 2026
**Current Monthly Cost: $0**

---

## Guiding Principle

Keep costs at $0 until real users justify paying. Every free tier limit should be
monitored and flagged before it's hit. No paid service should be introduced without
PM (Heenal) approval and a clear reason.

---

## Active Services & Free Tier Limits

### Supabase (Database + Auth)
| Resource | Free Limit | Current Usage | Status |
|---|---|---|---|
| Database storage | 500 MB | ~0 MB | ✅ Safe |
| Bandwidth | 5 GB / month | 0 GB | ✅ Safe |
| Auth users | 50,000 | 3 | ✅ Safe |
| API requests | 500K / month | 0 | ✅ Safe |
| Paid tier if needed | $25/month | — | — |

### Render (Backend Hosting)
| Resource | Free Limit | Current Usage | Status |
|---|---|---|---|
| Web services | 1 free service | 0 | ✅ Safe |
| Sleep after idle | 15 min inactivity | N/A | ⚠️ Note |
| Paid to stay always-on | $7/month | — | — |

> ⚠️ **Note on Render free tier:** The backend will "spin down" after 15 minutes of no traffic.
> The first request after sleeping takes ~30 seconds to respond. This is fine for a private
> app with few users. Upgrade to paid ($7/mo) when real users complain about slow first load.

### Vercel (Frontend Hosting)
| Resource | Free Limit | Current Usage | Status |
|---|---|---|---|
| Bandwidth | 100 GB / month | 0 GB | ✅ Safe |
| Builds | 6,000 min / month | 0 | ✅ Safe |
| Paid tier if needed | $20/month | — | — |

### Google Books API (Book Search)
| Resource | Free Limit | Current Usage | Status |
|---|---|---|---|
| Requests | 1,000/day without key | 0 | ✅ Safe |
| Requests with free API key | 40,000/day | — | ✅ Safe |
| Paid if exceeded | $0.004 per request | — | — |

> Note: Always use an API key (even the free one) so usage is tracked. Store in `.env`.

---

## AI Tool Costs

### Anthropic / Claude
| Tool | Plan | Monthly Cost | Usage |
|---|---|---|---|
| Claude.ai (Desktop + Web) | Pro | ~$20/mo | Planning, learning, PM support, resume |
| Claude Code (terminal) | Included in Pro | $0 extra | Development sessions |

> ⚠️ **Token awareness:** Claude Code sessions consume tokens from your Pro plan.
> Long sessions with large codebases use more tokens. If you hit limits:
> - Break tasks into smaller focused sessions
> - Use `/compact` command in Claude Code to compress context
> - Close and reopen sessions between unrelated tasks

### GitHub Copilot
| Tool | Plan | Monthly Cost | Usage |
|---|---|---|---|
| GitHub Copilot | Free (VS Code) | $0 | In-editor suggestions |

### ChatGPT / OpenAI
| Tool | Plan | Monthly Cost | Usage |
|---|---|---|---|
| ChatGPT | Free or Plus (~$20/mo) | TBD | Secondary reference |

---

## Monthly Cost Summary

| Month | Hosting | APIs | AI Tools | Total |
|---|---|---|---|---|
| May 2026 | $0 | $0 | ~$20 (Claude Pro) | ~$20 |

> The $20 Claude Pro subscription covers both this project and general use.
> It is not purely a project cost — allocate ~50% to the project = ~$10/mo project cost.

---

## Upgrade Decision Triggers

Only upgrade a service when one of these conditions is true:

| Service | Upgrade Trigger | Upgrade Cost |
|---|---|---|
| Render backend | Users complain about 30s cold start; OR traffic > 1 req/min consistently | $7/mo |
| Supabase | Storage approaches 400MB OR bandwidth approaches 4GB | $25/mo |
| Vercel | Bandwidth approaches 80GB/month (very unlikely) | $20/mo |
| Google Books API | App makes > 800 searches/day | Free API key first, then $0.004/req |

---

## Future Monetization Ideas (Phase 4)

| Model | How | Potential |
|---|---|---|
| Freemium | Free for ≤3 members, $3/mo for larger clubs | Low risk, scales with users |
| One-time purchase | $5 to unlock advanced features | Simple, no recurring billing |
| Bookstore partnerships | Local bookstores pay for a landing page / referral | Requires outreach |
| Affiliate links | Book purchase links (Bookshop.org affiliate) | Passive, ethical |

> Note: Monetization should never compromise the experience for existing users (Maya, Mina, Heenal).
> Any paid feature should be additive, not a gate on existing functionality.
