export const PLATFORM_COMMISSION_RATE = 0.05;

export function calculatePlatformCommission(orderValue: number) {
  return Math.round(orderValue * PLATFORM_COMMISSION_RATE);
}
