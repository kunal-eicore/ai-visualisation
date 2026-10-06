/*!
 * chat-throbber — scalable SVG throbber with a 4-state thinking lifecycle.
 * Zero dependencies. Works as a JS class or as the <chat-throbber> custom element.
 *
 *   import ChatThrobber from './throbber.js';        // or <script src="throbber.js"></script>
 *   const t = new ChatThrobber(document.querySelector('#slot'), { size: 26 });
 *   t.toolCall();        // constant spin loop
 *   t.startThinking();   // rotate -> line, then wave
 *   t.endThinking();     // wave -> line -> settle -> circle -> idle
 *   t.reset();           // jump to idle ring
 *
 * A running cycle ALWAYS completes before the next state begins.
 */

const GEO = {
  center: { x: 29.6709, y: 29.8504 },
  radius: 15,
  dotR: 5,
  lineDotR: 4,
  startAngle: [-90, -30, 30, 90, 150, 210],
  base: [[29.6709, 14.8504], [42.6613, 22.3504], [42.6613, 37.3504],
         [29.6709, 44.8504], [16.6805, 37.3504], [16.6805, 22.3504]],
  lineX: [5, 55, 45, 35, 25, 15],
  // per-dot lag so dots peel onto the line in sequence instead of collapsing together
  lineDelay: [0, 0.30, 0.24, 0.18, 0.12, 0.06],
  slot: [0, 5, 4, 3, 2, 1],          // left-to-right position of each dot on the line
  barW: 8,
  barMinH: 8,
  barMaxRise: 26,
  waveAmp: 13,
};
GEO.lineY = GEO.center.y + 16.15;

export const DEFAULT_COLORS = ['#F1673C', '#F7213F', '#C72BD5', '#1E9BCA', '#00B38E', '#7F4FE9'];

export const DEFAULTS = {
  size: 60,              // rendered px (viewBox is always 0 0 60 60, so it scales freely)
  color: null,           // null = original multicolor; any CSS color = single-color mode
  colors: DEFAULT_COLORS,
  wave: 'dots',          // 'dots' | 'bars'
  autoStart: null,       // null | 'spin' | 'thinking'
  phases: {
    spin:     { duration: 1.0, easing: 'in-out' },  // looping — tool call / indefinite work
    assemble: { duration: 0.5, easing: 'in-out' },  // rotate -> line (thinking begins)
    wave:     { duration: 1.0, easing: 'in-out' },  // looping — active thinking
    settle:   { duration: 0.7, easing: 'in' },      // line -> circle (work ends)
  },
  waveOut: 0.6,          // wave amplitude damping back to a flat dot line
};

const EASINGS = {
  'linear': t => t,
  'in':     t => t * t * t,
  'out':    t => 1 - Math.pow(1 - t, 3),
  'in-out': t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const ease = (t, kind) => EASINGS[kind in EASINGS ? kind : 'in-out'](Math.max(0, Math.min(1, t)));

const LOOPING = ['idle', 'linerest', 'spin', 'wave', 'wavebars'];
const REST_AFTER = { assemble: 'linerest', waveout: 'linerest', settle: 'idle' };
const SVG_NS = 'http://www.w3.org/2000/svg';

const deepMerge = (base, over) => {
  const out = { ...base };
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) out[k] = deepMerge(base[k] || {}, over[k]);
    else if (over[k] !== undefined) out[k] = over[k];
  }
  return out;
};

