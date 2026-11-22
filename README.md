# dsh-line-notice

给 DeepSeek Harness（DSH）输入框右侧那个**上下文小圆环**染上「成本温度」。

## 它解决什么

缓存命中率高不等于便宜：窗口里堆的上下文越多，每一轮都要把它整段读一遍，命中价虽低，但它是**线性涨**的。
真正该问的不是「命中率多少」，而是「**继续待在这个窗口，每轮花的钱，相当于新开一个窗口的多少倍**」。

这个插件把那个比值直接画在圆环上，不用点开账单、也不用问模型，**零 token**：

| ratio = 本步缓存花费 ÷ 该会话首轮花费 | 圆环 |
| --- | --- |
| 0（刚开窗，几乎全是未命中，没有缓存可重读） | 灰 |
| 0.3 / 0.6 …（越接近 1） | 越来越红 |
| ≥ 1（继续待着已经比换窗口贵） | 深红 |
| 跨过 1 / 2 / 3 整数档 | 分别闪 1 / 2 / 3 次，之后不再闪 |

## 依赖

数据来自同生态插件 **[meow-cachebilling](https://github.com/Phant0Meow/dsh-meow-cachebilling)** 的会话投影 `cacheBilling`
（它已经把每一步的「缓存命中花费 / 未命中花费 / 输出花费」算好并落盘）。没装它的话，本插件只会保持默认灰色。

## 安装

```sh
dsh plugin --profile web add github:<你的账号>/dsh-line-notice
```

装完重启 `dsh web`（或桌面端）生效。

## 实现说明

- **零 token**：宿主侧不注册任何工具、不发消息、不唤醒模型；宿主 `lib/index.js` 只在启动时打一行日志。
- 客户端通过 `conversation.input.dock` 挂一个什么都不渲染的组件，拿 `useProjection('cacheBilling')`，
  算出 ratio 后直接改圆环 `<path>` 的 `stroke`；跨档时用注入的 keyframes 闪一下。
- 圆环选择器做了兜底：先 `[class*="_fill"]`，找不到就找「`NN%` 文本旁边的 svg → 第一个 path」，
  这样 DSH 前端重新构建、哈希类名变了也还能命中。

## 许可

MIT
