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

    /**
     * ratio = 本步「重读缓存」的钱 ÷ 新开一个窗口「重读代码」的钱
     * 数据全部来自 meow-cachebilling 的 view（它自己弹层里「消耗比较」那一块用的也是这两个数）：
     *   view.compare.cache    = 本步缓存命中金额
     *   view.compare.readCode = 该会话前两轮「未命中 + 输出」之和 ≈ 新开窗口要先读一遍的代价
     * 比值 < 1：继续待着还便宜；≥ 1：换窗口更划算。
     */
    function ratioOf(view) {
      if (!view) return 0;
      var cmp = view.compare;
      var cache = cmp ? Number(cmp.cache) : 0;
      if (!(cache > 0)) cache = Number(view.turnHitCost) || 0;
      var read = cmp ? Number(cmp.readCode) : 0;
      if (!(read > 0)) return 0;
      return cache / read;
    }

    var lastView = null;
    function diagOf() {
      var v = lastView;
      if (!v) return 'view=null';
      var cmp = v.compare || {};
      return 'cache=' + Number(cmp.cache || 0).toFixed(5)
        + ' readCode=' + Number(cmp.readCode || 0).toFixed(5)
        + ' fullMiss=' + Number(cmp.fullMiss || 0).toFixed(5)
        + ' turnHit=' + Number(v.turnHitCost || 0).toFixed(5);
    }

    var capturedSessions = null;

    var blinked = {};
    var paintedOnce = false;
    var lastLoggedRatio = -1;

    function paint(ratio, key) {
      /* view 由调用方先写进 lastView */
      ensureCss();
      var els = rings();
      if (!els.length) {
        if (!paintedOnce) console.error('[line-notice] 未找到圆环 DOM（ratio=' + ratio.toFixed(3) + '）');
        return;
      }
      if (!paintedOnce) {
        paintedOnce = true;
        console.error('[line-notice] 已接管圆环 x' + els.length + '，ratio=' + ratio.toFixed(3) + ' 明细=' + diagOf());
      } else if (Math.abs(ratio - lastLoggedRatio) > 0.05) {
        // ratio 变化超过 5% 才记一行，免得刷屏
        lastLoggedRatio = ratio;
        console.error('[line-notice] ratio 变化 ' + ratio.toFixed(3) + ' → 颜色 ' + colorOf(ratio));
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
      if (!window.__lnDiag) {
        window.__lnDiag = 1;
        try {
          console.error('[line-notice] DIAG props=' + Object.keys(props).join(',')
            + ' sid=' + String(props.sessionId)
            + ' sessionsApi=' + (capturedSessions ? Object.keys(capturedSessions).join('|') : 'null')
            + ' sessionKeys=' + (props.session ? Object.keys(props.session).join('|') : 'none')
            + ' projFace=' + (props.session && props.session.projections ? Object.keys(props.session.projections).join('|') : 'none')
            + ' useProjRet=' + (function(){ try { var v = props.useProjection ? props.useProjection('cacheBilling') : null; return v ? ('obj:' + Object.keys(v).slice(0,6).join(',')) : String(v); } catch(e) { return 'err:' + e.message; } })());
        } catch (e) {}
      }
      var up = props.useProjection;
      var proj = typeof up === 'function' ? up('cacheBilling') : undefined;
      if (!proj) {
        // dock 上的 useProjection 有时在投影还没就绪时拿到 undefined，直接走 sessions API 取快照
        try {
          var b = capturedSessions && capturedSessions.binding(props.sessionId);
          var face = b && b.session && b.session.projections && b.session.projections.faceOf('cacheBilling');
          var snap = face && face.getSnapshot && face.getSnapshot();
          if (snap) proj = snap;
        } catch (e) { /* 取不到就保持原样 */ }
      }
      var key = props.sessionId || 'current';
      // 投影有时在本组件挂载后才就绪：定时强制重渲染，让 useProjection 有机会重新取值
      var tickState = React.useState(0);
      var setTick = tickState[1];
      React.useEffect(function () {
        var t = setInterval(function () { setTick(function (n) { return n + 1; }); }, 2000);
        return function () { clearInterval(t); };
      }, []);
      lastView = proj || null;
      React.useEffect(function () {
        lastView = proj || null;
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
      inject: ['slots', 'sessions'],
      apply: apply,
    };
    return module.exports;
  },
});
