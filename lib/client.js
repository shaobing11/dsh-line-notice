// dsh-line-notice —— 客户端半部分：给输入框右侧的「上下文小圆环」染上成本温度
//
// 数据全部来自 meow-cachebilling 已经算好的会话投影 cacheBilling，不新增扫描、不触发模型回合（零 token）：
//   ratio = 本步缓存命中花费 ÷ 该会话首轮花费
//     · 0        → 灰（默认色）
//     · 越接近 1 → 越红
//     · ≥1       → 深红
//   跨越整数档 1/2/3 时分别闪 1/2/3 次，之后不再闪。
window.__ModuleLoader__.load({
  id: 'dsh-line-notice',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');

    var CSS_ID = 'dsh-line-notice-css';
    var GRAY = [138, 143, 153];
    var RED = [178, 24, 28];

    function ensureCss() {
      if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
      var s = document.createElement('style');
      s.id = CSS_ID;
      s.textContent = '@keyframes lnBlink{0%,100%{opacity:1}50%{opacity:.12}}'
        + '[data-ln-blink]{animation:lnBlink .34s ease-in-out var(--ln-blink-count,1)}';
      document.head.appendChild(s);
    }

    /** 圆环候选：先找任意 *_fill；再退一步找「NN%」文本旁边 svg 里的第一个 path。 */
    function rings() {
      if (typeof document === 'undefined') return [];
      var direct = Array.prototype.slice.call(document.querySelectorAll('[class*="_fill"]'));
      if (direct.length) return direct;
      var out = [];
      var all = document.querySelectorAll('span,div');
      for (var i = 0; i < all.length; i++) {
        var t = (all[i].textContent || '').trim();
        if (/^\d{1,3}%$/.test(t) && all[i].children.length === 0 && all[i].parentElement) {
          var svg = all[i].parentElement.querySelector('svg');
          var path = svg && svg.querySelector('path');
          if (path) out.push(path);
        }
      }
      return out;
    }

    function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
    function colorOf(r) {
      var t = Math.max(0, Math.min(1, r || 0));
      return 'rgb(' + lerp(GRAY[0], RED[0], t) + ',' + lerp(GRAY[1], RED[1], t) + ',' + lerp(GRAY[2], RED[2], t) + ')';
    }

    /** 本步缓存花费 ÷ 会话首轮花费（首轮几乎全是未命中，正好代表「新开一个窗口的重读代价」）。 */
    function ratioOf(proj) {
      var steps = proj && proj.history;
      if (!Array.isArray(steps) || steps.length < 2) return 0;
      var first = Number(steps[0] && steps[0].c) || 0;
      var hit = Number((steps[steps.length - 1] || {}).hc) || 0;
      if (first <= 0) return 0;
      return hit / first;
    }

    var blinked = {};
    var paintedOnce = false;

    function paint(ratio, key) {
      ensureCss();
      var els = rings();
      if (!els.length) {
        if (!paintedOnce) console.error('[line-notice] 未找到圆环 DOM（ratio=' + ratio.toFixed(3) + '）');
        return;
      }
      if (!paintedOnce) {
        paintedOnce = true;
        console.error('[line-notice] 已接管圆环 x' + els.length + '，ratio=' + ratio.toFixed(3));
      }
      var color = colorOf(ratio);
      var level = Math.floor(ratio || 0);
      var prev = blinked[key] || 0;
      var doBlink = level >= 1 && level <= 3 && level > prev;
      for (var i = 0; i < els.length; i++) {
        els[i].style.stroke = color;
        if (doBlink) {
          els[i].style.setProperty('--ln-blink-count', String(level));
          els[i].setAttribute('data-ln-blink', '1');
        }
      }
      if (doBlink) {
        blinked[key] = level;
        setTimeout(function () {
          for (var j = 0; j < els.length; j++) {
            els[j].removeAttribute('data-ln-blink');
            els[j].style.removeProperty('--ln-blink-count');
          }
        }, level * 380 + 80);
      }
    }

    function LineNoticeRing(props) {
      var up = props.useProjection;
      var proj = typeof up === 'function' ? up('cacheBilling') : undefined;
      var key = props.sessionId || 'current';
      React.useEffect(function () {
        paint(ratioOf(proj), key);
      }, [proj, key]);
      React.useEffect(function () {
        // 切会话/重渲染时圆环会换节点，定时补一次上色
        var timer = setInterval(function () { paint(ratioOf(proj), key); }, 3000);
        return function () { clearInterval(timer); };
      }, [key]);
      return null;
    }

    function apply(ctx) {
      ensureCss();
      try {
        ctx.slots.inject('conversation.input.dock', function () {
          return ctx.slots.register(
            { name: 'conversation.input.dock', id: 'line-notice-ring', order: 95 },
            LineNoticeRing,
          );
        });
      } catch (e) {
        console.error('[line-notice] 注册失败', e);
      }
    }

    module.exports = {
      name: 'line-notice',
      inject: ['slots'],
      apply: apply,
    };
    return module.exports;
  },
});
