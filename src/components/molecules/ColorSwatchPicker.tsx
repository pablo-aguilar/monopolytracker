// #index
// - //#component: grid of color swatches with uniqueness enforcement

import React from 'react';
import ColorSwatch from '@/components/atoms/ColorSwatch';

export type ColorSwatchPickerProps = {
  colors: string[];
  usedColors: Set<string>;
  value: string;
  onChange: (color: string) => void;
};

export default function ColorSwatchPicker({ colors, usedColors, value, onChange }: ColorSwatchPickerProps): JSX.Element {
  // //#component
  // WHY: centralize taken/selected logic and data-qa wiring for consistency
  return (
    <div className="grid grid-cols-7 gap-2">
      {colors.map((c) => (
        <ColorSwatch key={c} color={c} selected={value === c} taken={usedColors.has(c)} qa={`color-${c}`} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}
