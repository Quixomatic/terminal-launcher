import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigParser, ConfigLocation } from './configParser';
import { TerminalManager } from './terminalManager';
import { ConfigInitializer } from './configInitializer';

let terminalManager: TerminalManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Terminal Launcher extension is now active!');

    terminalManager = new TerminalManager();
    const configParser = new ConfigParser();
    const configInitializer = new ConfigInitializer();

    // Register the main launch terminals command
    const launchCommand = vscode.commands.registerCommand('terminalLauncher.launchTerminals', async () => {
        // Debug: Show current workspace folders
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder or workspace.');
            return;
        }
        
        console.log('Workspace folders:', vscode.workspace.workspaceFolders.map(f => f.uri.fsPath));
        
        const configs = await configParser.findAllConfigFiles();
        console.log('Found configs:', configs.map(c => c.path));
        
        if (configs.length === 0) {
            const workspacePaths = vscode.workspace.workspaceFolders.map(f => f.uri.fsPath).join(', ');
            
            // Also try to show what files VS Code can see
            const testPattern = '**/Projects/**/.terminal*';
            const testFiles = await vscode.workspace.findFiles(testPattern, '**/node_modules/**', 10);
            console.log('Test search found:', testFiles.map(f => f.fsPath));
            
            vscode.window.showErrorMessage(`No terminal configuration files found. Workspace root: ${workspacePaths}`);
            return;
        }

        let selectedConfig: ConfigLocation | undefined;

        if (configs.length === 1) {
            // Only one config found, use it directly
            selectedConfig = configs[0];
        } else {
            // Multiple configs found, show picker
            const items = configs.map(config => ({
                label: config.projectName,
                description: path.relative(config.folder.uri.fsPath, path.dirname(config.path)),
                detail: `$(folder) ${config.path}`,
                config: config
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select project to launch terminals for',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return;
            }

            selectedConfig = selected.config;
        }

        const config = await configParser.parseConfig(selectedConfig.path);
        
        if (!config) {
            vscode.window.showErrorMessage('Failed to parse terminal configuration file.');
            return;
        }

        // Pass the project base path to the terminal manager
        const projectPath = path.dirname(selectedConfig.path);
        await terminalManager.launchTerminals(config, projectPath);
        vscode.window.showInformationMessage(`Terminals launched for ${selectedConfig.projectName}!`);
    });

    // Register command to launch all terminals
    const launchAllCommand = vscode.commands.registerCommand('terminalLauncher.launchAllTerminals', async () => {
        const configs = await configParser.findAllConfigFiles();
        
        if (configs.length === 0) {
            vscode.window.showErrorMessage('No terminal configuration files found.');
            return;
        }

        const answer = await vscode.window.showWarningMessage(
            `Launch terminals for all ${configs.length} projects?`,
            'Yes',
            'No'
        );

        if (answer !== 'Yes') {
            return;
        }

        for (const configLocation of configs) {
            const config = await configParser.parseConfig(configLocation.path);
            if (config) {
                const projectPath = path.dirname(configLocation.path);
                await terminalManager.launchTerminals(config, projectPath);
            }
        }

        vscode.window.showInformationMessage(`Launched terminals for ${configs.length} projects!`);
    });

    // Register the init config command
    const initCommand = vscode.commands.registerCommand('terminalLauncher.initConfig', async () => {
        await configInitializer.initializeConfig();
    });

    context.subscriptions.push(launchCommand, launchAllCommand, initCommand);

    // Auto-launch terminals when workspace opens if config exists
    checkAndLaunchTerminals();

    // Watch for config file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/.terminal{,.json}');
    watcher.onDidCreate(() => {
        vscode.window.showInformationMessage('Terminal configuration file detected. Use "Launch Configured Terminals" command to start.');
    });
    
    context.subscriptions.push(watcher);

    async function checkAndLaunchTerminals() {
        const configPath = await configParser.findConfigFile();
        if (configPath) {
            const config = await configParser.parseConfig(configPath);
            if (config) {
                const answer = await vscode.window.showInformationMessage(
                    'Terminal configuration found. Launch terminals now?',
                    'Yes',
                    'No'
                );
                
                if (answer === 'Yes') {
                    await terminalManager.launchTerminals(config);
                }
            }
        }
    }
}

export function deactivate() {
    if (terminalManager) {
        terminalManager.disposeTerminals();
    }
}