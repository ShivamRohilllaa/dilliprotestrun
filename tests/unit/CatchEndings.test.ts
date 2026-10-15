import { expect, test } from 'vitest';
import { catchEndingFor } from '../../src/protest/CatchEndings';
import { PURSUERS } from '../../src/characters/PursuerDefinitions';

test('each selectable pursuer has a distinct catch ending', () => {
  const endings = PURSUERS.map(({ id }) => catchEndingFor(id));
  expect(new Set(endings.map(({ message }) => message)).size).toBe(PURSUERS.length);
  expect(catchEndingFor('mobi').message).toContain('drink a chai');
  expect(catchEndingFor('amit').extra).toContain('fictional accusation');
  expect(catchEndingFor('baba').extra).toContain('rocket for Mars');
  expect(catchEndingFor('unknown')).toEqual(catchEndingFor('mobi'));
});
