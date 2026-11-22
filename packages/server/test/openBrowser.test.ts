import { describe, expect, it } from 'vitest';
import { browserCommand } from '../src/openBrowser';

describe('opening the game in the default browser', () => {
  const url = 'http://localhost:8000';

  it('uses the right command on each system', () => {
    expect(browserCommand('win32', url)).toEqual(['cmd', ['/c', 'start', '', url]]);
    expect(browserCommand('darwin', url)).toEqual(['open', [url]]);
    expect(browserCommand('linux', url)).toEqual(['xdg-open', [url]]);
  });
});
