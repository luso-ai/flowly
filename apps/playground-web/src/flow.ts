import { defineFlow, i, nav, back, cmd, screen } from "@luso-ai/flowly";

export const Home = screen("Home")
  .params<{ ref?: string }>()
  .interactions({
    OPEN_PRODUCT: i<{ id: string }>(),
    OPEN_CART: i<void>()
  });

export const Product = screen("Product")
  .params<{ id: string }>()
  .interactions({
    ADD_TO_CART: i<{ qty: number }>(),
    BACK: i<void>()
  });

export const Cart = screen("Cart")
  .params<void>()
  .interactions({
    CHECKOUT: i<void>(),
    BACK: i<void>()
  });

export const shopFlow = defineFlow({
  id: "shop",
  screens: [Home, Product, Cart],
  start: { screen: "Home", params: { ref: "welcome" } },
  on: {
    Home: {
      OPEN_PRODUCT: ({ payload }) => nav("Product", { id: payload.id }),
      OPEN_CART: () => nav("Cart")
    },
    Product: {
      ADD_TO_CART: ({ payload, api }) => {
        api.commands.cart.add({ productId: api.screen.params.id, qty: payload.qty });
        return [cmd("cart.added"), nav("Cart")];
      },
      BACK: () => back()
    },
    Cart: {
      CHECKOUT: () => cmd("checkout.start"),
      BACK: () => back()
    }
  }
});
