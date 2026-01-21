import { describe, expect, it, vi } from "vitest";
import { createEngine, defineFlow, i, nav, screen, cmd } from "../index";

const Home = screen("Home").interactions({
  OPEN: i<{ id: string }>()
});

const Product = screen("Product")
  .params<{ id: string }>()
  .interactions({
    ADD: i<void>()
  });

const flow = defineFlow({
  id: "test",
  screens: [Home, Product],
  start: { screen: "Home" },
  on: {
    Home: {
      OPEN: ({ payload }) => nav("Product", { id: payload.id })
    },
    Product: {
      ADD: () => cmd("cart.add")
    }
  }
});

describe("engine", () => {
  it("navigates and runs commands", async () => {
    const add = vi.fn();
    const engine = createEngine({
      flow,
      commands: {
        cart: {
          add
        }
      },
      tracing: { enabled: true }
    });

    engine.start();
    await engine.dispatch("OPEN", { id: "p1" });

    expect(engine.getState().screen.id).toBe("Product");

    await engine.dispatch("ADD", undefined);
    expect(add).toHaveBeenCalledOnce();
    expect(engine.getTrace().length).toBe(2);
  });
});
