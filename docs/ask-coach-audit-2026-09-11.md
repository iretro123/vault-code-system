# Ask Coach audit — September 11, 2026

## Scope and confidence

Read-only application audit of the local checkout. Inspected CoachDrawer, coach-chat edge handler, Supabase client/preview guard, route definitions, and ticket/history migrations. Opened the local coach UI and captured its layout; checked a 390×844 viewport and restored the viewport afterward. Ran the actual edge-handler and frontend parser code in an isolated Node/TypeScript harness with synthetic student records and mocked database and AI gateway. No live AI messages, tickets, database changes, deployment, or push.

This is not a production penetration test or a measured evaluation of generated answers. The deployed function, database policies, gateway credits, model availability, response latency, and real answer accuracy remain unverified. Mobile screenshot capture showed compositor artifacts; DOM checks were reliable, but mobile visual sign-off and real keyboard testing remain outstanding.

## Verdict

The foundation is useful, but this is a general chatbot with a curriculum directory—not yet a tutor grounded in Vault's course material. The biggest improvement is supplying approved teaching content and designing an explanation/example/practice loop. Changing the model alone cannot fix missing knowledge, broken navigation, or persistence problems.

## How it works

1. Sidebar opens `src/components/academy/CoachDrawer.tsx`.
2. AI messages go directly to Supabase `coach-chat` using browser fetch and the signed-in user's bearer token.
3. `supabase/functions/coach-chat/index.ts` verifies the user, loads 11 database datasets, and builds a system prompt containing curriculum titles and student information.
4. It calls Lovable's AI gateway with `google/gemini-2.5-flash`, streaming text to the browser. This is the model configured in this checkout, not a verified production model.
5. The browser parses specially formatted text into navigation/lesson cards and saves individual question/answer pairs to `instant_answers`.
6. The separate human Coach tab creates tickets and screenshot attachments. This is not AI chart-image analysis.

## Prioritized findings

### P1 — Knowledge and teaching quality

- **No actual lesson or PDF content reaches the model.** The curriculum query selects titles/module metadata, not transcripts, teaching notes, timestamps, or PDF passages. It can recommend a title without knowing what the lesson teaches. Source: edge handler lines 139–189.
- **Some prompt definitions are too categorical.** BOS “confirms” continuation; order blocks are asserted to identify where smart money placed orders; gaps are described as prices revisiting them. These are not adequate qualifications for beginner education. Rewrite as observable patterns and interpretations, include failure examples, and never imply a setup guarantees an outcome. Source: lines 34–45.
- **No verified citations, comprehension checks, lesson-aware conversation, or approved example selection.** There is no retrieval layer or grounded answer validation in this request path.
- **Visuals are three fixed assets triggered by phrases.** The same images can appear for different related concepts. They are described inconsistently as real charts and AI-generated diagrams; the model does not inspect the images it displays. Source: drawer lines 27–31, 510–539, 848 onward.

### P1 — Functional bugs reproduced or directly traced

- **Conversation limit:** the client sends the entire thread, while the server rejects more than 20 messages. Ten ordinary exchanges produce 20 messages; the 11th question produces 21 and returns HTTP 400. Image-only assistant messages can reach the limit earlier. No automatic summarization/windowing exists.
- **Incorrect balance:** only the latest 20 trades are fetched, but their P/L is added to starting balance and all adjustments and labeled Account Balance. Synthetic fixture: $1,000 starting balance, 21 losses of $10; handler reported $800 rather than $790. Do not use this number for risk guidance. Source: handler lines 140, 198–201.
- **Lesson routing guesses slugs:** the parser returns title/module title, not a real module slug or lesson ID. Click handling lowercases the title and replaces spaces. Tested with distinct title/slug: generated destination was wrong. It also does not select the exact recommended lesson. Source: drawer lines 96–109, 409–412.
- **Stale navigation:** prompt points Trade OS at `/academy/vault-os`; App.tsx redirects that route to Home. `/academy/trade` is still described as a journal, while the local redesign is a daily-loss calculator. Setup and Schedule 1:1 are absent from the navigation list.
- **Unvalidated link format:** the “Go to” parser accepts arbitrary paths; isolated test accepted `/academy/nonexistent`. Use a route registry and validated IDs, not generated routes.
- **Malformed input:** `[null]` returns HTTP 500 and exposes a JavaScript error rather than a clean 400. Validate every message object, role, and content.

### P1 — Isolation, permissions, and integrity

- **Local guard bypass:** Supabase SDK calls use `localPreviewFetch`, but AI chat uses raw `fetch`. Local chat can call the shared AI backend even though local history inserts are blocked. Do not assume localhost means all requests are isolated. Source: drawer line 434; client.ts; localPreviewFetch.ts.
- **No membership entitlement or per-user usage enforcement in the handler.** Authentication is checked, which is good. However, the service-role content reads and AI call follow authentication without a subscription check or app-level quota. Gateway 429/402 handling is not a per-member budget. Verify deployed controls before selling restricted access.
- **Unnecessary private context:** every question loads balance, trades, journals, rules, and AI personality assessments. Only send data needed for the question; education should not require trading records. User-written notes are concatenated into the system message. Treat those as untrusted data rather than instructions.
- **Human reply identity weakness in checked-in SQL:** the user reply policy checks ticket ownership but does not constrain reply `user_id`, `user_name`, or `is_admin`. The UI trusts `is_admin` to display a Coach badge. Needs server-enforced identity/role and deployed-policy verification; no exploit was attempted. Source: migration `20260215155431_a4040d1d-0c01-40b6-8c82-a91a513a6846.sql`, lines 46–49. Later screenshot privacy migrations were found; do not incorrectly flag those buckets as still public.

