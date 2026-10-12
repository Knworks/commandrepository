import * as assert from 'assert';
import { CommandExplorerProvider } from '../treeViewProvider';
import { StorageManager } from '../storage';
import * as path from 'path';

class MockStorageManager extends StorageManager {
  private mock = {
    version: 1,
    categories: [
      {
        id: 'cat1',
        label: 'Category 1',
        children: [
          { id: 'c1', label: 'cmd1', command: 'echo 1', description: 'd1' },
          { id: 'c2', label: 'cmd2', command: 'echo 2', parameter: '--help' },
        ],
      },
      {
        id: 'cat2',
        label: 'Tools',
        children: [
          { id: 'c3', label: 'build', command: 'npm run build' },
        ],
      },
    ],
  };
  override getData() { return this.mock as any; }
}

const mockContext = {
  asAbsolutePath: (p: string) => path.resolve(process.cwd(), p),
} as any;

suite('CommandExplorerProvider filtering', () => {
  test('no filter returns all categories', async () => {
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    const root = await provider.getChildren();
    assert.strictEqual(root.length, 2);
  });

  test('category match shows the category and all children', async () => {
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    provider.setFilterText('category');
    const root = await provider.getChildren();
    assert.strictEqual(root.length, 1);
    const cat = root[0];
    assert.strictEqual(cat.type, 'category');
    const children = await provider.getChildren(cat);
    assert.strictEqual(children.length, 2);
  });

  test('command match shows only the matched command under its parent', async () => {
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    provider.setFilterText('cmd2');
    const root = await provider.getChildren();
    assert.strictEqual(root.length, 1);
    const cat = root[0];
    const children = await provider.getChildren(cat);
    assert.strictEqual(children.length, 1);
    assert.strictEqual((children[0] as any).label, 'cmd2');
  });

  test('OR filter with pipe returns union of matches across categories', async () => {
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    provider.setFilterText('cmd2 | build');
    const root = await provider.getChildren();
    // cat1 (cmd2) and cat2 (build) should appear
    assert.strictEqual(root.length, 2);
    const cat1 = root.find(r => (r as any).label === 'Category 1')!;
    const cat2 = root.find(r => (r as any).label === 'Tools')!;
    const c1 = await provider.getChildren(cat1 as any);
    const c2 = await provider.getChildren(cat2 as any);
    assert.strictEqual(c1.length, 1);
    assert.strictEqual((c1[0] as any).label, 'cmd2');
    assert.strictEqual(c2.length, 1);
    assert.strictEqual((c2[0] as any).label, 'build');
  });
});
