// All visible interface elements live here so ArcEngine's UI editor can adjust them.
const UI_LAYOUT = [
    { id: 'hud_title', kind: 'text', anchor: 'top-left', x: 14, y: 10, text: 'NIGHT CARAVAN', fontSize: 18, color: '#f6dca4', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_level', kind: 'text', anchor: 'top-left', x: 14, y: 36, text: '', fontSize: 13, color: '#e6e1d7', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_credits', kind: 'text', anchor: 'top-right', x: 14, y: 10, text: '', fontSize: 16, color: '#f6dca4', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_health', kind: 'text', anchor: 'top-right', x: 14, y: 36, text: '', fontSize: 13, color: '#e6e1d7', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_progress', kind: 'bar', anchor: 'top-center', x: 0, y: 61, w: 240, h: 8, value: 0, color: '#71d6c5', fill: '#151b2b', border: '#baa46d', radius: 4, alpha: 0.95, visible: 1 },
    { id: 'hud_phase', kind: 'text', anchor: 'top-center', x: 0, y: 77, text: '', fontSize: 12, color: '#e6e1d7', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'hud_tip', kind: 'text', anchor: 'bottom-center', x: 0, y: 145, text: '', fontSize: 13, color: '#ffffff', shadow: '#11101c', alpha: 1, visible: 1 },
    { id: 'controls', kind: 'panel', anchor: 'bottom-center', x: 0, y: 12, w: 310, h: 124, fill: '#101625', border: '#806f59', radius: 14, alpha: 0.93, visible: 1 },
    { id: 'lamp', kind: 'button', parent: 'controls', anchor: 'top-left', x: 8, y: 8, w: 93, h: 48, text: 'Лампа · 80', fontSize: 12, color: '#fff5d8', fill: '#383c4c', border: '#d8b86b', radius: 8, alpha: 1, visible: 1 },
    { id: 'coil', kind: 'button', parent: 'controls', anchor: 'top-left', x: 108, y: 8, w: 93, h: 48, text: 'Катушка · 130', fontSize: 12, color: '#e6fdff', fill: '#293f51', border: '#69c8dd', radius: 8, alpha: 1, visible: 1 },
    { id: 'signal', kind: 'button', parent: 'controls', anchor: 'top-left', x: 208, y: 8, w: 93, h: 48, text: 'Сигнал · 105', fontSize: 12, color: '#f4eaff', fill: '#423952', border: '#b896d9', radius: 8, alpha: 1, visible: 1 },
    { id: 'upgrade', kind: 'button', parent: 'controls', anchor: 'bottom-left', x: 8, y: 8, w: 93, h: 48, text: 'Улучшить', fontSize: 12, color: '#fff5d8', fill: '#5d4836', border: '#d8b86b', radius: 8, alpha: 1, visible: 1 },
    { id: 'sell', kind: 'button', parent: 'controls', anchor: 'bottom-left', x: 108, y: 8, w: 93, h: 48, text: 'Продать', fontSize: 12, color: '#ffffff', fill: '#4b3841', border: '#b98793', radius: 8, alpha: 1, visible: 1 },
    { id: 'pause', kind: 'button', parent: 'controls', anchor: 'bottom-left', x: 208, y: 8, w: 93, h: 48, text: 'Пауза', fontSize: 12, color: '#ffffff', fill: '#394450', border: '#a7b7c2', radius: 8, alpha: 1, visible: 1 },
    { id: 'overlay', kind: 'panel', anchor: 'top-left', stretch: 'both', x: 0, y: 0, fill: '#090c17', border: '', radius: 0, alpha: 0.74, visible: 1 },
    { id: 'menu', kind: 'panel', parent: 'overlay', anchor: 'middle-center', x: 0, y: 0, w: 300, h: 234, fill: '#172033', border: '#c6a96a', radius: 16, alpha: 1, visible: 1 },
    { id: 'menu_title', kind: 'text', parent: 'menu', anchor: 'top-center', x: 0, y: 28, text: 'НОЧНОЙ КАРАВАН', fontSize: 22, color: '#f5d590', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_body', kind: 'text', parent: 'menu', anchor: 'middle-center', x: 0, y: -3, text: '', fontSize: 13, color: '#e8e4da', shadow: '#090c17', alpha: 1, visible: 1 },
    { id: 'menu_action', kind: 'button', parent: 'menu', anchor: 'bottom-center', x: 0, y: 22, w: 190, h: 46, text: 'Начать', fontSize: 17, color: '#141926', fill: '#f1c877', border: '#fff1c9', radius: 9, alpha: 1, visible: 1 }
];
