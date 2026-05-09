import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';
import { COLORS, REALM_COLORS } from '../constants/theme';

const W = 700;
const H = 480;

function hex(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

// Pyramid layout: higher realms near the top (Heaven), lower near the bottom (Mortal World)
const REALM_POS: Record<number, [number, number]> = {
  1:  [350, 415],
  2:  [240, 355], 3:  [460, 355],
  4:  [170, 293], 5:  [530, 293],
  6:  [240, 232], 7:  [460, 232],
  8:  [295, 170], 9:  [405, 170],
  10: [350, 108],
};

const CONNECTIONS: [number, number][] = [
  [1, 2], [1, 3],
  [2, 4], [3, 5],
  [4, 6], [5, 7],
  [6, 8], [7, 9],
  [8, 10], [9, 10],
];

const SHORT_NAMES: Record<number, string> = {
  1: 'Mortal',    2: 'Qi Cond.',  3: 'Foundation',
  4: 'Core',      5: 'Nascent',   6: 'Soul',
  7: 'Void',      8: 'Body',      9: 'Mahayana',
  10: 'Tribulation',
};

const NODE_R = 34;

export default function WorldMap() {
  const { character } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<Application | null>(null);
  const tickRef      = useRef(0);
  const [status, setStatus]   = useState<'loading' | 'ready' | 'error'>('loading');
  const [total, setTotal]     = useState(0);
  const [errMsg, setErrMsg]   = useState('');

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        // ── 1. Fetch population ───────────────────────────────────────────────
        const popByRealm: Record<number, number> = {};

        const builder = supabase.from('characters').select('realm_level');
        const finalQuery = character?.server_id
          ? builder.eq('server_id', character.server_id)
          : builder;
        const { data, error } = await finalQuery;

        if (!active) return;
        if (error) throw new Error(error.message);

        if (data) {
          let n = 0;
          for (const row of data) {
            popByRealm[row.realm_level] = (popByRealm[row.realm_level] ?? 0) + 1;
            n++;
          }
          setTotal(n);
        }

        // ── 2. Init Pixi ─────────────────────────────────────────────────────
        const app = new Application();
        await app.init({
          width: W, height: H,
          background: hex(COLORS.bg),
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!active) { app.destroy(true); return; }

        appRef.current = app;
        containerRef.current!.appendChild(app.canvas as HTMLCanvasElement);

        buildScene(app, popByRealm, character?.realm_level ?? 0);
        setStatus('ready');

      } catch (e) {
        if (active) setErrMsg(e instanceof Error ? e.message : String(e));
        if (active) setStatus('error');
      }
    }

    init();

    return () => {
      active = false;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.server_id, character?.realm_level]);

  function buildScene(app: Application, pop: Record<number, number>, playerRealm: number) {
    const maxPop = Math.max(1, ...Object.values(pop));

    // Background starfield
    const starContainer = new Container();
    for (let i = 0; i < 70; i++) {
      const s = new Graphics();
      s.circle(0, 0, Math.random() * 1.1 + 0.3);
      s.fill({ color: 0xffffff, alpha: 0.05 + Math.random() * 0.1 });
      s.x = Math.random() * W;
      s.y = Math.random() * H;
      starContainer.addChild(s);
    }
    app.stage.addChild(starContainer);

    // Axis labels
    const heavenLbl = new Text({
      text: "☯  H E A V E N ' S   P E A K",
      style: { fill: COLORS.gold, fontSize: 9, letterSpacing: 2 },
    });
    heavenLbl.anchor.set(0.5, 0);
    heavenLbl.x = W / 2; heavenLbl.y = 16;
    heavenLbl.alpha = 0.38;
    app.stage.addChild(heavenLbl);

    const mortalLbl = new Text({
      text: '⚡  M O R T A L   W O R L D',
      style: { fill: COLORS.textMuted, fontSize: 9, letterSpacing: 2 },
    });
    mortalLbl.anchor.set(0.5, 1);
    mortalLbl.x = W / 2; mortalLbl.y = H - 14;
    mortalLbl.alpha = 0.38;
    app.stage.addChild(mortalLbl);

    // Connection lines
    for (const [a, b] of CONNECTIONS) {
      const [ax, ay] = REALM_POS[a];
      const [bx, by] = REALM_POS[b];
      const line = new Graphics();
      line.moveTo(ax, ay);
      line.lineTo(bx, by);
      line.stroke({ color: hex(COLORS.border), width: 1, alpha: 0.32 });
      app.stage.addChild(line);
    }

    // Ascending Qi particles
    const particles = new Container();
    for (let i = 0; i < 36; i++) {
      const p = new Graphics() as Graphics & { _vy: number; _phase: number };
      p.circle(0, 0, Math.random() * 1.4 + 0.4);
      p.fill({ color: hex(COLORS.jade), alpha: 0.1 });
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p._vy    = 0.28 + Math.random() * 0.42;
      p._phase = Math.random() * Math.PI * 2;
      particles.addChild(p);
    }
    app.stage.addChild(particles);

    // Realm nodes
    const nodeGlows: Graphics[] = [];

    for (let realm = 1; realm <= 10; realm++) {
      const [x, y]    = REALM_POS[realm];
      const count      = pop[realm] ?? 0;
      const popRatio   = count / maxPop;
      const color      = hex(REALM_COLORS[realm] ?? COLORS.textMuted);
      const isPlayer   = realm === playerRealm;
      const shortName  = SHORT_NAMES[realm] ?? `Realm ${realm}`;
      const realmColor = REALM_COLORS[realm] ?? COLORS.textMuted;

      const node = new Container();
      node.x = x; node.y = y;

      // [0] Outer glow — pulsed by ticker
      const glow = new Graphics();
      glow.circle(0, 0, NODE_R + 16);
      glow.fill({ color, alpha: 0.06 + popRatio * 0.10 + (isPlayer ? 0.07 : 0) });
      node.addChild(glow);
      nodeGlows.push(glow);

      // [1] Ring
      const ring = new Graphics();
      ring.circle(0, 0, NODE_R);
      ring.stroke({
        color: isPlayer ? hex(COLORS.gold) : color,
        width: isPlayer ? 2.5 : 1.5,
        alpha: isPlayer ? 1.0 : 0.55,
      });
      node.addChild(ring);

      // [2] Fill
      const fill = new Graphics();
      fill.circle(0, 0, NODE_R - 2);
      fill.fill({ color, alpha: 0.10 + popRatio * 0.22 });
      node.addChild(fill);

      // [3] Realm number
      const numLbl = new Text({
        text: `${realm}`,
        style: { fill: isPlayer ? COLORS.gold : realmColor, fontSize: 15, fontWeight: '900' },
      });
      numLbl.anchor.set(0.5, 1);
      numLbl.y = -1;
      node.addChild(numLbl);

      // [4] Population count
      const cntLbl = new Text({
        text: count > 0 ? `${count}` : '—',
        style: { fill: COLORS.textMuted, fontSize: 10 },
      });
      cntLbl.anchor.set(0.5, 0);
      cntLbl.y = 4;
      node.addChild(cntLbl);

      // [5] Short name below node
      const nameLbl = new Text({
        text: isPlayer ? `▶ ${shortName}` : shortName,
        style: {
          fill: isPlayer ? COLORS.gold : COLORS.textMuted,
          fontSize: 9,
          fontWeight: isPlayer ? '700' : '400',
        },
      });
      nameLbl.anchor.set(0.5, 0);
      nameLbl.y = NODE_R + 5;
      node.addChild(nameLbl);

      app.stage.addChild(node);
    }

    // Ticker: pulse glows + drift particles upward
    app.ticker.add(() => {
      tickRef.current++;
      const t = tickRef.current;
      const pulse = 1 + Math.sin(t * 0.038) * 0.13;

      for (const g of nodeGlows) g.scale.set(pulse);

      particles.children.forEach((c: unknown, i: number) => {
        const p = c as Graphics & { _vy: number; _phase: number };
        p.y -= p._vy;
        p.x += Math.sin(t * 0.013 + p._phase) * 0.38;
        p.alpha = 0.04 + Math.abs(Math.sin(t * 0.022 + i * 0.6)) * 0.11;
        if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
      });
    });
  }

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>🌌 World Map</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5 }}>
          {character?.server_id
            ? <>Server <span style={{ color: COLORS.text }}>{character.server_id}</span></>
            : 'All servers'}
          {status !== 'loading' && (
            <span style={{ color: COLORS.border }}>
              {' '}· {total} cultivator{total !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
      </div>

      {status === 'error' && (
        <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 16 }}>
          Failed to load map: {errMsg}
        </div>
      )}

      {/* Canvas container — always in DOM so ref is stable; Pixi appends its canvas here */}
      <div
        ref={containerRef}
        style={{
          width: W, height: H,
          borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
          position: 'relative',
        }}
      >
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COLORS.textMuted, fontSize: 13,
          }}>
            Loading realm data…
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 11, color: COLORS.textMuted }}>
        <span><span style={{ color: COLORS.gold, fontWeight: 700 }}>▶</span> Your realm</span>
        <span>Number inside = cultivators at this realm (this server)</span>
        <span>Glow intensity = relative population</span>
      </div>
    </div>
  );
}
