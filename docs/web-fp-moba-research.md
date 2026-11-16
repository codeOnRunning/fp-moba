# Web 版第一人称 LoL 风格单机游戏：调研与可行性对比

> 调研日期：2026-11-13  
> 后续：已按用户选择锁定“1v1 中路 / 远程法术 / 第一人称+第三人称 / Three.js + TypeScript + Rapier”，执行版方案见 `docs/web-fp-moba-mvp-plan.md`。  
> 范围：商业 3D MOBA / 第一人称英雄射击案例、浏览器 3D MOBA 开源项目、Web 3D 游戏工程实践。  
> 结论先行：**技术上可行，但不能按“Web 版 LoL 1:1 复刻”来做。** 可行的是“LoL 规则骨架 + 第一人称动作战斗 + 单机 AI 对局”的小体量竞技场。第一人称会削弱传统 MOBA 最重要的全局信息，必须针对单机体验重新设计，而不是把俯视相机简单换成第一人称。  
> 说明：商业案例的事实主要来自 Steam 商店页、官方页面和百科；本文的设计结论是基于这些公开信息的归纳，不是对某款游戏商业成败的因果判断。

---

## 1. 调研结论

### 1.1 是否存在可以直接参考的“最佳实践”？

有，但要分成三层看：

1. **商业案例层**：没有找到一款“纯第一人称、完整 LoL 规则、单机”的成功产品。最接近的是：
   - `Battleborn`：第一人称英雄射击 + MOBA 式兵线/推基地模式（Incursion）。
   - `Deadlock`：第三人称 6v6 MOBA 射击，目前最接近“3D MOBA”的现代商业样本。
   - `SMITE 2` / `Predecessor`：第三人称动作 MOBA，证明 3D 视角下的技能瞄准和动作战斗可以成立。
   - `Monday Night Combat`：第三人称职业射击 + 兵线/炮塔，且有单机/合作 PvE 模式。

2. **Web 开源层**：有浏览器 3D MOBA 原型，但普遍是**演示级**，没有可直接复用的完整生产项目：
   - `华夏英杰传 / China Hero`：Three.js 写的 3D MOBA，功能清单很全（50 英雄、三路、3v3/5v5、AI、商店），但实际是斜俯视视角，代码规模约 99 KB，属于功能演示，不是第一人称，也不能直接当生产级底座。
   - `Web MOBA Arena`：Three.js + TypeScript + Colyseus，架构干净，但目前只有大厅、移动、同步；战斗、小兵、防御塔还在路线图里。
   - `OpenMOBA`：2012 年的 WebGL 3D MOBA 尝试，创建后约一个月就停止更新，只剩 README 和子模块，不能作为技术底座。

3. **工程实践层**：Web 3D 的技术栈和性能优化已经有成熟共识：
   - Three.js / Babylon.js / PlayCanvas 都能做浏览器 3D 游戏。
   - 第一人称键鼠控制用 Pointer Lock API。
   - 固定时间步模拟 + 渲染插值，避免帧率影响手感。
   - 小兵/投射物用 Instancing / Object Pool，控制 draw call 和内存。
   - AI 寻路限频，必要时放 Web Worker。
   - 单机版不需要服务器、匹配、反作弊、网络同步，技术风险显著低于多人 Web MOBA。

### 1.2 最终判断

| 目标 | 判断 | 说明 |
|---|---|---|
| Web 第一人称单机可玩原型 | **可行，风险低** | 1 个玩家 + 1 个 AI 英雄 + 少量小兵，浏览器完全能跑 |
| LoL 风格完整单机 MVP | **可行，但要缩范围** | 推荐 1v1 中路、1 张图、1-3 个英雄、简化装备 |
| 5v5 第一人称完整 LoL | **不建议作为首版** | AI、地图、英雄、平衡、性能、内容量都会指数级上升 |
| 直接复刻 LoL 英雄/美术/名称 | **不建议** | 版权与商标风险；应做原创英雄和原创世界观 |
| 纯第一人称、无任何辅助视角 | **高风险** | 视野、近战手感、技能瞄准、空间感知都会成为问题；建议保留第三人称切换 |

