import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TerminalLauncherConfig } from './types';

export class ConfigInitializer {
    private readonly colors = [
        { label: '🔵 Blue', value: 'blue' },
        { label: '🟢 Green', value: 'green' },
        { label: '🔴 Red', value: 'red' },
        { label: '🟡 Yellow', value: 'yellow' },
        { label: '🟠 Orange', value: 'orange' },
        { label: '🟣 Purple', value: 'purple' },
        { label: '🩷 Pink', value: 'pink' },
        { label: '⚫ Black', value: 'black' },
        { label: '⚪ White', value: 'white' }
    ];

    private readonly icons = [
        { label: '🖥️ Terminal', value: 'terminal' },
        { label: '🖳 Console', value: 'console' },
        { label: '🌐 Server', value: 'server' },
        { label: '🌍 Globe', value: 'globe' },
        { label: '🗂️ Database', value: 'database' },
        { label: '🌐 Browser', value: 'browser' },
        { label: '🧪 Beaker (Tests)', value: 'beaker' },
        { label: '🐛 Bug (Debug)', value: 'bug' },
        { label: '📝 Code', value: 'code' },
        { label: '📄 File Code', value: 'file-code' },
        { label: '📁 Folder', value: 'folder' },
        { label: '📂 Folder Opened', value: 'folder-opened' },
        { label: '▶️ Play', value: 'play' },
        { label: '🏃 Run', value: 'run' },
        { label: '🔧 Tools', value: 'tools' },
        { label: '⚙️ Gear', value: 'gear' },
        { label: '📦 Package', value: 'package' },
        { label: '🔍 Search', value: 'search' }
    ];

    async initializeConfig(): Promise<void> {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a workspace folder first.');
            return;
        }

        // First, select the target directory
        vscode.window.showInformationMessage('First, choose where to create the .terminal.json file...');
        
        const targetFolder = await this.selectWorkspaceFolder();
        if (!targetFolder) {
            return;
        }

        // No confirmation needed - user already selected "Use This Directory"

        const setupType = await vscode.window.showQuickPick([
            { label: '🚀 Quick Setup', description: 'Create a basic single terminal configuration' },
            { label: '🏗️ Advanced Setup', description: 'Create a multi-terminal group configuration' },
            { label: '📋 Example Template', description: 'Generate example configurations to learn from' }
        ], {
            placeHolder: 'Choose setup type'
        });

        if (!setupType) {
            return;
        }

        let config: TerminalLauncherConfig | undefined;

        switch (setupType.label) {
            case '🚀 Quick Setup':
                config = await this.quickSetup();
                break;
            case '🏗️ Advanced Setup':
                config = await this.advancedSetup();
                break;
            case '📋 Example Template':
                config = this.createExampleTemplate();
                break;
            default:
                return;
        }

