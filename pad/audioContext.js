/**
 * pad/audioContext.js
 * 
 * What it Does:
 *   This file exports requestAnimationFrame and cancelAnimationFrame
 *   for the major browsers
 * 
 *   requestAnimationFrame: takes a function we want to run.
 * 
 *   cancelAnimationFrame: takes the frame number and cancels the animation
 *   checkout the cancelFrame method in game/main.js that extends cancelAnimationFrame
 * 
 * Learn more:
 * 
 */

const audioContext = window.AudioContext || 
    window.webkitAudioContext || 
    window.mozAudioContext || 
    window.oAudioContext || 
    window.msAudioContext;

export { audioContext };