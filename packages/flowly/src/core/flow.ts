import type {
  AnyScreen,
  EffectResult,
  InteractionOf,
  ParamsOf,
  PayloadOf,
  ScreenId
} from "./types";

export type ScreenMap<Screens extends AnyScreen[]> = {
  [Key in ScreenId<Screens>]: Extract<Screens[number], { id: Key }>;
};

export type HandlerContext<
  Id extends string,
  Interaction extends string,
  Screens extends AnyScreen[],
  Commands
> = {
  payload: PayloadOf<Id, Interaction, Screens>;
  screen: {
    id: Id;
    params: ParamsOf<Id, Screens>;
  };
  api: {
    commands: Commands;
    screen: {
      id: Id;
      params: ParamsOf<Id, Screens>;
    };
  };
};

export type FlowHandlers<Screens extends AnyScreen[], Commands> = {
  [Id in ScreenId<Screens>]: {
    [Interaction in InteractionOf<Id, Screens>]: (
      ctx: HandlerContext<Id, Extract<Interaction, string>, Screens, Commands>
    ) => EffectResult<ScreenId<Screens>>;
  };
};

export type FlowDefinition<Screens extends AnyScreen[], Commands> = {
  id: string;
  screens: Screens;
  start: {
    screen: ScreenId<Screens>;
    params?: ParamsOf<ScreenId<Screens>, Screens>;
  };
  on: FlowHandlers<Screens, Commands>;
};

export const defineFlow = <Screens extends AnyScreen[], Commands = Record<string, unknown>>(
  flow: FlowDefinition<Screens, Commands>
) => flow;
