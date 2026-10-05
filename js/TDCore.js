// Pure tower-defense simulation. Coordinates and decisions never depend on Babylon.
class TDCore {
    constructor(level, options = {}) {
        this.level = level;
        this.route = TDCore.route(level.path);
        this.state = 'ready';
        this.time = 0;
        this.distance = 0;
        this.convoy = { x: level.path[0][0], y: level.path[0][1], hp: level.hp, maxHp: level.hp };
        this.credits = level.credits;
        this.score = 0;
        this.phase = 1;
        this.spawnTimer = 0;
        this.spawnCount = 0;
        this.phaseSpawnCount = 0;
        this.nextEnemyId = 1;
        this.enemies = [];
        this.towers = [];
        this.events = [];
        this.options = options;
    }

    static route(points) {
        const lengths = [];
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
            lengths.push(total);
        }
        return { points, lengths, total };
    }

    static pointAt(route, distance) {
        const points = route.points;
        let previous = 0;
        for (let i = 0; i < route.lengths.length; i++) {
            const end = route.lengths[i];
            if (distance <= end || i === route.lengths.length - 1) {
                const t = Math.max(0, Math.min(1, (distance - previous) / (end - previous)));
                return {
                    x: points[i][0] + (points[i + 1][0] - points[i][0]) * t,
                    y: points[i][1] + (points[i + 1][1] - points[i][1]) * t
                };
            }
            previous = end;
        }
        return { x: points[0][0], y: points[0][1] };
    }

    static projectOnRoute(route, x, y) {
        let best = { x: route.points[0][0], y: route.points[0][1], distance: 0 };
        let nearest = Infinity, previous = 0;
        for (let i = 1; i < route.points.length; i++) {
            const a = route.points[i - 1], b = route.points[i];
            const dx = b[0] - a[0], dy = b[1] - a[1];
            const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
            const px = a[0] + dx * t, py = a[1] + dy * t;
            const d = Math.hypot(x - px, y - py);
            if (d < nearest) { nearest = d; best = { x: px, y: py, distance: previous + Math.hypot(dx, dy) * t }; }
            previous = route.lengths[i - 1];
        }
        return best;
    }

    start() {
        if (this.state !== 'ready') return false;
        this.state = 'playing';
        this.events.push({ kind: 'start' });
        return true;
    }

    setPaused(paused) {
        if (this.state === 'playing' && paused) this.state = 'paused';
        else if (this.state === 'paused' && !paused) this.state = 'playing';
        return this.state;
    }

    getTower(siteId) { return this.towers.find(t => t.siteId === siteId) || null; }

    place(siteId, type) {
        if (this.state === 'won' || this.state === 'lost') return false;
        const site = this.level.sites.find(s => s.id === siteId);
        const spec = TDCore.TOWERS[type];
        if (!site || !spec || this.getTower(siteId) || this.credits < spec.cost) return false;
        this.credits -= spec.cost;
        this.towers.push({ siteId, type, level: 1, cooldown: 0, x: site.x, y: site.y });
        this.events.push({ kind: 'build', siteId, type });
        return true;
    }

    upgrade(siteId) {
        const tower = this.getTower(siteId);
        if (!tower || tower.level >= 3 || this.state === 'won' || this.state === 'lost') return false;
        const cost = TDCore.upgradeCost(tower);
        if (this.credits < cost) return false;
        this.credits -= cost;
        tower.level++;
        this.events.push({ kind: 'upgrade', siteId });
        return true;
    }

    sell(siteId) {
        const index = this.towers.findIndex(t => t.siteId === siteId);
        if (index < 0 || this.state === 'won' || this.state === 'lost') return false;
        const tower = this.towers[index];
        this.credits += Math.floor((TDCore.TOWERS[tower.type].cost +
            (tower.level > 1 ? TDCore.upgradeCost({ ...tower, level: 1 }) : 0) +
            (tower.level > 2 ? TDCore.upgradeCost({ ...tower, level: 2 }) : 0)) * 0.65);
        this.towers.splice(index, 1);
        this.events.push({ kind: 'sell', siteId });
        return true;
    }

    static upgradeCost(tower) { return Math.round(TDCore.TOWERS[tower.type].cost * (0.65 + 0.3 * tower.level)); }

    spawnEnemy() {
        const wave = this.level.waves[this.phase - 1];
        const type = wave.pattern[this.phaseSpawnCount % wave.pattern.length];
        const spec = TDCore.ENEMIES[type];
        const point = this.level.spawns[this.spawnCount % this.level.spawns.length];
        const entry = TDCore.projectOnRoute(this.route, point[0], point[1]);
        const scale = 1 + (this.level.difficulty - 1) * 0.17 + (this.phase - 1) * 0.12;
        const enemy = {
            id: this.nextEnemyId++, type, x: point[0], y: point[1],
            hp: Math.round(spec.hp * scale), maxHp: Math.round(spec.hp * scale),
            speed: spec.speed, slow: 0, marked: 0, entry,
            routeDistance: entry.distance, mode: 'alley'
        };
        this.enemies.push(enemy);
        this.spawnCount++;
        this.phaseSpawnCount++;
        this.events.push({ kind: 'spawn', enemy });
    }

    hurt(enemy, damage, attackType) {
        if (enemy.hp <= 0) return;
        const resistance = TDCore.MATCHUPS[attackType][enemy.type];
        const multiplier = enemy.type === 'wraith' && enemy.marked <= 0 && attackType !== 'signal'
            ? 0 : resistance;
        enemy.hp = Math.max(0, enemy.hp - damage * multiplier);
        if (enemy.hp === 0) {
            const reward = TDCore.ENEMIES[enemy.type].reward;
            this.credits += reward;
            this.score += reward * 10;
            this.events.push({ kind: 'kill', id: enemy.id, x: enemy.x, y: enemy.y });
        }
    }

    fire(tower) {
        const spec = TDCore.TOWERS[tower.type];
        const range = spec.range * (1 + 0.12 * (tower.level - 1));
        const damage = spec.damage * (1 + 0.5 * (tower.level - 1));
        if (tower.type === 'signal') {
            const targets = this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - tower.x, e.y - tower.y) <= range);
            if (!targets.length) return false;
            for (const enemy of targets) {
                enemy.marked = Math.max(enemy.marked, spec.mark);
                enemy.slow = Math.max(enemy.slow, spec.slow);
                this.hurt(enemy, damage, 'signal');
            }
            this.events.push({ kind: 'shot', type: tower.type, x: tower.x, y: tower.y,
                targets: targets.map(e => ({ x: e.x, y: e.y })) });
            return true;
        }
        let target = null;
        let best = Infinity;
        for (const enemy of this.enemies) {
            if (enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > range) continue;
            const distance = Math.hypot(enemy.x - this.convoy.x, enemy.y - this.convoy.y);
            if (distance < best) { best = distance; target = enemy; }
        }
        if (!target) return false;
        if (tower.type === 'coil') {
            const chain = [target];
            while (chain.length < spec.jumps) {
                const last = chain[chain.length - 1];
                const next = this.enemies.filter(e => e.hp > 0 && !chain.includes(e) &&
                    Math.hypot(e.x - last.x, e.y - last.y) <= spec.jumpRange)
                    .sort((a, b) => Math.hypot(a.x - last.x, a.y - last.y) - Math.hypot(b.x - last.x, b.y - last.y))[0];
                if (!next) break;
                chain.push(next);
            }
            chain.forEach((enemy, i) => this.hurt(enemy, damage * (1 - i * 0.12), 'coil'));
            this.events.push({ kind: 'shot', type: tower.type, x: tower.x, y: tower.y,
                targets: chain.map(e => ({ x: e.x, y: e.y })) });
        } else {
            this.hurt(target, damage, 'lamp');
            this.events.push({ kind: 'shot', type: tower.type, x: tower.x, y: tower.y,
                targets: [{ x: target.x, y: target.y }] });
        }
        return true;
    }

    update(dt) {
        this.events.length = 0;
        if (this.state !== 'playing') return;
        dt = Math.max(0, Math.min(0.1, dt));
        this.time += dt;
        this.distance = Math.min(this.route.total, this.distance + this.level.speed * dt);
        Object.assign(this.convoy, TDCore.pointAt(this.route, this.distance));
        const phase = Math.min(3, Math.floor(this.distance / this.route.total * 3) + 1);
        if (phase !== this.phase) {
            this.phase = phase;
            this.phaseSpawnCount = 0;
            this.spawnTimer = 0;
            const bonus = this.level.phaseBonus || 0;
            this.credits += bonus;
            this.events.push({ kind: 'phase', phase, bonus });
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.distance < this.route.total - 40) {
            this.spawnEnemy();
            this.spawnTimer += this.level.waves[this.phase - 1].interval;
        }

        for (const tower of this.towers) {
            tower.cooldown -= dt;
            if (tower.cooldown <= 0 && this.fire(tower)) tower.cooldown = TDCore.TOWERS[tower.type].interval / (1 + 0.18 * (tower.level - 1));
        }

        for (const enemy of this.enemies) {
            if (enemy.hp <= 0) continue;
            const dx = this.convoy.x - enemy.x, dy = this.convoy.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 28) {
                enemy.hp = 0;
                this.convoy.hp = Math.max(0, this.convoy.hp - TDCore.ENEMIES[enemy.type].breach);
                this.events.push({ kind: 'breach', type: enemy.type, x: enemy.x, y: enemy.y, hp: this.convoy.hp });
                continue;
            }
            const factor = enemy.slow > 0 ? 0.48 : 1;
            const step = enemy.speed * factor * dt;
            if (enemy.mode === 'alley') {
                const ex = enemy.entry.x - enemy.x, ey = enemy.entry.y - enemy.y;
                const remaining = Math.hypot(ex, ey);
                if (remaining <= step) {
                    enemy.x = enemy.entry.x; enemy.y = enemy.entry.y; enemy.mode = 'route';
                } else { enemy.x += ex / remaining * step; enemy.y += ey / remaining * step; }
            } else {
                const delta = this.distance - enemy.routeDistance;
                enemy.routeDistance += Math.sign(delta) * Math.min(Math.abs(delta), step);
                Object.assign(enemy, TDCore.pointAt(this.route, enemy.routeDistance));
            }
            enemy.slow = Math.max(0, enemy.slow - dt);
            enemy.marked = Math.max(0, enemy.marked - dt);
        }
        this.enemies = this.enemies.filter(e => e.hp > 0);
        if (this.convoy.hp <= 0) {
            this.state = 'lost';
            this.events.push({ kind: 'lost' });
        } else if (this.distance >= this.route.total) {
            this.state = 'won';
            this.score += this.convoy.hp * 100;
            this.events.push({ kind: 'won' });
        }
    }
}

TDCore.TOWERS = {
    lamp: { cost: 85, range: 210, damage: 36, interval: 0.7 },
    coil: { cost: 120, range: 215, damage: 28, interval: 1, jumps: 4, jumpRange: 100 },
    signal: { cost: 105, range: 215, damage: 20, interval: 1.6, slow: 3.5, mark: 4.5 }
};
TDCore.ENEMIES = {
    runner: { hp: 65, speed: 90, reward: 14, breach: 1 },
    wraith: { hp: 85, speed: 58, reward: 19, breach: 3 },
    moth: { hp: 38, speed: 110, reward: 9, breach: 2 },
    porter: { hp: 235, speed: 44, reward: 34, breach: 3 }
};
TDCore.MATCHUPS = {
    lamp: { runner: 1, wraith: 1, moth: 0.25, porter: 1.35 },
    coil: { runner: 1, wraith: 0.8, moth: 1.9, porter: 0.2 },
    signal: { runner: 0.5, wraith: 2.5, moth: 0.35, porter: 0.2 }
};
