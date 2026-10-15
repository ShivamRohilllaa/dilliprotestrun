import { describe, expect, test } from 'vitest';
import { StateMachine } from '../../src/game/GameState';
import type { GameState } from '../../src/game/GameState';

const path: GameState[] = [
  'CHARACTER_SELECT',
  'LOCATION_SELECT',
  'ISSUE_SELECT',
  'PURSUER_SELECT',
  'PROTEST_INTRO',
  'CHASE_TRANSITION',
  'PLAYING',
];
function playing(): StateMachine {
  const machine = new StateMachine();
  for (const state of path) expect(machine.transition(state)).toBe(true);
  return machine;
}

describe('game state transitions', () => {
  test('victory freezes the run and only permits a fresh intro or menu', () => {
    const machine = playing();
    expect(machine.transition('VICTORY')).toBe(true);
    expect(machine.transition('VICTORY')).toBe(false);
    expect(machine.transition('GAME_OVER')).toBe(false);
    expect(machine.transition('PLAYING')).toBe(false);
    expect(machine.transition('PROTEST_INTRO')).toBe(true);
    expect(machine.transition('CHASE_TRANSITION')).toBe(true);
    expect(machine.transition('PLAYING')).toBe(true);
    expect(machine.transition('VICTORY')).toBe(true);
    expect(machine.transition('MENU')).toBe(true);
  });
  test('starts at the menu and follows the complete intro flow', () => {
    const machine = new StateMachine();
    expect(machine.state).toBe('MENU');
    for (const state of path) {
      expect(machine.transition(state)).toBe(true);
      expect(machine.state).toBe(state);
    }
  });

  test('rejects invalid shortcuts without changing current state', () => {
    const machine = new StateMachine();
    for (const state of [
      'PLAYING',
      'PAUSED',
      'GAME_OVER',
      'CHASE_TRANSITION',
      'PROTEST_INTRO',
      'ISSUE_SELECT',
      'PURSUER_SELECT',
    ] as GameState[]) {
      expect(machine.transition(state)).toBe(false);
      expect(machine.state).toBe('MENU');
    }
    machine.transition('LOCATION_SELECT');
    expect(machine.transition('PROTEST_INTRO')).toBe(false);
    expect(machine.transition('GAME_OVER')).toBe(false);
    expect(machine.state).toBe('LOCATION_SELECT');
  });

  test('pause and resume preserve the playing state and reject duplicate events', () => {
    const machine = playing();
    expect(machine.transition('PAUSED')).toBe(true);
    expect(machine.transition('PAUSED')).toBe(false);
    expect(machine.transition('GAME_OVER')).toBe(false);
    expect(machine.state).toBe('PAUSED');
    expect(machine.transition('PLAYING')).toBe(true);
    expect(machine.transition('PLAYING')).toBe(false);
    expect(machine.state).toBe('PLAYING');
  });

  test('game over restarts through the intro and supports returning to menu', () => {
    const machine = playing();
    expect(machine.transition('GAME_OVER')).toBe(true);
    expect(machine.transition('PLAYING')).toBe(false);
    expect(machine.transition('PROTEST_INTRO')).toBe(true);
    expect(machine.transition('CHASE_TRANSITION')).toBe(true);
    expect(machine.transition('PLAYING')).toBe(true);
    expect(machine.transition('PAUSED')).toBe(true);
    expect(machine.transition('MENU')).toBe(true);
    expect(machine.state).toBe('MENU');
  });

  test('character selection returns to menu without entering gameplay', () => {
    const machine = new StateMachine();
    expect(machine.transition('CHARACTER_SELECT')).toBe(true);
    expect(machine.transition('PLAYING')).toBe(false);
    expect(machine.transition('MENU')).toBe(true);
  });
  test('setup permits returning through each selection without allowing an early start', () => {
    const machine = new StateMachine();
    machine.transition('CHARACTER_SELECT');
    expect(machine.transition('PROTEST_INTRO')).toBe(false);
    expect(machine.transition('ISSUE_SELECT')).toBe(false);
    expect(machine.transition('PURSUER_SELECT')).toBe(false);
    expect(machine.transition('LOCATION_SELECT')).toBe(true);
    expect(machine.transition('PROTEST_INTRO')).toBe(false);
    expect(machine.transition('CHARACTER_SELECT')).toBe(true);
    expect(machine.transition('LOCATION_SELECT')).toBe(true);
    expect(machine.transition('PURSUER_SELECT')).toBe(false);
    expect(machine.transition('ISSUE_SELECT')).toBe(true);
    expect(machine.transition('PROTEST_INTRO')).toBe(false);
    expect(machine.transition('PURSUER_SELECT')).toBe(true);
    expect(machine.transition('ISSUE_SELECT')).toBe(true);
    expect(machine.transition('LOCATION_SELECT')).toBe(true);
    expect(machine.transition('ISSUE_SELECT')).toBe(true);
    expect(machine.transition('PURSUER_SELECT')).toBe(true);
    expect(machine.transition('PROTEST_INTRO')).toBe(true);
  });
});
