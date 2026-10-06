// ArcEngine presentation and input for the pure convoy simulation in TDCore.js.
class Game {
    /** @param {{ location: Location3D, camera: CameraController }} app */
    constructor(app) {
        this.app = app;
        this.view = app.location.view;
        this.scene = this.view.scene;
        this.canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('world3d'));
        this.materials = new Map();
        this.meshes = [];
        this.enemyMeshes = new Map();
        this.towerMeshes = new Map();
        this.beams = [];
        this.selectedType = 'lamp';
        this.selectedSite = null;
        this.locale = 'ru';
        this.progress = Store.getJSON('nyc_td_progress_v1', { unlocked: 0, best: [0, 0, 0] });
        this.pointerStart = null;
        this.tip = '';
        this.phaseTip = '';
        this.phaseTipTime = 0;
        this.uiTimer = 0;
        this.prepared = false;
        this.menuAction = () => this.prepare();
        this.bindUI();
        this.loadLevel(Math.min(TD_LEVELS.length - 1, Math.max(0, Number(this.progress.unlocked) || 0)));
    }

    tr(ru, en) { return this.locale === 'en' ? en : ru; }

    setLocale(locale) {
        this.locale = locale === 'ru' ? 'ru' : 'en';
        if (this.core && this.core.state === 'ready' && !this.prepared) this.showReadyMenu();
        this.refreshUI();
    }

    ui(id) { return UI.get(id); }
    write(id, value) { const el = this.ui(id); if (el) el.setText(value); }

    bindUI() {
        for (const type of ['lamp', 'coil', 'signal']) {
            const button = this.ui(type);
            if (button) button.onClick(() => {
                this.selectedType = type;
                this.selectedSite = null;
                const hints = {
                    lamp: this.tr('Лампа прожигает броню носильщиков', 'Lamp burns through porter armor'),
                    coil: this.tr('Катушка цепной молнией бьёт стаи', 'Coil chains lightning through swarms'),
                    signal: this.tr('Сигнал раскрывает духов и тормозит толпу', 'Signal reveals spirits and slows crowds')
                };
                this.tip = hints[type];
                this.refreshUI();
            });
        }
        const upgrade = this.ui('upgrade');
        if (upgrade) upgrade.onClick(() => this.upgradeSelected());
        const sell = this.ui('sell');
        if (sell) sell.onClick(() => this.sellSelected());
        const pause = this.ui('pause');
        if (pause) pause.onClick(() => this.togglePause());
        const action = this.ui('menu_action');
        if (action) action.onClick(() => this.menuAction());
        this.canvas.addEventListener('pointerdown', e => { this.pointerStart = { x: e.clientX, y: e.clientY }; });
        this.canvas.addEventListener('pointerup', e => {
            const start = this.pointerStart;
            this.pointerStart = null;
            if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 9) return;
            this.pickSite(e);
        });
    }

    pickSite(event) {
        if (this.core.state === 'won' || this.core.state === 'lost') return;
        const rect = this.canvas.getBoundingClientRect();
        const point = this.view.pointerToGround(event.clientX - rect.left, event.clientY - rect.top, 0);
        if (!point) return;
        let site = null, best = 44;
        for (const candidate of this.core.level.sites) {
            const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
            if (d < best) { best = d; site = candidate; }
        }
        if (!site) return;
        this.selectedSite = site.id;
        const tower = this.core.getTower(site.id);
        if (!tower) {
            if (this.core.place(site.id, this.selectedType)) {
                this.createTowerMesh(this.core.getTower(site.id));
                this.tip = this.tr('Башня построена', 'Tower built');
            } else this.tip = this.tr('Недостаточно монет', 'Not enough coins');
        } else this.tip = this.tr('Выберите улучшение или продажу', 'Choose upgrade or sell');
        this.refreshUI();
    }

    upgradeSelected() {
        if (!this.selectedSite || !this.core.getTower(this.selectedSite)) {
            this.tip = this.tr('Сначала выберите башню', 'Select a tower first');
        } else if (this.core.upgrade(this.selectedSite)) {
            const mesh = this.towerMeshes.get(this.selectedSite);
            if (mesh) mesh.scaling.y = 1 + 0.18 * (this.core.getTower(this.selectedSite).level - 1);
            this.tip = this.tr('Башня улучшена', 'Tower upgraded');
        } else this.tip = this.tr('Не хватает монет или максимум уровня', 'Not enough coins or max level');
        this.refreshUI();
    }

    sellSelected() {
        if (this.selectedSite && this.core.sell(this.selectedSite)) {
            const mesh = this.towerMeshes.get(this.selectedSite);
            if (mesh) this.removeMesh(mesh);
            this.towerMeshes.delete(this.selectedSite);
            this.tip = this.tr('Башня продана', 'Tower sold');
            this.selectedSite = null;
        } else this.tip = this.tr('Сначала выберите башню', 'Select a tower first');
        this.refreshUI();
    }

    togglePause() {
        if (this.core.state === 'ready') this.start();
        else if (this.core.state === 'playing') {
            this.core.setPaused(true);
            this.showMenu(this.tr('Пауза', 'Paused'), this.tr('Караван ждёт вашего приказа.', 'The convoy awaits your order.'),
                this.tr('Продолжить', 'Resume'), () => this.resume());
        } else if (this.core.state === 'paused') this.resume();
        this.refreshUI();
    }

    resume() {
        this.core.setPaused(false);
        const overlay = this.ui('overlay');
        if (overlay) overlay.show(false);
        this.syncGameplay();
    }

    start() {
        if (this.core.start()) {
            const overlay = this.ui('overlay');
            if (overlay) overlay.show(false);
            this.tip = this.tr('Защитите караван до выхода из района', 'Protect the convoy to the district exit');
            this.syncGameplay();
            this.refreshUI();
        }
    }

    prepare() {
        if (this.core.state !== 'ready') return;
        this.prepared = true;
        const overlay = this.ui('overlay');
        if (overlay) overlay.show(false);
        this.tip = this.tr('Поставьте башни, затем нажмите «В путь»', 'Build towers, then press Go');
        this.refreshUI();
    }

    loadLevel(index) {
        this.clearScene();
        this.levelIndex = index;
        this.core = new TDCore(TD_LEVELS[index]);
        this.selectedSite = null;
        this.selectedType = 'lamp';
        this.prepared = false;
        this.phaseTip = '';
        this.phaseTipTime = 0;
        this.drawDistrict();
        this.cameraAnchor = { x: 0, y: 0 };
        this.updateCameraAnchor();
        this.app.camera.follow(this.cameraAnchor);
        this.app.camera.home();
        this.showReadyMenu();
        this.refreshUI();
        this.syncGameplay();
    }

    showReadyMenu() {
        if (!this.core) return;
        this.showMenu(
            this.tr('НОЧНОЙ КАРАВАН', 'NIGHT CARAVAN'),
            this.tr('Доведите караван через район.\nЛампа — броня; катушка — стаи.\nДухов сначала раскрывает сигнал.\nНовые фазы дают +75 монет.',
                'Escort the convoy across town.\nLamp: armor; coil: swarms.\nSignal must reveal spirits first.\nEach new phase grants 75 coins.'),
            this.tr('Подготовить', 'Prepare'), () => this.prepare()
        );
    }

    showMenu(title, body, action, handler) {
        this.write('menu_title', title);
        this.write('menu_body', body);
        this.write('menu_action', action);
        this.menuAction = handler;
        const overlay = this.ui('overlay');
        if (overlay) overlay.show(true);
        this.syncGameplay();
    }

    finish() {
        const won = this.core.state === 'won';
        if (won) {
            const best = Array.isArray(this.progress.best) ? this.progress.best : [0, 0, 0];
            best[this.levelIndex] = Math.max(Number(best[this.levelIndex]) || 0, this.core.score);
            this.progress.best = best;
            this.progress.unlocked = Math.max(Number(this.progress.unlocked) || 0,
                Math.min(TD_LEVELS.length - 1, this.levelIndex + 1));
            Store.set('nyc_td_progress_v1', JSON.stringify(this.progress));
        }
        const next = won ? (this.levelIndex + 1) % TD_LEVELS.length : this.levelIndex;
        this.showMenu(
            won ? this.tr('Маршрут пройден', 'Route cleared') : this.tr('Караван потерян', 'Convoy lost'),
            won ? this.tr('Очки: ' + this.core.score + '\nОсталось здоровья: ' + this.core.convoy.hp,
                'Score: ' + this.core.score + '\nHealth left: ' + this.core.convoy.hp)
                : this.tr('Лампа ломает броню; катушка бьёт стаю.\nДухов сначала раскройте сигналом.',
                    'Lamp breaks armor; coil hits swarms.\nReveal spirits with signal first.'),
            won ? (this.levelIndex + 1 < TD_LEVELS.length ? this.tr('Следующий район', 'Next district') : this.tr('Начать заново', 'Play again'))
                : this.tr('Повторить', 'Retry'),
            () => this.loadLevel(next)
        );
        this.syncGameplay();
    }

    syncGameplay() {
        if (typeof YandexBridge !== 'undefined') YandexBridge.setGameplay(this.core && this.core.state === 'playing');
    }

    refreshUI() {
        if (!this.core) return;
        const c = this.core;
        this.write('hud_title', this.tr('НОЧНОЙ КАРАВАН', 'NIGHT CARAVAN'));
        this.write('hud_level', (this.levelIndex + 1) + '/3 · ' + c.level.name[this.locale]);
        this.write('hud_credits', this.tr('Монеты: ', 'Coins: ') + c.credits);
        this.write('hud_health', this.tr('Караван: ', 'Convoy: ') + c.convoy.hp + '/' + c.convoy.maxHp);
        this.write('hud_phase', this.tr('Угроза ', 'Threat ') + c.phase + '/3');
        this.write('hud_tip', this.tip || this.tr('Выберите башню и точку на улице', 'Choose a tower and a street site'));
        const towerButtons = {
            lamp: { text: this.tr('ЛАМПА\nБроня', 'LAMP\nArmor'), color: '#ffd479', fill: '#664630' },
            coil: { text: this.tr('КАТУШКА\nСтая', 'COIL\nSwarm'), color: '#66e6ed', fill: '#254d5b' },
            signal: { text: this.tr('СИГНАЛ\nДухи', 'SIGNAL\nSpirits'), color: '#e9aff5', fill: '#503b62' }
        };
        for (const [type, style] of Object.entries(towerButtons)) {
            this.write(type, style.text + ' · ' + TDCore.TOWERS[type].cost);
            const button = this.ui(type);
            if (button) {
                button.def.fill = this.selectedType === type ? style.fill : '#263544';
                button.def.border = style.color;
                button.apply();
            }
        }
        this.write('pause', c.state === 'ready' ? this.tr('В путь', 'Go')
            : c.state === 'paused' ? this.tr('Продолжить', 'Resume') : this.tr('Пауза', 'Pause'));
        this.write('sell', this.tr('Продать', 'Sell'));
        const tower = this.selectedSite && c.getTower(this.selectedSite);
        this.write('upgrade', tower && tower.level < 3 ? this.tr('Улучшить ', 'Upgrade ') + TDCore.upgradeCost(tower) : this.tr('Улучшить', 'Upgrade'));
        const progress = this.ui('hud_progress');
        if (progress) progress.setValue(c.distance / c.route.total);
    }

    material(hex, kind = 'prop', glow = false) {
        const key = kind + hex + glow;
        if (!this.materials.has(key)) {
            const mat = new BABYLON.StandardMaterial('td-' + key, this.scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString(hex);
            mat.specularColor = BABYLON.Color3.Black();
            if (glow) mat.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(0.62);
            this.materials.set(key, mat);
        }
        return this.materials.get(key);
    }

    warmWashMaterial() {
        const key = 'warm-wash';
        if (!this.materials.has(key)) {
            const texture = new BABYLON.DynamicTexture('warm-wash-gradient',
                { width: 64, height: 64 }, this.scene, false);
            const context = texture.getContext();
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255,255,255,0.82)');
            gradient.addColorStop(0.42, 'rgba(255,255,255,0.43)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
            texture.hasAlpha = true;
            texture.update();
            const material = new BABYLON.StandardMaterial('td-warm-wash', this.scene);
            material.diffuseTexture = texture;
            material.diffuseColor = BABYLON.Color3.FromHexString('#ffd7a3');
            material.emissiveColor = BABYLON.Color3.FromHexString('#ffc98c').scale(0.8);
            material.useAlphaFromDiffuseTexture = true;
            material.alpha = 0.7;
            material.disableLighting = true;
            material.backFaceCulling = false;
            material.disableDepthWrite = true;
            this.materials.set(key, material);
        }
        return this.materials.get(key);
    }

    track(mesh, kind = 'prop', opts = {}) {
        World3D.addObject(this.view, mesh, kind, opts);
        this.meshes.push(mesh);
        return mesh;
    }

    removeMesh(mesh) {
        World3D.removeObject(this.view, mesh);
        const index = this.meshes.indexOf(mesh);
        if (index >= 0) this.meshes.splice(index, 1);
    }

    box(name, w, h, d, x, y, z, hex, kind = 'prop', opts = {}) {
        const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
        mesh.position.set(x, y, z);
        mesh.material = this.material(hex, kind);
        return this.track(mesh, kind, opts);
    }

    childBox(parent, name, w, h, d, x, y, z, hex, glow = false) {
        const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
        mesh.parent = parent;
        mesh.position.set(x, y, z);
        mesh.material = this.material(hex, 'actor', glow);
        return mesh;
    }

    childCylinder(parent, name, diameter, height, x, y, z, hex, glow = false, tessellation = 8) {
        const mesh = BABYLON.MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, this.scene);
        mesh.parent = parent;
        mesh.position.set(x, y, z);
        mesh.material = this.material(hex, 'actor', glow);
        return mesh;
    }

    nearSegment(x, y, a, b, limit) {
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t)) < limit;
    }

    // Buildings use a conservative bounding circle. The clearances include the road,
    // the footprint and the porter's wide shield, so no enemy can clip a facade.
    clearBuildingSite(x, y, width, alleys) {
        const radius = width * Math.SQRT2 / 2;
        return !this.nearRoute(x, y, radius + 63) &&
            !alleys.some(([a, b]) => this.nearSegment(x, y, a, b, radius + 54)) &&
            !this.core.level.sites.some(s => Math.hypot(s.x - x, s.y - y) < radius + 43);
    }

    roadMark(x, y, horizontal, color) {
        this.box('lane-mark', horizontal ? 29 : 3, 1, horizontal ? 3 : 29,
            x, 4.25, y, color, 'prop', { castShadow: false, ink: false, outline: false });
    }

    drawDistrict() {
        const level = this.core.level;
        const roadColor = ['#6b8291', '#64808a', '#718998'][this.levelIndex];
        this.box('district-pavement', 1196, 2, 896, 600, 0, 450,
            ['#576a79', '#526e77', '#596c79'][this.levelIndex], 'prop',
            { castShadow: false, ink: false, outline: false });
        for (let i = 1; i < level.path.length; i++) {
            const a = level.path[i - 1], b = level.path[i];
            const horizontal = a[1] === b[1];
            const w = horizontal ? Math.abs(b[0] - a[0]) + 92 : 92;
            const d = horizontal ? 92 : Math.abs(b[1] - a[1]) + 92;
            this.box('street', w, 3, d, (a[0] + b[0]) / 2, 2, (a[1] + b[1]) / 2,
                roadColor, 'prop', { castShadow: false, ink: false, outline: false });
            const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const count = Math.max(0, Math.floor((distance - 40) / 74));
            for (let n = 1; n <= count; n++) {
                const t = n / (count + 1);
                this.roadMark(a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t, horizontal, '#e0be7f');
            }
        }
        const alleys = level.spawns.map(spawn => {
            const entry = TDCore.projectOnRoute(this.core.route, spawn[0], spawn[1]);
            const length = Math.hypot(entry.x - spawn[0], entry.y - spawn[1]);
            const road = this.box('spawn-alley', length + 42, 3, 42,
                (spawn[0] + entry.x) / 2, 3, (spawn[1] + entry.y) / 2,
                '#847e8e', 'prop', { castShadow: false, ink: false, outline: false });
            road.rotation.y = -Math.atan2(entry.y - spawn[1], entry.x - spawn[0]);
            return [spawn, [entry.x, entry.y]];
        });
        let seed = 991 + this.levelIndex * 101;
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
        const palette = ['#b98d78', '#9b91a3', '#8da8ab', '#c09b7d', '#9a85a3'];
        const signs = ['#ffcf7b', '#76e7e8', '#f4a5d8'];
        const windowPanes = { '#76e7e8': [], '#ffdd9a': [] };
        const warmPools = [];
        const warmFacades = [];
        for (let x = 80; x < 1200; x += 115) for (let y = 80; y < 880; y += 110) {
            const cx = x + (random() - 0.5) * 22, cy = y + (random() - 0.5) * 22;
            const height = 78 + random() * 110;
            const width = 53 + random() * 26;
            if (!this.clearBuildingSite(cx, cy, width, alleys)) continue;
            this.box('brownstone', width, height, width, cx, height / 2, cy,
                palette[Math.floor(random() * palette.length)], 'prop', { ink: false, outline: false });
            this.box('roof-cornice', width + 7, 8, width + 7, cx, height - 3, cy,
                '#3f5665', 'prop', { castShadow: false, ink: false, outline: false });
            this.box('art-deco-crown', width * 0.7, 10, width * 0.7, cx, height + 5, cy,
                '#d5b993', 'prop', { castShadow: false, ink: false, outline: false });
            for (const offset of [-width * 0.22, width * 0.22]) {
                this.box('facade-pilaster', 5, height * 0.69, 3, cx + offset * 1.7,
                    height * 0.48, cy + width / 2 + 2, '#d6b98d', 'prop',
                    { castShadow: false, ink: false, outline: false });
                const glass = random() < 0.35 ? '#76e7e8' : '#ffdd9a';
                windowPanes[glass].push({ x: cx + offset, y: cy + width / 2 + 3, h: height * 0.57 });
                windowPanes[glass].push({ x: cx - width / 2 - 3, y: cy + offset,
                    h: height * 0.57, heading: Math.PI / 2 });
            }
            if (random() < 0.32) {
                const sign = this.box('marquee', width * 0.75, 14, 3, cx, 30, cy + width / 2 + 4,
                    '#f6bc68', 'prop', { castShadow: false, ink: false, outline: false });
                sign.material = this.material(signs[Math.floor(random() * signs.length)], 'prop', true);
            }
            const lanternHash = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^
                Math.imul(this.levelIndex + 1, 83492791)) >>> 0;
            if (lanternHash % 11 < 2) {
                const wall = cy + width / 2;
                const sconceY = Math.max(34, height * 0.36);
                this.box('sconce-bracket', 5, 6, 18, cx, sconceY + 5, wall + 8,
                    '#674e53', 'prop', { castShadow: false, ink: false, outline: false });
                const lantern = this.box('warm-lantern', 13, 16, 9, cx, sconceY, wall + 20,
                    '#ffd394', 'prop', { castShadow: false, ink: false, outline: false });
                lantern.material = this.material('#ffd394', 'prop', true);
                this.box('lantern-cap', 18, 4, 13, cx, sconceY + 10, wall + 20,
                    '#534c59', 'prop', { castShadow: false, ink: false, outline: false });
                warmPools.push({ x: cx, y: wall + 43, h: 4.1, scale: [114, 1, 108] });
                warmFacades.push({ x: cx, y: wall + 1.5, h: sconceY + 13,
                    scale: [width * 1.02, height * 0.56, 1] });
            }
            if (random() < 0.26) {
                this.box('rooftop-water-tank', 25, 19, 25, cx + width * 0.2, height + 19, cy,
                    '#617c89', 'prop', { ink: false, outline: false });
            }
        }
        for (const [glass, panes] of Object.entries(windowPanes)) {
            if (!panes.length) continue;
            const source = BABYLON.MeshBuilder.CreateBox('lit-window-batch',
                { width: 11, height: 20, depth: 2 }, this.scene);
            source.material = this.material(glass, 'prop', true);
            const group = World3D.addInstances(this.view, source, 'prop', panes,
                { castShadow: false, ink: false, outline: false });
            if (group.ok) this.meshes.push(group.root);
            else source.dispose();
        }
        if (warmPools.length) {
            // Soft static washes: two thin-instance draws, no per-building point lights.
            const pool = BABYLON.MeshBuilder.CreateGround('warm-light-pools',
                { width: 1, height: 1 }, this.scene);
            pool.material = this.warmWashMaterial();
            pool.isPickable = false;
            const group = World3D.addInstances(this.view, pool, 'prop', warmPools,
                { castShadow: false, receiveShadows: false, ink: false, outline: false });
            if (group.ok) this.meshes.push(group.root);
            else pool.dispose();
            const facade = BABYLON.MeshBuilder.CreatePlane('warm-facade-washes',
                { width: 1, height: 1 }, this.scene);
            facade.material = this.warmWashMaterial();
            facade.isPickable = false;
            const facadeGroup = World3D.addInstances(this.view, facade, 'prop', warmFacades,
                { castShadow: false, receiveShadows: false, ink: false, outline: false });
            if (facadeGroup.ok) this.meshes.push(facadeGroup.root);
            else facade.dispose();
        }
        for (const [spawn, entry] of alleys) {
            const mark = BABYLON.MeshBuilder.CreateCylinder('rift', { diameter: 38, height: 3, tessellation: 12 }, this.scene);
            mark.position.set(spawn[0], 5, spawn[1]);
            mark.material = this.material('#db71c5', 'prop', true);
            this.track(mark, 'prop', { castShadow: false, ink: false, outline: false });
            const dx = entry[0] - spawn[0], dy = entry[1] - spawn[1];
            const length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
            for (const side of [-1, 1]) {
                this.box('rift-gate-post', 9, 68, 9, spawn[0] + nx * side * 58, 39,
                    spawn[1] + ny * side * 58, '#b49bc1', 'prop', { ink: false, outline: false });
            }
            const lintel = this.box('rift-gate-lintel', 126, 10, 10, spawn[0], 78, spawn[1],
                '#e4a4d4', 'prop', { castShadow: false, ink: false, outline: false });
            lintel.rotation.y = -Math.atan2(dy, dx) - Math.PI / 2;
        }
        for (const site of level.sites) {
            const mark = BABYLON.MeshBuilder.CreateCylinder('tower-site', { diameter: 42, height: 5, tessellation: 8 }, this.scene);
            mark.position.set(site.x, 7, site.y);
            mark.material = this.material('#ffd978', 'prop', true);
            this.track(mark, 'prop', { castShadow: false, ink: false, outline: false });
        }
        const wagon = this.box('convoy', 58, 18, 32, this.core.convoy.x, 17, this.core.convoy.y, '#c18862', 'actor');
        const roof = BABYLON.MeshBuilder.CreateBox('convoy-roof', { width: 35, height: 18, depth: 30 }, this.scene);
        roof.parent = wagon;
        roof.position.set(-5, 17, 0);
        roof.material = this.material('#e2c88f', 'actor');
        const lamp = BABYLON.MeshBuilder.CreateSphere('convoy-lamp', { diameter: 13, segments: 8 }, this.scene);
        lamp.parent = wagon;
        lamp.position.set(31, 8, 0);
        lamp.material = this.material('#ffe29b', 'actor', true);
        this.convoyMesh = wagon;
    }

    nearRoute(x, y, limit) {
        const path = this.core.level.path;
        return path.slice(1).some((b, i) => this.nearSegment(x, y, path[i], b, limit));
    }

    updateCameraAnchor() {
        if (!this.cameraAnchor) return;
        // Keep the action near the edge of the frame while showing the district ahead.
        const convoy = this.core.convoy;
        this.cameraAnchor.x = convoy.x * 0.72 + LOCATION_WIDTH * 0.5 * 0.28;
        this.cameraAnchor.y = convoy.y * 0.72 + LOCATION_HEIGHT * 0.5 * 0.28;
    }

    createTowerMesh(tower) {
        if (!tower) return;
        const colors = { lamp: '#ffd875', coil: '#59dce9', signal: '#db96eb' };
        const base = BABYLON.MeshBuilder.CreateCylinder('tower-' + tower.type,
            { diameter: 35, height: 17, tessellation: 8 }, this.scene);
        base.position.set(tower.x, 18, tower.y);
        base.material = this.material('#4a5263', 'actor');
        if (tower.type === 'lamp') {
            this.childCylinder(base, 'lamp-post', 9, 34, 0, 24, 0, '#b78854');
            this.childCylinder(base, 'lamp-lantern', 23, 22, 0, 45, 0, '#ffd875', true, 6);
            this.childCylinder(base, 'lamp-cap', 30, 5, 0, 58, 0, '#5a4150');
        } else if (tower.type === 'coil') {
            this.childCylinder(base, 'coil-core', 14, 37, 0, 27, 0, '#354e69');
            for (const y of [19, 34, 48]) {
                const ring = BABYLON.MeshBuilder.CreateTorus('coil-ring', { diameter: 32, thickness: 5, tessellation: 8 }, this.scene);
                ring.parent = base; ring.position.y = y;
                ring.material = this.material('#59dce9', 'actor', true);
            }
        } else {
            this.childCylinder(base, 'signal-mast', 8, 32, 0, 22, 0, '#9176ac');
            const dish = BABYLON.MeshBuilder.CreateCylinder('signal-dish',
                { diameterTop: 40, diameterBottom: 16, height: 12, tessellation: 8 }, this.scene);
            dish.parent = base; dish.position.y = 45;
            dish.material = this.material('#b987df', 'actor');
            this.childCylinder(base, 'signal-beacon', 12, 12, 0, 54, 0, '#f4b4ff', true);
        }
        this.track(base, 'actor');
        this.towerMeshes.set(tower.siteId, base);
    }

    createEnemyMesh(enemy) {
        const type = enemy.type;
        const colors = { runner: '#71545c', wraith: '#965e80', moth: '#e49d52', porter: '#8294a0' };
        const mesh = BABYLON.MeshBuilder.CreateBox('enemy-' + type + '-' + enemy.id,
            { width: type === 'porter' ? 34 : 22, height: type === 'porter' ? 29 : 20,
                depth: type === 'porter' ? 28 : 18 }, this.scene);
        const baseY = type === 'porter' ? 23 : type === 'moth' ? 17 : 18;
        mesh.position.set(enemy.x, baseY, enemy.y);
        mesh.metadata = { baseY };
        mesh.material = this.material(colors[type], 'actor');
        const orb = (name, diameter, x, y, z, color, glow = false) => {
            const part = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 6 }, this.scene);
            part.parent = mesh; part.position.set(x, y, z);
            part.material = this.material(color, 'actor', glow);
            return part;
        };
        if (type === 'runner') {
            this.childCylinder(mesh, 'bell-head', 28, 21, 0, 23, 0, '#bc9256', false, 8);
            orb('bell-eye', 9, 0, 23, -15, '#ff9e43', true);
            this.childBox(mesh, 'satchel', 13, 12, 9, 15, -1, 0, '#9c6f4f');
            this.childBox(mesh, 'ribbon-left', 5, 17, 3, -16, 7, 0, '#5ae4e8', true);
            this.childBox(mesh, 'ribbon-right', 5, 17, 3, 16, 7, 0, '#5ae4e8', true);
            this.childBox(mesh, 'runner-boot-left', 8, 8, 12, -9, -11, -2, '#493b4d');
            this.childBox(mesh, 'runner-boot-right', 8, 8, 12, 9, -11, -2, '#493b4d');
        } else if (type === 'wraith') {
            orb('ticket-mask', 25, 0, 21, 0, '#ead9be');
            this.childCylinder(mesh, 'conductor-cap', 28, 7, 0, 36, 0, '#743a51');
            this.childBox(mesh, 'ticket-left', 11, 15, 2, -19, 7, 0, '#fff0be', true);
            this.childBox(mesh, 'ticket-right', 11, 15, 2, 19, 7, 0, '#fff0be', true);
            orb('wraith-eye', 5, 0, 22, -13, '#ffbf7a', true);
        } else if (type === 'moth') {
            orb('marquee-bulb', 28, 0, 9, 0, '#ffb142', true);
            const left = this.childBox(mesh, 'moth-wing-left', 22, 3, 30, -18, 12, 0, '#52dce5', true);
            const right = this.childBox(mesh, 'moth-wing-right', 22, 3, 30, 18, 12, 0, '#e77fcf', true);
            left.rotation.z = -0.35; right.rotation.z = 0.35;
            mesh.metadata.wings = [left, right];
            orb('moth-eye', 7, 0, 1, -12, '#fff3af', true);
        } else {
            this.childBox(mesh, 'porter-shoulder-left', 16, 21, 28, -25, 7, 0, '#68747e');
            this.childBox(mesh, 'porter-shoulder-right', 16, 21, 28, 25, 7, 0, '#68747e');
            this.childBox(mesh, 'porter-gate-shield', 10, 39, 34, -37, 3, -4, '#8b654d');
            this.childCylinder(mesh, 'porter-head', 19, 20, 0, 27, 0, '#6b6e77');
            this.childBox(mesh, 'porter-eye', 12, 11, 3, 0, 27, -11, '#ec7bdb', true);
            this.childBox(mesh, 'porter-rune', 5, 23, 2, 10, 0, -15, '#57dbdf', true);
        }
        const barY = type === 'porter' ? 55 : 47;
        this.childBox(mesh, 'enemy-health-back', 33, 5, 3, 0, barY, 0, '#172534');
        mesh.metadata.healthFill = this.childBox(mesh, 'enemy-health', 29, 3, 4,
            0, barY, -1, type === 'wraith' ? '#f0b8e5' : '#87eed1', true);
        this.track(mesh, 'actor', { ink: false, outline: false });
        this.enemyMeshes.set(enemy.id, mesh);
    }

    addEffect(mesh, life, spread = 0) {
        mesh.isPickable = false;
        this.beams.push({ mesh, life, maxLife: life, spread });
    }

    hitSpark(x, y, color, diameter = 14) {
        const spark = BABYLON.MeshBuilder.CreateSphere('hit-spark', { diameter, segments: 6 }, this.scene);
        spark.position.set(x, 29, y);
        spark.material = this.material(color, 'actor', true);
        this.addEffect(spark, 0.22, 0.9);
    }

    fireEffect(event) {
        const targets = event.targets || [];
        if (!targets.length) return;
        if (event.type === 'signal') {
            const wave = BABYLON.MeshBuilder.CreateTorus('signal-wave',
                { diameter: 42, thickness: 5, tessellation: 24 }, this.scene);
            wave.position.set(event.x, 10, event.y);
            wave.material = this.material('#e8adfa', 'actor', true);
            this.addEffect(wave, 0.5, 5.8);
            for (const target of targets) {
                const seal = BABYLON.MeshBuilder.CreateTorus('spirit-seal',
                    { diameter: 25, thickness: 3, tessellation: 12 }, this.scene);
                seal.position.set(target.x, 9, target.y);
                seal.material = this.material('#e8adfa', 'actor', true);
                this.addEffect(seal, 0.45, 1.7);
            }
            return;
        }
        let from = new BABYLON.Vector3(event.x, 64, event.y);
        for (const target of targets) {
            const to = new BABYLON.Vector3(target.x, 29, target.y);
            if (event.type === 'lamp') {
                const beam = BABYLON.MeshBuilder.CreateTube('lamp-beam',
                    { path: [from, to], radius: 4, tessellation: 6 }, this.scene);
                beam.material = this.material('#ffce73', 'actor', true);
                this.addEffect(beam, 0.16);
                this.hitSpark(target.x, target.y, '#ffdf8f', 17);
            } else {
                const delta = to.subtract(from), side = new BABYLON.Vector3(-delta.z, 0, delta.x).normalize();
                const wobble = (this.core.time * 19 + target.x * 0.13 + target.y * 0.07);
                const path = [from];
                for (let i = 1; i < 5; i++) {
                    const t = i / 5;
                    path.push(from.add(delta.scale(t)).add(side.scale(Math.sin(wobble + i * 3.2) * 11)));
                }
                path.push(to);
                const arc = BABYLON.MeshBuilder.CreateTube('coil-lightning',
                    { path, radius: 2.5, tessellation: 5 }, this.scene);
                arc.material = this.material('#6debf4', 'actor', true);
                this.addEffect(arc, 0.24);
                this.hitSpark(target.x, target.y, '#8df5ff', 11);
            }
            from = to;
        }
    }

    syncMeshes() {
        const c = this.core;
        this.convoyMesh.position.set(c.convoy.x, 17, c.convoy.y);
        const a = TDCore.pointAt(c.route, Math.max(0, c.distance - 3));
        const b = TDCore.pointAt(c.route, Math.min(c.route.total, c.distance + 3));
        this.convoyMesh.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
        const alive = new Set();
        for (const enemy of c.enemies) {
            alive.add(enemy.id);
            if (!this.enemyMeshes.has(enemy.id)) this.createEnemyMesh(enemy);
            const mesh = this.enemyMeshes.get(enemy.id);
            const dx = enemy.x - mesh.position.x, dy = enemy.y - mesh.position.z;
            if (Math.hypot(dx, dy) > 0.1) mesh.rotation.y = -Math.atan2(dy, dx);
            const bob = enemy.type === 'wraith' ? Math.sin(c.time * 4 + enemy.id) * 3
                : enemy.type === 'moth' ? Math.sin(c.time * 9 + enemy.id) * 3
                    : enemy.type === 'runner' ? Math.abs(Math.sin(c.time * 12 + enemy.id)) * 2 : 0;
            mesh.position.set(enemy.x, mesh.metadata.baseY + bob, enemy.y);
            if (mesh.metadata.healthFill) {
                const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
                mesh.metadata.healthFill.scaling.x = ratio;
                mesh.metadata.healthFill.position.x = -(1 - ratio) * 14.5;
            }
            if (mesh.metadata.wings) {
                const flap = Math.sin(c.time * 15 + enemy.id) * 0.24;
                mesh.metadata.wings[0].rotation.z = -0.35 - flap;
                mesh.metadata.wings[1].rotation.z = 0.35 + flap;
            }
        }
        for (const [id, mesh] of this.enemyMeshes) if (!alive.has(id)) {
            this.removeMesh(mesh);
            this.enemyMeshes.delete(id);
        }
        for (const event of c.events) if (event.kind === 'shot') this.fireEffect(event);
    }

    clearScene() {
        if (this.meshes) for (const mesh of [...this.meshes]) this.removeMesh(mesh);
        if (this.beams) for (const beam of this.beams) beam.mesh.dispose();
        this.meshes = [];
        this.beams = [];
        this.enemyMeshes = new Map();
        this.towerMeshes = new Map();
    }

    update(dt) {
        if (!this.core) return;
        const oldState = this.core.state;
        this.core.update(dt);
        this.updateCameraAnchor();
        for (const event of this.core.events) if (event.kind === 'phase' && event.bonus) {
            this.phaseTip = this.tr('Подкрепление +', 'Reinforcements +') + event.bonus;
            this.tip = this.phaseTip;
            this.phaseTipTime = 3.2;
        }
        if (oldState === 'playing') this.syncMeshes();
        if (this.phaseTipTime > 0) {
            this.phaseTipTime -= dt;
            if (this.phaseTipTime <= 0 && this.tip === this.phaseTip) this.tip = '';
        }
        for (const beam of this.beams) {
            beam.life -= dt;
            if (beam.spread) beam.mesh.scaling.setAll(1 + beam.spread * (1 - beam.life / beam.maxLife));
        }
        this.beams = this.beams.filter(beam => {
            if (beam.life > 0) return true;
            beam.mesh.dispose();
            return false;
        });
        if (oldState === 'playing' && (this.core.state === 'won' || this.core.state === 'lost')) this.finish();
        this.uiTimer -= dt;
        if (this.uiTimer <= 0) { this.uiTimer = 0.1; this.refreshUI(); }
    }
}
