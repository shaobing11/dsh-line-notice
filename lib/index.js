// dsh-line-notice —— 宿主半部分
//
// 提醒完全由客户端（lib/client.js）完成：读 meow-cachebilling 的 cacheBilling 投影，
// 把输入框右侧的上下文小圆环按「本步缓存花费 ÷ 新窗口首轮花费」染色并跨档闪烁。
// 零 token：不投递消息、不触发模型回合。宿主这里只留一条装载痕迹，方便确认插件挂上了。
export const name = 'line-notice';
export const inject = [];

export function apply() {
  const line = `[line-notice] HOST LOADED v0.3.1 pid=${process.pid} at ${new Date().toISOString()}`;
  try { console.error(line); } catch { /* 忽略 */ }
}
