import React, { useEffect, useState } from "react";
import type { FlowlyDevtoolsProps } from "@luso-ai/flowly/devtools";

type EngineLike = FlowlyDevtoolsProps["engine"];

type AppProps = {
  engine: EngineLike;
};

export const App: React.FC<AppProps> = ({ engine }) => {
  const [state, setState] = useState(engine.getState());

  useEffect(() => engine.subscribe(setState), [engine]);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Flowly Playground</h1>
      <p style={{ marginTop: 0, color: "#6b7280" }}>Typed flows, not routes.</p>

      <div style={{ marginTop: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Current screen: {state.screen.id}</h2>
        <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(state.screen.params, null, 2)}
        </pre>

        {state.screen.id === "Home" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => engine.dispatch("OPEN_PRODUCT", { id: "p1" })}
              style={{ padding: "8px 12px" }}
            >
              Open Product P1
            </button>
            <button onClick={() => engine.dispatch("OPEN_CART", undefined)} style={{ padding: "8px 12px" }}>
              Open Cart
            </button>
          </div>
        )}

        {state.screen.id === "Product" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => engine.dispatch("ADD_TO_CART", { qty: 1 })}
              style={{ padding: "8px 12px" }}
            >
              Add Qty 1
            </button>
            <button onClick={() => engine.dispatch("BACK", undefined)} style={{ padding: "8px 12px" }}>
              Back
            </button>
          </div>
        )}

        {state.screen.id === "Cart" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => engine.dispatch("CHECKOUT", undefined)} style={{ padding: "8px 12px" }}>
              Checkout
            </button>
            <button onClick={() => engine.dispatch("BACK", undefined)} style={{ padding: "8px 12px" }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