**推荐产品定义：**

> 一款 8-12 分钟一局的 Web 单机第一人称“中路对决”：玩家操控原创英雄，在一条简化兵线上补兵、升级、买装备、击杀敌方 AI 英雄，推掉两座防御塔并摧毁敌方水晶。第一人称为主，提供第三人称观察切换；不包含多人、排位、野区、符文等大系统。

---

## 2. 商业案例对比

| 案例 | 视角 / 平台 | 它证明了什么 | 可以借鉴 | 不能直接照搬 |
|---|---|---|---|---|
| **Deadlock**（Valve，2024 起测试） | 第三人称 / PC | 6v6、三路兵线、魂经济、装备、滑索、立体移动可以被现代玩家接受；3D MOBA 的关键是“移动 + 射击 + 路线”三者咬合 | 经济系统简化为单一“魂”；滑索/传送解决大地图跑路；装备与技能联动；三路节奏 | 6v6 的英雄/地图/平衡成本极高；它是第三人称，不是第一人称；仍在早期开发，不能当作成熟范式 |
| **Battleborn**（Gearbox，2016） | 第一人称 / PC、主机 | 第一人称 + 小兵 + 推基地的 Incursion 模式确实能成立；英雄技能、兵线、防御目标可以共存 | 第一人称英雄技能组；PvE 与 PvP 共用英雄；兵线推进 + 基地防守的明确目标 | 英雄数量、养成、PvP 平衡和内容量过重；商业表现未达预期，说明“第一人称 MOBA”不是免死金牌；不要首版堆 25+ 英雄 |
| **SMITE 2**（Hi-Rez / Titan Forge，2024 起） | 第三人称 / PC、主机 | 第三人称动作 MOBA 可以长期运营；地面指示器、第三人称技能瞄准、自动出装/自动升级能显著降低门槛 | 技能地面预警/指示器；自动出装作为单机辅助；动作化普攻与技能衔接；多平台输入思路 | 系列 100+ 神明的内容与平衡负担；大量 PvP 平衡；第三人称相机不等于第一人称 |
| **Predecessor**（Omeda，2024） | 第三人称 / PC、主机 | “MOBA 深度 + 3D 射击的垂直空间”可以作为核心卖点；Paragon 的精神续作证明 3D MOBA 仍有受众 | 垂直地图、跳跃/位移、墙体与高低差；动作化战斗；英雄定位清晰 | 高制作成本；5v5 平衡；第一人称化后垂直空间会带来更强眩晕和瞄准难度 |
| **Monday Night Combat**（Uber，2010/2011） | 第三人称 / PC、Xbox | 职业射击 + 兵线/炮塔/金钱球可以成立；`Blitz` 单机/合作 PvE 模式证明“MOBA 元素 + 刷波次”很适合单机 | 单机 PvE 波次防守；清晰的兵线/炮塔目标；体育转播式包装和播报 | 第三人称；MOBA 深度较浅；不要把所有玩法都塞进首版 |
| **Paragon**（Epic，2016-2018） | 第三人称 / PC、PS4 | 3D MOBA 的视觉和垂直战斗可以做到很高完成度；但项目已停运，说明市场和运营风险真实存在 | 立体地图、英雄动作设计、视觉表现 | 不要用“高画质 3D MOBA”作为唯一卖点；首版应验证玩法而不是堆美术 |

### 2.1 从商业案例得到的四条硬结论

1. **3D MOBA 的主流选择是第三人称，不是第一人称。**  
   原因不是技术做不到，而是第一人称会牺牲地图信息、背后视野、近战空间感和技能范围判断。`Deadlock`、`SMITE 2`、`Predecessor` 都选择第三人称，这是重要信号。

2. **第一人称更适合“单机动作 MOBA”，不适合“竞技公平 MOBA”。**  
   单机不需要保证两边玩家信息完全对称，可以用更强的 HUD、标记、慢节奏、AI 难度调节来弥补视野问题。第一人称的沉浸感和技能命中反馈，在单机里是加分项。

