# 插件快捷调用 · dsh-plugin-quick-invoke

给 DeepSeek Harness（DSH）Web UI 用的插件快捷调用面板：把已安装插件的名字快速、准确地写进提示词。

> A DeepSeek Harness plugin that puts an installed-plugin picker beside the composer. Drag a plugin name into the prompt at the drop point, pin a draggable rail in the right sidebar, and choose which plugins appear (with optional remarks) in Settings.

## 功能

- **入口**：新会话里位于「工作区 / 工作模式」同一行的扩展位；进入对话后，输入框工具栏左侧保留一个紧凑入口，不会因为发出第一条消息而消失。
- **上拉面板**：单击「插件调用」向上展开插件列表；面板整体抬到输入框卡片上方，不遮挡正在编辑的内容。鼠标移到某个插件上会加深底色。
- **拖拽插入**：在列表或右侧栏中按住插件名，拖到输入框的任意位置松开，插件名会插入到落点（走输入框自身的 Lexical 拖放通道，和模块化拖拽一致）。
- **右侧常驻栏**：双击「插件调用」入口，在右侧边栏打开 / 收起「插件调用」页；里面是一排可拖动的插件名，便于反复取用。
- **设置页**：`设置 → 插件快捷调用` 列出所有已安装插件，每个插件有：
  - 一个开关：是否出现在快捷调用面板 / 右侧栏中；
  - 一条备注：会以灰色小字显示在插件名下方；
  - 搜索框与「重新读取」，插件安装变化后可刷新列表。

默认只开启「用户自己安装、且当前处于启用状态」的插件；DSH 自带可选插件包默认关闭。主题、皮肤、插件市场这类不需要调用的插件，在设置里关掉开关即可。开关只控制是否出现在快捷调用里，**不会**启用或停用插件本身。

## 兼容性

- DSH `0.2.1-rc.1` 及以上（`dsh.compatibility.dshReleases` 声明了 rc.1 / rc.2）。
- 仅 Web / Desktop 的浏览器半边；无需额外 Host 依赖，无网络请求。

## 安装

插件目前从 GitHub 源码安装（npm 包尚未发布）：

1. 在 DSH 的 `插件` 页面 → 添加插件，输入 GitHub 地址：
   `Thyxqz/dsh-plugin-quick-invoke`（或完整地址 `https://github.com/Thyxqz/dsh-plugin-quick-invoke`）；
2. 或让 DSH 里的 Agent 调用 `plugin_manager` 的 `install_bundle`，`target` 写
   `github:Thyxqz/dsh-plugin-quick-invoke`；
3. 或命令行装进 profile：

```bash
dsh plugin --profile <profile> add github:Thyxqz/dsh-plugin-quick-invoke
```

仓库根目录已包含 `package.json` 和 `cordis.patch.yml`，可直接作为 bundle 安装（无需构建步骤）。安装后如界面未立即出现，刷新一次 Web 页面（Desktop 窗口按 `Ctrl+R`）。

> npm 包 `dsh-plugin-quick-invoke` 尚未发布；发布后会补充按包名安装的方式。

## 使用

1. 新会话：点输入框上方「工作区 / 工作模式」右侧的「插件调用」，向上展开面板；按住插件名拖进输入框即可插入。
2. 对话中：输入框工具栏左侧的紧凑入口同样可用。
3. 双击入口：右侧边栏常驻「插件调用」页，拖动其中的名字到输入框。
4. 设置里调整显示范围与备注。

偏好（开关、备注）保存在当前浏览器配置的 `localStorage`（键 `dsh-plugin-quick-invoke:preferences:v1`），不写入会话日志；清除站点数据或换浏览器配置后会还原默认。

## 开发与发布

本包是纯 ESM、无构建步骤：`index.js` 是空行为的 Host 半边，`client.js` 是自包含的浏览器半边（只 require `react`），`cordis.patch.yml` 插入 Host 装载行。

发布前先让 `package.json` 的 `repository` 指向 GitHub 仓库（收录条目与 npm 包靠它关联），再按需补 `author`，然后：

```bash
npm login
npm publish
```

校验打包内容：

```bash
npm pack --dry-run
```

`files` 白名单已包含运行所需文件；`LICENSE` 为 MIT。

### 收录到 awesome-dsh-plugin

本目录已按 [贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) 准备好提交材料，步骤见 [submission/README.md](submission/README.md)：

1. 创建公开 GitHub 仓库并推送本目录；
2. 给仓库加 `dsh-plugin` topic；
3. 运行 `node scripts/write-submission.mjs <github-owner>` 生成 `data/plugins/<owner>__dsh-plugin-quick-invoke.yml`，并回填 `package.json.repository`；
4. 仓库创建满 1 天后，向 awesome-dsh-plugin 提 PR，只新增该条目文件（PR 文案见 [submission/PR.md](submission/PR.md)）。

生成文件不会进入 npm 包（`files` 白名单只含运行所需文件）。

## 目录结构

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch` + `dsh.client` + 兼容性 |
| `cordis.patch.yml` | 插入 Host 装载行（id `plugin-quick-invoke`） |
| `index.js` | Host 半（无行为，仅让 bundle 有装载项） |
| `client.js` | 全部界面：入口、上拉面板、拖拽、右侧栏、设置页 |
| `locale/*.json` | 插件管理器里的标题 / 描述（zh / en） |
| `icon.svg` | 插件图标 |
| `LICENSE` | MIT |
| `submission/` | awesome-dsh-plugin 收录材料（生成的文件不进 npm 包） |
| `scripts/write-submission.mjs` | 按 GitHub owner 生成收录条目并回填仓库元数据 |

## 已知限制

- 新会话入口使用官方提供的该行扩展位（该行右对齐），因此位于这一行右端，而非紧贴「工作模式」。
- 拖拽插入的是插件的显示标题；没有本地化标题时回退为包名。
- 偏好按浏览器 origin 存储，不跨设备 / 浏览器同步。

## License

MIT
