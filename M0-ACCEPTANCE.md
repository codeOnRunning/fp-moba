# M0 验收记录

日期：2026-11-13  
环境：Windows / Node 22 / Chrome headless + SwiftShader / WebGL2

## 自动检查

| 检查项 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| 生产预览启动 | 通过 |
| 启动页显示 | 通过 |
| Pointer Lock | 通过 |
| 鼠标视角变化 | 通过（yaw 变化符合灵敏度） |
| 左键普攻发射 | 通过（投射物计数 +1） |
| Q 命中移动假人 | 通过（假人 300 → 245，Q 伤害 55） |
| Q 冷却显示 | 通过（2.4s → 1.3s） |
| V 切第三人称 | 通过（HUD 显示“第三人称”） |
| 暂停 / 继续 | 通过（释放锁显示暂停，点击继续恢复锁） |
| 假人死亡 / 3.2s 重生 | 通过（击杀数 +1，血量重置 300） |
| 玩家死亡 / 复活 | 通过（死亡界面、倒计时、复活后 100 HP） |
| 浏览器控制台错误 | 0 个 error / 0 个 warning |

## 性能基线（软件渲染，仅作结构参考）

- Draw calls：约 90
- 三角形：约 4k
- 同屏单位：玩家 + 假人 + 少量投射物
- 说明：headless SwiftShader 下 FPS 为 10-18，不代表真实 GPU 性能；真实桌面 GPU 预期远高于 60 FPS。

## 截图

- `screenshots/start.png`：启动页
- `screenshots/after-q.png`：第一人称 + Q 命中
- `screenshots/third-person.png`：第三人称
- `screenshots/dummy-defeated.png`：假人被击败
- `screenshots/death.png`：玩家死亡界面

> Art Pass 1.0 后场景指标已变化，见 [`ART-PASS-STATUS.md`](./ART-PASS-STATUS.md)。

## M0 结论

M0 目标达成：移动、鼠标视角、普攻、Q 技能、移动假人、命中反馈、死亡/复活、暂停/继续、第一/第三人称切换均已跑通。  
下一阶段进入 M1：补齐 W/E/R、等级/技能点、更强的敌方 AI，并开始小兵波次与第一座防御塔。