3. **兵线/推塔/装备是 MOBA 的骨架，不能全部删掉。**  
   如果只做“第一人称英雄射击 + 一条血条”，那就不是 LoL 风格，而是普通 FPS。至少要保留：小兵波次、防御塔、金币/经验、装备成长、水晶胜负。

4. **内容量是最大风险，不是渲染。**  
   一个英雄 4 个技能 + 被动，一套装备，一张地图，一个 AI，已经足够做 2-4 周。首版做 10 个英雄会直接把项目拖死。

---

## 3. Web / 开源项目对比

| 项目 | 技术栈 / 形态 | 实际完成度 | 可借鉴 | 局限 |
|---|---|---|---|---|
| **华夏英杰传（China Hero）** | Three.js + 原生 JS；单页 `index.html` + `game.js`；三路、50 英雄、3v3/5v5、AI、商店 | 从代码规模看更像功能演示；仓库约 554 KB，`game.js` 约 99 KB；实际画面是斜俯视，不是第一人称 | 单机 AI、兵线、商店、三路地图、浏览器直接运行的产品结构；用低多边形快速堆内容 | 代码规模与“50 英雄”不匹配，战斗深度和美术大概率是占位级；没有第一人称；无 license 元数据；不能作为生产底座 |
| **Web MOBA Arena** | Three.js + TypeScript + Vite + Colyseus；WebSocket 多人 | 大厅、移动、同步、重连完成；战斗、小兵、防御塔、胜负条件在路线图 | TypeScript/Vite 工程结构；客户端/服务器职责分离；轻量渲染；小规模房间设计 | 目前还不是 MOBA；多人架构对单机是额外复杂度；没有第一人称和 AI |
| **OpenMOBA** | 2012 年 WebGL 3D 多人 MOBA | 创建后约 1 个月停止更新；仓库只有 README、子模块和 libs | 早期 WebGL MOBA 的技术路线参考 | 过于陈旧、无 license、缺少可运行说明；说明“浏览器 MOBA demo”很容易停留在 demo |
| **Krunker** | 浏览器 FPS，低多边形，Pointer Lock | 长期运营的 Web FPS，证明浏览器第一人称射击可以大规模运行 | 低多边形美术、轻量地图、第一人称输入、性能优先；不要把画面做成 3A | 不是 MOBA；没有兵线/技能/装备/AI 系统；玩法深度不同 |
| **Three.js FPS 示例** | Three.js 官方 `games_fps` / PointerLockControls 示例 | 官方可运行示例 | 第一人称移动、碰撞、指针锁定、基础射击的参考实现 | 只是技术示例，不含 MOBA 规则 |

### 3.1 从 Web 项目得到的结论

- **浏览器端“3D MOBA”不是没人做过，而是大多停在 demo。** 失败原因通常不是 WebGL 不能渲染，而是：
  - 英雄/技能/装备内容量太大；
  - 小兵和 AI 的寻路、仇恨、波次逻辑复杂；
  - 第一/第三人称视角下的战斗可读性难调；
  - 没有持续的内容生产管线。
- **单机版是绕过这些风险的最好方式。** 不需要服务器、网络同步、匹配、反作弊，能把精力集中在“一局好不好玩”。
- **不要从 OpenMOBA 这类老项目起步。** 技术栈和代码都过时，学习成本高于自己搭一个干净骨架。

---

## 4. Web 技术栈对比

