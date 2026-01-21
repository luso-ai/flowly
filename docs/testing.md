# Testing

Flowly includes a dedicated test harness in `@luso-ai/flowly/test`.

```ts
import { createTestHarness } from "@luso-ai/flowly/test";

const t = createTestHarness(flow, { tracing: true });

t.start({ screen: "Home" });
await t.emit({ screen: "Home", interaction: "OPEN_PRODUCT", payload: { id: "p1" } });
await t.rewind(0);
await t.step();
```

## Replay modes
- `dry`: do not execute commands (default).
- `live`: execute commands during replay.

## Useful outputs
- `t.getState()` for current engine state.
- `t.getTrace()` for recorded events and effects.
- `t.commands` for mocks passed into the harness.
