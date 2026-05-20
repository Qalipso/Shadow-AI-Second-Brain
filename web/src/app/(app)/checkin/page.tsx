import { PageHeader } from "@/components/PageHeader";
import { CheckInPageClient } from "@/components/checkin/CheckInPageClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import type { PendingQuestion } from "@/components/checkin/CheckInWizard";

export const dynamic = "force-dynamic";

type AiQuestionRow = {
  id: string;
  question_text: string;
};

type TodayCheckinRow = {
  id: string;
  date: string;
  energy: number | null;
  mood: number | null;
  mental_noise: number | null;
  body_state: number | null;
  focus: number | null;
  today_focus: string | null;
  today_focus_custom: string | null;
  insight_text: string | null;
  created_at: string;
};

async function fetchServerData(): Promise<{
  pendingQuestion: PendingQuestion | null;
  todayCheckins: TodayCheckinRow[];
}> {
  if (!hasSupabase()) {
    return { pendingQuestion: null, todayCheckins: [] };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { pendingQuestion: null, todayCheckins: [] };
    }

    const today = new Date().toISOString().slice(0, 10);

    const [questionResult, checkinResult] = await Promise.all([
      supabase
        .from("ai_questions")
        .select("id, question_text")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<AiQuestionRow>(),
      supabase
        .from("daily_checkins")
        .select(
          "id, date, energy, mood, mental_noise, body_state, focus, today_focus, today_focus_custom, insight_text, created_at",
        )
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: false }),
    ]);

    const pendingQuestion: PendingQuestion | null =
      questionResult.data
        ? { id: questionResult.data.id, question_text: questionResult.data.question_text }
        : null;

    return {
      pendingQuestion,
      todayCheckins: (checkinResult.data as TodayCheckinRow[]) ?? [],
    };
  } catch {
    return { pendingQuestion: null, todayCheckins: [] };
  }
}

export default async function CheckInPage() {
  const { pendingQuestion, todayCheckins } = await fetchServerData();

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Daily Sync"
        title="Daily Sync"
        subtitle="Rate your state. Shadow uses this as baseline for your Map."
      />

      <CheckInPageClient
        pendingQuestion={pendingQuestion}
        initialCheckins={todayCheckins}
      />
    </div>
  );
}
