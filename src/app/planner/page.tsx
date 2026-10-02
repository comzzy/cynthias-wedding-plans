import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Planner from "@/components/Planner";

export const metadata: Metadata = { title: "The Planner · Cynthia's Wedding Plans" };

export default function PlannerPage() {
  return (
    <main>
      <Nav />
      <Planner />
    </main>
  );
}
