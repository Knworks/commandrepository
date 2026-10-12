import * as assert from 'assert';
import { getNonce } from '../utils';

suite('utils.getNonce', () => {
  test('returns 32-char alphanumeric string and is unique', () => {
    // Arrange: 2回 nonce を生成
    const a = getNonce();
    const b = getNonce();
    // Assert: 文字数は32、英数字のみ、かつ一意である
    assert.strictEqual(a.length, 32);
    assert.strictEqual(b.length, 32);
    assert.notStrictEqual(a, b);
    const re = /^[A-Za-z0-9]{32}$/;
    assert.ok(re.test(a) && re.test(b));
  });
});
