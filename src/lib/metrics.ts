
/**
 * Calculates the Exponential Moving Average (EMA) for a series of data points.
 * EMA_today = Value_today * k + EMA_yesterday * (1 - k)
 * where k = 2 / (periods + 1)
 */
export function calculateEMA(data: number[], periods: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (periods + 1);
  const ema: number[] = [];
  
  let currentEMA = data[0];
  ema.push(currentEMA);

  for (let i = 1; i < data.length; i++) {
    currentEMA = data[i] * k + currentEMA * (1 - k);
    ema.push(currentEMA);
  }
  return ema;
}

/**
 * Returns an array of date strings (YYYY-MM-DD) for the range [endDate - daysBack + 1, endDate].
 */
export function getDatesRange(endDateStr: string, daysBack: number): string[] {
  const dates: string[] = [];
  const endDate = new Date(endDateStr);
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Extracts a metric series from stats and calculates its EMA.
 */
export function getMetricEMASeries(
  stats: Record<string, any>,
  metricKey: string,
  endDate: string,
  daysBack: number = 30,
  emaPeriods: number = 14
): number[] {
  const dates = getDatesRange(endDate, daysBack);
  const rawData = dates.map(date => stats[date]?.[metricKey] || 0);
  return calculateEMA(rawData, emaPeriods);
}
