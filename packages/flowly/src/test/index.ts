import { createEngine } from "../core/engine";
import type { FlowDefinition } from "../core/flow";
import type { AnyScreen, ReplayMode, TraceEntry } from "../core/types";

export type TestHarnessOptions<Commands> = {
  commands?: Commands;
  tracing?: boolean;
  replayMode?: ReplayMode;
};

export const createTestHarness = <
  Screens extends AnyScreen[],
  Commands extends Record<string, any>,
  Flow extends FlowDefinition<Screens, Commands>
>(flow: Flow, options: TestHarnessOptions<Commands> = {}) => {
  const engine = createEngine({
    flow,
    commands: options.commands ?? ({} as Commands),
    tracing: { enabled: options.tracing ?? true, maxEvents: 1000 }
  });

  let startOverride: { screen: string; params?: Record<string, unknown> } | undefined;
  let replayMode: ReplayMode = options.replayMode ?? "dry";
  let cursor = -1;
  const traceEntries: TraceEntry[] = [];

  engine.onTrace((entry) => {
    traceEntries.push(entry);
  });

  const start = (override?: { screen: string; params?: Record<string, unknown> }) => {
    startOverride = override;
    engine.start(override);
  };

  const emit = async (input: { screen: string; interaction: string; payload: unknown }) => {
    await engine.emit(input);
    cursor = traceEntries.length - 1;
  };

  const replayTo = async (index: number) => {
    engine.start(startOverride);
    for (let i = 0; i <= index; i += 1) {
      const entry = traceEntries[i];
      if (!entry) {
        break;
      }
      await engine.emit(
        {
          screen: entry.event.screen,
          interaction: entry.event.interaction,
          payload: entry.event.payload
        },
        { replayMode, record: false }
      );
    }
  };

  const rewind = async (index: number) => {
    cursor = Math.max(-1, Math.min(index, traceEntries.length - 1));
    await replayTo(cursor);
  };

  const step = async () => {
    const next = cursor + 1;
    if (next < traceEntries.length) {
      cursor = next;
      await replayTo(cursor);
    }
  };

  const reset = () => {
    cursor = -1;
    engine.start(startOverride);
  };

  const setReplayMode = (mode: ReplayMode) => {
    replayMode = mode;
  };

  return {
    engine,
    start,
    emit,
    rewind,
    step,
    reset,
    setReplayMode,
    getState: engine.getState,
    getTrace: () => traceEntries.slice(),
    get replayMode() {
      return replayMode;
    },
    get commands() {
      return options.commands;
    }
  };
};
