import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { App } from '../app.js';
import { Metrics } from '../shared/metrics/metrics.js';

const app = new App().instance;

describe('Metrics — unit', () => {
  it('counts requests by route and errors by status', () => {
    const metrics = new Metrics();
    metrics.record('GET', '/v1/message', 200);
    metrics.record('GET', '/v1/message', 200);
    metrics.record('POST', '/v1/message', 400);
    metrics.record('GET', '/v1/message', 500);

    const snapshot = metrics.snapshot();
    expect(snapshot.totalRequests).toBe(4);
    expect(snapshot.totalErrors).toBe(2);
    expect(snapshot.requestsByRoute['GET /v1/message']).toBe(3);
    expect(snapshot.requestsByRoute['POST /v1/message']).toBe(1);
    expect(snapshot.errorsByStatus['400']).toBe(1);
    expect(snapshot.errorsByStatus['500']).toBe(1);
  });

  it('alerts when the server error ratio in the window is too high', () => {
    const metrics = new Metrics();
    for (let i = 0; i < 120; i++) metrics.record('GET', '/v1/x', 500);
    for (let i = 0; i < 80; i++) metrics.record('GET', '/v1/x', 200);

    expect(metrics.shouldAlert()).toBe(true);
    expect(metrics.shouldAlert()).toBe(false);
  });

  it('does not alert on healthy traffic', () => {
    const metrics = new Metrics();
    for (let i = 0; i < 300; i++) metrics.record('GET', '/v1/x', 200);

    expect(metrics.shouldAlert()).toBe(false);
  });
});

describe('Metrics — HTTP endpoint', () => {
  it('exposes counters at GET /v1/metrics', async () => {
    const before = await request(app).get('/v1/metrics').expect(200);
    expect(before.body.totalRequests).toBeGreaterThanOrEqual(0);

    await request(app).get('/v1/metrics');
    await request(app).get('/v1/natter/message').expect(401);
    await request(app).post('/v1/auth/login').send({}).expect(400);

    const after = await request(app).get('/v1/metrics').expect(200);
    expect(after.body.totalRequests).toBeGreaterThan(before.body.totalRequests);
    expect(after.body.requestsByRoute['GET /v1/metrics']).toBeGreaterThanOrEqual(2);
    expect(after.body.errorsByStatus['401']).toBeGreaterThanOrEqual(1);
    expect(after.body.errorsByStatus['400']).toBeGreaterThanOrEqual(1);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});