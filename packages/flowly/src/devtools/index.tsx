import React, { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { flowToMermaid } from "../core/mermaid";
import type { TraceEntry } from "../core/types";

mermaid.initialize({ startOnLoad: false });

type EngineLike = {
  flow: {
    id: string;
    screens: Array<{ id: string; interactions: Record<string, any> }>;
  };
  getState: () => {
    flowId: string;
    screen: { id: string; params?: Record<string, unknown> };
    history: Array<{ id: string; params?: Record<string, unknown> }>;
    context?: unknown;
  };
  dispatch: (interaction: string, payload: unknown, options?: { record?: boolean; replayMode?: "dry" | "live" }) =>
    | Promise<unknown>
    | unknown;
  emit: (
    input: { screen: string; interaction: string; payload: unknown },
    options?: { record?: boolean; replayMode?: "dry" | "live" }
  ) => Promise<unknown> | unknown;
  subscribe: (listener: (state: any) => void) => () => void;
  onTrace: (listener: (trace: TraceEntry) => void) => () => void;
  getTrace: () => TraceEntry[];
  reset: () => void;
  enableTracing: () => void;
  isTracingEnabled: () => boolean;
};

export type FlowlyDevtoolsProps = {
  engine: EngineLike;
  defaultOpen?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
};

const tabList = ["State", "Events", "Diagram", "Dispatch", "Timeline", "Export"] as const;

type Tab = (typeof tabList)[number];

export const FlowlyDevtools: React.FC<FlowlyDevtoolsProps> = ({
  engine,
  defaultOpen = false,
  position = "bottom-right"
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>("State");
  const [state, setState] = useState(engine.getState());
  const [trace, setTrace] = useState<TraceEntry[]>(engine.getTrace());
  const [search, setSearch] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState<string | null>(null);
  const [payloadText, setPayloadText] = useState("{}");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(trace.length - 1);
  const [replayMode, setReplayMode] = useState<"dry" | "live">("dry");
  const [persistTrace, setPersistTrace] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") {
      return false;
    }
    return localStorage.getItem("flowly.trace.persist") === "true";
  });
  const diagramRef = useRef<HTMLDivElement>(null);
  const [tracingEnabled, setTracingEnabled] = useState(engine.isTracingEnabled());

  useEffect(() => {
    const unsubscribeState = engine.subscribe((next) => setState(next));
    const unsubscribeTrace = engine.onTrace((entry) => {
      setTrace((prev) => {
        const updated = [...prev, entry];
        setCursor(updated.length - 1);
        return updated;
      });
    });
    return () => {
      unsubscribeState();
      unsubscribeTrace();
    };
  }, [engine]);

  useEffect(() => {
    setTracingEnabled(engine.isTracingEnabled());
  }, [engine, trace.length]);

  useEffect(() => {
    if (!persistTrace || typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem("flowly.trace.persist", "true");
    localStorage.setItem("flowly.trace", JSON.stringify(trace));
  }, [trace, persistTrace]);

  useEffect(() => {
    if (!persistTrace || typeof localStorage === "undefined") {
      return;
    }
    const stored = localStorage.getItem("flowly.trace");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TraceEntry[];
        setTrace(parsed);
        setCursor(parsed.length - 1);
      } catch (error) {
        localStorage.removeItem("flowly.trace");
      }
    }
  }, [persistTrace]);

  useEffect(() => {
    if (tab !== "Diagram") {
      return;
    }
    const last = trace[trace.length - 1];
    const mermaidText = flowToMermaid(engine.flow as any, {
      direction: "LR",
      highlight: {
        current: state.screen.id,
        last: last
          ? {
              from: last.stateBefore.screen.id,
              to: last.stateAfter.screen.id,
              interaction: last.event.interaction
            }
          : undefined
      }
    });
    if (!diagramRef.current) {
      return;
    }
    mermaid
      .render("flowly-diagram", mermaidText)
      .then((result) => {
        if (diagramRef.current) {
          diagramRef.current.innerHTML = result.svg;
        }
      })
      .catch(() => {
        if (diagramRef.current) {
          diagramRef.current.innerText = mermaidText;
        }
      });
  }, [engine.flow, state.screen.id, tab, trace]);

  const currentScreen = useMemo(() => {
    return engine.flow.screens.find((screen) => screen.id === state.screen.id);
  }, [engine.flow.screens, state.screen.id]);

  const interactions = useMemo(() => {
    if (!currentScreen) {
      return [];
    }
    return Object.keys(currentScreen.interactions);
  }, [currentScreen]);

  const handleDispatch = () => {
    try {
      const parsed = payloadText ? JSON.parse(payloadText) : undefined;
      setPayloadError(null);
      if (selectedInteraction) {
        engine.dispatch(selectedInteraction, parsed);
      }
    } catch (error) {
      setPayloadError("Invalid JSON payload.");
    }
  };

  const replayTo = async (index: number) => {
    engine.reset();
    for (let i = 0; i <= index; i += 1) {
      const entry = trace[i];
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

  const handleRewind = async (next: number) => {
    setCursor(next);
    await replayTo(next);
  };

  const handleStep = async () => {
    const next = Math.min(trace.length - 1, cursor + 1);
    if (next !== cursor) {
      await handleRewind(next);
    }
  };

  const handleReset = () => {
    setCursor(-1);
    engine.reset();
  };

  const filteredTrace = trace.filter((entry) => {
    if (!search) {
      return true;
    }
    const target = `${entry.event.screen} ${entry.event.interaction} ${JSON.stringify(entry.event.payload)}`;
    return target.toLowerCase().includes(search.toLowerCase());
  });

  const handleCopy = async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const rootStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width: open ? 380 : 44,
    height: open ? 460 : 44,
    background: "#111827",
    color: "#f9fafb",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "Inter, system-ui, sans-serif",
    ...{
      "bottom-right": { bottom: 16, right: 16 },
      "bottom-left": { bottom: 16, left: 16 },
      "top-right": { top: 16, right: 16 },
      "top-left": { top: 16, left: 16 }
    }[position]
  };

  return (
    <div style={rootStyle}>
      <div
        style={{
          padding: "10px 12px",
          background: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <strong style={{ fontSize: 12 }}>Flowly Devtools</strong>
        <button
          style={{
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            cursor: "pointer"
          }}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Close" : "Open"}
        </button>
      </div>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {!tracingEnabled && (
            <div
              style={{
                background: "#f97316",
                color: "#0f172a",
                padding: "6px 10px",
                fontSize: 11
              }}
            >
              Tracing is disabled. Enable it to see live events.
            </div>
          )}
          <div style={{ display: "flex", gap: 6, padding: "8px", flexWrap: "wrap" }}>
            {tabList.map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: tab === tabName ? "#6366f1" : "transparent",
                  color: "#f9fafb",
                  cursor: "pointer"
                }}
              >
                {tabName}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
            {tab === "State" && (
              <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{JSON.stringify(state, null, 2)}</pre>
            )}
            {tab === "Events" && (
              <div>
                <input
                  placeholder="Search events"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid #374151",
                    marginBottom: 8,
                    background: "#0f172a",
                    color: "#f9fafb"
                  }}
                />
                {filteredTrace.map((entry) => (
                  <div
                    key={entry.event.seq}
                    style={{
                      borderBottom: "1px solid #1f2937",
                      paddingBottom: 6,
                      marginBottom: 6
                    }}
                  >
                    <div style={{ fontSize: 12 }}>
                      <strong>{entry.event.screen}</strong> · {entry.event.interaction}
                    </div>
                    <pre style={{ fontSize: 11 }}>{JSON.stringify(entry.event.payload, null, 2)}</pre>
                    <pre style={{ fontSize: 10, color: "#9ca3af" }}>
                      {JSON.stringify(entry.effect, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
            {tab === "Diagram" && (
              <div>
                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      handleCopy(
                        flowToMermaid(engine.flow as any, {
                          direction: "LR",
                          highlight: { current: state.screen.id }
                        })
                      )
                    }
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "transparent",
                      color: "#f9fafb",
                      cursor: "pointer"
                    }}
                  >
                    Copy Mermaid
                  </button>
                </div>
                <div ref={diagramRef} style={{ background: "#0f172a", padding: 8, borderRadius: 8 }} />
              </div>
            )}
            {tab === "Dispatch" && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Interaction</label>
                  <select
                    value={selectedInteraction ?? ""}
                    onChange={(event) => setSelectedInteraction(event.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      marginTop: 4,
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "#0f172a",
                      color: "#f9fafb",
                      fontSize: 11
                    }}
                  >
                    <option value="" disabled>
                      Select interaction
                    </option>
                    {interactions.map((interaction) => (
                      <option key={interaction} value={interaction}>
                        {interaction}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Payload JSON</label>
                  <textarea
                    rows={6}
                    value={payloadText}
                    onChange={(event) => setPayloadText(event.target.value)}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "#0f172a",
                      color: "#f9fafb",
                      fontSize: 11
                    }}
                  />
                  {payloadError && <div style={{ color: "#fca5a5", fontSize: 11 }}>{payloadError}</div>}
                </div>
                <button
                  onClick={handleDispatch}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Dispatch
                </button>
              </div>
            )}
            {tab === "Timeline" && (
              <div>
                {trace.map((entry) => (
                  <div key={entry.event.seq} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      {entry.event.screen} · {entry.event.interaction}
                    </div>
                    {entry.middlewareTimings.map((mw) => (
                      <div
                        key={`${entry.event.seq}-${mw.name}`}
                        style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
                      >
                        <span>{mw.name}</span>
                        <span>{mw.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {tab === "Export" && (
              <div>
                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleCopy(JSON.stringify(trace, null, 2))}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "transparent",
                      color: "#f9fafb",
                      cursor: "pointer"
                    }}
                  >
                    Copy Trace JSON
                  </button>
                  <button
                    onClick={() => handleCopy(flowToMermaid(engine.flow as any))}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "transparent",
                      color: "#f9fafb",
                      cursor: "pointer"
                    }}
                  >
                    Copy Mermaid
                  </button>
                </div>
                <label style={{ fontSize: 11 }}>
                  <input
                    type="checkbox"
                    checked={persistTrace}
                    onChange={(event) => setPersistTrace(event.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Persist trace in localStorage
                </label>
              </div>
            )}
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid #1f2937" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handleReset}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer"
                }}
              >
                Reset
              </button>
              <button
                onClick={handleStep}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer"
                }}
              >
                Step
              </button>
              <input
                type="range"
                min={-1}
                max={Math.max(trace.length - 1, 0)}
                value={cursor}
                onChange={(event) => handleRewind(Number(event.target.value))}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: 11 }}>Replay:</label>
              <select
                value={replayMode}
                onChange={(event) => setReplayMode(event.target.value as "dry" | "live")}
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#0f172a",
                  color: "#f9fafb"
                }}
              >
                <option value="dry">dry</option>
                <option value="live">live</option>
              </select>
              <button
                onClick={() => {
                  engine.enableTracing();
                  setTracingEnabled(true);
                }}
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer"
                }}
              >
                {tracingEnabled ? "Tracing enabled" : "Enable tracing"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
