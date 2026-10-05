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

test('convoy can be lost without defenses and can be saved with planned towers', () => {
    assert.equal(run(new Core(levels[0])).state, 'lost');
    for (const level of levels) {
        const core = new Core(level);
        assert.equal(core.place(level.sites[0].id, 'lamp'), true);
        assert.equal(core.place(level.sites[1].id, 'signal'), true);
        run(core, (game, tick) => {
            if (tick % 80 !== 0) return;
            const site = level.sites.find(s => !game.getTower(s.id));
            if (site) game.place(site.id, 'lamp');
        });
        assert.equal(core.state, 'won', `${level.id} should be beatable`);
        assert.ok(core.convoy.hp > 0);
        assert.ok(core.score > 0);
    }
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
