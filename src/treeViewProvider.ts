// src/treeViewProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { StorageManager } from './storage';
import { TreeItemData, Category, Command } from './types';

/**
 * Provides data for the Explorer TreeView (categories + commands)
 * and supports filtering by label, including OR conditions with '|'.
 */
export class CommandExplorerProvider implements vscode.TreeDataProvider<TreeItemData> {

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItemData | undefined | null | void> = new vscode.EventEmitter<TreeItemData | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItemData | undefined | null | void> = this._onDidChangeTreeData.event;

    private filterText: string = '';
    private collapsedCategoryIds: Set<string> = new Set();

    constructor(
        private storageManager: StorageManager,
        private context: vscode.ExtensionContext
    ) {}

    /** Refresh the entire tree */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /** Set filter string (empty to clear) */
    setFilterText(text: string) {
        this.filterText = (text || '').toLowerCase();
        this.refresh();
    }

    /** Persisted collapsed category IDs (workspace scope) */
    setCollapsedCategoryIds(ids: string[]) {
        this.collapsedCategoryIds = new Set(ids);
    }

    /** Build the TreeItem appearance */
    getTreeItem(element: TreeItemData): vscode.TreeItem {
        const isCategory = element.type === 'category';
        const hasFilter = this.filterText.trim().length > 0;
        const isExpanded = !this.collapsedCategoryIds.has(element.id);
        const collapsibleState = isCategory
            ? (hasFilter || isExpanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed)
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(element.label, collapsibleState);

        item.id = element.id;
        if (isCategory) {
            item.contextValue = 'category';
        } else {
            const hasParam = typeof (element as any).parameter === 'string' && (element as any).parameter.trim().length > 0;
            item.contextValue = hasParam ? 'commandHasParam' : 'commandNoParam';
        }

        if (isCategory) {
            item.iconPath = {
                light: vscode.Uri.file(this.context.asAbsolutePath(path.join('images', 'folder16.png'))),
                dark: vscode.Uri.file(this.context.asAbsolutePath(path.join('images', 'folder16.png')))
            };
        } else {
            item.iconPath = {
                light: vscode.Uri.file(this.context.asAbsolutePath(path.join('images', 'command16.png'))),
                dark: vscode.Uri.file(this.context.asAbsolutePath(path.join('images', 'command16.png')))
            };
            item.tooltip = (element as any).description || element.label;
        }

        item.command = {
            command: 'commandRepository.showDetails',
            title: 'Show Details',
            arguments: [element]
        };

        return item;
    }

    /** Enumerate children for a given element */
    async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
        const data = this.storageManager.getData();

        // Support OR conditions with '|' (trim spaces, ignore empty tokens)
        const tokens = (this.filterText || '')
            .split('|')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // No filter: return original data
        if (tokens.length === 0) {
            if (!element) {
                return data.categories.map(cat => ({ ...cat, type: 'category', children: cat.children }));
            }
            if (element.type === 'category') {
                const cat = data.categories.find(c => c.id === element.id);
                return cat ? cat.children.map(cmd => ({ ...cmd, type: 'command', categoryId: cat.id })) : [];
            }
            return [];
        }

        // Apply filter: case-insensitive OR match on label
        const match = (label: string) => {
            const l = (label || '').toLowerCase();
            return tokens.some(tok => l.includes(tok));
        };

        const filteredCats: Array<Category & { children: Command[] }> = data.categories
            .map(cat => {
                if (match(cat.label)) {
                    return { ...cat, children: cat.children.slice() };
                }
                const children = cat.children.filter(cmd => match(cmd.label));
                return children.length ? { ...cat, children } : null;
            })
            .filter((x): x is Category & { children: Command[] } => !!x);

        if (!element) {
            return filteredCats.map(cat => ({ ...cat, type: 'category', children: cat.children }));
        }
        if (element.type === 'category') {
            const cat = filteredCats.find(c => c.id === element.id);
            return cat ? cat.children.map(cmd => ({ ...cmd, type: 'command', categoryId: cat.id })) : [];
        }
        return [];
    }
}
