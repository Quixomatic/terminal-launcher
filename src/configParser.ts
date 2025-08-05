import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TerminalLauncherConfig } from './types';

export interface ConfigLocation {
    path: string;
    folder: vscode.WorkspaceFolder;
    projectName: string;
}

export class ConfigParser {
    private configFileName: string;

    constructor() {
        this.configFileName = vscode.workspace.getConfiguration('terminalLauncher').get('configFileName', '.terminal');
    }

    async findAllConfigFiles(): Promise<ConfigLocation[]> {
        const configs: ConfigLocation[] = [];
        
        if (!vscode.workspace.workspaceFolders) {
            return configs;
        }

        // Use VS Code's file search API for better reliability
        // Search for .terminal and .terminal.json files anywhere in the workspace
        const patterns = [
            `**/${this.configFileName}`,
            `**/${this.configFileName}.json`
        ];
        const excludePattern = '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**}';
        
        try {
            // Search for each pattern separately
            for (const pattern of patterns) {
                const files = await vscode.workspace.findFiles(pattern, excludePattern, 100);
                
                for (const file of files) {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
                    if (workspaceFolder) {
                        const folderPath = path.dirname(file.fsPath);
                        configs.push({
                            path: file.fsPath,
                            folder: workspaceFolder,
                            projectName: path.basename(folderPath)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error finding config files:', error);
            // Fallback to manual search
            for (const folder of vscode.workspace.workspaceFolders) {
                // Check root folder
                const rootConfigs = await this.findConfigInFolder(folder.uri.fsPath, folder);
                configs.push(...rootConfigs);
                
                // Check immediate subdirectories (common for monorepo structures)
                try {
                    const subdirs = fs.readdirSync(folder.uri.fsPath, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => path.join(folder.uri.fsPath, dirent.name));
                    
                    for (const subdir of subdirs) {
                        const subConfigs = await this.findConfigInFolder(subdir, folder);
                        configs.push(...subConfigs);
                    }
                } catch (error) {
                    // Ignore errors reading subdirectories
                }
            }
        }
        
        return configs;
    }

    private async findConfigInFolder(folderPath: string, workspaceFolder: vscode.WorkspaceFolder): Promise<ConfigLocation[]> {
        const configs: ConfigLocation[] = [];
        const configPath = path.join(folderPath, this.configFileName);
        const jsonConfigPath = configPath + '.json';
        
        if (fs.existsSync(jsonConfigPath)) {
            configs.push({
                path: jsonConfigPath,
                folder: workspaceFolder,
                projectName: path.basename(folderPath)
            });
        } else if (fs.existsSync(configPath)) {
            configs.push({
                path: configPath,
                folder: workspaceFolder,
                projectName: path.basename(folderPath)
            });
        }
        
        return configs;
    }

    async findConfigFile(): Promise<string | undefined> {
        const configs = await this.findAllConfigFiles();
        return configs.length > 0 ? configs[0].path : undefined;
    }

    async parseConfig(configPath: string): Promise<TerminalLauncherConfig | undefined> {
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            
            // Try to parse as JSON
            try {
                return JSON.parse(content) as TerminalLauncherConfig;
            } catch (jsonError) {
                // If JSON parsing fails, try to parse as custom format
                return this.parseCustomFormat(content);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read config file: ${error}`);
            return undefined;
        }
    }

    private parseCustomFormat(content: string): TerminalLauncherConfig {
        const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
        const config: TerminalLauncherConfig = { terminals: [] };
        
        let currentTerminal: any = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                if (currentTerminal) {
                    config.terminals!.push(currentTerminal);
                }
                currentTerminal = { name: trimmed.slice(1, -1) };
            } else if (currentTerminal && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=').trim();
                
                switch (key.trim()) {
                    case 'cwd':
                        currentTerminal.cwd = value;
                        break;
                    case 'command':
                        currentTerminal.command = value;
                        break;
                    case 'commands':
                        // Split by semicolon and trim each command
                        currentTerminal.commands = value.split(';').map(cmd => cmd.trim());
                        break;
                    case 'script':
                        currentTerminal.script = value;
                        break;
                    case 'color':
                        currentTerminal.color = value;
                        break;
                    case 'icon':
                        currentTerminal.icon = value;
                        break;
                }
            }
        }
        
        if (currentTerminal) {
            config.terminals!.push(currentTerminal);
        }
        
        return config;
    }
}