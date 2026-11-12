/**
 * NovisEye events adapter: pure aggregation, no database/authentication coupling.
 * Data contracts require explicit provenance; synthetic and observed data never mix.
 */
export function summarizeROIEvents(events, {sourceType, currency="USD", windowStart=null, windowEnd=null}={}) {
  if (!["observed","synthetic"].includes(sourceType)) throw new Error("sourceType observed|synthetic required");
  if (!Array.isArray(events)) throw new TypeError("events must be array");
  let savings=0, hours=0, completed=0, included=0; const byCategory={};
  for (const ev of events) {
    if (!ev || ev.provenance !== sourceType) throw new Error("mixed or missing provenance");
    if (!ev.process_name || typeof ev.process_name!=="string") throw new Error("process_name required");
    const date=new Date(ev.created_at);
    if (!Number.isFinite(date.getTime())) throw new Error("created_at must be valid ISO timestamp");
    if (windowStart && date < new Date(windowStart)) continue;
    if (windowEnd && date > new Date(windowEnd)) continue;
    if (ev.currency!==currency) throw new Error("currency mismatch");
    const money=Number(ev.saving_amount_usd),time=Number(ev.time_saved_hours);
    if (!Number.isFinite(money)||!Number.isFinite(time)||money<0||time<0) throw new Error("invalid metrics");
    const status=ev.status;
    if (!["completed","in_progress","failed"].includes(status)) throw new Error("invalid status");
    included++;
    if (status==="completed") {
      completed++;
      savings+=money;hours+=time;
      const key=ev.process_category || "General";
      byCategory[key]=(byCategory[key]||0)+money;
    }
  }
  return {sourceType,currency,windowStart,windowEnd,events:included,completed,
    completedSavings:savings,completedHours:hours,byCategory,
    caveat:sourceType==="synthetic"?"Simulated examples, not verified savings":"Observed-label data; requires source and accounting validation"};
}