export default class ChatThrobber {
  constructor(target, options = {}) {
    this.el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.el) throw new Error('ChatThrobber: mount target not found');
    this.cfg = deepMerge(DEFAULTS, options);
    this.phase = 'idle';
    this.queue = [];
    this.repr = this.cfg.wave === 'bars' ? 'bars' : 'dots';
    this._switchAt = null;
    this._build();
    this.clock = performance.now() / 1000;
    this.t0 = this.clock;
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
    if (this.cfg.autoStart === 'spin') this.toolCall();
    if (this.cfg.autoStart === 'thinking') this.startThinking();
  }

  /* ---------- public API ---------- */

  /** Constant spin loop — indefinite background work (tool calls). */
  toolCall() { this._request(this._exitToLine().concat('spin')); return this; }

  /** Rotate -> line, then the wave loop — active thinking. */
  startThinking() {
    const w = this.cfg.wave === 'bars' ? 'wavebars' : 'wave';
    this._request(this._isWaving() ? [w] : this._atLine() ? [w] : ['assemble', w]);
    return this;
  }

  /** Wave calms to a dot line, settles back into the circle, then idles. */
  endThinking() { this._request(this._exitToLine().concat('idle')); return this; }

  /** Immediately show the resting ring (no transition). */
  reset() { this.queue = []; this._setPhase('idle'); return this; }

  /** Jump straight to one state, skipping transitions — useful for previews. */
  show(phase) { this.queue = []; this._setPhase(phase); return this; }

  /** Live-update any config (size, color, wave style, phase timings). */
  set(patch = {}) {
    this.cfg = deepMerge(this.cfg, patch);
    if (patch.size) { this.svg.setAttribute('width', this.cfg.size); this.svg.setAttribute('height', this.cfg.size); }
    if (patch.wave && this._isWaving()) this._request([patch.wave === 'bars' ? 'wavebars' : 'wave']);
    this._draw();
    return this;
  }

  get state() { return this.phase; }
  get isThinking() { return ['assemble', 'wave', 'wavebars', 'waveout', 'linerest'].includes(this.phase); }

  destroy() { cancelAnimationFrame(this._raf); this.svg.remove(); }

  /* ---------- internals ---------- */

  _isWaving() { return ['wave', 'wavebars', 'waveout'].includes(this.phase); }
  _atLine() { return ['assemble', 'linerest'].includes(this.phase); }
  // whatever we are doing now, get back to a flat dot line first
  _exitToLine() { return this._isWaving() ? ['waveout', 'settle'] : this._atLine() ? ['settle'] : []; }

  _build() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 60 60');
    svg.setAttribute('width', this.cfg.size);
    svg.setAttribute('height', this.cfg.size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('role', 'progressbar');
    svg.setAttribute('aria-label', 'Loading');
    svg.style.overflow = 'visible';

    this.dotsG = document.createElementNS(SVG_NS, 'g');
    this.barsG = document.createElementNS(SVG_NS, 'g');
    this.dots = []; this.bars = [];
    for (let i = 0; i < 6; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      this.dotsG.appendChild(c); this.dots.push(c);
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('x', GEO.lineX[i] - GEO.barW / 2);
      r.setAttribute('width', GEO.barW);
      r.setAttribute('rx', GEO.barW / 2);
      this.barsG.appendChild(r); this.bars.push(r);
    }
    svg.appendChild(this.dotsG); svg.appendChild(this.barsG);
    this.el.appendChild(svg);
    this.svg = svg;
  }

  _dur(phase) {
    if (phase === 'waveout') return this.cfg.waveOut;
    if (phase === 'idle' || phase === 'linerest') return 0;
    return this.cfg.phases[phase === 'wavebars' ? 'wave' : phase].duration;
  }
  _ease(phase) {
    const key = phase === 'waveout' ? 'wave' : phase === 'wavebars' ? 'wave' : phase;
    return (this.cfg.phases[key] || {}).easing || 'in-out';
  }

  _request(list) { this.queue = list.slice(); this._arm(); }

  _setPhase(name) {
    if (name === 'wave') this.repr = 'dots';
    if (name === 'wavebars') this.repr = 'bars';
    this.phase = name;
    this.t0 = this.clock;
    this._switchAt = null;
    this._arm();
    this.el.dispatchEvent(new CustomEvent('throbber:phase', { detail: { phase: name }, bubbles: true }));
  }

  // schedule the hand-off at the end of the cycle running right now
  _arm() {
    const d = this._dur(this.phase);
    if (LOOPING.includes(this.phase) && d > 0 && this.queue.length) {
      this._switchAt = this.t0 + (Math.floor((this.clock - this.t0) / d) + 1) * d;
    }
  }

  _advance() {
    if (this.queue.length) this._setPhase(this.queue.shift());
    else this._setPhase(REST_AFTER[this.phase] || 'idle');
  }

  _loop = () => {
    this.clock = performance.now() / 1000;
    const d = this._dur(this.phase), tp = this.clock - this.t0;
    if (LOOPING.includes(this.phase)) {
      if (this.queue.length) {
        if (!(d > 0)) this._advance();
        else {
          if (this._switchAt == null) this._switchAt = this.t0 + (Math.floor(tp / d) + 1) * d;
          if (this.clock >= this._switchAt) this._advance();
        }
      } else this._switchAt = null;
    } else if (tp >= d) this._advance();
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  // position of dot i along the rotate->line transition, p in 0..1
  _morph(i, p, easing) {
    const a = (GEO.startAngle[i] + 180 * ease(p, easing)) * Math.PI / 180;
    const cx = GEO.center.x + GEO.radius * Math.cos(a);
    const cy = GEO.center.y + GEO.radius * Math.sin(a);
    const d = GEO.lineDelay[i];
    const w = ease((p - d) / (1 - d), easing);
    return {
      cx: cx + (GEO.lineX[i] - cx) * w,
      cy: cy + (GEO.lineY - cy) * w,
      r: GEO.dotR - (GEO.dotR - GEO.lineDotR) * w,
    };
  }

  _draw() {
    const ph = this.phase, tp = this.clock - this.t0, dur = this._dur(ph);
    const single = this.cfg.color;
    const fill = i => single || this.cfg.colors[i] || DEFAULT_COLORS[i];
    const showBars = ph === 'wavebars' || (ph === 'waveout' && this.repr === 'bars');
    this.dotsG.style.display = showBars ? 'none' : '';
    this.barsG.style.display = showBars ? '' : 'none';

    const put = (el, cx, cy, r) => {
      el.setAttribute('cx', cx.toFixed(3)); el.setAttribute('cy', cy.toFixed(3)); el.setAttribute('r', r.toFixed(3));
    };

    if (ph === 'idle') {
      this.dots.forEach((el, i) => { el.setAttribute('fill', fill(i)); put(el, GEO.base[i][0], GEO.base[i][1], GEO.dotR); });
    } else if (ph === 'linerest') {
      this.dots.forEach((el, i) => { el.setAttribute('fill', fill(i)); put(el, GEO.lineX[i], GEO.lineY, GEO.lineDotR); });
    } else if (ph === 'spin') {
      const e = ease(dur > 0 ? (tp % dur) / dur : 0, this._ease('spin'));
      this.dots.forEach((el, i) => {
        el.setAttribute('fill', fill(i));
        const a = (GEO.startAngle[i] + 360 * e) * Math.PI / 180;
        put(el, GEO.center.x + GEO.radius * Math.cos(a), GEO.center.y + GEO.radius * Math.sin(a), GEO.dotR);
      });
    } else if (ph === 'assemble' || ph === 'settle') {
      const raw = dur > 0 ? Math.min(1, tp / dur) : 1;
      const p = ph === 'settle' ? 1 - raw : raw;
      this.dots.forEach((el, i) => {
        el.setAttribute('fill', fill(i));
        const d = this._morph(i, p, this._ease(ph));
        put(el, d.cx, d.cy, d.r);
      });
    } else { // wave | wavebars | waveout
      const w = 2 * Math.PI / this._dur('wave');
      const env = ph === 'waveout'
        ? 1 - ease(dur > 0 ? Math.min(1, tp / dur) : 1, this._ease('wave'))
        : 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, dur > 0 ? tp / dur : 1));
      if (showBars) {
        this.bars.forEach((el, i) => {
          el.setAttribute('fill', fill(i));
          const a = 0.5 + 0.5 * Math.cos(Math.PI * GEO.slot[i] / 5 - w * tp);
          const h = GEO.barMinH + env * a * GEO.barMaxRise;
          el.setAttribute('height', h.toFixed(3));
          el.setAttribute('y', (GEO.lineY + GEO.lineDotR - h).toFixed(3));
        });
      } else {
        this.dots.forEach((el, i) => {
          el.setAttribute('fill', fill(i));
          const a = 1 + Math.cos(Math.PI * GEO.slot[i] / 5 - w * tp);
          put(el, GEO.lineX[i], GEO.lineY - env * GEO.waveAmp * a, GEO.lineDotR);
        });
      }
    }
  }
}

