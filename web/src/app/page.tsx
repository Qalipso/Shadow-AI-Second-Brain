import { redirect } from "next/navigation";

// Root → dashboard. Login gating wires in Phase 3.
export default function HomePage() {
  redirect("/dashboard");
}
