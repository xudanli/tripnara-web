interface PriceRangeInputProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

export function PriceRangeInput({ min, max, onChange }: PriceRangeInputProps) {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs">
      <label className="text-[11px] space-y-0.5">
        <span className="text-muted-foreground">最低 (USD)</span>
        <input
          type="number"
          min={0}
          value={min}
          onChange={(e) => onChange(Number(e.target.value), max)}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
      </label>
      <label className="text-[11px] space-y-0.5">
        <span className="text-muted-foreground">最高 (USD)</span>
        <input
          type="number"
          min={0}
          value={max}
          onChange={(e) => onChange(min, Number(e.target.value))}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
      </label>
    </div>
  );
}
