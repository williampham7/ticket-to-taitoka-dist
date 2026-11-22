import { describe, expect, it } from 'vitest';
import { SERVER_TITLE } from '../src/title';

describe('game title in server messages', () => {
  it('is generic, because one server plays every edition', () => {
    expect(SERVER_TITLE).toBe('Ticket to … (USA / China / Europe)');
  });
});
