import { describe, expect, it } from 'vitest';

import { helloWorld } from './index.js';

describe('helloWorld', () => {
  it('returns Hello World', () => {
    expect(helloWorld()).toBe('Hello World');
  });
});
