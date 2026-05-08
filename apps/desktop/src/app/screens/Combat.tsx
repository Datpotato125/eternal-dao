import { COLORS } from '../constants/theme';

export default function Combat() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
      <div style={{ fontSize: 20, color: COLORS.gold, marginBottom: 8 }}>Manual Combat</div>
      <div style={{ fontSize: 14 }}>
        The flagship Desktop feature — choose actions each round,{'\n'}
        watch combat resolve with Pixi.js animations.{'\n\n'}
        Coming in Phase 4 Step 3.
      </div>
    </div>
  );
}
