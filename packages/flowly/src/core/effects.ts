import type { FlowEffect } from "./types";

export const nav = <ScreenId extends string>(screen: ScreenId, params?: Record<string, unknown>): FlowEffect<ScreenId> => ({
  type: "nav",
  screen,
  params
});

export const replace = <ScreenId extends string>(
  screen: ScreenId,
  params?: Record<string, unknown>
): FlowEffect<ScreenId> => ({
  type: "replace",
  screen,
  params
});

export const back = (): FlowEffect => ({ type: "back" });

export const cmd = (command: string, ...args: unknown[]): FlowEffect => ({
  type: "cmd",
  command,
  args
});

export const none = (): FlowEffect => ({ type: "none" });
