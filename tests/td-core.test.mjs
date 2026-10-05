import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'js/TDLevels.js'), 'utf8') + '\nthis.levels = TD_LEVELS;', context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/TDCore.js'), 'utf8') + '\nthis.Core = TDCore;', context);
const { Core, levels } = context;

function run(core, policy = () => {}) {
    core.start();
    for (let tick = 0; tick < 3000 && core.state === 'playing'; tick++) {
        policy(core, tick);
        core.update(0.1);
    }
    return core;
}

function buildInOrder(types) {
    let next = 0;
    return (core, tick) => {
        if (tick % 10 !== 0) return;
        while (next < core.level.sites.length && core.credits >= Core.TOWERS[types[next]].cost) {
            assert.equal(core.place(core.level.sites[next].id, types[next]), true);
            next++;
        }
    };
}

test('encounters escalate, lamps alone fail, and planned mixed defenses win', () => {
    assert.equal(run(new Core(levels[0])).state, 'lost');
    const enemyCounts = [];
    for (const level of levels) {
        const lamps = run(new Core(level), buildInOrder(level.sites.map(() => 'lamp')));
        assert.equal(lamps.state, 'lost', `${level.id}: lamp spam must lose`);

        const pattern = level.sites.map((_, i) => ['lamp', 'coil', 'signal'][i % 3]);
        const mixed = run(new Core(level), buildInOrder(pattern));
        assert.equal(mixed.state, 'won', `${level.id}: mixed towers should win`);
        assert.ok(mixed.convoy.hp > 0);
        assert.ok(mixed.score > 0);
        enemyCounts.push(mixed.spawnCount);

        if (level.difficulty > 1) {
            const noCoil = level.sites.map((_, i) => ['lamp', 'signal'][i % 2]);
            assert.equal(run(new Core(level), buildInOrder(noCoil)).state, 'lost',
                `${level.id}: moth packs should require crowd control`);
        }
    }
    assert.ok(enemyCounts[0] < enemyCounts[1] && enemyCounts[1] < enemyCounts[2],
        'each level should spawn more enemies');
});

test('moth packs share an alley and can be cleared by one chain attack', () => {
    const core = new Core(levels[1]);
    core.phaseSpawnCount = 2; // The third first-phase group is a moth pack.
    core.spawnEnemy();
    assert.equal(core.enemies.length, 2);
    assert.equal(core.spawnCount, 2);
    assert.equal(core.spawnGroupCount, 1);
    assert.equal(core.enemies[0].spawnIndex, core.enemies[1].spawnIndex);
    assert.ok(core.enemies[0].x !== core.enemies[1].x || core.enemies[0].y !== core.enemies[1].y);
    const [x, y] = levels[1].spawns[0];
    assert.equal(core.fire({ type: 'coil', level: 1, x, y }), true);
    assert.equal(core.enemies.filter(e => e.hp > 0).length, 0);
    assert.equal(core.events.at(-1).targets.length, 2);
});

test('tower roles have distinct targeting, damage, and status effects', () => {
    const core = new Core(levels[0]);
    core.convoy.x = 0; core.convoy.y = 0;
    const enemy = (id, type, x) => ({ id, type, x, y: 0, hp: 300, maxHp: 300, marked: 0, slow: 0 });
    const porter = enemy(1, 'porter', 40);
    const moth = enemy(2, 'moth', 70);
    const wraith = enemy(3, 'wraith', 100);
    core.enemies = [porter, moth, wraith];

    assert.equal(core.fire({ type: 'lamp', level: 1, x: 0, y: 0 }), true);
    assert.ok(porter.hp < 300, 'lamp should damage its single armored target');
    assert.equal(moth.hp, 300);
    assert.equal(wraith.hp, 300);
    assert.equal(core.events.at(-1).targets.length, 1);

    assert.equal(core.fire({ type: 'coil', level: 1, x: 0, y: 0 }), true);
    assert.ok(moth.hp < 300, 'coil should chain from the first target into a swarm');
    assert.equal(wraith.hp, 300, 'unmarked spirits should ignore electric attacks');
    assert.equal(core.events.at(-1).targets.length, 3);

    assert.equal(core.fire({ type: 'signal', level: 1, x: 0, y: 0 }), true);
    assert.ok(core.enemies.every(e => e.slow > 0 && e.marked > 0),
        'signal should mark and slow everything in its area');
    assert.ok(wraith.hp < 300, 'signal should directly damage a spirit');
    assert.equal(core.events.at(-1).targets.length, 3);

    const before = wraith.hp;
    core.enemies = [wraith];
    assert.equal(core.fire({ type: 'lamp', level: 1, x: 0, y: 0 }), true);
    assert.ok(wraith.hp < before, 'a marked spirit should become vulnerable to lamp shots');
});

test('enemies stay on rendered alleys and convoy streets', () => {
    for (const level of levels) {
        const core = new Core({ ...level, hp: 9999 });
        core.start();
        let sawAlley = false, sawStreet = false;
        for (let tick = 0; tick < 400; tick++) {
            core.update(0.1);
            for (const enemy of core.enemies) {
                if (enemy.mode === 'alley') {
                    sawAlley = true;
                    const spawn = level.spawns[enemy.spawnIndex];
                    const alley = Core.route([spawn, [enemy.entry.x, enemy.entry.y]]);
                    const nearest = Core.projectOnRoute(alley, enemy.x, enemy.y);
                    assert.ok(Math.hypot(enemy.x - nearest.x, enemy.y - nearest.y) < 1e-5,
                        `${level.id}: enemy left its alley`);
                } else {
                    sawStreet = true;
                    const expected = Core.pointAt(core.route, enemy.routeDistance);
                    assert.ok(Math.hypot(enemy.x - expected.x, enemy.y - expected.y) < 1e-5,
                        `${level.id}: enemy left the street route`);
                }
            }
        }
        assert.ok(sawAlley && sawStreet, `${level.id}: both route segments should be exercised`);
    }
});

test('district phase transitions pay one resupply bonus', () => {
    const core = new Core(levels[0]);
    const initialCredits = core.credits;
    core.distance = core.route.total / 3 - 0.5;
    core.start();
    core.update(0.1);
    assert.equal(core.phase, 2);
    assert.equal(core.credits, initialCredits + levels[0].phaseBonus);
    assert.ok(core.events.some(e => e.kind === 'phase' && e.phase === 2 && e.bonus === levels[0].phaseBonus));
    core.update(0.1);
    assert.equal(core.credits, initialCredits + levels[0].phaseBonus);
});

test('building, upgrades and pausing respect resources and state', () => {
    const core = new Core(levels[0]);
    const site = levels[0].sites[0].id;
    assert.equal(core.place(site, 'lamp'), true);
    assert.equal(core.place(site, 'lamp'), false);
    assert.equal(core.credits, levels[0].credits - Core.TOWERS.lamp.cost);
    assert.equal(core.upgrade(site), true);
    assert.equal(core.getTower(site).level, 2);
    core.start();
    core.setPaused(true);
    const before = core.distance;
    core.update(0.1);
    assert.equal(core.distance, before);
    core.setPaused(false);
    core.update(0.1);
    assert.ok(core.distance > before);
    assert.equal(core.sell(site), true);
    assert.equal(core.getTower(site), null);
});
