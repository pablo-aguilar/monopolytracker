import React from 'react';
import CloseIconButton from '@/components/atoms/CloseIconButton';

export interface OverlayHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  className?: string;
  rowClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export default function OverlayHeader({
  title,
  subtitle,
  onClose,
  className,
  rowClassName,
  titleClassName,
  subtitleClassName,
}: OverlayHeaderProps): JSX.Element {
  return (
    <div data-cmp="m/OverlayHeader" className={className ?? ''}>
      <div className={`flex items-center justify-between ${rowClassName ?? ''}`}>
        <div className={titleClassName ?? 'text-sm font-semibold'}>{title}</div>
        <CloseIconButton onClick={onClose} />
      </div>
      {subtitle ? (
        <div className={subtitleClassName ?? 'pt-1 text-xs text-muted'}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
