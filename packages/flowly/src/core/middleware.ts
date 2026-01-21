import type { EffectResult, EngineState, EventPayload } from "./types";

export type MiddlewareContext<Commands> = {
  event: EventPayload;
  engineState: EngineState;
  api: {
    commands: Commands;
    screen: EngineState["screen"];
  };
};

export type MiddlewareNext = () => Promise<{ effect: EffectResult }>;

export type FlowlyMiddleware<Commands> = (ctx: MiddlewareContext<Commands>, next: MiddlewareNext) => Promise<{
  effect: EffectResult;
}>;

export const createMiddleware = <Commands>(middleware: FlowlyMiddleware<Commands>) => middleware;
