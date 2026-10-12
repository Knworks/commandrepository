import * as assert from 'assert';
import { StorageManager } from '../storage';

suite('StorageManager moveItem', () => {
  test('move category up/down updates order', () => {
    const s = new StorageManager();
    // 構築
    s.addCategory('A');
    s.addCategory('B');
    let data = s.getData();
    const a = data.categories[0].id;
    const b = data.categories[1].id;
    // 下げる: A を down → [B, A]
    assert.strictEqual(s.moveItem(a, 'down'), true);
    assert.deepStrictEqual(s.getData().categories.map(c => c.id), [b, a]);
    // 上げる: A を up → [A, B]
    assert.strictEqual(s.moveItem(a, 'up'), true);
    assert.deepStrictEqual(s.getData().categories.map(c => c.id), [a, b]);
    // 境界: A を up は不可
    assert.strictEqual(s.moveItem(a, 'up'), false);
  });

  test('move command within category', () => {
    const s = new StorageManager();
    s.addCategory('Cat');
    const catId = s.getData().categories[0].id;
    s.addCommand(catId, { label: 'one', command: 'one' });
    s.addCommand(catId, { label: 'two', command: 'two' });
    s.addCommand(catId, { label: 'three', command: 'three' });
    const cmds = s.getData().categories[0].children;
    const id1 = cmds[0].id, id2 = cmds[1].id, id3 = cmds[2].id;
    // two を up → [two, one, three]
    assert.strictEqual(s.moveItem(id2, 'up'), true);
    assert.deepStrictEqual(s.getData().categories[0].children.map(c => c.id), [id2, id1, id3]);
    // two を up (先頭) は不可
    assert.strictEqual(s.moveItem(id2, 'up'), false);
    // one を down → [two, three, one]
    assert.strictEqual(s.moveItem(id1, 'down'), true);
    assert.deepStrictEqual(s.getData().categories[0].children.map(c => c.id), [id2, id3, id1]);
  });

  test('moving a category preserves its children', () => {
    const s = new StorageManager();
    // Cat1 with children, then Cat2
    s.addCategory('Cat1');
    s.addCategory('Cat2');
    const d1 = s.getData();
    const cat1 = d1.categories[0];
    const cat2 = d1.categories[1];
    s.addCommand(cat1.id, { label: 'a', command: 'a' });
    s.addCommand(cat1.id, { label: 'b', command: 'b' });

    // Move Cat1 down → should become [Cat2, Cat1] and Cat1 keeps its children
    const moved = s.moveItem(cat1.id, 'down');
    assert.strictEqual(moved, true);
    const d2 = s.getData();
    assert.deepStrictEqual(d2.categories.map(c => c.id), [cat2.id, cat1.id]);
    const movedCat1 = d2.categories[1];
    assert.deepStrictEqual(movedCat1.children.map(c => c.label), ['a', 'b']);
  });
});
