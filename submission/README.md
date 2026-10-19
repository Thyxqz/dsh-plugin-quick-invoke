# 收录到 awesome-dsh-plugin

按官方贡献指南操作：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

收录 = 在你的 GitHub 仓库里放一份可安装的 DSH 插件代码 + 往 `awesome-dsh-plugin` 仓库提一个 PR，只新增 `data/plugins/<owner>__<repo>.yml` 一个文件。README 是自动生成的，**不要手改**。

本目录已经把材料和本地 git 仓库准备好了，剩下需要你用自己的 GitHub 账号完成（我没有你的账号凭据）。

## 0. 已满足的要求

- `package.json` 声明了 `dsh.bundle`（`./cordis.patch.yml`）和 `dsh.client`（Web UI）——这是 CI 必查项。
- 真实可用的代码，无占位、无聚合包行为。
- 只有一个插件，一个 PR 只加 1 条（上限 3 条）。
- 描述只写功能、可被代码核对；`en` 必填、`zh` 已一起写好。

## 1. 创建 GitHub 仓库

在 <https://github.com/new> 创建仓库：

- 名称：`dsh-plugin-quick-invoke`
- 可见性：**Public**
- 不要勾选 “Add a README file / .gitignore / license”（本目录已有）

创建后记下你的 GitHub 用户名（或组织名），下面称为 `OWNER`。

## 2. 提交并推送

本目录已经 `git init -b main` 并暂存了文件，只需设置提交身份、提交、推送：

```powershell
cd C:\Users\HUAWEI\Desktop\DSH\plugin-quick-invoke
git config user.name "你的名字"
git config user.email "你的 GitHub 邮箱"
git commit -m "feat: plugin quick invoke for DeepSeek Harness"
git remote add origin https://github.com/OWNER/dsh-plugin-quick-invoke.git
git push -u origin main
```

如果推送要求认证，用 GitHub 的 Personal Access Token 作为密码，或在 Git Credential Manager 弹窗里登录。

## 3. 加 topic

仓库页面右上 **About → ⚙ → Topics**，添加 `dsh-plugin`（指南要求，市场也会按这个 topic 发现插件）。

## 4. 生成收录条目

在插件目录运行（`OWNER` 换成你的 GitHub 用户名/组织名）：

```powershell
node scripts/write-submission.mjs OWNER
```

会做两件事：

1. 生成 `submission/data/plugins/OWNER__dsh-plugin-quick-invoke.yml`（文件名和内容都符合指南）；
2. 把 `package.json` 的 `repository` / `homepage` / `bugs` 指向你的仓库——将来发布 npm 时，市场靠这个字段把包和收录条目关联起来。

提交这次改动并推送：

```powershell
git add -A
git commit -m "chore: point metadata at the GitHub repository"
git push
```

## 5. 等仓库满 1 天

指南里写明 CI 会检查**仓库创建满 1 天**。刚建好就提 PR 会被 CI 拦下。等 24 小时后再做第 6 步即可，功能代码不需要改。

## 6. Fork 并提 PR

1. 打开 <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>，点 **Fork**。
2. 在你的 fork 里：**Add file → Create new file**，文件名填
   `data/plugins/OWNER__dsh-plugin-quick-invoke.yml`
   （`OWNER` 与第 4 步生成的文件名一致），内容粘贴 `submission/data/plugins/OWNER__dsh-plugin-quick-invoke.yml`。
3. 提交到一个新分支，例如 `add-dsh-plugin-quick-invoke`。
4. 向 `awesome-dsh-plugin:main` 开 Pull Request，标题和正文用 [PR.md](PR.md) 里的内容（把 `OWNER` 和创建日期替换掉）。
5. 如果 CI 报错，按它指出的位置修改同一个分支再推送，不需要重开 PR。

## 7. 可选：发布 npm 包

指南推荐发布 npm（预构建安装更快），发布后市场的下载量统计才会出现。包已整理好：

```powershell
cd C:\Users\HUAWEI\Desktop\DSH\plugin-quick-invoke
npm login
npm publish
```

注意：必须在第 4 步之后发布（`package.json.repository` 要指向仓库），否则 npm 包不会和收录条目关联。之后更新用 `npm version patch && npm publish`。

## 8. 可选：截图

市场详情页可以展示截图，方式是**在你自己仓库根目录**放 `screenshots.json`，列出 1–8 张仓库内图片路径：

```json
["assets/screenshot-1.png", "assets/screenshot-2.png"]
```

没有截图也可以，市场会尝试从 README 抽取（本插件 README 目前没有图片）。

## 提交后

- 合并后网站和两个 README 会自动重建，不需要你改任何生成文件。
- 维护者可能微调分类或补中文描述，这不影响收录。
- 描述里不要加营销词或无法核对的数字；这是被打回的最常见原因。
