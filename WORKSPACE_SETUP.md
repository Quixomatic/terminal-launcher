# VS Code Workspace Setup for Terminal Launcher

## The Issue

If you're getting "No terminal configuration files found", it's likely because VS Code doesn't know about your project folders.

## Solution 1: Multi-Root Workspace (Recommended)

1. **Add folders to workspace:**
   - File → Add Folder to Workspace...
   - Select `TaleFrame` folder
   - File → Add Folder to Workspace...
   - Select `FableForge` folder

2. **Save workspace (optional):**
   - File → Save Workspace As...
   - Save as `my-projects.code-workspace`

Now Terminal Launcher will find both `.terminal.json` files!

## Solution 2: Open Parent Folder

If your structure is:
```
Projects/
├── TaleFrame/
│   └── .terminal.json
└── FableForge/
    └── .terminal.json
```

Simply open the `Projects` folder in VS Code:
- File → Open Folder...
- Select the `Projects` folder

## Solution 3: Use Workspace File

Create a `projects.code-workspace` file:
```json
{
    "folders": [
        {
            "path": "Projects/TaleFrame"
        },
        {
            "path": "Projects/FableForge"
        }
    ]
}
```

Then open this workspace file in VS Code.

## How VS Code Workspaces Work

- **Single Folder**: File → Open Folder
- **Multi-Root Workspace**: File → Add Folder to Workspace (multiple times)
- **Workspace File**: Saves your multi-root configuration

Terminal Launcher searches in:
1. Each workspace folder's root
2. Immediate subdirectories of each workspace folder

So make sure your project folders are added to the VS Code workspace!