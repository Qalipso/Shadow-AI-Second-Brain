"use client";

import useSWR, { type KeyedMutator } from "swr";
import { z } from "zod";
import { GoalSchema, MissionSchema, TaskSchema, type Goal, type Mission, type Task } from "@/types/db";

// Shared SWR-backed data layer for Direction/Tasks/Goals (issue #11).
// GoalsView, TasksView, and DirectionView each independently fetched all of
// goals/missions/tasks — three separate network requests for the same data,
// with no consistency between them (editing a goal in one view didn't show
// up in another until its next full mount). These hooks give every consumer
// one shared cache entry per resource: one fetch, and a mutation anywhere is
// visible everywhere immediately via optimistic mutate().

const GoalsResponseSchema = z.object({ goals: z.array(GoalSchema) });
const MissionsResponseSchema = z.object({ missions: z.array(MissionSchema) });
const TasksResponseSchema = z.object({ tasks: z.array(TaskSchema) });

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load (${res.status})`);
  return res.json();
}

export function useGoals(): {
  goals: Goal[];
  error: string | null;
  isLoading: boolean;
  mutate: KeyedMutator<Goal[]>;
} {
  const { data, error, isLoading, mutate } = useSWR<Goal[]>("/api/goals", async (url: string) => {
    const parsed = GoalsResponseSchema.safeParse(await fetchJson(url));
    if (!parsed.success) throw new Error("Malformed response from server.");
    return parsed.data.goals;
  });
  return { goals: data ?? [], error: error ? (error as Error).message : null, isLoading, mutate };
}

export function useMissions(): {
  missions: Mission[];
  error: string | null;
  isLoading: boolean;
  mutate: KeyedMutator<Mission[]>;
} {
  const { data, error, isLoading, mutate } = useSWR<Mission[]>("/api/missions", async (url: string) => {
    const parsed = MissionsResponseSchema.safeParse(await fetchJson(url));
    if (!parsed.success) throw new Error("Malformed response from server.");
    return parsed.data.missions;
  });
  return { missions: data ?? [], error: error ? (error as Error).message : null, isLoading, mutate };
}

export function useTasks(): {
  tasks: Task[];
  error: string | null;
  isLoading: boolean;
  mutate: KeyedMutator<Task[]>;
} {
  const { data, error, isLoading, mutate } = useSWR<Task[]>("/api/tasks", async (url: string) => {
    const parsed = TasksResponseSchema.safeParse(await fetchJson(url));
    if (!parsed.success) throw new Error("Malformed response from server.");
    return parsed.data.tasks;
  });
  return { tasks: data ?? [], error: error ? (error as Error).message : null, isLoading, mutate };
}
