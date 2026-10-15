export type GameState =
  | 'MENU'
  | 'LOCATION_SELECT'
  | 'CHARACTER_SELECT'
  | 'PURSUER_SELECT'
  | 'ISSUE_SELECT'
  | 'PROTEST_INTRO'
  | 'CHASE_TRANSITION'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'VICTORY';
const transitions: Record<GameState, readonly GameState[]> = {
  MENU: ['LOCATION_SELECT', 'CHARACTER_SELECT'],
  LOCATION_SELECT: ['MENU', 'CHARACTER_SELECT', 'ISSUE_SELECT'],
  CHARACTER_SELECT: ['MENU', 'LOCATION_SELECT'],
  ISSUE_SELECT: ['MENU', 'LOCATION_SELECT', 'PURSUER_SELECT'],
  PURSUER_SELECT: ['MENU', 'ISSUE_SELECT', 'PROTEST_INTRO'],
  PROTEST_INTRO: ['CHASE_TRANSITION', 'MENU'],
  CHASE_TRANSITION: ['PLAYING', 'MENU'],
  PLAYING: ['PAUSED', 'GAME_OVER', 'VICTORY'],
  PAUSED: ['PLAYING', 'MENU'],
  GAME_OVER: ['PROTEST_INTRO', 'MENU'],
  VICTORY: ['PROTEST_INTRO', 'MENU'],
};
export class StateMachine {
  state: GameState = 'MENU';
  transition(next: GameState): boolean {
    if (!transitions[this.state].includes(next)) return false;
    this.state = next;
    return true;
  }
}
