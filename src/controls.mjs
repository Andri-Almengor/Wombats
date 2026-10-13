// Keep the keyboard listener and simulation synchronized on gameplay controls.
export const GAMEPLAY_KEYS = new Set([
 'ArrowLeft','ArrowRight','ArrowUp','Space',
 'ShiftLeft','ShiftRight','KeyW','KeyA','KeyD','KeyR'
]);
export const JUMP_KEYS = Object.freeze(['Space','ArrowUp']);
export function wantsJump(pressed){return JUMP_KEYS.some(code=>pressed.has(code));}
