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
                this.tip = this.tr('Выберите светящуюся точку на улице', 'Tap a glowing rooftop site');
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
        this.drawDistrict();
        this.app.camera.follow(this.core.convoy);
        this.app.camera.lookAt(this.core.convoy.x, this.core.convoy.y);
        this.showReadyMenu();
        this.refreshUI();
        this.syncGameplay();
    }

    showReadyMenu() {
        if (!this.core) return;
        this.showMenu(
            this.tr('НОЧНОЙ КАРАВАН', 'NIGHT CARAVAN'),
            this.tr('Доведите караван через район.\nСтавьте башни на светящихся точках.\nСначала можно подготовить оборону.',
                'Escort the convoy across town.\nBuild on glowing rooftop sites.\nPrepare defenses before departure.'),
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
                : this.tr('Попробуйте иной порядок башен.\nКатушка бьёт по группе, сигнал замедляет.',
                    'Try a different tower order.\nCoil hits groups; signal slows them.'),
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
        this.write('lamp', this.tr('Лампа · 80', 'Lamp · 80'));
        this.write('coil', this.tr('Катушка · 130', 'Coil · 130'));
        this.write('signal', this.tr('Сигнал · 105', 'Signal · 105'));
        this.write('pause', c.state === 'ready' ? this.tr('В путь', 'Go')
            : c.state === 'paused' ? this.tr('Продолжить', 'Resume') : this.tr('Пауза', 'Pause'));
        this.write('sell', this.tr('Продать', 'Sell'));
        const tower = this.selectedSite && c.getTower(this.selectedSite);
        this.write('upgrade', tower && tower.level < 3 ? this.tr('Улучшить ', 'Upgrade ') + TDCore.upgradeCost(tower) : this.tr('Улучшить', 'Upgrade'));
        const progress = this.ui('hud_progress');
        if (progress) progress.setValue(c.distance / c.route.total);
    }

    material(hex, kind = 'prop') {
        const key = kind + hex;
        if (!this.materials.has(key)) {
            const mat = new BABYLON.StandardMaterial('td-' + key, this.scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString(hex);
            mat.specularColor = BABYLON.Color3.Black();
            this.materials.set(key, mat);
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

    drawDistrict() {
        const level = this.core.level;
        const roadColor = ['#3a3545', '#303c4d', '#35404b'][this.levelIndex];
        for (let i = 1; i < level.path.length; i++) {
            const a = level.path[i - 1], b = level.path[i];
            const horizontal = a[1] === b[1];
            const w = horizontal ? Math.abs(b[0] - a[0]) + 92 : 92;
            const d = horizontal ? 92 : Math.abs(b[1] - a[1]) + 92;
            this.box('street', w, 3, d, (a[0] + b[0]) / 2, 2, (a[1] + b[1]) / 2,
                roadColor, 'prop', { castShadow: false, ink: false, outline: false });
        }
        let seed = 991 + this.levelIndex * 101;
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
        const palette = ['#363343', '#444050', '#48404a', '#4a3b3c', '#394451'];
        for (let x = 80; x < 1200; x += 115) for (let y = 80; y < 880; y += 110) {
            const cx = x + (random() - 0.5) * 22, cy = y + (random() - 0.5) * 22;
            if (this.nearRoute(cx, cy, 84) || level.sites.some(s => Math.hypot(s.x - cx, s.y - cy) < 52)) continue;
            const height = 58 + random() * 125;
            const width = 55 + random() * 30;
            this.box('brownstone', width, height, width, cx, height / 2, cy,
                palette[Math.floor(random() * palette.length)], 'prop', { ink: false, outline: false });
            if (random() < 0.23) this.box('lit-window', width * 0.55, 5, 3, cx, height * 0.65, cy - width / 2 - 2,
                random() < 0.5 ? '#b48958' : '#688c9a', 'prop', { castShadow: false, ink: false, outline: false });
        }
        for (const spawn of level.spawns) {
            const mark = BABYLON.MeshBuilder.CreateCylinder('rift', { diameter: 38, height: 3, tessellation: 12 }, this.scene);
            mark.position.set(spawn[0], 5, spawn[1]);
            mark.material = this.material('#745780');
            this.track(mark, 'prop', { castShadow: false, ink: false, outline: false });
        }
        for (const site of level.sites) {
            const mark = BABYLON.MeshBuilder.CreateCylinder('tower-site', { diameter: 42, height: 5, tessellation: 8 }, this.scene);
            mark.position.set(site.x, 7, site.y);
            mark.material = this.material('#c3a86b');
            this.track(mark, 'prop', { castShadow: false, ink: false, outline: false });
        }
        const wagon = this.box('convoy', 58, 18, 32, this.core.convoy.x, 17, this.core.convoy.y, '#9d7251', 'actor');
        const roof = BABYLON.MeshBuilder.CreateBox('convoy-roof', { width: 35, height: 18, depth: 30 }, this.scene);
        roof.parent = wagon;
        roof.position.set(-5, 17, 0);
        roof.material = this.material('#e2c88f', 'actor');
        const lamp = BABYLON.MeshBuilder.CreateSphere('convoy-lamp', { diameter: 13, segments: 8 }, this.scene);
        lamp.parent = wagon;
        lamp.position.set(31, 8, 0);
        lamp.material = this.material('#f1d18b', 'actor');
        this.convoyMesh = wagon;
    }

    nearRoute(x, y, limit) {
        const path = this.core.level.path;
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            const dx = b[0] - a[0], dy = b[1] - a[1];
            const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
            if (Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)) < limit) return true;
        }
        return false;
    }

    createTowerMesh(tower) {
        if (!tower) return;
        const colors = { lamp: '#e8c678', coil: '#63c5d7', signal: '#b58bd0' };
        const base = BABYLON.MeshBuilder.CreateCylinder('tower-' + tower.type, { diameter: 27, height: 37, tessellation: 8 }, this.scene);
        base.position.set(tower.x, 26, tower.y);
        base.material = this.material(colors[tower.type], 'actor');
        const top = BABYLON.MeshBuilder.CreateSphere('tower-light', { diameter: tower.type === 'coil' ? 27 : 20, segments: 8 }, this.scene);
        top.parent = base;
        top.position.y = 22;
        top.material = this.material(colors[tower.type], 'actor');
        this.track(base, 'actor');
        this.towerMeshes.set(tower.siteId, base);
    }

    createEnemyMesh(enemy) {
        const colors = { shade: '#9d82b1', runner: '#d49c6b', brute: '#8f5e72' };
        const size = enemy.type === 'brute' ? 31 : enemy.type === 'runner' ? 18 : 23;
        const mesh = BABYLON.MeshBuilder.CreateSphere('enemy-' + enemy.id, { diameter: size, segments: 8 }, this.scene);
        mesh.position.set(enemy.x, 17, enemy.y);
        mesh.material = this.material(colors[enemy.type], 'actor');
        this.track(mesh, 'actor', { ink: false, outline: false });
        this.enemyMeshes.set(enemy.id, mesh);
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
            mesh.position.set(enemy.x, enemy.type === 'brute' ? 20 : 17, enemy.y);
            mesh.scaling.setAll(Math.max(0.3, enemy.hp / enemy.maxHp));
        }
        for (const [id, mesh] of this.enemyMeshes) if (!alive.has(id)) {
            this.removeMesh(mesh);
            this.enemyMeshes.delete(id);
        }
        for (const event of c.events) if (event.kind === 'shot') {
            const line = BABYLON.MeshBuilder.CreateLines('shot', { points: [
                new BABYLON.Vector3(event.x, 52, event.y), new BABYLON.Vector3(event.tx, 18, event.ty)
            ] }, this.scene);
            line.color = BABYLON.Color3.FromHexString(event.type === 'lamp' ? '#ffdc86' : event.type === 'coil' ? '#75e2f5' : '#c5a0ec');
            this.beams.push({ mesh: line, life: 0.13 });
        }
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
        if (oldState === 'playing') this.syncMeshes();
        for (const beam of this.beams) beam.life -= dt;
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
