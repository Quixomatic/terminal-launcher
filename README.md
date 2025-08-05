# Terminal Launcher

Launch and manage multiple terminals from configuration files in VS Code.

## Features

- Define multiple terminals in a configuration file
- Auto-launch terminals when opening a workspace
- Group terminals together (split view)
- Customize terminal colors and icons
- Support for custom working directories and commands
- Environment variable support

## Configuration

Create a `.terminal` or `.terminal.json` file in your workspace root.

### JSON Format (.terminal.json)

```json
{
  "version": "1.0",
  "groups": [
    {
      "name": "Development Servers",
      "terminals": [
        {
          "name": "Backend",
          "cwd": "./backend",
          "command": "npm run dev",
          "color": "blue",
          "icon": "server",
          "env": {
            "NODE_ENV": "development"
          }
        },
        {
          "name": "Frontend",
          "cwd": "./frontend",
          "command": "npm start",
          "color": "green",
          "icon": "browser"
        }
      ]
    }
  ]
}
```

### Simple Format (.terminal)

```ini
[Backend Server]
cwd = ./backend
command = npm run dev
color = blue
icon = server

[Frontend App]
cwd = ./frontend
command = npm start
color = green
icon = browser
```

## Terminal Options

- **name**: Display name for the terminal
- **cwd**: Working directory (relative to workspace or absolute)
- **command**: Single command to execute when terminal opens
- **commands**: Array of commands to execute in sequence (JSON format) or semicolon-separated (simple format)
- **script**: Path to external script to execute (overrides command/commands)
- **commandDelay**: Delay in milliseconds between commands (default: 100, JSON format only)
- **color**: Terminal color (red, orange, yellow, green, blue, purple, pink, black, white)
- **icon**: VS Code icon name (e.g., server, browser, database, beaker)
- **env**: Environment variables (JSON format only)
- **shellPath**: Custom shell path (JSON format only)
- **shellArgs**: Shell arguments (JSON format only)

## Command Execution Priority

Commands are executed in this order of priority:
1. **script** - If specified, executes the external script
2. **commands** - If specified, executes multiple commands in sequence
3. **command** - If specified, executes a single command

## Usage

1. Create a `.terminal` or `.terminal.json` file in your workspace
2. Use Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → "Launch Configured Terminals"
3. Or terminals will auto-launch when opening the workspace (with prompt)

## Extension Settings

- `terminalLauncher.configFileName`: Name of the configuration file (default: `.terminal`)

## Icon Names

Common VS Code icons you can use:
- `server`, `database`, `browser`, `globe`
- `beaker`, `bug`, `code`, `file-code`
- `terminal`, `console`, `output`
- `gear`, `tools`, `package`
- `folder`, `folder-opened`
- `play`, `debug-start`, `run`