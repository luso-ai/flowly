# Devtools

Flowly devtools are bundled in `@luso-ai/flowly/devtools` and provide live introspection of flows.

## Usage
```tsx
import { FlowlyDevtools } from "@luso-ai/flowly/devtools";

<FlowlyDevtools engine={engine} defaultOpen position="bottom-right" />
```

## Tabs
- **State**: flow ID, screen, params, history, context.
- **Events**: event list with payload + effect details.
- **Diagram**: Mermaid flowchart with current/highlighted node.
- **Dispatch**: trigger interactions with JSON payload input.
- **Timeline**: middleware timings per event.
- **Export**: copy trace + Mermaid.

## Time Travel
Use reset/step/rewind to replay events. Toggle replay mode:

- **dry**: do not execute commands.
- **live**: run commands during replay.

## Tracing
If tracing is disabled, the devtools can enable it on demand via `engine.enableTracing()`.
