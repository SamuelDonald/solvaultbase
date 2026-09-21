import { cn } from "@/lib/utils";

interface SliderProps {
  id?: string;
  className?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
}

/** Native range input, styled to match — no extra dependency needed. */
export function Slider({ id, className, min, max, step, value, onValueChange }: SliderProps) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary",
        className,
      )}
    />
  );
}
