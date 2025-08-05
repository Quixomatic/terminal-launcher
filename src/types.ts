export interface TerminalConfig {
  name: string;
  cwd?: string;
  command?: string;
  commands?: string[];
  script?: string;
  commandDelay?: number;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'black' | 'white';
  icon?: string;
  env?: Record<string, string>;
  shellPath?: string;
  shellArgs?: string[];
}

export interface TerminalGroupConfig {
  name?: string;
  terminals: TerminalConfig[];
}

export interface TerminalLauncherConfig {
  version?: string;
  groups?: TerminalGroupConfig[];
  terminals?: TerminalConfig[];
}