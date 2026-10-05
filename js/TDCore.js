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
        const phase = this.phase;
        const type = this.spawnCount % 10 === 9 && phase >= 2 ? 'brute'
            : this.spawnCount % 4 === 3 ? 'runner' : 'shade';
        const spec = TDCore.ENEMIES[type];
        const point = this.level.spawns[this.spawnCount % this.level.spawns.length];
        const scale = 1 + (this.level.difficulty - 1) * 0.22 + (phase - 1) * 0.18;
        const enemy = {
            id: this.nextEnemyId++, type, x: point[0], y: point[1],
            hp: Math.round(spec.hp * scale), maxHp: Math.round(spec.hp * scale),
            speed: spec.speed, slow: 0
        };
        this.enemies.push(enemy);
        this.spawnCount++;
        this.events.push({ kind: 'spawn', enemy });
    }

    hurt(enemy, damage, slow = 0) {
        if (enemy.hp <= 0) return;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.slow = Math.max(enemy.slow, slow);
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
        let target = null;
        let best = Infinity;
        for (const enemy of this.enemies) {
            if (enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > range) continue;
            const distance = Math.hypot(enemy.x - this.convoy.x, enemy.y - this.convoy.y);
            if (distance < best) { best = distance; target = enemy; }
        }
        if (!target) return false;
        const damage = spec.damage * (1 + 0.5 * (tower.level - 1));
        if (tower.type === 'coil') {
            for (const enemy of this.enemies) {
                if (enemy.hp > 0 && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= spec.splash)
                    this.hurt(enemy, damage);
            }
        } else this.hurt(target, damage, tower.type === 'signal' ? spec.slow : 0);
        this.events.push({ kind: 'shot', type: tower.type, x: tower.x, y: tower.y, tx: target.x, ty: target.y });
        return true;
    }

    update(dt) {
        this.events.length = 0;
        if (this.state !== 'playing') return;
        dt = Math.max(0, Math.min(0.1, dt));
        this.time += dt;
        this.distance = Math.min(this.route.total, this.distance + this.level.speed * dt);
        Object.assign(this.convoy, TDCore.pointAt(this.route, this.distance));
        this.phase = Math.min(3, Math.floor(this.distance / this.route.total * 3) + 1);

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.distance < this.route.total - 40) {
            this.spawnEnemy();
            this.spawnTimer += Math.max(1.8, 4.5 - 0.5 * this.level.difficulty - 0.35 * (this.phase - 1));
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
                this.events.push({ kind: 'breach', x: enemy.x, y: enemy.y, hp: this.convoy.hp });
                continue;
            }
            const factor = enemy.slow > 0 ? 0.55 : 1;
            const step = Math.min(distance, enemy.speed * factor * dt);
            enemy.x += dx / distance * step;
            enemy.y += dy / distance * step;
            enemy.slow = Math.max(0, enemy.slow - dt);
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
    lamp: { cost: 80, range: 190, damage: 28, interval: 0.8 },
    coil: { cost: 130, range: 150, damage: 18, interval: 1.5, splash: 78 },
    signal: { cost: 105, range: 180, damage: 10, interval: 0.9, slow: 2.2 }
};
TDCore.ENEMIES = {
    shade: { hp: 65, speed: 48, reward: 12, breach: 1 },
    runner: { hp: 48, speed: 78, reward: 15, breach: 1 },
    brute: { hp: 220, speed: 34, reward: 35, breach: 3 }
};
