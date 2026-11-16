# GitHub 发布说明

## 当前状态

- 项目已初始化 Git 仓库
- 当前分支：`main`
- 首次提交：`bd82429 feat: boss rush with 3-choice upgrades and player guide`
- 已跟踪文件：115 个
- `node_modules/`、`dist/`、`screenshots/`、Vite 日志已通过 `.gitignore` 排除
- 当前环境无法连接 `github.com:443`，所以还没有创建远端仓库/推送

## 方式一：GitHub CLI（推荐）

安装并登录：

```powershell
winget install --id GitHub.cli
gh auth login
```

然后在项目目录执行：

```powershell
cd "G:\shares\games\fp-moba"
gh repo create fp-moba --public --source=. --remote=origin --push
```

完成后仓库地址类似：

```text
https://github.com/<你的账号>/fp-moba
```

## 方式二：网页创建 + Git 推送

1. 打开 https://github.com/new
2. Repository name 填 `fp-moba`
3. 选择 **Public**
4. 不要勾选初始化 README / .gitignore / license
5. 创建后在项目目录执行：

```powershell
cd "G:\shares\games\fp-moba"
git remote add origin https://github.com/<你的账号>/fp-moba.git
git push -u origin main
```

## 仓库建议信息

- 名称：`fp-moba`
- 描述：`First-person single-player MOBA boss rush prototype built with Three.js + Rapier`
- 公开：是
- 默认分支：`main`

## 注意

- `public/assets/kaykit` 是 CC0 资产，已在 `ASSET-CREDITS.md` 记录来源
- 不要把 GitHub Token 写进仓库
- 如果网络仍然无法访问 GitHub，可以先在有网络的机器上执行推送，或把项目目录复制到该机器