| 方案 | 优势 | 代价 | 适合度 |
|---|---|---|---|
| **Three.js + TypeScript + Rapier + Vite** | 轻量、可控、生态大、示例多；Rapier 提供角色控制器/碰撞；Vite 迭代快；方便做自定义 MOBA 系统 | 需要自己搭游戏框架：场景管理、资源加载、对象池、AI、UI 桥接 | **推荐**。最适合“从零做一个小而完整的 Web 3D 游戏” |
| **Babylon.js + TypeScript** | 更“引擎化”：内置物理、GUI、导航/人群、Inspector；TypeScript 友好；上手做 3D 游戏更快 | 包体和 API 面更大；自定义底层逻辑时约束更多；社区示例相对 Three.js 少一些 | **强备选**。如果更看重内置导航/物理/编辑器能力，选它 |
| **PlayCanvas** | 浏览器编辑器、团队协作、引擎与工具一体化；适合美术/策划一起改场景 | 代码优先程度较低；编辑器和运行时绑定；复杂自定义系统不如纯代码灵活 | 适合有美术/策划协作的团队，不是单人快速原型首选 |
| **Unity WebGL** | 成熟工具链、资源商店、C#、3D 游戏开发经验丰富 | WebGL 构建体积和内存较大；移动浏览器兼容性/加载时间差；对小团队和浏览器优先产品偏重 | 不推荐作为 Web 优先 MVP；除非团队已有 Unity 积累 |
| **Godot 4 Web** | 开源、轻量、迭代快、场景/节点工作流清晰 | Web 导出有线程/COOP-COEP、性能和包体限制；复杂 3D 大场景不如原生引擎稳 | 可以作为备选，但 Web 优先仍建议 Three.js/Babylon.js |

**推荐组合：**

```text
Vite + TypeScript
Three.js                渲染、场景、材质、粒子
@dimforge/rapier3d-compat  物理、角色控制器、碰撞检测（WASM 打包更省心）
DOM + CSS               HUD、商店、菜单、设置
Canvas 2D               小地图
Web Audio API           音效、空间音频、音乐
localStorage            设置、存档、按键配置
```

不引入 React 也可以；如果 UI 复杂（商店、天赋、结算），可以用 Preact/React 只做 DOM 覆盖层，不要让 React 参与每帧渲染。

---

## 5. 第一人称 MOBA 的关键设计问题

### 5.1 为什么不能 1:1 搬 LoL

传统 LoL 是俯视视角，核心信息是“全图/半图可见 + 精确位置 + 多单位目标选择”。第一人称会带来：

| 问题 | 具体表现 | 设计对策 |
|---|---|---|
| 视野窄 | 看不到背后、侧翼、塔后 | 小地图、屏幕边缘指示器、声音提示、敌方消失警告 |
| 目标选择难 | 小兵、英雄、塔混在一起，鼠标指向不直观 | 准星软锁定、优先级目标、Tab 切换目标、范围技能指示器 |
| 近战手感难 | 第一人称看不到自身动作，攻击距离难判断 | 首版做远程英雄；近战用软锁、命中停顿、武器入镜、第三人称切换 |
| 技能瞄准难 | 地面目标/圆形 AoE 在 3D 中不直观 | 地面投影圈、抛物线预览、命中预判线、颜色区分敌我 |
| 空间感知弱 | 高低差、墙体、拐角容易迷路 | 首版地图尽量平坦；用主路地标、灯光、箭头、罗盘 |
| 眩晕/不适 | 快速转向、镜头抖动、FOV 过窄 | FOV 75-90 可调、默认关闭头部晃动/动态模糊、稳定地平线、第三人称选项 |

### 5.2 第一人称下仍然要保留的 LoL 骨架

按优先级：

1. **兵线**：每 30 秒一波，3 个近战 + 1 个远程；沿固定路线推进；会攻击仇恨目标。
2. **防御塔**：每方 2 座外塔 + 1 座水晶；塔有攻击范围、优先攻击小兵/英雄的规则。
3. **金币/经验**：补兵、击杀、推塔获得；等级提升基础属性；金币买装备。
4. **技能组**：被动 + Q/W/E + R；冷却、法力、施法前摇/后摇。
5. **复活/回城**：死亡计时；回城补给；基地商店。
6. **胜负**：摧毁敌方水晶；己方水晶被摧毁则失败。
7. **AI 对手**：会补兵、换血、后退、回城、买装备、推线、打塔。

首版可以删掉：野区、打野、符文、天赋、召唤师技能、迷雾、插眼、排位、多人、皮肤、赛事系统。

### 5.3 一局的具体节奏（推荐）

