'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SchoolProfile } from '@/types/schoolProfile';
import { buildAcademicYearOptions } from '@/components/dashboard/academicYear';
import DashboardInsights from '@/components/dashboard/DashboardInsights';
import AdminPerformance from '@/components/dashboard/AdminPerformance';
import AdminEnrollment from '@/components/dashboard/AdminEnrollment';
import { areAcademicYearsEqual } from '@/utils/academicYear';
import { pickCurrentOrMostRecentAcademicYear } from '@/utils/academicYearOptions';

interface SystemAdminDashboardProps {
	schoolProfile: SchoolProfile;
	user: any;
}

export default function SystemAdminDashboard({
	schoolProfile,
	user,
}: SystemAdminDashboardProps) {
	const academicYearOptions = useMemo(
		() => buildAcademicYearOptions(schoolProfile),
		[schoolProfile],
	);
	const currentAcademicYear = schoolProfile.currentAcademicYear || '';
	const defaultAcademicYear = useMemo(
		() =>
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions.map((option) => option.value),
				currentAcademicYear,
			) || '',
		[academicYearOptions, currentAcademicYear],
	);
	const [selectedYear, setSelectedYear] = useState(
		defaultAcademicYear,
	);
	const showAcademicYearSelector = academicYearOptions.length > 1;

	useEffect(() => {
		const selectedIsAvailable = academicYearOptions.some((option) =>
			areAcademicYearsEqual(option.value, selectedYear),
		);
		if (!selectedYear || !selectedIsAvailable) {
			setSelectedYear(defaultAcademicYear);
		}
	}, [academicYearOptions, defaultAcademicYear, selectedYear]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold">School Overview</h2>
					<p className="text-sm text-muted-foreground">
						Academic year: {selectedYear || 'N/A'}
					</p>
				</div>
				{showAcademicYearSelector ? (
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Academic Year
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedYear}
							onChange={(event) => setSelectedYear(event.target.value)}
						>
							{academicYearOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
				) : null}
			</div>

			<Tabs defaultValue="insights" className="w-full">
				<TabsList className="w-full justify-start">
					<TabsTrigger value="insights">Insights</TabsTrigger>
					<TabsTrigger value="performance">Performance Lab</TabsTrigger>
					<TabsTrigger value="enrollment">Enrollment</TabsTrigger>
				</TabsList>

				<TabsContent value="insights">
					<DashboardInsights
						schoolProfile={schoolProfile}
						user={user}
						selectedYear={selectedYear}
						onYearChange={setSelectedYear}
						showYearSelector={false}
					/>
				</TabsContent>

				<TabsContent value="performance">
					<AdminPerformance
						schoolProfile={schoolProfile}
						selectedYear={selectedYear}
					/>
				</TabsContent>

				<TabsContent value="enrollment">
					<AdminEnrollment
						schoolProfile={schoolProfile}
						selectedYear={selectedYear}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
