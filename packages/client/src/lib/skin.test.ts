import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Lines of code, without comments, so notes about the hub's name don't count. */
const codeLines = (file: string) =>
  fs.readFileSync(file, 'utf8').split(/\r?\n/).map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => !/^\s*(\/\/|\/\*|\*)/.test(text));

describe('every screen follows the chosen skin', () => {
  it('no screen spells out the game or hub name itself (use SKIN / GAME_TITLE / cityName from lib/skin)', () => {
    const hits = sourceFiles(src).flatMap((f) => codeLines(f)
      .filter(({ text }) => /\b(Boboland|Taitoka)\b|BOBOLAND|TAITOKA/.test(text))
      .map(({ line }) => `${path.relative(src, f)}:${line}`));
    expect(hits).toEqual([]);
  });

  it('city names are always read through cityName(), which knows the hub is renamed', () => {
    const hits = sourceFiles(src).filter((f) => !f.endsWith(path.join('lib', 'skin.ts'))).flatMap((f) => codeLines(f)
      // CITY_BY_ID may only be used to ask whether a city is the hub or special, or where the hub's banner goes;
      // names must come from cityName()
      .filter(({ text }) => /CITY_BY_ID\[[^\]]+\](?!\.(hub|special|banner)\b)/.test(text))
      .map(({ line }) => `${path.relative(src, f)}:${line}`));
    expect(hits).toEqual([]);
  });
});
