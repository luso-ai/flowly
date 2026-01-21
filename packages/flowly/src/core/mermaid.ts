import type { AnyScreen, EffectResult, FlowEffect } from "./types";
import type { FlowDefinition } from "./flow";

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, "_");

const toEffectArray = (effect: EffectResult) => (Array.isArray(effect) ? effect : [effect]);

const extractTargets = (effect: EffectResult) => {
  const targets: Array<{ type: FlowEffect["type"]; screen?: string }> = [];
  toEffectArray(effect).forEach((item) => {
    if (item.type === "nav" || item.type === "replace") {
      targets.push({ type: item.type, screen: item.screen });
    }
    if (item.type === "back") {
      targets.push({ type: "back" });
    }
  });
  return targets;
};

const createSafePayload = () =>
  new Proxy(
    {},
    {
      get: () => undefined
    }
  );

const createSafeApi = () =>
  new Proxy(
    {},
    {
      get: () => () => undefined
    }
  );

export type MermaidOptions = {
  direction?: "LR" | "TB";
  highlight?: {
    current?: string;
    last?: {
      from: string;
      to: string;
      interaction: string;
    };
  };
};

export const flowToMermaid = <Screens extends AnyScreen[], Commands>(
  flow: FlowDefinition<Screens, Commands>,
  options: MermaidOptions = {}
) => {
  const direction = options.direction ?? "LR";
  const nodeIds = new Map<string, string>();
  flow.screens.forEach((screen) => {
    nodeIds.set(screen.id, sanitizeId(screen.id));
  });

  const edges: Array<{ from: string; to: string; label: string }> = [];

  Object.entries(flow.on).forEach(([screenId, interactions]) => {
    Object.entries(interactions).forEach(([interaction, handler]) => {
      let effect: EffectResult | undefined;
      try {
        const result = (handler as any)({
          payload: createSafePayload(),
          screen: { id: screenId, params: {} },
          api: { commands: createSafeApi(), screen: { id: screenId, params: {} } }
        });
        if (result && typeof (result as Promise<EffectResult>).then === "function") {
          effect = { type: "none" };
        } else {
          effect = result as EffectResult;
        }
      } catch (error) {
        effect = { type: "none" };
      }

      if (!effect) {
        return;
      }

      const targets = extractTargets(effect);
      if (targets.length === 0) {
        return;
      }
      targets.forEach((target) => {
        if (target.type === "back") {
          edges.push({
            from: screenId,
            to: "Back",
            label: interaction
          });
          nodeIds.set("Back", sanitizeId("Back"));
          return;
        }
        if (target.screen) {
          edges.push({
            from: screenId,
            to: target.screen,
            label: interaction
          });
        }
      });
    });
  });

  const lines: string[] = [`flowchart ${direction}`];

  nodeIds.forEach((nodeId, screenId) => {
    lines.push(`  ${nodeId}["${screenId}"]`);
  });

  edges.forEach(({ from, to, label }) => {
    const fromId = nodeIds.get(from) ?? sanitizeId(from);
    const toId = nodeIds.get(to) ?? sanitizeId(to);
    lines.push(`  ${fromId} -->|${label}| ${toId}`);
  });

  if (options.highlight?.current) {
    const currentId = nodeIds.get(options.highlight.current);
    if (currentId) {
      lines.push(`  class ${currentId} current`);
      lines.push("  classDef current fill:#6366f1,color:#fff,stroke:#312e81,stroke-width:2px;");
    }
  }

  if (options.highlight?.last) {
    const matchIndex = edges.findIndex(
      (edge) =>
        edge.from === options.highlight?.last?.from &&
        edge.to === options.highlight?.last?.to &&
        edge.label === options.highlight?.last?.interaction
    );
    if (matchIndex >= 0) {
      lines.push(`  linkStyle ${matchIndex} stroke:#f97316,stroke-width:2px;`);
    }
  }

  return lines.join("\n");
};
