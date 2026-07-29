import { describe, expect, it, vi } from "vitest";
import { ACTION_MENU_CLOSE_DELAY_MS, runAfterActionMenuClose } from "./actionMenu";

describe("runAfterActionMenuClose", () => {
  it("fecha o menu antes de agendar a ação", () => {
    const calls: string[] = [];
    const schedule = vi.fn((callback: () => void, delay: number) => {
      calls.push(`schedule:${delay}`);
      callback();
    });

    runAfterActionMenuClose(
      () => calls.push("close"),
      () => calls.push("action"),
      schedule,
    );

    expect(calls).toEqual([
      "close",
      `schedule:${ACTION_MENU_CLOSE_DELAY_MS}`,
      "action",
    ]);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("não executa a ação imediatamente enquanto o modal ainda está fechando", () => {
    const onClose = vi.fn();
    const action = vi.fn();
    let scheduledAction: (() => void) | undefined;

    runAfterActionMenuClose(onClose, action, (callback, delay) => {
      expect(delay).toBe(ACTION_MENU_CLOSE_DELAY_MS);
      scheduledAction = callback;
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();

    scheduledAction?.();

    expect(action).toHaveBeenCalledTimes(1);
  });
});
