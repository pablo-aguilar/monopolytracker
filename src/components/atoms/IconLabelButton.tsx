import React from 'react';

export type IconLabelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  iconSrc: string;
  label: React.ReactNode;
  iconAlt?: string;
  iconClassName?: string;
};

export default function IconLabelButton({
  iconSrc,
  label,
  iconAlt = '',
  iconClassName,
  className,
  type,
  ...rest
}: IconLabelButtonProps): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={`inline-flex items-center justify-center gap-1 rounded-md pl-1 pr-2.5 py-1 text-sm font-semibold ${className ?? ''}`}
      {...rest}
    >
      <img
        src={iconSrc}
        alt={iconAlt}
        className={iconClassName ?? 'h-7 w-7 inline-block align-middle'}
        loading="lazy"
        decoding="async"
      />
      <span>{label}</span>
    </button>
  );
}

