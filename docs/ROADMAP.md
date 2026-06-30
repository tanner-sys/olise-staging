# Olise — Brain & Backend Execution Roadmap

**Status:** Active execution plan (Phase 2)  
**Companion:** [ARCHITECTURE.md](./ARCHITECTURE.md) — system design and current vs target state  
**Linear:** Olise project → Phase 2 epic **T3V-164** and sub-issues  
**Product constraint:** Guidance-only — no diagnosis, prescribing, synchronous therapy, or insurance billing.

---

## Architectural tenets (load-bearing)

1. **Governed orchestration, not a trained model.** IP lives in structured corpora retrieved at query time. Stay API-model-agnostic until measured tripwires justify a narrow fine-tune ([§ Model graduation](#model-graduation-tripwires)).
2. **Safety is the license to operate.** Safety-critical paths are deterministic; nothing reaches real caregivers until the safety subsystem is green.
3. **Claims discipline in code.** Abstention on empty retrieval, deterministic instrument scoring, post-generation validation — not marketing copy.
4. **PHI minimization + vendor discipline.** PHI never hits client-side models. Only BAA-covered vendors in config; no runtime “BAA checker” — ops gate instead.
5. **Instrument everything from day one.** Per-turn cost and safety telemetry (`model_calls`) tagged by feature/model/environment.
6. **Server-authoritative for auditable data.** Brain owns what was sent to models and what safety saw.
7. **Capital efficiency.** Supabase hybrid now; queues, caches, monolith only when triggers fire.

---

## Current baseline (post Tier 0–1)

**Shipped:** Auth + MFA, profiles + RLS, chat SSE, personalized prompts, model fallback chain, regex crisis stub + `crisis_events`, programs/routines UI, desktop v0.1.3.

**The gap:** Chat is live while **safety pipeline** and **RAG** — the systems safety and differentiation depend on — are largely unbuilt. Client owns message writes; brain is a stateless reply generator.

---

## Build sequence (risk-driven)

Safety and grounding before reach. **No real-family beta** until M4 (Eval gate) is green.

```text
M1 Foundation     → server-owned turns + telemetry
M2 Safety         → parallel pre-safety + post-safety + crisis UX
M3 Clinical RAG   → ingest → retrieve → cite → abstain
M4 Eval gate      → harness + CI + beta checklist
        ↓
   Caregiver beta (closed)
        ↓
   Phase 3 IP depth (biomarker, instruments, memories)
        ↓
   Production launch gate (legal + red-team + prod traffic)
```

### M1 — Foundation: authoritative turns + telemetry

| # | Deliverable | Repos |
|---|-------------|-------|
| 1 | Schema: `model_calls`, `safety_verdicts`, `message_citations`; brain INSERT on `messages` | supabase, brain |
| 2 | Telemetry: insert `model_calls` on every provider call (chat first) | brain |
| 3 | Brain writes user + assistant messages; idempotency `(sessionId, clientMessageId)` | brain |
| 4 | Brain loads history from DB; retire client `history` array | brain, ui |
| 5 | UI chat refactor: optimistic display, sync from server `done` event | ui |

**Exit:** Every turn has server message IDs + at least one `model_calls` row.

### M2 — Safety pipeline

| # | Deliverable | Repos |
|---|-------------|-------|
| 6 | Pre-safety: Haiku classifier + **parallel** regex; OR-merge on crisis | brain |
| 7 | Jailbreak / extraction → `blocked` SSE + `abuse_incidents` | brain |
| 8 | Post-safety: diagnosis/prescription, leak, crisis-in-output, fabricated scores | brain |
| 9 | Crisis UX: full-screen card, acknowledgment, composer lock | ui, brain |
| 10 | Internal alert on `crisis_events` insert | brain, infra |

**Exit:** Crisis path emits zero coaching tokens; pre/post logged in `safety_verdicts` + telemetry.

### M3 — Clinical RAG (corpus: `clinical` only)

| # | Deliverable | Repos |
|---|-------------|-------|
| 11 | Ingest CLI: register → chunk → embed (Azure OpenAI) → publish | brain |
| 12 | `sync-program` job: programs table → knowledge chunks | brain, supabase |
| 13 | Query-time retrieval: corpus-filtered, top_k=5, min_similarity=0.75 | brain |
| 14 | Abstain flag when empty/low score on clinical claims | brain |
| 15 | SSE `citation` events + UI display | brain, ui |

**Exit:** Clinical education answers cite published chunks or abstain.

### M4 — Eval gate + beta readiness

| # | Deliverable | Repos |
|---|-------------|-------|
| 16 | Eval harness: scenarios, deterministic checks, staging-only | brain |
| 17 | CI gate: 100% crisis/jailbreak; ≥90% citation; ≥85% abstention | brain, infra |
| 18 | Red-team seed (expand safety buckets beyond v1 set) | brain |
| 19 | Per-environment API keys (staging/prod/eval) | infra |
| 20 | Beta exit checklist (see below) | all |

---

## Per-turn pipeline (target)

1. **Ingress** — JWT, rate limit, idempotency, payload limits  
2. **Pre-safety** — parallel regex + Haiku; crisis/jailbreak short-circuit  
3. **Context** — Layer 1–3 assembly; **server-side** history + summary  
4. **Retrieval** — corpus-filtered pgvector; abstain flag  
5. **Generation** — model chain (Sonnet → Haiku → Azure OpenAI fallback)  
6. **Post-safety** — validate stream; regenerate or abstain  
7. **Persistence + telemetry** — messages, verdicts, citations, `model_calls`

See [ARCHITECTURE.md §5](./ARCHITECTURE.md) for diagrams and SSE event types.

---

## Beta exit gate (real caregivers, real PHI)

**Engineering (required):**

- [x] M1 — server-authoritative messages + telemetry on staging
- [x] M2 — pre/post safety + crisis UX + internal alerts
- [x] M3 — clinical RAG ingest, retrieve, cite, abstain (staging corpus v1)
- [x] M4 v0 — eval harness + CI gate (31 scenarios, 5 buckets)
- [ ] M4 full — expand to ~110 scenarios + red-team seed
- [ ] Eval suite green on every deploy (expand citation/abstain coverage)

**Legal / clinical (required before prod; parallel with beta prep):**

- [ ] Crisis template + resource set (CMO sign-off)  
- [ ] Duty-to-warn / mandatory reporting protocol (counsel)  
- [ ] Biomarker claims boundary (defer biomarker corpus until ruled)  
- [ ] Data retention + export/delete baseline documented  

**Explicitly not required for closed beta:** biomarker RAG, instrument scoring, child memories, capability/cost routing, production traffic.

---

## Phase 3 — IP depth (post-beta)

- Biomarker + instrument corpora (behind regulatory ruling)  
- Deterministic assessment scoring (`scoring_config` in code)  
- Child memories (confirmation-gated) + conversation summaries  
- Trend-aware responses (check-in + program progress)  
- Cross-space intelligence with disambiguation eval  
- Capability/cost routing + prompt caching (first COGS lever)

---

## Phase 4 — Hardening & scale (trigger-gated)

- Continuous red-team; shadow eval on sampled prod turns  
- Admin abuse-review console  
- Full data lifecycle automation; SOC 2 + pen test  
- Async queues, semantic cache, HNSW at scale  
- Optional monolith migration; narrow fine-tune only if tripwires hit  

---

## Model graduation tripwires

Do **not** fine-tune on caregiver PHI until **all** hold:

- ≥12 months cohort data; month-12 retention ~30%+; LTV:CAC ≥ 3  
- ~50k+ paying subs **and** inference COGS > ~$1M/yr **and** 100k–1M+ curated conversations  
- Capital for ~$0.75–1.5M/yr ML function (< ~10–15% of cost base)  
- Measured ≥40% inference cut or significant quality/retention lift in blinded A/B  
- 2+ post-training ML hires who shipped production fine-tunes + eval harnesses  

**Defensive exception:** frontier provider restricts pediatric mental health → evaluate open-weight fine-tune for continuity.

---

## Resolved design decisions (from planning review)

| Tension | Resolution |
|---------|------------|
| Brain vs client persistence | **Brain authoritative** before beta |
| BAA enforcement | **Config/ops gate** — only BAA vendors provisioned; log provider in telemetry |
| Client history | **Retire** client-supplied history; server reconstruction + summaries |
| Sonnet-first COGS | Accept higher beta COGS; capability routing in Phase 3 |
| Prompt secrecy | Hygiene only; moat = corpus + data |

---

## Linear mapping

| Linear | Scope |
|--------|-------|
| **T3V-164** | Phase 2 parent epic |
| **T3V-164.1 – .10** | M1–M2 implementation issues (sequenced) |
| **T3V-131** | RAG epic (expand under M3) |
| **T3V-134** | Eval harness (expand under M4) |
| **T3V-114** | Superseded by telemetry spine (164.2) |
| **T3V-112** | Azure OpenAI fallback keys (M4 infra) |

Full specs live in Linear issue descriptions and the project document **Brain Architecture & Roadmap**.
