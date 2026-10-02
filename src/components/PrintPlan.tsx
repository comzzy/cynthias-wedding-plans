import type { Plan, VendorStatus } from "@/lib/types";
import { daysUntil, money, prettyDate } from "@/lib/format";

const STATUS: Record<VendorStatus, string> = { "to find": "#a89585", contacted: "#a8735d", quoted: "#6e4c44", booked: "#6f7d5a" };

/** Static, motion-free copy of the whole plan. Hidden on screen, it is the only thing that prints on /planner. */
export default function PrintPlan({ plan }: { plan: Plan }) {
  const f = plan.facts;
  const days = daysUntil(f.date);
  const done = plan.tasks.filter((t) => t.done).length;
  const tasks = [...plan.tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9").localeCompare(b.due ?? "9"));
  const max = Math.max(1, ...plan.budget.map((b) => b.amount));
  const total = f.budget ?? plan.budget.reduce((a, b) => a + b.amount, 0);

  return (
    <div id="print-plan" className="print-plan hidden text-cocoa">
      <header className="pp-head text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={44} height={44} className="mx-auto rounded-[11px]" />
        <p className="mt-3 font-script text-[44px] leading-none text-rosegold-deep">Cynthia&rsquo;s</p>
        <p className="mt-1 font-display text-[24px] font-medium tracking-[0.2em]">WEDDING PLAN</p>
        <div className="pp-rule mx-auto mt-3" />
        <dl className="pp-facts mt-4">
          <div><dt className="caps">Date</dt><dd>{f.date ? prettyDate(f.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "To be decided"}</dd></div>
          {days !== null && days >= 0 && <div><dt className="caps">Countdown</dt><dd>{days} days to go</dd></div>}
          <div><dt className="caps">Guests</dt><dd>{f.guests ? `${f.guests} guests` : "To be decided"}</dd></div>
          {f.city && <div><dt className="caps">City</dt><dd>{f.city}</dd></div>}
          {total > 0 && <div><dt className="caps">Budget</dt><dd>{money(total)}</dd></div>}
        </dl>
        {f.style && <p className="mt-3 font-display text-[15px] italic text-cocoa-soft">{f.style}</p>}
      </header>

      <section className="pp-sec">
        <h2><span>Checklist</span><small className="caps">{done} of {plan.tasks.length} done</small></h2>
        {plan.tasks.length ? (
          <ul className="pp-tasks">
            {tasks.map((t) => (
              <li key={t.id} className={t.done ? "is-done" : ""}>
                <span className="pp-box">{t.done ? "✓" : ""}</span>
                <span className="pp-title">{t.title}</span>
                <span className="pp-meta caps">{t.category}{t.due ? ` · ${prettyDate(t.due, { day: "numeric", month: "short" })}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="pp-empty">Nothing on the checklist yet.</p>}
      </section>

      <section className="pp-sec">
        <h2><span>Budget</span>{total > 0 && <small className="caps">Total {money(total)}</small>}</h2>
        {plan.budget.length ? (
          <ul className="pp-budget">
            {plan.budget.map((b) => (
              <li key={b.category}>
                <span>{b.category}</span>
                <span className="pp-bar"><i style={{ width: `${(b.amount / max) * 100}%` }} /></span>
                <span className="pp-amt">{money(b.amount)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="pp-empty">No budget yet.</p>}
      </section>

      <section className="pp-sec">
        <h2><span>The day</span>{f.date && <small className="caps">{prettyDate(f.date, { day: "numeric", month: "long" })}</small>}</h2>
        {plan.timeline.length ? (
          <ol className="pp-day">
            {plan.timeline.map((t) => <li key={t.time + t.item}><span className="pp-time">{t.time}</span><span>{t.item}</span></li>)}
          </ol>
        ) : <p className="pp-empty">The order of the day comes once there&rsquo;s a date.</p>}
      </section>

      <section className="pp-sec">
        <h2><span>Vendors</span>{plan.vendors.length > 0 && <small className="caps">{plan.vendors.filter((v) => v.status === "booked").length} of {plan.vendors.length} booked</small>}</h2>
        {plan.vendors.length ? (
          <ul className="pp-vendors">
            {plan.vendors.map((v) => (
              <li key={v.id}>
                <p className="caps pp-meta">{v.category}</p>
                <p className="pp-vname">{v.name || "Not chosen yet"} <span className="caps pp-status" style={{ color: STATUS[v.status], borderColor: STATUS[v.status] }}>{v.status}</span></p>
                {v.note && <p className="pp-note">{v.note}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="pp-empty">No vendors yet.</p>}
      </section>

      <footer className="pp-foot caps">Cynthia&rsquo;s Wedding Plans{plan.updatedAt ? ` · updated ${prettyDate(plan.updatedAt.slice(0, 10), { day: "numeric", month: "long", year: "numeric" })}` : ""}</footer>
    </div>
  );
}
