import type { Experience } from '../../domain/catalog';
import { planItinerary, type TravelConstraints } from '../../domain/planner';

/** Propone paradas de una misma provincia. No inventa distancias ni tiempos de traslado. */
export function suggestStops(input: TravelConstraints, records: Experience[], selected: string[] = []): string[] {
  const existing = records.filter(item => selected.includes(item.id));
  let budget = input.budgetTotal - existing.reduce((sum,item) => sum + (item.price.currency === 'USD' ? (item.price.max ?? item.price.min ?? 0) * input.people : 0),0);
  let hours = input.maxHours - existing.reduce((sum,item) => sum + (item.duration.maxHours ?? (item.duration.days ?? 0)*24),0);
  if (budget <= 0 || hours <= 0 || selected.length >= 5) return [];
  const options = planItinerary({...input,budgetTotal:budget,maxHours:hours,excludedIds:selected}, records)
    .filter(item => item.fitsKnownConstraints && item.experienceSubtotal !== null);
  const anchor = existing[0] ?? options[0]?.experience;
  if (!anchor) return [];
  const chosen:string[]=[];
  for (const option of options) {
    const item=option.experience;
    const duration=item.duration.maxHours ?? (item.duration.days ?? 1)*24;
    if (item.province !== anchor.province || (option.experienceSubtotal ?? Infinity)>budget || duration>hours) continue;
    chosen.push(item.id); budget-=option.experienceSubtotal!; hours-=duration;
    if (chosen.length >= Math.min(3,5-selected.length)) break;
  }
  return chosen;
}
