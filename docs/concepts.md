# Concepts

Flowly is an **interaction-first** engine. Instead of tying logic to URL routes, you define screens and interactions, then wire them into a flow.

## Screens
A screen declares the parameters it needs and the interactions it can emit.

```ts
import { screen, i } from "@luso-ai/flowly";

export const Home = screen("Home")
  .params<{ ref?: string }>()
  .interactions({
    OPEN_PRODUCT: i<{ id: string }>(),
    OPEN_CART: i<void>()
  });
```

## Flows
A flow lists screens and provides handlers for every interaction in every screen. Flowly enforces exhaustiveness at compile time.

```ts
import { defineFlow, nav, back } from "@luso-ai/flowly";

const flow = defineFlow({
  id: "shop",
  screens: [Home, Product],
  start: { screen: "Home" },
  on: {
    Home: {
      OPEN_PRODUCT: ({ payload }) => nav("Product", { id: payload.id })
    },
    Product: {
      BACK: () => back()
    }
  }
});
```

## Engine
The engine runs your flow:

- builds events
- runs middleware
- resolves handlers
- applies effects

```ts
const engine = createEngine({ flow, tracing: { enabled: true } });
engine.start();
engine.dispatch("OPEN_PRODUCT", { id: "p1" });
```

## Effects
Handlers return serializable effects:

- `nav(screen, params)`
- `replace(screen, params)`
- `back()`
- `cmd(command, ...args)`
- `none()`

## Commands
Commands are injected APIs for side effects and are easy to mock for tests.
