import type {
  AnyScreen,
  EffectResult,
  EngineState,
  EngineStateListener,
  EngineTraceListener,
  EventPayload,
  InteractionOf,
  PayloadOf,
  ReplayMode,
  ScreenId,
  TraceEntry
} from "./types";
import type { FlowDefinition, FlowHandlers } from "./flow";
import type { FlowlyMiddleware } from "./middleware";

const cloneState = (state: EngineState): EngineState => ({
  flowId: state.flowId,
  screen: { ...state.screen },
  history: state.history.map((entry) => ({ ...entry })),
  context: state.context
});

const resolveCommand = (commands: Record<string, any>, command: string) => {
  return command.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), commands);
};

const getNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export type EngineOptions<Flow extends FlowDefinition<AnyScreen[], Commands>, Commands> = {
  flow: Flow;
  middlewares?: Array<FlowlyMiddleware<Commands>>;
  commands?: Commands;
  tracing?: {
    enabled?: boolean;
    maxEvents?: number;
  };
};

export type EmitOptions = {
  replayMode?: ReplayMode;
  record?: boolean;
};

export const createEngine = <
  Screens extends AnyScreen[],
  Commands extends Record<string, any>,
  Flow extends FlowDefinition<Screens, Commands>
>(options: EngineOptions<Flow, Commands>) => {
  type FlowScreenId = ScreenId<Screens>;
  type FlowInteraction<Id extends FlowScreenId> = InteractionOf<Id, Screens>;
  type FlowPayload<Id extends FlowScreenId, Interaction extends FlowInteraction<Id>> = PayloadOf<
    Id,
    Extract<Interaction, string>,
    Screens
  >;
  type EmitInput<Id extends FlowScreenId, Interaction extends FlowInteraction<Id>> = {
    screen: Id;
    interaction: Interaction;
    payload: FlowPayload<Id, Interaction>;
  };
  const { flow } = options;
  const middlewares = options.middlewares ?? [];
  const commands = options.commands ?? ({} as Commands);
  const traceEnabled = { current: options.tracing?.enabled ?? false };
  const maxEvents = options.tracing?.maxEvents ?? 500;

  let seq = 0;
  let state: EngineState = {
    flowId: flow.id,
    screen: {
      id: flow.start.screen,
      params: flow.start.params as Record<string, unknown> | undefined
    },
    history: []
  };

  const trace: TraceEntry[] = [];
  const traceListeners = new Set<EngineTraceListener>();
  const stateListeners = new Set<EngineStateListener>();

  const notifyState = () => {
    stateListeners.forEach((listener) => listener(cloneState(state)));
  };

  const pushTrace = (entry: TraceEntry) => {
    if (!traceEnabled.current) {
      return;
    }
    trace.push(entry);
    if (trace.length > maxEvents) {
      trace.shift();
    }
    traceListeners.forEach((listener) => listener(entry));
  };

  const applyEffect = (effect: EffectResult, replayMode: ReplayMode) => {
    const effects = Array.isArray(effect) ? effect : [effect];
    effects.forEach((item) => {
      switch (item.type) {
        case "nav":
          state.history.push({ id: state.screen.id, params: state.screen.params });
          state.screen = { id: item.screen, params: item.params };
          break;
        case "replace":
          state.screen = { id: item.screen, params: item.params };
          break;
        case "back": {
          const previous = state.history.pop();
          if (previous) {
            state.screen = { id: previous.id, params: previous.params };
          }
          break;
        }
        case "cmd": {
          if (replayMode === "live") {
            const handler = resolveCommand(commands as Record<string, any>, item.command);
            if (typeof handler === "function") {
              handler(...(item.args ?? []));
            }
          }
          break;
        }
        case "none":
          break;
        default:
          break;
      }
    });
  };

  const resolveHandler = (
    handlers: FlowHandlers<AnyScreen[], Commands>,
    screenId: string,
    interaction: string
  ) => {
    const screenHandlers = handlers[screenId as keyof typeof handlers];
    if (!screenHandlers) {
      return undefined;
    }
    return (screenHandlers as Record<string, any>)[interaction];
  };

  const runEvent = async (event: EventPayload, options?: EmitOptions) => {
    const stateBefore = cloneState(state);
    const middlewareTimings: TraceEntry["middlewareTimings"] = [];

    const ctx = {
      event,
      engineState: stateBefore,
      api: {
        commands,
        screen: stateBefore.screen
      }
    };

    const handler = resolveHandler(flow.on as FlowHandlers<AnyScreen[], Commands>, event.screen, event.interaction);

    const invokeHandler = async (): Promise<{ effect: EffectResult }> => {
      if (!handler) {
        return { effect: { type: "none" } };
      }
      const effect = await handler({
        payload: event.payload,
        screen: {
          id: event.screen,
          params: state.screen.params
        },
        api: {
          commands,
          screen: {
            id: event.screen,
            params: state.screen.params
          }
        }
      });
      return { effect };
    };

    let index = -1;
    const dispatchMiddleware = async (): Promise<{ effect: EffectResult }> => {
      index += 1;
      const middleware = middlewares[index];
      if (!middleware) {
        return invokeHandler();
      }
      const start = getNow();
      const result = await middleware(ctx, dispatchMiddleware);
      const end = getNow();
      middlewareTimings.push({
        name: middleware.name || `mw-${index + 1}`,
        durationMs: Number((end - start).toFixed(2))
      });
      return result;
    };

    const result = await dispatchMiddleware();
    const replayMode = options?.replayMode ?? "live";
    applyEffect(result.effect, replayMode);
    const stateAfter = cloneState(state);

    if (options?.record !== false) {
      pushTrace({
        event,
        effect: result.effect,
        stateBefore,
        stateAfter,
        middlewareTimings
      });
    }

    notifyState();
    return result.effect;
  };

  const emit = async <Id extends FlowScreenId, Interaction extends FlowInteraction<Id>>(
    input: EmitInput<Id, Interaction>,
    options?: EmitOptions
  ) => {
    const event: EventPayload = {
      seq: seq++,
      ts: Date.now(),
      flowId: flow.id,
      screen: input.screen,
      interaction: input.interaction,
      payload: input.payload
    };
    return runEvent(event, options);
  };

  const dispatch = async <Interaction extends FlowInteraction<FlowScreenId>>(
    interaction: Interaction,
    payload: FlowPayload<FlowScreenId, Interaction>,
    options?: EmitOptions
  ) => {
    return emit(
      {
        screen: state.screen.id,
        interaction,
        payload
      },
      options
    );
  };

  const start = (override?: { screen: string; params?: Record<string, unknown> }) => {
    state = {
      flowId: flow.id,
      screen: {
        id: override?.screen ?? flow.start.screen,
        params: override?.params ?? (flow.start.params as Record<string, unknown> | undefined)
      },
      history: []
    };
    notifyState();
  };

  const reset = () => {
    start();
  };

  const getState = () => cloneState(state);

  const subscribe = (listener: EngineStateListener) => {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
  };

  const onTrace = (listener: EngineTraceListener) => {
    traceListeners.add(listener);
    return () => traceListeners.delete(listener);
  };

  const getTrace = () => trace.slice();

  const clearTrace = () => {
    trace.length = 0;
  };

  const enableTracing = () => {
    traceEnabled.current = true;
  };

  const disableTracing = () => {
    traceEnabled.current = false;
  };

  const isTracingEnabled = () => traceEnabled.current;

  return {
    flow,
    start,
    reset,
    dispatch,
    emit,
    getState,
    subscribe,
    onTrace,
    getTrace,
    clearTrace,
    enableTracing,
    disableTracing,
    isTracingEnabled
  };
};
