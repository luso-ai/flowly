# Flowly
**Typed flows, not routes.**

Flowly is an interaction-first, TypeScript-native flow engine for apps that care about **screen intent**, not just URLs. Model screens + interactions once, get exhaustive flows, a middleware pipeline, URL mapping when you want it, and devtools from day one.

## Why Flowly?
Flowly flips the router model:

- **Screens** declare parameters + interactions.
- **Flows** wire interactions to effects (navigation, commands).
- **Engine** runs the flow and middleware pipeline.
- **Devtools** ship with state, diagram, and time travel.

## Install
```bash
pnpm add @luso-ai/flowly
```

## Quickstart
```ts
import { screen, i, defineFlow, nav, back, cmd, createEngine } from "@luso-ai/flowly";

const Home = screen("Home")
  .params<{ ref?: string }>()
  .interactions({
    OPEN_PRODUCT: i<{ id: string }>(),
    OPEN_CART: i<void>()
  });

const Product = screen("Product")
  .params<{ id: string }>()
  .interactions({
    ADD_TO_CART: i<{ qty: number }>(),
    BACK: i<void>()
  });

const Cart = screen("Cart")
  .params<void>()
  .interactions({
    CHECKOUT: i<void>(),
    BACK: i<void>()
  });

const shopFlow = defineFlow({
  id: "shop",
  screens: [Home, Product, Cart],
  start: { screen: "Home", params: { ref: "welcome" } },
  on: {
    Home: {
      OPEN_PRODUCT: ({ payload }) => nav("Product", { id: payload.id }),
      OPEN_CART: () => nav("Cart")
    },
    Product: {
      ADD_TO_CART: ({ payload, api }) => {
        api.commands.cart.add({ productId: api.screen.params.id, qty: payload.qty });
        return [cmd("cart.added"), nav("Cart")];
      },
      BACK: () => back()
    },
    Cart: {
      CHECKOUT: () => cmd("checkout.start"),
      BACK: () => back()
    }
  }
});

const engine = createEngine({
  flow: shopFlow,
  commands: { cart: { add: () => {} } },
  tracing: { enabled: true }
});

engine.start();
engine.dispatch("OPEN_CART", undefined);
```

## Devtools
```tsx
import { FlowlyDevtools } from "@luso-ai/flowly/devtools";

<FlowlyDevtools engine={engine} defaultOpen position="bottom-right" />
```

The devtools ship with tabs for State, Events, Diagram, Dispatch, Timeline, and Export. It also supports time travel and replay modes.

## URL Mapping
```ts
import { defineUrlMap, createBrowserUrlAdapter } from "@luso-ai/flowly/url";

const urlMap = defineUrlMap(shopFlow, {
  Home: {
    path: "/",
    toUrl: (params) => ({ pathname: "/", query: params.ref ? { ref: params.ref } : {} }),
    fromUrl: (url) => ({ ref: url.query.ref })
  },
  Product: {
    path: "/product/:id",
    toUrl: (params) => ({ pathname: `/product/${params.id}`, query: {} }),
    fromUrl: (url) => ({ id: url.params.id })
  },
  Cart: {
    path: "/cart",
    toUrl: () => ({ pathname: "/cart", query: {} }),
    fromUrl: () => undefined
  }
});

const adapter = createBrowserUrlAdapter({ engine, urlMap, mode: "history" });
adapter.start();
```

## Diagram
```ts
import { flowToMermaid } from "@luso-ai/flowly";

const mmd = flowToMermaid(shopFlow, {
  direction: "LR",
  highlight: { current: "Product" }
});
```

## Testing
```ts
import { createTestHarness } from "@luso-ai/flowly/test";

const t = createTestHarness(shopFlow, { tracing: true });

t.start({ screen: "Home" });
await t.emit({ screen: "Home", interaction: "OPEN_PRODUCT", payload: { id: "p1" } });
await t.rewind(0);
await t.step();
```

## Docs
- [Concepts](docs/concepts.md)
- [Devtools](docs/devtools.md)
- [URL Mapping](docs/url-mapping.md)
- [Testing](docs/testing.md)

## Playground
Run the playground:
```bash
pnpm install
pnpm dev
```

## License
MIT © luso-ai
