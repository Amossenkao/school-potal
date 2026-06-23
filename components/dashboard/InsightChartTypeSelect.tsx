'use client';

import type { ChartType } from '@/components/dashboard/insightAnalytics';
import { CHART_TYPE_OPTIONS } from '@/components/dashboard/insightAnalytics';

type InsightChartTypeSelectProps = {
	value: ChartType;
	onChange: (value: ChartType) => void;
	label?: string;
};

export default function InsightChartTypeSelect({
	value,
	onChange,
	label = 'Chart',
}: InsightChartTypeSelectProps) {
	return (
		<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
			{label}
			<select
				className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
				value={value}
				onChange={(event) => onChange(event.target.value as ChartType)}
			>
				{CHART_TYPE_OPTIONS.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}
