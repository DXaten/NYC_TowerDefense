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
    { id: 'hud_tip', kind: 'text', anchor: 'bottom-center', x: 0, y: 254, text: "", fontSize: 13, color: '#ffffff', shadow: '#183448', alpha: 1, visible: 1 },
    { id: 'controls', kind: 'panel', anchor: 'bottom-center', x: 0, y: 12, w: 310, h: 234, fill: '#1d3548', border: '#d5bb88', radius: 14, alpha: 0.97, visible: 1 },
    { id: 'card_0', kind: 'button', anchor: 'top-left', parent: 'controls', x: 8, y: 8, w: 93, h: 50, text: "Карта 1", fontSize: 12, color: '#fff5d8', fill: '#364a5a', border: '#ffd479', radius: 8, alpha: 1, visible: 1 },
    { id: 'card_1', kind: 'button', anchor: 'top-left', parent: 'controls', x: 108, y: 8, w: 93, h: 50, text: "Карта 2", fontSize: 12, color: '#fff5d8', fill: '#364a5a', border: '#66e6ed', radius: 8, alpha: 1, visible: 1 },
    { id: 'card_2', kind: 'button', anchor: 'top-left', parent: 'controls', x: 208, y: 8, w: 93, h: 50, text: "Карта 3", fontSize: 12, color: '#fff5d8', fill: '#364a5a', border: '#e9aff5', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade_0', kind: 'button', anchor: 'top-left', parent: 'controls', x: 8, y: 65, w: 70, h: 54, text: "Усилить", fontSize: 11, color: '#fff5d8', fill: '#644b39', border: '#ffd479', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade_1', kind: 'button', anchor: 'top-left', parent: 'controls', x: 83, y: 65, w: 70, h: 54, text: "Усилить", fontSize: 11, color: '#e6fdff', fill: '#354e59', border: '#66e6ed', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade_2', kind: 'button', anchor: 'top-left', parent: 'controls', x: 158, y: 65, w: 70, h: 54, text: "Усилить", fontSize: 11, color: '#f4eaff', fill: '#4d3c5b', border: '#e9aff5', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade_3', kind: 'button', anchor: 'top-left', parent: 'controls', x: 233, y: 65, w: 70, h: 54, text: "Открыть", fontSize: 11, color: '#fff6db', fill: '#61533b', border: '#f6dfa0', radius: 8, alpha: 1, visible: 1 },
    { id: 'dawn', kind: 'button', anchor: 'top-left', parent: 'controls', x: 8, y: 127, w: 144, h: 46, text: "Нить рассвета", fontSize: 13, color: '#241c16', fill: '#e9c676', border: '#fff2c7', radius: 8, alpha: 1, visible: 1 },
    { id: 'reroll', kind: 'button', anchor: 'top-left', parent: 'controls', x: 158, y: 127, w: 144, h: 46, text: "Обновить", fontSize: 13, color: '#ffffff', fill: '#36545b', border: '#83d6cf', radius: 8, alpha: 1, visible: 1 },
    { id: 'pause', kind: 'button', anchor: 'bottom-left', parent: 'controls', x: 8, y: 8, w: 293, h: 43, text: "В путь", fontSize: 15, color: '#ffffff', fill: '#394450', border: '#a7b7c2', radius: 8, alpha: 1, visible: 1 },
    { id: 'focus', kind: 'button', anchor: 'bottom-right', x: 16, y: 294, w: 96, h: 44, text: "Вся карта", fontSize: 12, color: '#fff4dc', fill: '#344c58', border: '#e5c88d', radius: 9, alpha: 0.96, visible: 0 },
    { id: 'overlay', kind: 'panel', anchor: 'top-left', x: 0, y: 0, w: 1, h: 1, stretch: 'both', fill: '', border: '', radius: 0, alpha: 1, visible: 1 },
    { id: 'overlay_dim', kind: 'panel', anchor: 'top-left', parent: 'overlay', x: 0, y: 0, w: 1, h: 1, stretch: 'both', fill: '#12283a', border: '', radius: 0, alpha: 0.68, visible: 1 },
    { id: 'home_panel', kind: 'panel', anchor: 'middle-center', parent: 'overlay', x: 0, y: 0, w: 300, h: 460, fill: '#23384a', border: '#e4c38d', radius: 18, alpha: 1, visible: 0 },
    { id: 'home_prev', kind: 'button', anchor: 'top-left', parent: 'home_panel', x: 16, y: 15, w: 42, h: 38, text: "‹", fontSize: 24, color: '#fff4d5', fill: '#425767', border: '#a4b5bb', radius: 8, alpha: 1, visible: 1 },
    { id: 'home_stage', kind: 'text', anchor: 'top-center', parent: 'home_panel', x: 0, y: 26, text: "МАЯК 1/3", fontSize: 15, color: '#e8dfc8', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'home_next', kind: 'button', anchor: 'top-right', parent: 'home_panel', x: 16, y: 15, w: 42, h: 38, text: "›", fontSize: 24, color: '#fff4d5', fill: '#425767', border: '#a4b5bb', radius: 8, alpha: 1, visible: 1 },
    { id: 'home_title', kind: 'text', anchor: 'top-center', parent: 'home_panel', x: 0, y: 69, text: "РАЙОН", fontSize: 22, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'home_body', kind: 'text', anchor: 'top-center', parent: 'home_panel', x: 0, y: 125, text: "", fontSize: 13, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'home_deck_summary', kind: 'text', anchor: 'top-center', parent: 'home_panel', x: 0, y: 242, text: "", fontSize: 13, color: '#f7dfae', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'home_deck', kind: 'button', anchor: 'bottom-center', parent: 'home_panel', x: 0, y: 91, w: 240, h: 53, text: "Колода", fontSize: 17, color: '#fff5d8', fill: '#425767', border: '#d7bd8e', radius: 10, alpha: 1, visible: 1 },
    { id: 'home_play', kind: 'button', anchor: 'bottom-center', parent: 'home_panel', x: 0, y: 23, w: 240, h: 53, text: "Начать бой", fontSize: 18, color: '#181d29', fill: '#f1c877', border: '#fff1c9', radius: 10, alpha: 1, visible: 1 },
    { id: 'menu', kind: 'panel', anchor: 'middle-center', parent: 'overlay', x: 0, y: 0, w: 300, h: 234, fill: '#25394d', border: '#e4c38d', radius: 16, alpha: 1, visible: 1 },
    { id: 'menu_title', kind: 'text', anchor: 'top-center', parent: 'menu', x: 0, y: 28, text: "НОЧНОЙ КАРАВАН", fontSize: 22, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_body', kind: 'text', anchor: 'middle-center', parent: 'menu', x: 0, y: -3, text: "", fontSize: 13, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_action', kind: 'button', anchor: 'bottom-center', parent: 'menu', x: 0, y: 22, w: 190, h: 46, text: "Начать", fontSize: 17, color: '#141926', fill: '#f1c877', border: '#fff1c9', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_panel', kind: 'panel', anchor: 'middle-center', parent: 'overlay', x: 0, y: 0, w: 300, h: 495, fill: '#25394d', border: '#e4c38d', radius: 16, alpha: 1, visible: 0 },
    { id: 'deck_back', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 12, y: 15, w: 60, h: 38, text: "Назад", fontSize: 12, color: '#fff5d8', fill: '#425767', border: '#a4b5bb', radius: 8, alpha: 1, visible: 1 },
    { id: 'deck_title', kind: 'text', anchor: 'top-center', parent: 'deck_panel', x: 0, y: 24, text: "КОЛОДА", fontSize: 20, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'deck_body', kind: 'text', anchor: 'top-center', parent: 'deck_panel', x: 0, y: 70, text: "Выберите карты для этого района", fontSize: 12, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'deck_lamp', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 14, y: 124, w: 132, h: 76, text: "Лампа", fontSize: 14, color: '#fff5d8', fill: '#644b39', border: '#ffd479', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_coil', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 154, y: 124, w: 132, h: 76, text: "Катушка", fontSize: 14, color: '#e6fdff', fill: '#354e59', border: '#66e6ed', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_signal', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 14, y: 208, w: 132, h: 76, text: "Сигнал", fontSize: 14, color: '#f4eaff', fill: '#4d3c5b', border: '#e9aff5', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_projector', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 154, y: 208, w: 132, h: 76, text: "Прожектор", fontSize: 14, color: '#fff6db', fill: '#61533b', border: '#f6dfa0', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_relay', kind: 'button', anchor: 'top-left', parent: 'deck_panel', x: 14, y: 292, w: 132, h: 76, text: "Реле", fontSize: 14, color: '#e4fff8', fill: '#395751', border: '#8dd9c1', radius: 9, alpha: 1, visible: 1 },
    { id: 'deck_tip', kind: 'text', anchor: 'top-center', parent: 'deck_panel', x: 72, y: 321, text: "4 карты", fontSize: 13, color: '#f7dfae', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'deck_confirm', kind: 'button', anchor: 'bottom-center', parent: 'deck_panel', x: 0, y: 25, w: 240, h: 53, text: "Сохранить", fontSize: 17, color: '#141926', fill: '#f1c877', border: '#fff1c9', radius: 9, alpha: 1, visible: 1 },
    { id: 'reward_panel', kind: 'panel', anchor: 'middle-center', parent: 'overlay', x: 0, y: 0, w: 300, h: 382, fill: '#25394d', border: '#e4c38d', radius: 16, alpha: 1, visible: 0 },
    { id: 'reward_title', kind: 'text', anchor: 'top-center', parent: 'reward_panel', x: 0, y: 22, text: "НАЙДЕНА УЛИКА", fontSize: 20, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'reward_body', kind: 'text', anchor: 'top-center', parent: 'reward_panel', x: 0, y: 61, text: "", fontSize: 12, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'reward_0', kind: 'button', anchor: 'top-center', parent: 'reward_panel', x: 0, y: 144, w: 272, h: 56, text: "Награда 1", fontSize: 13, color: '#fff5d8', fill: '#51453f', border: '#ffd479', radius: 8, alpha: 1, visible: 1 },
    { id: 'reward_1', kind: 'button', anchor: 'top-center', parent: 'reward_panel', x: 0, y: 208, w: 272, h: 56, text: "Награда 2", fontSize: 13, color: '#e6fdff', fill: '#344d58', border: '#66e6ed', radius: 8, alpha: 1, visible: 1 },
    { id: 'reward_2', kind: 'button', anchor: 'top-center', parent: 'reward_panel', x: 0, y: 272, w: 272, h: 56, text: "Награда 3", fontSize: 13, color: '#f4eaff', fill: '#4d3c5b', border: '#e9aff5', radius: 8, alpha: 1, visible: 1 },
];
