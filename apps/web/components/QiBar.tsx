export default function QiBar({
  current,
  max,
  showNumbers = true,
}: {
  current: number;
  max: number;
  showNumbers?: boolean;
}) {
  const pct = Math.min((current / max) * 100, 100);
  const isFull = current >= max;

  return (
    <div className="w-full">
      <div className="h-3 bg-ink-700 rounded-full overflow-hidden border border-ink-500">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull
              ? 'bg-gradient-to-r from-gold-600 to-gold-400'
              : 'bg-gradient-to-r from-jade-600 to-jade-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showNumbers && (
        <div className="flex justify-between text-xs text-ink-300 mt-1 font-body">
          <span>{current.toLocaleString()} Qi</span>
          <span className={isFull ? 'text-gold-500 font-semibold' : ''}>
            {isFull ? '⚡ Full' : `${max.toLocaleString()} max`}
          </span>
        </div>
      )}
    </div>
  );
}
