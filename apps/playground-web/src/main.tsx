import React from "react";
import ReactDOM from "react-dom/client";
import { createEngine, createMiddleware } from "@luso-ai/flowly";
import { FlowlyDevtools } from "@luso-ai/flowly/devtools";
import { createBrowserUrlAdapter, defineUrlMap } from "@luso-ai/flowly/url";
import { App } from "./App";
import { shopFlow } from "./flow";

const analyticsMiddleware = createMiddleware(async (ctx, next) => {
  ctx.api.commands.analytics?.track("interaction", ctx.event);
  const res = await next();
  ctx.api.commands.analytics?.track("effect", res.effect);
  return res;
});

const engine = createEngine({
  flow: shopFlow,
  middlewares: [analyticsMiddleware],
  commands: {
    cart: {
      add: (payload: { productId: string; qty: number }) => {
        console.info("cart.add", payload);
      }
    },
    analytics: {
      track: (name: string, payload: unknown) => console.info("analytics", name, payload)
    }
  },
  tracing: { enabled: true, maxEvents: 500 }
});

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

const adapter = createBrowserUrlAdapter({
  engine,
  urlMap,
  mode: "history",
  onUnknownUrl: "start"
});

adapter.start();
engine.start();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App engine={engine} />
    <FlowlyDevtools engine={engine} defaultOpen position="bottom-right" />
  </React.StrictMode>
);
