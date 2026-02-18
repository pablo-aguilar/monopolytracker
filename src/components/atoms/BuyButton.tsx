import React from 'react';

export interface BuyButtonProps {
	name: string;
	price: number;
	canAfford: boolean;
	selected: boolean;
	onToggle: () => void;
	bgClass: string; // e.g., from getBuyStyle
	textClass: string;
	borderClass: string;
	textStrongClass: string;
	label?: React.ReactNode;
	disabled?: boolean;
}

export default function BuyButton({ name, price, canAfford, selected, onToggle, bgClass, textClass, borderClass, textStrongClass, label, disabled }: BuyButtonProps): JSX.Element {
	const isDisabled = !!disabled || !canAfford;
	const filledClasses = `${bgClass} ${textClass} ${!isDisabled ? 'hover:brightness-110' : 'opacity-60 cursor-not-allowed'}`;
	const ghostClasses = `bg-transparent border ${borderClass} ${textStrongClass} dark:text-white ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/5 dark:hover:bg-white/10'}`;
	return (
		<div className="pt-1 space-y-1">
			<div className="text-xs opacity-80">{name}</div>
			<button
				type="button"
				className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold shadow ${selected ? filledClasses : ghostClasses}`}
				disabled={isDisabled}
				onClick={onToggle}
			>
				{selected && <span>✓</span>}
				{label ?? <>Buy for ${price}</>}
			</button>
		</div>
	);
}
