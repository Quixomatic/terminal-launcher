import * as vscode from 'vscode';
import * as path from 'path';
import { TerminalConfig, TerminalGroupConfig, TerminalLauncherConfig } from './types';

export class TerminalManager {
    private terminals: vscode.Terminal[] = [];

    async launchTerminals(config: TerminalLauncherConfig, projectBasePath?: string) {
        // Check for existing terminals before launching
        const duplicateAction = await this.checkForDuplicateTerminals(config, projectBasePath);
        if (duplicateAction === 'cancel') {
            return;
        }

        if (config.groups && config.groups.length > 0) {
            // Launch grouped terminals
            for (const group of config.groups) {
                await this.launchTerminalGroup(group, projectBasePath, duplicateAction);
            }
        } else if (config.terminals && config.terminals.length > 0) {
            // Launch ungrouped terminals
            for (let i = 0; i < config.terminals.length; i++) {
                const terminal = await this.createTerminal(config.terminals[i], projectBasePath, duplicateAction);
                if (terminal) {
                    this.terminals.push(terminal);
                    terminal.show(i === 0);
                }
            }
        }
    }

    private async launchTerminalGroup(group: TerminalGroupConfig, projectBasePath?: string, duplicateAction?: string) {
        if (!group.terminals || group.terminals.length === 0) {
            return;
        }

        // Create all terminals in the group normally (VS Code will handle grouping them visually)
        for (let i = 0; i < group.terminals.length; i++) {
            const terminal = await this.createTerminal(group.terminals[i], projectBasePath, duplicateAction);
            if (terminal) {
                this.terminals.push(terminal);
                // Show the first terminal, others will be available as tabs
                terminal.show(i === 0);
                
                // Small delay between creating terminals
                if (i < group.terminals.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
    }

    private async createTerminal(config: TerminalConfig, projectBasePath?: string, duplicateAction?: string): Promise<vscode.Terminal | undefined> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const basePath = projectBasePath || workspaceFolder?.uri.fsPath;
            
            if (!basePath && config.cwd && !path.isAbsolute(config.cwd)) {
                vscode.window.showErrorMessage(`Cannot resolve relative path without base path: ${config.cwd}`);
                return undefined;
            }

            const cwd = config.cwd 
                ? (path.isAbsolute(config.cwd) 
                    ? config.cwd 
                    : path.join(basePath!, config.cwd))
                : basePath;

            // Add project name prefix if we have a project base path
            let terminalName = projectBasePath 
                ? `[${path.basename(projectBasePath)}] ${config.name}`
                : config.name;

            // Handle existing terminals based on user choice
            const existingTerminal = this.findExistingTerminal(terminalName);
            if (existingTerminal) {
                if (duplicateAction === 'replace') {
                    existingTerminal.dispose();
                } else if (duplicateAction === 'skip') {
                    return undefined; // Skip creating this terminal
                } else if (duplicateAction === 'rename') {
                    terminalName = this.generateUniqueTerminalName(terminalName);
                }
            }

            const terminalOptions: vscode.TerminalOptions = {
                name: terminalName,
                cwd: cwd,
                env: config.env,
                shellPath: config.shellPath,
                shellArgs: config.shellArgs
            };

            // Set color if specified
            if (config.color) {
                terminalOptions.color = this.getTerminalColor(config.color);
            }

            // Set icon if specified
            if (config.icon) {
                terminalOptions.iconPath = new vscode.ThemeIcon(config.icon);
            }

            const terminal = vscode.window.createTerminal(terminalOptions);

            // Small delay to ensure terminal is ready
            setTimeout(() => {
                this.executeTerminalCommands(terminal, config, cwd || basePath || '');
            }, 500);

            return terminal;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create terminal ${config.name}: ${error}`);
            return undefined;
        }
    }

    private executeTerminalCommands(terminal: vscode.Terminal, config: TerminalConfig, basePath: string) {
        // Execute commands in order of priority: script > commands > command
        if (config.script) {
            // Execute external script
            const scriptPath = path.isAbsolute(config.script) 
                ? config.script 
                : path.join(basePath, config.script);
            terminal.sendText(scriptPath);
        } else if (config.commands && config.commands.length > 0) {
            // Execute multiple commands with optional delay between them
            const delay = config.commandDelay || 100;
            config.commands.forEach((cmd, index) => {
                setTimeout(() => {
                    terminal.sendText(cmd);
                }, index * delay);
            });
        } else if (config.command) {
            // Execute single command
            terminal.sendText(config.command);
        }
    }

    private getTerminalColor(color: string): vscode.ThemeColor {
        const colorMap: Record<string, string> = {
            'red': 'terminal.ansiRed',
            'orange': 'terminal.ansiYellow',
            'yellow': 'terminal.ansiYellow',
            'green': 'terminal.ansiGreen',
            'blue': 'terminal.ansiBlue',
            'purple': 'terminal.ansiMagenta',
            'pink': 'terminal.ansiMagenta',
            'black': 'terminal.ansiBlack',
            'white': 'terminal.ansiWhite'
        };

        return new vscode.ThemeColor(colorMap[color] || 'terminal.foreground');
    }

    disposeTerminals() {
        this.terminals.forEach(terminal => terminal.dispose());
        this.terminals = [];
    }

    private async checkForDuplicateTerminals(config: TerminalLauncherConfig, projectBasePath?: string): Promise<string> {
        const terminalNames: string[] = [];

        // Collect all terminal names that would be created
        if (config.groups && config.groups.length > 0) {
            for (const group of config.groups) {
                if (group.terminals) {
                    for (const terminal of group.terminals) {
                        const name = projectBasePath 
                            ? `[${path.basename(projectBasePath)}] ${terminal.name}`
                            : terminal.name;
                        terminalNames.push(name);
                    }
                }
            }
        } else if (config.terminals && config.terminals.length > 0) {
            for (const terminal of config.terminals) {
                const name = projectBasePath 
                    ? `[${path.basename(projectBasePath)}] ${terminal.name}`
                    : terminal.name;
                terminalNames.push(name);
            }
        }

        // Check if any of these terminals already exist
        const duplicates = terminalNames.filter(name => this.findExistingTerminal(name) !== undefined);

        if (duplicates.length > 0) {
            const duplicateList = duplicates.map(name => `• ${name}`).join('\n');
            
            const action = await vscode.window.showQuickPick([
                { 
                    label: '🔄 Replace Existing', 
                    description: 'Kill existing terminals and create new ones',
                    detail: 'Recommended if you want fresh terminals',
                    value: 'replace'
                },
                { 
                    label: '⏭️ Skip Existing', 
                    description: 'Only create terminals that don\'t exist yet',
                    detail: 'Keep running terminals, add missing ones',
                    value: 'skip'
                },
                { 
                    label: '🏷️ Rename New', 
                    description: 'Create new terminals with unique names',
                    detail: 'Add (2), (3), etc. to avoid conflicts',
                    value: 'rename'
                },
                { 
                    label: '❌ Cancel', 
                    description: 'Don\'t launch any terminals',
                    detail: 'Leave everything as is',
                    value: 'cancel'
                }
            ], {
                placeHolder: `Found ${duplicates.length} existing terminal${duplicates.length > 1 ? 's' : ''}. What should we do?`,
                ignoreFocusOut: true
            });

            return action?.value || 'cancel';
        }

        return 'proceed'; // No duplicates found
    }

    private findExistingTerminal(name: string): vscode.Terminal | undefined {
        return vscode.window.terminals.find(terminal => terminal.name === name);
    }

    private generateUniqueTerminalName(baseName: string): string {
        let counter = 2;
        let uniqueName = `${baseName} (${counter})`;
        
        while (this.findExistingTerminal(uniqueName)) {
            counter++;
            uniqueName = `${baseName} (${counter})`;
        }
        
        return uniqueName;
    }
}