# Flowly
**Typed flows, not routes.**

Flowly is an **interaction-first** flow engine for building navigations as **typed screens + typed interactions**, with **exhaustive flows**, **middleware pipeline**, **URL mapping (optional)**, and **first-class devtools** (diagram, event stream, timeline, dispatch panel, time travel).

## Why Flowly?
Most routers are URL-first. Flowly is **interaction-first**:

- Define **Screens** (params + interactions)
- Compose **Flows** (which screens exist + what each interaction does)
- Run with an **Engine** (dispatch interactions → effects)
- Add **Middleware** (analytics, guards, audits, A/B tests)
- Debug with **Devtools** (live diagram + trace + time travel)

## Install
```bash
pnpm add @luso-ai/flowly
# optional devtools
pnpm add -D @luso-ai/flowly