| 时间 | 发生什么 |
|---|---|
| 0:00 | 出生，买初始装备，走向中路 |
| 0:20 | 第一波小兵出发 |
| 0:30-3:00 | 对线：补刀、消耗、抢 2 级 |
| 3:00-6:00 | 第一次回城/买装备；小规模击杀；推第一座塔 |
| 6:00-9:00 | 塔后对决；等级/装备差距扩大；推第二座塔 |
| 9:00-12:00 | 水晶团/最终推进；胜负结算 |

目标：**8-12 分钟一局**，失败也能在 15 分钟内重开。

---

## 6. 推荐的最小可行版本（MVP）

### 6.1 产品范围

| 项目 | MVP 范围 | 后续扩展 |
|---|---|---|
| 对局 | 1v1 中路，玩家 vs AI | 3v3（2 个 AI 队友）、5v5 |
| 地图 | 1 张对称单路地图；2 塔 + 水晶；无野区 | 加入侧路、野区、河道、Buff |
| 英雄 | 1 个远程法师英雄（玩家）；敌方 AI 可用同英雄换色/换技能组合 | 3-6 个原创英雄 |
| 技能 | 被动 + Q/W/E/R，共 4 个主动 | 每英雄独立技能组、连招、符文 |
| 小兵 | 每波 4 个（3 近战 + 1 远程），30 秒一波 | 炮车、超级兵、不同兵种 |
| 装备 | 6-8 件，3 类属性；基地商店；推荐出装 | 合成树、主动装备、情境装备 |
| AI | 对线、补刀、换血、撤退、回城、推塔 | 不同性格/难度、队友 AI、打野 AI |
| 视角 | 第一人称默认；V 键切换第三人称观察 | 第一人称专属演出、镜头震动 |
| 操作 | WASD + 鼠标视角；LMB 普攻；Q/W/E/R；B 商店；Tab 战绩；Esc 暂停 | 手柄、按键重绑定 |
| 平台 | 桌面 Chrome/Edge/Firefox；键鼠 | 移动端/云游戏 |
| 存档 | localStorage：设置、按键、最高难度通关 | 英雄熟练度、皮肤、成就 |

### 6.2 英雄技能示例（首版可直接用）

> 定位：远程法术输出，适合第一人称瞄准；避免首版做复杂近战。

- **被动：奥术回流** — 技能命中敌方英雄后，回复少量法力。
- **Q：秘法飞弹** — 直线 projectile，命中第一个敌人；可穿透小兵但伤害降低。
- **W：滞留法阵** — 在准星落点生成圆形区域，延迟后爆炸并减速。
- **E：相位步** — 向输入方向短距离位移，短暂无碰撞；用于躲技能/拉开距离。
- **R：棱镜光束** — 持续引导的直线光束，对路径上敌人持续伤害；引导时移动速度降低。

这套技能覆盖了第一人称最需要的三种瞄准方式：**直线预判、地面落点、瞬时位移**，而且不需要复杂近战动画。

### 6.3 技术架构

```text
src/
  main.ts                 启动、画布、主循环
  core/
    loop.ts               固定时间步 + 渲染插值
    events.ts             事件队列/发布订阅
    rng.ts                可复现随机数
  sim/
    world.ts              实体/组件容器
    components.ts         Transform, Health, Mana, Combat, AI, Minion, Structure...
    systems/
      input.ts
      movement.ts
      combat.ts
      abilities.ts
      projectiles.ts
      minions.ts
      structures.ts
      economy.ts
      match.ts
  render/
    scene.ts              Three.js 场景、相机、光照
    assets.ts             GLTF/纹理/音频加载
    vfx.ts                粒子、命中特效、范围指示器
    camera.ts             第一/第三人称相机
  ai/
    brain.ts              行为树/效用 AI
    navigation.ts         A* 网格/路点
    difficulty.ts        难度参数
  content/
    heroes/*.json
    abilities/*.json
    items/*.json
    waves/*.json
  ui/
    hud.ts
    shop.ts
    minimap.ts
    menus.ts
  persistence/
    settings.ts
```

关键原则：

