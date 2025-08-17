# Command Repository

This is a VS Code extension that allows you to register commands by category and send them to the terminal with a single click from the sidebar.
You can also use it as a command reference.

## Features

- Register, edit, and delete commands for each category.
- List commands by category.
- Check command information in the details view.
- Send commands to the terminal instantly.
- Automatically reflects the command in the executor view when selected.
- Edit commands in the executor view, or enter and execute any command (send with Ctrl+Enter).

## Views

### EXPLORER View

A view to display the operation panel and command list.

![EXPLORER](https://github.com/Knworks/commandrepository/raw/HEAD/commandrepository/images/explorer.png)

### DETAIL View

A view to display the details of a command.

![DETAIL](https://github.com/Knworks/commandrepository/raw/HEAD/commandrepository/images/detail.png)

### EXECUTOR VIew

A view to edit and execute commands.

![EXECUTOR](https://github.com/Knworks/commandrepository/raw/HEAD/commandrepository/images/executor.png)

## Usage

### Registering a Command

1. Click the "Command Repository" icon in the sidebar to display the dedicated panel.
2. In the Explorer's operation panel, click the "Add Category" button (folder icon) and enter a category name.
3. Select the added category and click the "Add Command" button in the Explorer's operation panel.
4. Register the command by entering the following information:

- Command (required)
- Parameter (optional)
- Description (optional)

### Executing a Command

1. Select a command node in the Explorer.
2. Send and execute it to the terminal with the "▶" button on the command node. If the terminal is not running, it will start automatically.
3. If the command has parameters, change them in the executor view.
4. Send and execute from the Executor's "▶" button (or send with Ctrl+Enter).

### Editing/Deleting a Command

1. Select the category/command node you want to edit or delete in the Explorer.
2. Click the "Edit" or "Delete" button in the Explorer's operation panel.
3. When editing, overwrite the registration information with the same items as when registering. When deleting, allow the deletion in the confirmation dialog.

## Settings

Settings can be configured in "Extension Settings" or `settings.json`.

- `commandRepository.storagePath`: Specifies the storage directory for the command repository.
  - You can specify it in the following ways:
    - Absolute path
    - Relative path from the workspace root
    - With `${workspaceFolder}`
      - Example: `${workspaceFolder}/data` → `C:\Projects\app\data\commandrepository.json`
    - With `${env:VARNAME}`
      - This is the format for referencing environment variables. Common variable names differ for each OS.
- The file name is fixed to `commandrepository.json`.
- The default value is blank. When blank, nothing is displayed in the tree etc.
- If you try to add/edit/delete from the operation panel without setting it, a message prompting you to set it will be displayed.

## Privacy/Telemetry

This extension does not send any usage data (telemetry).

## License

MIT