### P2 — Reliability and usability

- Opening Coach clears the current chat. “Past Conversations” is a list of individual answers, without full thread restoration. Images are not persisted with answers.
- No request cancellation or generation identifier. Starting a new chat while an old response streams can allow old response updates to modify the new thread. This is a code-path risk, not a reproduced race.
- No explicit generation timeout/output cap in the handler. Stream parsing does not explicitly handle gateway stream-error events. Partial responses can be finalized without a clear interrupted indicator.
- History insert errors are ignored. Human reply errors also clear the input without reporting failure. Screenshot upload failure can still submit a ticket without its attachment.
- Coach modal has no dialog semantics/focus trap; close/send icon buttons have no accessible names. DOM check found zero dialog roles and two unnamed buttons while it was open.
- The mobile AI/Human labels hide their distinguishing words at small widths. “AI Coach” versus “Coach” is less clear than “Ask AI” versus “Message the team.”
- Desktop/current screenshot has a large empty area, low-contrast starter buttons, and repeated labels: Vault AI Coach, AI Coach, AI Trading Coach. Simplify hierarchy rather than add widgets.
- Human reply promise “usually within 1–2 hours” is static. No staffing/calendar-aware guarantee was found in this component.

## What to keep

Streaming replies; concise answer-first instructions; one clarifying question; a human escalation path; actual user authentication; user-scoped personal-data queries; input count/length caps; private screenshot handling in later migrations; existing lesson/progress metadata. These are good building blocks.

## Recommended product: a Vault tutor

Keep one question box and three starters: **Explain a concept**, **Practice with a chart**, **Help with this lesson**. Avoid a new settings panel or long intake form.

Every teaching answer should follow a compact pattern:

1. Answer in plain language.
2. Show one approved example when helpful, with an optional explanation of why a similar example fails.
3. Offer one short check of understanding—not an obligatory quiz on every message.
4. Link to the exact relevant lesson and timestamp or PDF page.

Example: “A demand zone is the base before a strong upward move. A later return can fail.” Show an approved annotated chart. Ask, “Would you mark the base or the top of the rally?” Then explain the choice and offer the relevant lesson clip. This is teaching, not a buy signal.

Beginner: everyday language and one concept. Intermediate: compare two plausible interpretations. Advanced: explain invalidation and ambiguity. Infer from the question and available learning progress; allow “simpler” or “go deeper” without a setup questionnaire.

### Knowledge foundation

- Index approved lesson transcripts with real IDs and timestamps, PDF text with page references, setup instructions, and RZ-reviewed FAQs.
- The existing PDF may require OCR; verify extraction before indexing. Do not assume that a PDF link provides readable knowledge.
- Retrieve only a few relevant, member-authorized passages per answer. Attach source/version metadata and render citations from validated records.
- Say when Vault's materials do not establish an answer. Separate general education from Vault-specific methodology.
- Store approved chart examples with topic, annotations, failure conditions, and provenance. Add screenshot review only after vision testing, privacy controls, and explicit uncertainty handling.

### Reliability foundation

- Shared local-only guard for every request; sandbox fixtures for development.
- Server-owned conversations, resumable history, cancel/retry, bounded history summarization, validated response schema.
- Route/lesson ID validation; entitlement checks before retrieval; per-member quotas; output/time limits; privacy-minimized context; server-side role enforcement.
- Do not choose a replacement model by marketing claims. Compare candidates on the same reviewed Vault question set for accuracy, source fidelity, speed, and cost.

## Launch gate and business value

Create a human-reviewed evaluation set before upgrading: beginner definitions, chart ambiguity, a wrong student assumption, lesson lookup, missing knowledge, broker/setup help, guaranteed-profit requests, private-data attacks, long conversations, network interruptions, and membership boundaries. Suggested initial set: 40 educational questions plus 10 adversarial/reliability scenarios. Score factual correctness, source support, valid links, readability, and appropriate uncertainty. Any critical permission leak or fabricated citation blocks launch.

Measure whether answers help: optional “That helped / Still confused,” correct lesson opens, practice completion, repeat use, human escalation reasons, and support response times. These are product-learning metrics, not student P/L tracking. Test whether coach use correlates with retained subscriptions; do not promise it will increase MRR.

The differentiator is **Vault's teaching, made interactive and available between classes**. Generic AI answers alone are not a durable subscription advantage.

## Recommended order

1. Fix isolation, identity/entitlement checks, conversation failure, balance misuse, and lesson routing.
2. Ground answers in a small, reviewed set of Vault lessons and FAQs; validate before indexing everything.
3. Add approved visual exercises and a light understanding check.
4. Introduce resumable learning context and useful human handoff, then compare model choices using evaluations.

Security reference: [OWASP prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) and [RAG security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html). These support separating untrusted content, retrieval permissions, and application-enforced controls; prompt instructions alone are not access controls.
