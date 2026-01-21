import type { AnyScreen, InteractionMarker, ScreenDefinition } from "./types";

const screenRegistry = new Map<string, AnyScreen>();

export const getScreenRegistry = () => screenRegistry;

export const i = <Payload>() => null as unknown as InteractionMarker<Payload>;

const registerScreen = (definition: AnyScreen) => {
  screenRegistry.set(definition.id, definition);
};

const finalizeScreen = <Id extends string, Params, Interactions extends Record<string, InteractionMarker<any>>>(
  id: Id,
  params: Params,
  interactions: Interactions
) => {
  const definition: ScreenDefinition<Id, Params, Interactions> = {
    id,
    params,
    interactions
  };
  registerScreen(definition as AnyScreen);
  return {
    ...definition,
    component<Component>(component: Component) {
      const finalDefinition: ScreenDefinition<Id, Params, Interactions> = {
        ...definition,
        component
      };
      registerScreen(finalDefinition as AnyScreen);
      return finalDefinition;
    }
  };
};

export const screen = <Id extends string>(id: Id) => {
  const withoutParams = {
    params<Params>() {
      return {
        interactions<Interactions extends Record<string, InteractionMarker<any>>>(interactions: Interactions) {
          return finalizeScreen(id, null as unknown as Params, interactions);
        }
      };
    },
    interactions<Interactions extends Record<string, InteractionMarker<any>>>(interactions: Interactions) {
      return finalizeScreen(id, null as unknown as undefined, interactions);
    }
  };

  return withoutParams;
};
