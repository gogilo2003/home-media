// @ts-check
/** @typedef {import('../../types.ts').CaptionTrack} CaptionTrack */

const player = /** @type {HTMLVideoElement} */ (document.getElementById('player'));
/** @type {any} */
const PlyrCtor = (/** @type {any} */ (window)).Plyr;
/** @type {any} */
let plyr = null;

const CONTROLS = ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'];

/** Initialize Plyr when the vendored script loaded; native `controls` is the fallback. */
export function initPlayer() {
  if (!PlyrCtor) return;
  plyr = new PlyrCtor(player, {
    controls: CONTROLS,
    settings: ['captions', 'speed'],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    captions: { active: true, update: true, language: 'en' },
    keyboard: { focused: false, global: false },
  });
}

/** @returns {HTMLVideoElement} */
export function videoEl() { return player; }
/** @returns {any} */
export function getPlayer() { return plyr; }

/** Minimal SRT → WebVTT: drop cue indices, swap comma decimals for dots. @param {string} srt */
function srtToVtt(srt) {
  const cues = srt.replace(/\r/g, '').replace(/^\uFEFF/, '').split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const first = lines[0];
    if (first !== undefined && /^\d+$/.test(first.trim())) lines.shift();
    return lines.join('\n').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  }).filter(Boolean);
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

/** @param {CaptionTrack} track */
async function trackEl(track) {
  let src = track.url;
  if (track.format === 'srt') {
    try {
      const text = await (await fetch(track.url)).text();
      src = URL.createObjectURL(new Blob([srtToVtt(text)], { type: 'text/vtt' }));
    } catch {
      return null;
    }
  }
  const el = document.createElement('track');
  el.kind = 'captions';
  el.label = track.label;
  el.srclang = track.lang || 'en';
  el.src = src;
  if (!track.lang) el.default = true;
  return el;
}

/** Attach the catalog's caption tracks to the player. @param {CaptionTrack[]} tracks */
export async function loadCaptions(tracks) {
  player.querySelectorAll('track').forEach((node) => node.remove());
  const built = await Promise.all(tracks.map(trackEl));
  for (const el of built) if (el) player.appendChild(el);
  if (!plyr) return;
  plyr.captions.update();
  if (built.some(Boolean)) plyr.captions.active = true;
}
