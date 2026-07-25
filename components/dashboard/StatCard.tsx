'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
	label: string;
	value: string;
	helper?: string;
	icon?: LucideIcon;
	index?: number;
};

const fadeVariant = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0 },
};

export default function StatCard({
	label,
	value,
	helper,
	icon: Icon,
	index = 0,
}: StatCardProps) {
	return (
		<motion.div
			variants={fadeVariant}
			initial="hidden"
			animate="show"
			transition={{ duration: 0.28, delay: index * 0.05 }}
			className="relative rounded-lg border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
		>
			{Icon && (
				<div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Icon className="h-4 w-4" />
				</div>
			)}
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
			{helper && (
				<p className="mt-1 text-xs text-muted-foreground">{helper}</p>
			)}
		</motion.div>
	);
}