/* ---------- <chat-throbber> custom element ---------- */
if (typeof customElements !== 'undefined' && !customElements.get('chat-throbber')) {
  customElements.define('chat-throbber', class extends HTMLElement {
    connectedCallback() {
      if (this._t) return;
      const num = (a, d) => (this.hasAttribute(a) ? parseFloat(this.getAttribute(a)) : d);
      this._t = new ChatThrobber(this, {
        size: num('size', DEFAULTS.size),
        color: this.getAttribute('color') || null,
        wave: this.getAttribute('wave') || DEFAULTS.wave,
        autoStart: this.getAttribute('auto-start') || null,
        phases: {
          spin:     { duration: num('spin-duration', 1.0),     easing: this.getAttribute('spin-easing')     || 'in-out' },
          assemble: { duration: num('assemble-duration', 0.5), easing: this.getAttribute('assemble-easing') || 'in-out' },
          wave:     { duration: num('wave-duration', 1.0),     easing: this.getAttribute('wave-easing')     || 'in-out' },
          settle:   { duration: num('settle-duration', 0.7),   easing: this.getAttribute('settle-easing')   || 'in' },
        },
      });
    }
    disconnectedCallback() { this._t && this._t.destroy(); this._t = null; }
    get throbber() { return this._t; }
    toolCall() { return this._t.toolCall(); }
    startThinking() { return this._t.startThinking(); }
    endThinking() { return this._t.endThinking(); }
    reset() { return this._t.reset(); }
    show(p) { return this._t.show(p); }
    set(p) { return this._t.set(p); }
  });
}

if (typeof window !== 'undefined') window.ChatThrobber = ChatThrobber;
