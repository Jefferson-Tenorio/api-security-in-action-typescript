export interface MetricsSnapshot {
  errorsByStatus: Record<string, number>;
  requestsByRoute: Record<string, number>;
  totalErrors: number;
  totalRequests: number;
}

const ALERT_WINDOW = 200;
const ALERT_ERROR_RATIO = 0.4;
const ALERT_COOLDOWN_MS = 60_000;

export class Metrics {
  private readonly errorsByStatus = new Map<string, number>();
  private lastAlertAt = 0;
  private readonly recentStatuses: number[] = [];
  private readonly requestsByRoute = new Map<string, number>();
  private totalErrors = 0;
  private totalRequests = 0;

  record(method: string, route: string, status: number): void {
    const key = `${method} ${route}`;
    this.requestsByRoute.set(key, (this.requestsByRoute.get(key) ?? 0) + 1);
    this.totalRequests += 1;

    if (status >= 400) {
      const statusKey = String(status);
      this.errorsByStatus.set(statusKey, (this.errorsByStatus.get(statusKey) ?? 0) + 1);
      this.totalErrors += 1;
    }

    this.recentStatuses.push(status);
    if (this.recentStatuses.length > ALERT_WINDOW) this.recentStatuses.shift();
  }

  shouldAlert(): boolean {
    const now = Date.now();
    if (now - this.lastAlertAt < ALERT_COOLDOWN_MS) return false;
    if (this.recentStatuses.length < ALERT_WINDOW) return false;

    const serverErrors = this.recentStatuses.filter((status) => status >= 500).length;
    const errorRate = serverErrors / this.recentStatuses.length;
    if (errorRate < ALERT_ERROR_RATIO) return false;

    this.lastAlertAt = now;
    return true;
  }

  snapshot(): MetricsSnapshot {
    return {
      errorsByStatus: Object.fromEntries(this.errorsByStatus),
      requestsByRoute: Object.fromEntries(this.requestsByRoute),
      totalErrors: this.totalErrors,
      totalRequests: this.totalRequests,
    };
  }
}