        if (config) {
            await this.saveConfig(targetFolder, config);
        }
    }

    private async selectWorkspaceFolder(): Promise<{ uri: vscode.Uri, name: string } | undefined> {
        if (!vscode.workspace.workspaceFolders) {
            return undefined;
        }

        // Start navigation from workspace root
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        return await this.navigateToDirectory(workspaceFolder.uri.fsPath, workspaceFolder.name);
    }

    private async navigateToDirectory(currentPath: string, displayName: string): Promise<{ uri: vscode.Uri, name: string } | undefined> {
        const subdirectories = await this.getSubdirectories(currentPath);
        
        // Create options: Use current directory + subdirectories
        const options: (vscode.QuickPickItem & { action: string, fullPath?: string })[] = [];
        
        // Option to use the current directory
        options.push({
            label: `✅ Use This Directory`,
            description: `Create .terminal.json here`,
            detail: currentPath,
            action: 'use',
            fullPath: currentPath
        });

        if (subdirectories.length > 0) {
            // Add separator
            options.push({
                label: '',
                description: '───── Navigate to Subdirectory ─────',
                detail: '',
                action: 'separator'
            } as any);

            // Add subdirectories for navigation
            subdirectories.forEach(subdir => {
                options.push({
                    label: `📁 ${subdir.name}`,
                    description: `Navigate into this folder`,
                    detail: subdir.fullPath,
                    action: 'navigate',
                    fullPath: subdir.fullPath
                });
            });
        }

        // Show navigation back to parent (except for workspace root)
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
        if (currentPath !== workspaceRoot) {
            options.push({
                label: '',
                description: '───── Go Back ─────',
                detail: '',
                action: 'separator'
            } as any);

            const parentPath = path.dirname(currentPath);
            options.push({
                label: `⬆️ Back to Parent`,
                description: `Go back to ${path.basename(parentPath)}`,
                detail: parentPath,
                action: 'back',
                fullPath: parentPath
            });
        }

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: `Select action for: ${path.relative(workspaceRoot, currentPath) || '(workspace root)'}`,
            matchOnDescription: true,
            ignoreFocusOut: true
        });

        if (!selected || selected.action === 'separator') {
            return undefined;
        }

        switch (selected.action) {
            case 'use':
                return {
                    uri: vscode.Uri.file(currentPath),
                    name: path.basename(currentPath)
                };
            
            case 'navigate':
                if (selected.fullPath) {
                    return await this.navigateToDirectory(selected.fullPath, path.basename(selected.fullPath));
                }
                break;
            
            case 'back':
                if (selected.fullPath) {
                    return await this.navigateToDirectory(selected.fullPath, path.basename(selected.fullPath));
                }
                break;
            
            default:
                return undefined;
        }

        return undefined;
    }

    private async getSubdirectories(directoryPath: string): Promise<Array<{ name: string, fullPath: string }>> {
        const subdirectories: Array<{ name: string, fullPath: string }> = [];
        
        try {
            const fs = require('fs');
            const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // Skip common directories that we don't want to navigate into
                    const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', 'out'];
                    if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        subdirectories.push({
                            name: entry.name,
                            fullPath: path.join(directoryPath, entry.name)
                        });
                    }
                }
            }
            
            // Sort alphabetically
            subdirectories.sort((a, b) => a.name.localeCompare(b.name));
            
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        return subdirectories;
    }

    private async quickSetup(): Promise<TerminalLauncherConfig | undefined> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter terminal name',
            placeHolder: 'e.g., Development Server'
        });

        if (!name) {
            return undefined;
        }

        const color = await vscode.window.showQuickPick(this.colors, {
            placeHolder: 'Choose terminal color'
        });

        const icon = await vscode.window.showQuickPick(this.icons, {
            placeHolder: 'Choose terminal icon'
        });

        const cwd = await vscode.window.showInputBox({
            prompt: 'Enter working directory (optional)',
            placeHolder: 'e.g., ./src or leave empty for project root'
        });

        const command = await vscode.window.showInputBox({
            prompt: 'Enter command to run (optional)',
            placeHolder: 'e.g., npm run dev'
        });

        const config: TerminalLauncherConfig = {
            version: '1.0',
            terminals: [{
                name: name,
                ...(color && { color: color.value as any }),
                ...(icon && { icon: icon.value }),
                ...(cwd && cwd.trim() && { cwd: cwd.trim() }),
                ...(command && command.trim() && { command: command.trim() })
            }]
        };

        return config;
    }

    private async advancedSetup(): Promise<TerminalLauncherConfig | undefined> {
        const groupName = await vscode.window.showInputBox({
            prompt: 'Enter group name',
            placeHolder: 'e.g., Full Stack Development'
        });

        if (!groupName) {
            return undefined;
        }

        const terminals = [];
        let addMore = true;

        while (addMore) {
            const terminalNumber = terminals.length + 1;
            
            const name = await vscode.window.showInputBox({
                prompt: `Enter name for terminal ${terminalNumber}`,
                placeHolder: `e.g., ${terminalNumber === 1 ? 'Backend' : terminalNumber === 2 ? 'Frontend' : 'Database'}`
            });

            if (!name) {
                break;
            }

            const color = await vscode.window.showQuickPick(this.colors, {
                placeHolder: `Choose color for ${name}`
            });

            const icon = await vscode.window.showQuickPick(this.icons, {
                placeHolder: `Choose icon for ${name}`
            });

            const cwd = await vscode.window.showInputBox({
                prompt: `Enter working directory for ${name} (optional)`,
                placeHolder: `e.g., ./${name.toLowerCase()}`
            });

            const command = await vscode.window.showInputBox({
                prompt: `Enter command for ${name} (optional)`,
                placeHolder: 'e.g., npm run dev'
            });

            terminals.push({
                name: name,
                ...(color && { color: color.value as any }),
                ...(icon && { icon: icon.value }),
                ...(cwd && cwd.trim() && { cwd: cwd.trim() }),
                ...(command && command.trim() && { command: command.trim() })
            });

            const continueAdding = await vscode.window.showQuickPick([
                { label: '➕ Add Another Terminal', value: true },
                { label: '✅ Finish Setup', value: false }
            ], {
                placeHolder: `Added ${terminals.length} terminal${terminals.length > 1 ? 's' : ''}. What next?`
            });

            addMore = continueAdding?.value ?? false;
        }

        if (terminals.length === 0) {
            return undefined;
        }

        const config: TerminalLauncherConfig = {
            version: '1.0',
            groups: [{
                name: groupName,
                terminals: terminals
            }]
        };

        return config;
    }

    private createExampleTemplate(): TerminalLauncherConfig {
        return {
            version: '1.0',
            groups: [
                {
                    name: 'Full Stack Development',
                    terminals: [
                        {
                            name: 'Backend API',
                            cwd: './backend',
                            commands: [
                                'npm install',
                                'npm run dev'
                            ],
                            color: 'blue',
                            icon: 'server'
                        },
                        {
                            name: 'Frontend UI',
                            cwd: './frontend',
                            command: 'npm start',
                            color: 'green',
                            icon: 'browser'
                        },
                        {
                            name: 'Database',
                            cwd: './',
                            command: 'docker-compose up db',
                            color: 'orange',
                            icon: 'database'
                        }
                    ]
                }
            ],
            terminals: [
                {
                    name: 'Tests',
                    command: 'npm test -- --watch',
                    color: 'yellow',
                    icon: 'beaker'
                }
            ]
        };
    }

    private async saveConfig(targetFolder: { uri: vscode.Uri, name: string }, config: TerminalLauncherConfig): Promise<void> {
        const configPath = path.join(targetFolder.uri.fsPath, '.terminal.json');
        const configContent = JSON.stringify(config, null, 2);

        try {
            fs.writeFileSync(configPath, configContent, 'utf8');
            
            const openFile = await vscode.window.showInformationMessage(
                `Terminal configuration created at ${configPath}`,
                'Open File',
                'Launch Terminals'
            );

            if (openFile === 'Open File') {
                const document = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(document);
            } else if (openFile === 'Launch Terminals') {
                await vscode.commands.executeCommand('terminalLauncher.launchTerminals');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create config file: ${error}`);
        }
    }
}