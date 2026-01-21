import type { FlowDefinition } from "../core/flow";
import type { AnyScreen } from "../core/types";

export type UrlState = {
  pathname: string;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
};

export type UrlEntry<Params> = {
  path: string;
  toUrl: (params: Params) => { pathname: string; query: Record<string, string | undefined> };
  fromUrl: (url: UrlState) => Params | undefined;
};

export type UrlMap<Flow extends FlowDefinition<AnyScreen[], any>> = {
  flow: Flow;
  map: {
    [Key in keyof Flow["on"] & string]: UrlEntry<any>;
  };
};

export const defineUrlMap = <Flow extends FlowDefinition<AnyScreen[], any>>(
  flow: Flow,
  map: UrlMap<Flow>["map"]
): UrlMap<Flow> => ({
  flow,
  map
});

const parseQuery = (search: string) => {
  const params = new URLSearchParams(search);
  const query: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
};

const parsePath = (pattern: string, pathname: string) => {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    const value = pathParts[index];
    if (part.startsWith(":")) {
      params[part.slice(1)] = value;
      continue;
    }
    if (part !== value) {
      return null;
    }
  }
  return params;
};

const createUrlState = (location: Location, mode: "history" | "hash"): UrlState => {
  if (mode === "hash") {
    const hash = location.hash.replace(/^#/, "");
    const [path, search = ""] = hash.split("?");
    return {
      pathname: path || "/",
      query: parseQuery(search ? `?${search}` : ""),
      params: {}
    };
  }
  return {
    pathname: location.pathname,
    query: parseQuery(location.search),
    params: {}
  };
};

export type BrowserUrlAdapterOptions<Flow extends FlowDefinition<AnyScreen[], any>> = {
  engine: {
    flow: Flow;
    start: (override?: { screen: string; params?: Record<string, unknown> }) => void;
    onTrace: (listener: (trace: any) => void) => () => void;
    getState: () => { screen: { id: string; params?: Record<string, unknown> } };
  };
  urlMap: UrlMap<Flow>;
  mode?: "history" | "hash";
  onUnknownUrl?: "start" | "ignore" | "notfound";
};

export const createBrowserUrlAdapter = <Flow extends FlowDefinition<AnyScreen[], any>>(
  options: BrowserUrlAdapterOptions<Flow>
) => {
  const mode = options.mode ?? "history";
  const onUnknownUrl = options.onUnknownUrl ?? "start";
  let isSyncing = false;

  const resolveUrlToScreen = () => {
    const urlState = createUrlState(window.location, mode);
    for (const [screenId, entry] of Object.entries(options.urlMap.map)) {
      const params = parsePath(entry.path, urlState.pathname);
      if (params) {
        const resolvedParams = entry.fromUrl({
          ...urlState,
          params
        });
        if (resolvedParams !== undefined) {
          return { screen: screenId, params: resolvedParams };
        }
      }
    }
    return undefined;
  };

  const updateUrlFromScreen = (screenId: string, params?: Record<string, unknown>, modeOverride?: "push" | "replace") => {
    const entry = options.urlMap.map[screenId as keyof Flow["on"] & string];
    if (!entry) {
      return;
    }
    const url = entry.toUrl(params ?? {});
    const query = new URLSearchParams(url.query).toString();
    const path = query ? `${url.pathname}?${query}` : url.pathname;
    if (mode === "hash") {
      const hashValue = `#${path}`;
      if (modeOverride === "replace") {
        history.replaceState({}, "", hashValue);
      } else {
        history.pushState({}, "", hashValue);
      }
      return;
    }
    if (modeOverride === "replace") {
      history.replaceState({}, "", path);
    } else {
      history.pushState({}, "", path);
    }
  };

  const start = () => {
    const match = resolveUrlToScreen();
    if (match) {
      options.engine.start({ screen: match.screen, params: match.params });
    } else if (onUnknownUrl === "start") {
      options.engine.start();
    }

    const onTrace = options.engine.onTrace((trace) => {
      if (isSyncing) {
        return;
      }
      const effect = trace.effect;
      const effects = Array.isArray(effect) ? effect : [effect];
      const navEffect = effects.find((item) => item.type === "nav" || item.type === "replace");
      const backEffect = effects.find((item) => item.type === "back");
      if (navEffect && (navEffect.type === "nav" || navEffect.type === "replace")) {
        updateUrlFromScreen(navEffect.screen, navEffect.params, navEffect.type === "replace" ? "replace" : "push");
      } else if (backEffect) {
        history.back();
      } else {
        const state = options.engine.getState();
        updateUrlFromScreen(state.screen.id, state.screen.params, "replace");
      }
    });

    const handlePop = () => {
      isSyncing = true;
      const next = resolveUrlToScreen();
      if (next) {
        options.engine.start({ screen: next.screen, params: next.params });
      } else if (onUnknownUrl === "start") {
        options.engine.start();
      }
      isSyncing = false;
    };

    window.addEventListener("popstate", handlePop);
    if (mode === "hash") {
      window.addEventListener("hashchange", handlePop);
    }

    return () => {
      onTrace();
      window.removeEventListener("popstate", handlePop);
      if (mode === "hash") {
        window.removeEventListener("hashchange", handlePop);
      }
    };
  };

  return { start };
};
