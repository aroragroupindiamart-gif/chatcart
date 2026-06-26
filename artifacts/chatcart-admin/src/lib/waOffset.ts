export function formatOffset(hourOffset: number): string {
  if (hourOffset === 0) return 'Now';
  if (hourOffset <= 48) return `${hourOffset}h`;
  return `Day ${Math.floor(hourOffset / 24)}`;
}
