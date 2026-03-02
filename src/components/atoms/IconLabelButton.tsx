import React from 'react';

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: React.ReactNode;
  iconClassName?: string;
};

type WithIconSrc = BaseProps & {
  iconSrc: string;
  iconAlt?: string;
  icon?: never;
};

type WithIconNode = BaseProps & {
  icon: React.ReactNode;
  iconSrc?: never;
  iconAlt?: never;
};

export type IconLabelButtonProps = WithIconSrc | WithIconNode;

export default function IconLabelButton({
  iconSrc,
  icon,
  label,
  iconAlt = '',
  iconClassName,
  className,
  type,
  ...rest
}: IconLabelButtonProps): JSX.Element {
  return (
    <button
      data-cmp="a/IconLabelButton"
      type={type ?? 'button'}
      className={`inline-flex items-center justify-center gap-1 rounded-md pl-1 pr-2.5 py-1 text-sm font-semibold ${className ?? ''}`}
      {...rest}
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={iconAlt}
          className={iconClassName ?? 'h-7 w-7 inline-block align-middle'}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className={iconClassName ?? 'inline-flex items-center justify-center text-current'}>
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}

