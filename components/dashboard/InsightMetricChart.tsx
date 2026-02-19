'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from 'recharts';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartType } from '@/components/dashboard/insightAnalytics';

type InsightMetricChartProps<T extends Record<string, string | number>> = {
	data: T[];
	chartType: ChartType;
	xKey: keyof T & string;
	yKey: keyof T & string;
	yLabel: string;
	color: string;
	className?: string;
	xTickFormatter?: (value: string) => string;
};

export default function InsightMetricChart<T extends Record<string, string | number>>({
	data,
	chartType,
	xKey,
	yKey,
	yLabel,
	color,
	className = 'h-[240px] sm:h-[290px] w-full aspect-auto',
	xTickFormatter,
}: InsightMetricChartProps<T>) {
	return (
		<ChartContainer
			config={{
				[yKey]: {
					label: yLabel,
					color,
				},
			}}
			className={className}
		>
			{chartType === 'line' ? (
				<LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
					<CartesianGrid vertical={false} strokeDasharray="3 3" />
					<XAxis
						dataKey={xKey}
						tickLine={false}
						axisLine={false}
						interval="preserveStartEnd"
						minTickGap={8}
						angle={-24}
						textAnchor="end"
						height={48}
						tick={{ fontSize: 12 }}
						tickFormatter={xTickFormatter}
					/>
					<YAxis tickLine={false} axisLine={false} width={32} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<Line
						type="monotone"
						dataKey={yKey}
						stroke={`var(--color-${yKey})`}
						strokeWidth={2.5}
						dot={{ r: 3 }}
						activeDot={{ r: 5 }}
						isAnimationActive
						animationDuration={700}
					/>
				</LineChart>
			) : chartType === 'bar' ? (
				<BarChart
					layout="vertical"
					data={data}
					margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
				>
					<CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
					<XAxis type="number" tickLine={false} axisLine={false} />
					<YAxis
						type="category"
						dataKey={xKey}
						tickLine={false}
						axisLine={false}
						width={96}
						tick={{ fontSize: 12 }}
						tickFormatter={xTickFormatter}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar
						dataKey={yKey}
						fill={`var(--color-${yKey})`}
						radius={[0, 6, 6, 0]}
						isAnimationActive
						animationDuration={700}
					/>
				</BarChart>
			) : (
				<BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
					<CartesianGrid vertical={false} strokeDasharray="3 3" />
					<XAxis
						dataKey={xKey}
						tickLine={false}
						axisLine={false}
						interval="preserveStartEnd"
						minTickGap={8}
						angle={-24}
						textAnchor="end"
						height={48}
						tick={{ fontSize: 12 }}
						tickFormatter={xTickFormatter}
					/>
					<YAxis tickLine={false} axisLine={false} width={32} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar
						dataKey={yKey}
						fill={`var(--color-${yKey})`}
						radius={[6, 6, 0, 0]}
						isAnimationActive
						animationDuration={700}
					/>
				</BarChart>
			)}
		</ChartContainer>
	);
}
