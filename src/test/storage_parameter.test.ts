import * as assert from 'assert';
import { StorageManager } from '../storage';
import { CommandRepositoryData, TreeItemData } from '../types';

suite('StorageManager parameter field', () => {
  test('addCommand stores parameter and description', async () => {
    // Arrange: カテゴリを1つ用意
    const sm = new StorageManager();
    await sm.load();
    sm.addCategory('cat1');

    const data1: CommandRepositoryData = sm.getData();
    const cat = data1.categories[0];
    // Act: parameter と description を含むコマンドを追加
    sm.addCommand(cat.id, {
      label: 'npm install packagename',
      command: 'npm install packagename',
      parameter: 'npm install <package_name>',
      description: 'Installs the specified package.',
    });

    const data2 = sm.getData();
    const cmd = data2.categories[0].children[0];
    // Assert: parameter と description が保存されている
    assert.strictEqual(cmd.parameter, 'npm install <package_name>');
    assert.strictEqual(cmd.description, 'Installs the specified package.');
  });

  test('updateItem can update parameter', async () => {
    // Arrange: parameter を持つコマンドを1つ用意
    const sm = new StorageManager();
    await sm.load();
    sm.addCategory('cat1');
    const cat = sm.getData().categories[0];
    sm.addCommand(cat.id, {
      label: 'cmd',
      command: 'cmd',
      parameter: 'p1',
    });
    const cmd = sm.getData().categories[0].children[0];
    const item: TreeItemData = { ...cmd, type: 'command', categoryId: cat.id } as any;
    // Act: parameter を更新
    sm.updateItem(item, { parameter: 'p2' } as any);
    const updated = sm.getData().categories[0].children[0];
    // Assert: parameter が 'p2' に更新されている
    assert.strictEqual(updated.parameter, 'p2');
  });
});
