import { cn } from '../../lib/utils';

type MaterialIconProps = {
  name: string;
  className?: string;
  /** Visually hidden label for screen readers */
  label?: string;
};

/** Material Symbols Outlined ligature icon (matches Stitch HTML). */
export default function MaterialIcon({ name, className, label }: MaterialIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