- **模拟与渲染分离**：`sim` 不直接操作 Three.js 对象；渲染层只读状态。
- **固定时间步**：模拟 30 Hz，渲染 60-144 Hz，用插值平滑。
- **数据驱动**：英雄/技能/装备/波次用 JSON 或 TS 配置，不把数值写死在系统里。
- **对象池**：投射物、命中特效、伤害数字、小兵复用，避免 GC 卡顿。
- **AI 限频**：寻路 5 Hz，决策 10 Hz，不跟渲染帧绑定。
- **事件队列**：伤害、死亡、金币、击杀播报通过事件解耦，避免系统互相引用。

### 6.4 性能预算（桌面 1080p）

| 指标 | 目标 |
|---|---|
| 帧率 | 60 FPS（中端核显/4 年前轻薄本） |
| Draw calls | < 250 |
| 三角形 | < 1.5M |
| 同屏小兵 | ≤ 30 |
| 投射物 | 池化 100 个以内 |
| 动态光源 | 1 个方向光 + 环境光；小兵不投射实时阴影 |
| 初始包体 | < 15 MB（gzip） |
| 地图资源 | < 30 MB，按需加载 |
| 内存 | < 300 MB |
| AI 寻路 | 5 Hz，网格 A*；必要时 Web Worker |

### 6.5 开发里程碑与工作量

> 以单人全职开发估算；如果采用 AI 辅助编码，代码产出会更快，但测试、手感调优、性能优化仍需要真实时间。

| 阶段 | 内容 | 预计 |
|---|---|---|
| M0 垂直切片 | 第一人称移动、鼠标视角、测试场景、1 个 projectile、HUD | 2-3 天 |
| M1 战斗沙盒 | 3 技能 + 大招、伤害/法力/冷却、命中反馈、敌方假人 | 4-5 天 |
| M2 兵线循环 | 小兵波次、塔、金币/经验、商店、复活、胜负 | 7-10 天 |
| M3 AI + 内容 | 对线 AI、难度、1 个完整英雄、地图美术、菜单/音效 | 5-7 天 |
| M4 打磨 | 性能、设置、存档、QA、平衡 | 3-5 天 |
| **合计** | **可玩的单机 MVP** | **约 4-5 周** |

如果只做“7-10 天可玩原型”，建议范围再砍：**1 个技能 + 1 波小兵 + 1 座塔 + 1 个 AI**，先验证第一人称 MOBA 的核心手感。

---

## 7. 主要风险与规避

| 风险 | 等级 | 规避 |
|---|---|---|
| 第一人称视野导致“被偷袭击杀”挫败感 | 高 | 小地图、边缘红点、音效方向、敌方消失提示、AI 不做过强绕后 |
| 近战手感差 | 高 | 首版远程英雄；近战用软锁 + 命中停顿 + 第三人称切换 |
| 3D 技能瞄准不直观 | 中高 | 地面投影、轨迹预览、命中反馈、颜色编码、慢速 projectile |
| 小兵/投射物导致帧率下降 | 中 | Instancing、对象池、低模、限制同屏数量、烘焙光照 |
| AI 像“木桩” | 高 | 行为树/效用 AI：补刀、换血、撤退、回城、推塔；难度只调反应/命中率，不调隐藏数值 |
| 内容量失控 | 高 | 首版 1 英雄、1 地图、6 装备；英雄/技能/装备全部数据驱动，后续再加 |
| 眩晕/3D 不适 | 中 | FOV 可调、关闭头部晃动/动态模糊、稳定地平线、第三人称选项 |
| 版权/IP | 中高 | 原创英雄、原创美术、原创名称/世界观；不直接用 LoL 模型、图标、音效、英雄名 |
| 浏览器兼容 | 低中 | 桌面 Chrome/Edge/Firefox；WebGL2；Pointer Lock 需要用户点击触发；处理 context lost |
| 范围蔓延 | 高 | 先锁定 MVP 清单；多人、排位、野区、皮肤、剧情全部后置 |

---

## 8. 需要拍板的细节

### 8.1 推荐默认值

