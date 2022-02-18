export default function todayPlus(plus: number): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + plus)
    .toISOString()
    .slice(0, 10);
}
