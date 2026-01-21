export type InteractionMarker<Payload> = {
  __payload?: Payload;
};

export type ScreenDefinition<Id extends string, Params, Interactions extends Record<string, InteractionMarker<any>>> = {
  id: Id;
  params?: Params;
  interactions: Interactions;
  component?: unknown;
};

export type AnyScreen = ScreenDefinition<string, any, Record<string, InteractionMarker<any>>>;

export type ScreenId<Screens extends AnyScreen[] = AnyScreen[]> = Screens[number]["id"];

export type ParamsOf<Id extends string, Screens extends AnyScreen[] = AnyScreen[]> =
  Extract<Screens[number], { id: Id }>["params"];

export type InteractionOf<Id extends string, Screens extends AnyScreen[] = AnyScreen[]> =
  keyof Extract<Screens[number], { id: Id }>["interactions"];

export type PayloadOf<
  Id extends string,
  Interaction extends string,
  Screens extends AnyScreen[] = AnyScreen[]
> = Extract<Screens[number], { id: Id }>["interactions"][Interaction] extends InteractionMarker<infer Payload>
  ? Payload
  : never;

export type FlowEffect<ScreenId extends string = string> =
  | { type: "nav"; screen: ScreenId; params?: Record<string, unknown> }
  | { type: "replace"; screen: ScreenId; params?: Record<string, unknown> }
  | { type: "back" }
  | { type: "cmd"; command: string; args?: unknown[] }
  | { type: "none" };

export type EffectResult<ScreenId extends string = string> = FlowEffect<ScreenId> | FlowEffect<ScreenId>[];

export type EventPayload = {
  seq: number;
  ts: number;
  flowId: string;
  screen: string;
  interaction: string;
  payload: unknown;
};

export type EngineState = {
  flowId: string;
  screen: {
    id: string;
    params?: Record<string, unknown>;
  };
  history: Array<{ id: string; params?: Record<string, unknown> }>;
  context?: unknown;
};

export type TraceMiddlewareTiming = {
  name: string;
  durationMs: number;
};

export type TraceEntry = {
  event: EventPayload;
  effect: EffectResult;
  stateBefore: EngineState;
  stateAfter: EngineState;
  middlewareTimings: TraceMiddlewareTiming[];
};

export type ReplayMode = "dry" | "live";

export type EngineTraceListener = (trace: TraceEntry) => void;

export type EngineStateListener = (state: EngineState) => void;
