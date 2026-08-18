import type { SecurityEvent, SecurityEventRepository } from './security-event-repository.js';

export class SecurityEventLogger {
  constructor(private readonly repository: SecurityEventRepository) {}

  async log(event: SecurityEvent): Promise<void> {
    try {
      await this.repository.insert(event);
    } catch (err) {
      console.error('Security event log failed:', err);
    }
  }
}