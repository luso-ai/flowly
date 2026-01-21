# URL Mapping

Flowly core is DOM-agnostic, but the `@luso-ai/flowly/url` subpath provides browser adapters for optional URL syncing.

## Define a map
```ts
import { defineUrlMap } from "@luso-ai/flowly/url";

const urlMap = defineUrlMap(flow, {
  Home: {
    path: "/",
    toUrl: (params) => ({ pathname: "/", query: params.ref ? { ref: params.ref } : {} }),
    fromUrl: (url) => ({ ref: url.query.ref })
  }
});
```

## Browser adapter
```ts
import { createBrowserUrlAdapter } from "@luso-ai/flowly/url";

const adapter = createBrowserUrlAdapter({
  engine,
  urlMap,
  mode: "history",
  onUnknownUrl: "start"
});

adapter.start();
```

## Behavior
- Reads the initial URL and starts the engine on the matching screen.
- Updates the URL when navigation effects are emitted.
- Listens to `popstate`/`hashchange` for back/forward support.
