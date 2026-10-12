// src/extension.ts
import * as vscode from 'vscode';
import { CommandExplorerProvider } from './treeViewProvider';
import { DetailsViewProvider } from './webviewProvider';
import { ExecutorViewProvider } from './executorViewProvider';
import { StorageManager } from './storage';
import { sendToTerminal } from './terminal';
import { TreeItemData, Category, Command } from './types';

const PLACEHOLDER = 'placeholder' as const;

export async function activate(context: vscode.ExtensionContext) {
    // Storage
    const storageManager = new StorageManager();
    await storageManager.load();

    const commandExplorerProvider = new CommandExplorerProvider(storageManager, context);
    const detailsViewProvider = new DetailsViewProvider(context.extensionUri);
    const executorViewProvider = new ExecutorViewProvider(context.extensionUri);

    // Views
    const commandExplorerView = vscode.window.createTreeView('commandRepositoryExplorer', {
        treeDataProvider: commandExplorerProvider
    });

    const collapsedCategoryIds = new Set(
        context.workspaceState.get<string[]>('commandRepository.collapsedCategoryIds', [])
    );
    commandExplorerProvider.setCollapsedCategoryIds(Array.from(collapsedCategoryIds));

    const persistCollapsedState = async () => {
        await context.workspaceState.update(
            'commandRepository.collapsedCategoryIds',
            Array.from(collapsedCategoryIds)
        );
        commandExplorerProvider.setCollapsedCategoryIds(Array.from(collapsedCategoryIds));
    };

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DetailsViewProvider.viewType, detailsViewProvider),
        vscode.window.registerWebviewViewProvider(ExecutorViewProvider.viewType, executorViewProvider),
        commandExplorerView.onDidExpandElement(async e => {
            const element = e.element as TreeItemData;
            if (!element || element.type !== 'category') { return; }
            if (collapsedCategoryIds.delete(element.id)) {
                await persistCollapsedState();
            }
        }),
        commandExplorerView.onDidCollapseElement(async e => {
            const element = e.element as TreeItemData;
            if (!element || element.type !== 'category') { return; }
            if (!collapsedCategoryIds.has(element.id)) {
                collapsedCategoryIds.add(element.id);
                await persistCollapsedState();
            }
        })
    );

    // Commands
    // Filter
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.filter', async () => {
        const current = context.workspaceState.get<string>('commandRepository.filterText', '') ?? '';
        const value = await vscode.window.showInputBox({ prompt: 'Enter filter (use | for OR)', value: current });
        if (value === undefined) { return; }
        const norm = value.trim();
        await context.workspaceState.update('commandRepository.filterText', norm);
        await vscode.commands.executeCommand('setContext', 'commandRepository:filterActive', !!norm);
        commandExplorerProvider.setFilterText(norm);
    }));

    // Clear Filter
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.clearFilter', async () => {
        await context.workspaceState.update('commandRepository.filterText', '');
        await vscode.commands.executeCommand('setContext', 'commandRepository:filterActive', false);
        commandExplorerProvider.setFilterText('');
    }));

    // Refresh
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.refresh', () => {
        storageManager.load().then(() => commandExplorerProvider.refresh());
    }));

    // Move Up/Down (category/command)
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.moveUp', async () => {
        const sel = (commandExplorerView.selection as TreeItemData[]) || [];
        if (!sel.length) { vscode.window.showInformationMessage('Select the item you want to move.'); return; }
        storageManager.moveItem(sel[0].id, 'up');
        commandExplorerProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.moveDown', async () => {
        const sel = (commandExplorerView.selection as TreeItemData[]) || [];
        if (!sel.length) { vscode.window.showInformationMessage('Select the item you want to move.'); return; }
        storageManager.moveItem(sel[0].id, 'down');
        commandExplorerProvider.refresh();
    }));

    // Add Category
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.addCategory', async () => {
        if (!ensureConfiguredPrompt(storageManager)) { return; }
        const label = await vscode.window.showInputBox({ prompt: 'Enter the category name' });
        if (label) {
            storageManager.addCategory(label);
            commandExplorerProvider.refresh();
        }
    }));

    // Add Command
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.addCommand', async (category?: TreeItemData) => {
        if (!ensureConfiguredPrompt(storageManager)) { return; }
        const selectedCategory = getSelectedCategory(category, commandExplorerView.selection as TreeItemData[]);
        if (!selectedCategory) {
            vscode.window.showErrorMessage('Select the category to which you want to add the command.');
            return;
        }
        const commandData = await promptCommandInput(undefined);
        if (!commandData) { return; }
        storageManager.addCommand(selectedCategory.id, commandData);
        commandExplorerProvider.refresh();
    }));

    // Edit Item
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.editItem', async (item?: TreeItemData) => {
        if (!ensureConfiguredPrompt(storageManager)) { return; }
        const selectedItem = item || (commandExplorerView.selection as TreeItemData[])[0];
        if (!selectedItem || commandExplorerView.selection.length === 0) {
            vscode.window.showErrorMessage('Select the item you want to edit.');
            return;
        }
        if (selectedItem.type === 'category') {
            const newLabel = await vscode.window.showInputBox({ prompt: 'Enter a new category name.', value: selectedItem.label });
            if (newLabel) {
                storageManager.updateItem(selectedItem, { label: newLabel });
            }
        } else if (selectedItem.type === 'command') {
            const updated = await promptCommandInput(selectedItem);
            if (updated) {
                storageManager.updateItem(selectedItem, updated);
            }
        }
        commandExplorerProvider.refresh();
        detailsViewProvider.updateView(selectedItem);
    }));

    // Delete Item
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.deleteItem', async (item?: TreeItemData) => {
        if (!ensureConfiguredPrompt(storageManager)) { return; }
        const itemsToDelete = item ? [item] : commandExplorerView.selection;
        if (!itemsToDelete || itemsToDelete.length === 0 || !itemsToDelete[0]) {
            vscode.window.showErrorMessage('Select the item you want to delete.');
            return;
        }
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete ${itemsToDelete.length} items?`,
            { modal: true },
            'delete'
        );
        if (confirm === 'delete') {
            for (const anItem of itemsToDelete) {
                storageManager.deleteItem(anItem.id);
            }
            commandExplorerProvider.refresh();
            detailsViewProvider.updateView(PLACEHOLDER);
        }
    }));

    // Open storage directory
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.openStorageDirectory', async () => {
        if (!ensureConfiguredPrompt(storageManager)) { return; }
        const dir = await storageManager.getResolvedDirectory();
        if (!dir) { return; }
        try {
            const dirUri = vscode.Uri.file(dir);
            try { await vscode.workspace.fs.stat(dirUri); } catch { await vscode.workspace.fs.createDirectory(dirUri); }
            await vscode.commands.executeCommand('revealFileInOS', dirUri);
        } catch (e) {
            vscode.window.showErrorMessage(`Could not open folder: ${e instanceof Error ? e.message : String(e)}`);
        }
    }));

    // Execute from tree
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.executeCommand', (item: TreeItemData) => {
        if (item && item.type === 'command') {
            sendToTerminal(item.command);
        }
    }));

    // Execute from input
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.executeFromInput', (commandText: string) => {
        if (commandText) {
            sendToTerminal(commandText);
        }
    }));

    // Details + Executor linkage
    context.subscriptions.push(vscode.commands.registerCommand('commandRepository.showDetails', (item: TreeItemData) => {
        detailsViewProvider.updateView(item);
        if (item?.type === 'command') {
            executorViewProvider.setInput(item.command);
        } else {
            executorViewProvider.setInput('');
        }
    }));

    // Restore filter state and selection context
    const savedFilter = (context.workspaceState.get<string>('commandRepository.filterText', '') ?? '').trim();
    await vscode.commands.executeCommand('setContext', 'commandRepository:filterActive', !!savedFilter);
    commandExplorerProvider.setFilterText(savedFilter);

    // 選択有無でのボタン表示制御は行わない（常時表示）

    // Initial refresh
    commandExplorerProvider.refresh();
}

// --- helpers ---

async function promptCommandInput(initial?: Command): Promise<Omit<Command, 'id'> | undefined> {
    const label = await vscode.window.showInputBox({
        prompt: initial ? 'Enter the new command' : 'Enter the command',
        value: initial && initial.command,
        validateInput: value => value ? undefined : 'Command is required'
    });
    if (label === undefined) { return undefined; }
    const parameter = await vscode.window.showInputBox({
        prompt: 'Enter parameters (e.g., npm install <package_name>) (optional)',
        value: initial && initial.parameter || ''
    });
    const description = await vscode.window.showInputBox({
        prompt: 'Enter description (optional)',
        value: initial && initial.description || ''
    });
    return {
        label: label,
        command: label,
        parameter: parameter || '',
        description: description || ''
    };
}

function getSelectedCategory(
    category: TreeItemData | undefined,
    selection: readonly TreeItemData[]
): (Category & { type: 'category' }) | undefined {
    if (category && category.type === 'category') { return category as Category & { type: 'category' }; }
    const sel = selection[0];
    if (sel && sel.type === 'category') { return sel as Category & { type: 'category' }; }
    return undefined;
}

export function deactivate() {}

function ensureConfiguredPrompt(storageManager: StorageManager): boolean {
    if (storageManager.isConfigured()) { return true; }
    vscode.window.showWarningMessage(
        'Storage folder (commandRepository.storagePath) is not set. Do you want to open the settings?',
        'Open Settings',
        'Cancel'
    ).then(sel => {
        if (sel === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'commandRepository.storagePath');
        }
    });
    return false;
}