- 对局：**1v1 中路**，先不做 AI 队友。
- 战斗：**远程法师**，先不做近战英雄。
- 视角：**第一人称默认 + V 键第三人称观察**。
- 地图：**单路、平坦、无野区**，2 塔 + 水晶。
- 英雄：**1 个**，4 个主动技能 + 被动。
- 装备：**6-8 件**，基地商店，推荐出装。
- 技术：**Three.js + TypeScript + Rapier + Vite**。
- 平台：**桌面浏览器、键鼠**。
- 美术：**低多边形 + 纯色材质 + 粒子特效**，先不做写实。

### 8.2 需要你确认的四个问题

1. **对局规模**：1v1 中路（推荐）/ 3v3 有 AI 队友 / 5v5 完整队形？
2. **战斗偏好**：远程法术与技能射击（推荐）/ 近战砍杀 / 远近混合？
3. **视角接受度**：严格第一人称 / 第一人称 + 第三人称切换（推荐）？
4. **技术路线**：Three.js（推荐）/ Babylon.js / Unity WebGL / 你指定？

这四件事确定后，就可以把上面的范围锁成一份正式的可执行方案：目录结构、数据结构、技能配置、AI 状态机、里程碑和验收标准。

---

## 9. 参考资料

### 商业案例

- Deadlock on Steam：https://store.steampowered.com/app/1422450/Deadlock/
- 死锁（百度百科，含 6v6、三路、魂、装备、滑索等玩法概述）：https://baike.baidu.com/item/死锁/68361548
- Battleborn on Steam（含 5v5、Incursion 兵线/基地模式）：https://store.steampowered.com/app/394230/Battleborn/
- Battleborn（Wikipedia，背景与停服信息）：https://en.wikipedia.org/wiki/Battleborn
- SMITE 2 官方网站（第三人称动作 MOBA、UE5、自动出装/自动升级）：https://www.smite2.com/
- SMITE 2 on Steam：https://store.steampowered.com/app/2437170/SMITE_2/
- Predecessor on Steam（MOBA + 5v5 3D 射击 + 垂直空间）：https://store.steampowered.com/app/961200/Predecessor/
- Monday Night Combat on Steam（第三人称职业射击、6v6、Blitz 单机/合作）：https://store.steampowered.com/app/63200/Monday_Night_Combat/
- League of Legends Wiki — Summoner's Rift（三路、小兵、防御塔、水晶、野区）：https://wiki.leagueoflegends.com/en-us/Summoner%27s_Rift
- Paragon（Wikipedia，项目停运背景）：https://en.wikipedia.org/wiki/Paragon_(video_game)

### Web / 开源项目

- 华夏英杰传 China Hero（Three.js 3D MOBA，50 英雄，3v3/5v5，AI）：https://github.com/Jsoned/chinahero
- Web MOBA Arena（Three.js + TypeScript + Colyseus）：https://github.com/Denny-Lin/web-moba-arena
- OpenMOBA（2012 WebGL 3D MOBA，已停止）：https://github.com/bananu7/OpenMOBA
- Krunker（浏览器第一人称 FPS）：https://krunker.io/
- Three.js FPS 示例：https://threejs.org/examples/#games_fps
- Three.js PointerLockControls 示例：https://threejs.org/examples/#webgl_pointerlockcontrols

### 工程实践

- MDN — WebGL best practices：https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- MDN — 3D games on the Web：https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web
- MDN — Pointer Lock API：https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- MDN — Web Audio API：https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Three.js manual — Optimize lots of objects：https://threejs.org/manual/#en/optimize-lots-of-objects
- Rapier — Character Controller（JavaScript）：https://rapier.rs/docs/user_guides/javascript/character_controller/
- Babylon.js — Crowd Navigation：https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/
- Glenn Fiedler — Fix Your Timestep!：https://gafferongames.com/post/fix_your_timestep/
- Game Programming Patterns — Component：https://gameprogrammingpatterns.com/component.html
- Game Programming Patterns — State：https://gameprogrammingpatterns.com/state.html
- Game Programming Patterns — Event Queue：https://gameprogrammingpatterns.com/event-queue.html
- Godot — Exporting for the Web：https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
