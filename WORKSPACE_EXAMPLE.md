# Multi-Project Workspace Example

## Scenario 1: Multiple Projects, Each with Own Config

```
workspace/
├── project-a/
│   ├── backend/
│   ├── frontend/
│   └── .terminal.json    # Launches both backend and frontend
├── project-b/
│   ├── server/
│   ├── client/
│   └── .terminal.json    # Launches server and client
└── project-c/
    ├── api/
    ├── web/
    └── .terminal.json    # Launches api and web
```

Each project has its own `.terminal.json` that can launch multiple terminals.

## Scenario 2: Single Project with Multiple Services

```
my-app/
├── backend/
│   ├── src/
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── database/
│   └── docker-compose.yml
└── .terminal.json        # Single config file launches all services
```

`.terminal.json` content:
```json
{
  "version": "1.0",
  "groups": [
    {
      "name": "Full Stack App",
      "terminals": [
        {
          "name": "Backend API",
          "cwd": "./backend",
          "commands": [
            "npm install",
            "npm run dev"
          ],
          "color": "blue",
          "icon": "server"
        },
        {
          "name": "Frontend UI",
          "cwd": "./frontend",
          "command": "npm run dev",
          "color": "green",
          "icon": "browser"
        },
        {
          "name": "Database",
          "cwd": "./database",
          "command": "docker-compose up",
          "color": "orange",
          "icon": "database"
        }
      ]
    }
  ]
}
```

## How It Works

1. **Single Project**: If your workspace has one project with a `.terminal.json`, it will launch all terminals defined in that file
2. **Multiple Projects**: If you have multiple projects each with their own `.terminal.json`, you'll get a picker to choose which project's terminals to launch
3. **Groups**: Terminals in the same group are launched together and appear in split view in VS Code

## Commands

- **"Terminal Launcher: Launch Terminals"**: Shows project picker if multiple configs found
- **"Terminal Launcher: Launch All Project Terminals"**: Launches terminals for ALL projects at once