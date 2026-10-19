# PR title

```text
Add dsh-plugin-quick-invoke (UI: plugin quick invoke)
```

# PR body

```markdown
## What this adds

`OWNER/dsh-plugin-quick-invoke` — a Web UI plugin for DeepSeek Harness that adds an installed-plugin picker beside the composer.

- A "插件调用 / Plugins" chip in the New Session row (right of the workspace and agent-preset controls) and a compact chip in the composer tool row, so the picker stays reachable during a conversation.
- An upward picker listing the user's installed plugins; rows highlight on hover and can be dragged into the prompt, where the plugin name is inserted at the drop point through the composer's own drag-and-drop path.
- Double-clicking the chip opens a persistent, draggable plugin rail as a tab in the right sidebar.
- A Settings page (`Settings → 插件快捷调用`) that lists installed plugins with a show/hide switch and an optional remark rendered as muted text under the plugin name.

The plugin is browser-only: the host row is an empty Cordis plugin, and preferences live in the browser's localStorage.

## Entry

- `url`: https://github.com/OWNER/dsh-plugin-quick-invoke
- `name`: OWNER/dsh-plugin-quick-invoke
- `category`: ui
- Added file: `data/plugins/OWNER__dsh-plugin-quick-invoke.yml`

## Checklist

- [x] Repository declares `dsh.bundle` (`cordis.patch.yml`) and `dsh.client` (Web UI)
- [x] Repository contains real, working code (no placeholder / no meta-package behaviour)
- [x] `dsh-plugin` topic added to the repository
- [x] Repository is at least 1 day old (created YYYY-MM-DD; PR opened after the 24h check point)
- [x] Description states what the plugin does, with no marketing terms
- [x] This PR adds exactly one entry and does not modify any existing entry
- [x] The generated READMEs were not edited
- [x] npm package `dsh-plugin-quick-invoke` published; its `package.json.repository` points back at this repository (optional but done)
```

# Notes before opening

- Replace `OWNER` with the GitHub user/organization that owns the repository, in both the title/body and the added file.
- Replace `YYYY-MM-DD` with the repository creation date, and only open the PR once the repository is at least 24 hours old.
- Add only `data/plugins/OWNER__dsh-plugin-quick-invoke.yml`; never edit the generated README files.
- If npm publishing was not done, remove that checklist line instead of claiming it.
