import { COLORS } from '../constants/theme';

export default function Sect() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏯</div>
      <div style={{ fontSize: 20, color: COLORS.gold, marginBottom: 8 }}>Sect Management</div>
      <div style={{ fontSize: 14 }}>
        Recruit, promote, disband, and set your sect banner.{'\n\n'}
        Coming in Phase 4 Step 6.
      </div>
    </div>
  );
}
