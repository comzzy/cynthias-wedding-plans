export type Facts = {
  budget: number | null; // total budget in NGN
  guests: number | null;
  city: string | null;
  date: string | null; // YYYY-MM-DD
  style: string | null; // colours, theme, aso-ebi notes
};

export type Task = {
  id: string;
  title: string;
  due: string | null; // YYYY-MM-DD
  category: string;
  done: boolean;
};

export type BudgetLine = { category: string; amount: number };
export type TimelineItem = { time: string; item: string };

export type VendorStatus = "to find" | "contacted" | "quoted" | "booked";
export type Vendor = {
  id: string;
  category: string;
  name: string;
  status: VendorStatus;
  note: string;
};

export type Plan = {
  facts: Facts;
  tasks: Task[];
  budget: BudgetLine[];
  timeline: TimelineItem[];
  vendors: Vendor[];
  updatedAt: string | null;
};

export type ChatTurn = { role: "user" | "assistant"; text: string };

/** What the model is asked to return. Every field except reply is optional. */
export type PlanPatch = {
  reply: string;
  facts?: Partial<Facts>;
  addTasks?: { title: string; due?: string | null; category?: string }[];
  completeTasks?: string[];
  budget?: BudgetLine[];
  timeline?: TimelineItem[];
  vendors?: { category: string; name?: string; status?: string; note?: string }[];
};

export type PlanResponse = {
  reply: string;
  plan: Plan;
  source: "llm" | "fallback";
  model: string | null;
  notice?: string;
};

export const emptyPlan = (): Plan => ({
  facts: { budget: null, guests: null, city: null, date: null, style: null },
  tasks: [],
  budget: [],
  timeline: [],
  vendors: [],
  updatedAt: null,
});
