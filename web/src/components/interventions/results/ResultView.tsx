"use client";
import { TaskShatterView, type TaskShatterResult } from "./TaskShatterView";
import { DopamineMenuView, type DopamineMenuResult } from "./DopamineMenuView";
import { ContextSwitchView, type ContextSwitchResult } from "./ContextSwitchView";
import { InterestFilterView, type InterestFilterResult } from "./InterestFilterView";

export type GeneratedResult =
  | TaskShatterResult
  | DopamineMenuResult
  | ContextSwitchResult
  | InterestFilterResult;

export type Status = "draft" | "active" | "completed" | "archived" | "dismissed";

export function collectSteps(result: GeneratedResult): { id: string; title: string }[] {
  switch (result.kind) {
    case "task_shatter":
      return result.steps;
    case "dopamine_menu":
      return [...result.appetizers, ...result.entrees, ...result.sides];
    case "interest_filter":
      return result.stages.map((s, i) => ({ id: `stage-${i + 1}`, title: s.name }));
    case "context_switch":
      return [{ id: "first", title: result.firstAction }];
  }
}

export function firstActionOf(result: GeneratedResult): string {
  switch (result.kind) {
    case "task_shatter":
      return result.firstAction;
    case "context_switch":
      return result.firstAction;
    case "dopamine_menu":
      return result.appetizers[0]?.title ?? "Pick an appetizer.";
    case "interest_filter":
      return result.stages[0]?.action ?? "Begin the quest.";
  }
}

export function ResultView({
  result,
  selected,
  onToggle,
  status,
}: {
  result: GeneratedResult;
  selected: Set<string>;
  onToggle: (id: string) => void;
  status: Status;
}) {
  switch (result.kind) {
    case "task_shatter":
      return <TaskShatterView result={result} selected={selected} onToggle={onToggle} />;
    case "dopamine_menu":
      return <DopamineMenuView result={result} selected={selected} onToggle={onToggle} />;
    case "context_switch":
      return <ContextSwitchView result={result} />;
    case "interest_filter":
      return <InterestFilterView result={result} selected={selected} onToggle={onToggle} status={status} />;
  }
}
