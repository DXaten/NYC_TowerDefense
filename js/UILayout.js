// UILayout.js — the game's UI layout: every HUD element, placed and styled in the editor (UI tab).
// The editor rewrites the whole file (POST /api/save-ui) — keep the format. Drawn by js/UI.js;
// game code takes an element by id: UI.get('score').setText('10') — and never positions HUD itself.
//   kind — 'text' | 'panel' | 'bar' | 'button'; anchor — one of 9 screen points ('top-left' …
//   'bottom-right'): x, y go from it to the same point of the element (inward from an edge,
//   signed from the center); w, h — px; numbers are px of a screen UI_REF_HEIGHT tall;
//   parent (optional) — id of the element this one sits in: anchor, x, y then count from the
//   parent's box, the parent clips it and hides it together with itself;
//   stretch (optional) — 'h' | 'v' | 'both': fills the container on that axis, x (y) — the inset
//   from both edges, w (h) is ignored;
//   colors — '#rrggbb', '' — none; visible: 0 — hidden until the game calls show().
//   Records go in drawing order: later — on top.
const UI_LAYOUT = [
    { id: 'hud_title', kind: 'text', anchor: 'top-left', x: 14, y: 10, text: "NIGHT CARAVAN", fontSize: 18, color: '#ffe0a3', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'hud_level', kind: 'text', anchor: 'top-left', x: 14, y: 36, text: "", fontSize: 13, color: '#f3f0df', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'hud_credits', kind: 'text', anchor: 'top-right', x: 14, y: 10, text: "", fontSize: 16, color: '#ffe0a3', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'hud_health', kind: 'text', anchor: 'top-right', x: 14, y: 36, text: "", fontSize: 13, color: '#f3f0df', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'hud_progress', kind: 'bar', anchor: 'top-center', x: 0, y: 61, w: 240, h: 8, value: 0, color: '#71d6c5', fill: '#151b2b', border: '#baa46d', radius: 4, alpha: 0.95, visible: 1 },
    { id: 'hud_phase', kind: 'text', anchor: 'top-center', x: 0, y: 77, text: "", fontSize: 12, color: '#e6e1d7', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_tip', kind: 'text', anchor: 'bottom-center', x: 0, y: 145, text: "", fontSize: 13, color: '#ffffff', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'controls', kind: 'panel', anchor: 'bottom-center', x: 0, y: 12, w: 310, h: 124, fill: '#1d3548', border: '#d5bb88', radius: 14, alpha: 0.96, visible: 1 },
    { id: 'lamp', kind: 'button', anchor: 'top-left', parent: 'controls', x: 8, y: 8, w: 93, h: 48, text: "ЛАМПА\nБроня · 85", fontSize: 12, color: '#fff5d8', fill: '#664630', border: '#ffd479', radius: 8, alpha: 1, visible: 1 },
    { id: 'coil', kind: 'button', anchor: 'top-left', parent: 'controls', x: 108, y: 8, w: 93, h: 48, text: "КАТУШКА\nСтая · 120", fontSize: 12, color: '#e6fdff', fill: '#263544', border: '#66e6ed', radius: 8, alpha: 1, visible: 1 },
    { id: 'signal', kind: 'button', anchor: 'top-left', parent: 'controls', x: 208, y: 8, w: 93, h: 48, text: "СИГНАЛ\nДухи · 105", fontSize: 12, color: '#f4eaff', fill: '#263544', border: '#e9aff5', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade', kind: 'button', anchor: 'bottom-left', parent: 'controls', x: 8, y: 8, w: 93, h: 48, text: "Улучшить", fontSize: 12, color: '#fff5d8', fill: '#5d4836', border: '#d8b86b', radius: 8, alpha: 1, visible: 1 },
    { id: 'sell', kind: 'button', anchor: 'bottom-left', parent: 'controls', x: 108, y: 8, w: 93, h: 48, text: "Продать", fontSize: 12, color: '#ffffff', fill: '#4b3841', border: '#b98793', radius: 8, alpha: 1, visible: 1 },
    { id: 'pause', kind: 'button', anchor: 'bottom-left', parent: 'controls', x: 208, y: 8, w: 93, h: 48, text: "Пауза", fontSize: 12, color: '#ffffff', fill: '#394450', border: '#a7b7c2', radius: 8, alpha: 1, visible: 1 },
    { id: 'overlay', kind: 'panel', anchor: 'top-left', x: 0, y: 0, w: 1, h: 1, stretch: 'both', fill: '#12283a', border: '', radius: 0, alpha: 0.56, visible: 1 },
    { id: 'menu', kind: 'panel', anchor: 'middle-center', parent: 'overlay', x: 0, y: 0, w: 300, h: 234, fill: '#25394d', border: '#e4c38d', radius: 16, alpha: 1, visible: 1 },
    { id: 'menu_title', kind: 'text', anchor: 'top-center', parent: 'menu', x: 0, y: 28, text: "НОЧНОЙ КАРАВАН", fontSize: 22, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_body', kind: 'text', anchor: 'middle-center', parent: 'menu', x: 0, y: -3, text: "", fontSize: 13, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_action', kind: 'button', anchor: 'bottom-center', parent: 'menu', x: 0, y: 22, w: 190, h: 46, text: "Начать", fontSize: 17, color: '#141926', fill: '#f1c877', border: '#fff1c9', radius: 9, alpha: 1, visible: 1 },
];
