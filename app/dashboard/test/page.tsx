'use client';
import React, { useState } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from 'recharts';
import {
	Search,
	Download,
	Eye,
	Filter,
	Users,
	Book,
	CalendarClock,
	ChevronRight,
	UserCheck,
} from 'lucide-react';

// Mock class data
const CLASSES_DATA = [
	{
		id: 'CLS001',
		name: 'Grade 10A',
		classTeacher: 'Dr. Robert Johnson',
		studentsCount: 28,
		subjects: [
			'Mathematics',
			'English',
			'Science',
			'History',
			'Computer Science',
		],
		averageAttendance: 96,
		averagePerformance: 85,
		lastAssessment: '2023-10-05',
		nextAssessment: '2023-10-25',
	},
	{
		id: 'CLS002',
		name: 'Grade 10B',
		classTeacher: 'Prof. Emily Davis',
		studentsCount: 26,
		subjects: ['Mathematics', 'English', 'Science', 'History', 'Art'],
		averageAttendance: 92,
		averagePerformance: 79,
		lastAssessment: '2023-10-07',
		nextAssessment: '2023-10-28',
	},
	{
		id: 'CLS003',
		name: 'Grade 9A',
		classTeacher: 'Prof. Sarah Williams',
		studentsCount: 30,
		subjects: ['Mathematics', 'English', 'Science', 'Geography', 'Music'],
		averageAttendance: 94,
		averagePerformance: 82,
		lastAssessment: '2023-10-12',
		nextAssessment: '2023-11-02',
	},
	{
		id: 'CLS004',
		name: 'Grade 11A',
		classTeacher: 'Dr. James Miller',
		studentsCount: 25,
		subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'],
		averageAttendance: 95,
		averagePerformance: 88,
		lastAssessment: '2023-10-03',
		nextAssessment: '2023-10-24',
	},
	{
		id: 'CLS005',
		name: 'Grade 11B',
		classTeacher: 'Dr. Michael Brown',
		studentsCount: 24,
		subjects: [
			'Mathematics',
			'English',
			'Physics',
			'Chemistry',
			'Computer Science',
		],
		averageAttendance: 91,
		averagePerformance: 83,
		lastAssessment: '2023-10-10',
		nextAssessment: '2023-10-31',
	},
	{
		id: 'CLS006',
		name: 'Grade 12A',
		classTeacher: 'Prof. Jennifer Smith',
		studentsCount: 22,
		subjects: ['Mathematics', 'English', 'Physics', 'Economics', 'Art'],
		averageAttendance: 93,
		averagePerformance: 86,
		lastAssessment: '2023-10-06',
		nextAssessment: '2023-10-27',
	},
	{
		id: 'CLS007',
		name: 'Grade 9B',
		classTeacher: 'Dr. David Wilson',
		studentsCount: 29,
		subjects: [
			'Mathematics',
			'English',
			'Science',
			'History',
			'Physical Education',
		],
		averageAttendance: 90,
		averagePerformance: 77,
		lastAssessment: '2023-10-11',
		nextAssessment: '2023-11-01',
	},
];

// Mock subject-wise performance data
const SUBJECT_PERFORMANCE = [
	{ name: 'Mathematics', performance: 82 },
	{ name: 'English', performance: 78 },
	{ name: 'Science', performance: 85 },
	{ name: 'History', performance: 79 },
	{ name: 'Computer Science', performance: 88 },
	{ name: 'Physics', performance: 84 },
	{ name: 'Chemistry', performance: 86 },
	{ name: 'Biology', performance: 83 },
];

// Mock attendance data
const ATTENDANCE_DATA = [
	{ name: 'Grade 9', attendance: 92 },
	{ name: 'Grade 10', attendance: 94 },
	{ name: 'Grade 11', attendance: 93 },
	{ name: 'Grade 12', attendance: 93 },
];

// Mock class size distribution
const CLASS_SIZE_DISTRIBUTION = [
	{ name: '20-25', value: 3 },
	{ name: '26-30', value: 4 },
];

// Mock gender distribution
const GENDER_DISTRIBUTION = [
	{ name: 'Male', value: 105 },
	{ name: 'Female', value: 100 },
];

// COLORS
const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'];
const GENDER_COLORS = ['#3b82f6', '#ec4899'];

export default function ClassesOverview() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');

	// Apply filters to class data
	const filteredClasses = CLASSES_DATA.filter((classData) => {
		const matchesSearch =
			classData.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			classData.classTeacher.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesGrade = selectedGradeLevel
			? classData.name.startsWith(`Grade ${selectedGradeLevel}`)
			: true;

		return matchesSearch && matchesGrade;
	});

	// Get unique grade levels
	const getGradeLevels = () => {
		return Array.from(
			new Set(
				CLASSES_DATA.map((classData) =>
					classData.name.split(' ')[1].replace(/[A-Z]/g, '')
				)
			)
		);
	};

	const gradeLevels = getGradeLevels();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">Classes Overview</h1>
				<div className="flex gap-2">
					<Button variant="outline">
						<Filter className="mr-2 h-4 w-4" />
						Advanced Filters
					</Button>
					<Button>
						<Download className="mr-2 h-4 w-4" />
						Export Report
					</Button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total Classes</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{CLASSES_DATA.length}</div>
						<p className="text-xs text-muted-foreground">
							Across {gradeLevels.length} grade levels
						</p>
						<div className="mt-4 flex items-center gap-2">
							<Users className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{CLASSES_DATA.reduce((sum, cls) => sum + cls.studentsCount, 0)}{' '}
								students total
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							Average Class Size
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.round(
								CLASSES_DATA.reduce((sum, cls) => sum + cls.studentsCount, 0) /
									CLASSES_DATA.length
							)}
						</div>
						<p className="text-xs text-muted-foreground">Students per class</p>
						<div className="mt-4 flex items-center gap-2">
							<Book className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{
									Array.from(
										new Set(CLASSES_DATA.flatMap((cls) => cls.subjects))
									).length
								}{' '}
								unique subjects taught
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							Average Attendance
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.round(
								CLASSES_DATA.reduce(
									(sum, cls) => sum + cls.averageAttendance,
									0
								) / CLASSES_DATA.length
							)}
							%
						</div>
						<p className="text-xs text-muted-foreground">
							School-wide attendance rate
						</p>
						<div className="mt-4 flex items-center gap-2">
							<UserCheck className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{
									CLASSES_DATA.filter((cls) => cls.averageAttendance > 95)
										.length
								}{' '}
								classes with &gt;95% attendance
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							Average Performance
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.round(
								CLASSES_DATA.reduce(
									(sum, cls) => sum + cls.averagePerformance,
									0
								) / CLASSES_DATA.length
							)}
							%
						</div>
						<p className="text-xs text-muted-foreground">
							Overall academic score
						</p>
						<div className="mt-4 flex items-center gap-2">
							<CalendarClock className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								Next assessments starting{' '}
								{new Date(
									Math.min(
										...CLASSES_DATA.map((cls) =>
											new Date(cls.nextAssessment).getTime()
										)
									)
								).toLocaleDateString()}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="list" className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="list">Class List</TabsTrigger>
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="attendance">Attendance</TabsTrigger>
					<TabsTrigger value="demographics">Demographics</TabsTrigger>
				</TabsList>

				<TabsContent value="list" className="space-y-6">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>All Classes</CardTitle>
							<CardDescription>
								Overview of all classes and their key metrics
							</CardDescription>

							<div className="flex flex-col sm:flex-row gap-4 pt-4 items-start sm:items-center justify-between">
								<div className="relative w-full max-w-sm">
									<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by class name or teacher..."
										className="pl-8 w-full"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<div className="flex flex-wrap gap-2 items-center">
									<Select
										value={selectedGradeLevel}
										onValueChange={setSelectedGradeLevel}
									>
										<SelectTrigger className="w-[160px]">
											<SelectValue placeholder="Grade Level" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="All">All Grades</SelectItem>
											{gradeLevels.map((grade) => (
												<SelectItem key={grade} value={grade}>
													{grade}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Class</TableHead>
										<TableHead>Class Teacher</TableHead>
										<TableHead className="text-center">Students</TableHead>
										<TableHead className="text-center">Attendance</TableHead>
										<TableHead className="text-center">Performance</TableHead>
										<TableHead>Last Assessment</TableHead>
										<TableHead>Next Assessment</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredClasses.map((classData) => (
										<TableRow key={classData.id}>
											<TableCell>
												<div>
													<p className="font-medium">{classData.name}</p>
													<p className="text-xs text-muted-foreground">
														{classData.id}
													</p>
												</div>
											</TableCell>
											<TableCell>{classData.classTeacher}</TableCell>
											<TableCell className="text-center">
												{classData.studentsCount}
											</TableCell>
											<TableCell className="text-center">
												<Badge
													variant="outline"
													className={
														classData.averageAttendance >= 95
															? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
															: classData.averageAttendance >= 90
															? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
															: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
													}
												>
													{classData.averageAttendance}%
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<Badge
													variant="outline"
													className={
														classData.averagePerformance >= 85
															? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
															: classData.averagePerformance >= 75
															? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
															: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
													}
												>
													{classData.averagePerformance}%
												</Badge>
											</TableCell>
											<TableCell>
												{new Date(
													classData.lastAssessment
												).toLocaleDateString()}
											</TableCell>
											<TableCell>
												{new Date(
													classData.nextAssessment
												).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right">
												<Button variant="ghost" size="sm" className="h-8">
													<Eye className="h-3.5 w-3.5 mr-1" />
													Details
													<ChevronRight className="h-3.5 w-3.5 ml-1" />
												</Button>
											</TableCell>
										</TableRow>
									))}
									{filteredClasses.length === 0 && (
										<TableRow>
											<TableCell colSpan={8} className="h-24 text-center">
												No classes found matching your criteria
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="performance" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Class Performance Comparison</CardTitle>
								<CardDescription>
									Average performance scores by class
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={CLASSES_DATA}
											margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
										>
											<CartesianGrid strokeDasharray="3 3" vertical={false} />
											<XAxis dataKey="name" />
											<YAxis domain={[0, 100]} />
											<Tooltip />
											<Bar
												dataKey="averagePerformance"
												fill="#3b82f6"
												name="Performance Score"
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
							<CardFooter className="flex justify-center pt-0">
								<p className="text-xs text-muted-foreground">
									Based on average scores from all assessments
								</p>
							</CardFooter>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Subject-wise Performance</CardTitle>
								<CardDescription>
									Average scores across all classes by subject
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={SUBJECT_PERFORMANCE}
											margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
											layout="vertical"
										>
											<CartesianGrid
												strokeDasharray="3 3"
												horizontal={true}
												vertical={false}
											/>
											<XAxis type="number" domain={[0, 100]} />
											<YAxis dataKey="name" type="category" width={100} />
											<Tooltip />
											<Bar
												dataKey="performance"
												fill="#8b5cf6"
												name="Average Score"
											>
												{SUBJECT_PERFORMANCE.map((entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={COLORS[index % COLORS.length]}
													/>
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
							<CardFooter className="flex justify-center pt-0">
								<p className="text-xs text-muted-foreground">
									Data aggregated from all class assessments
								</p>
							</CardFooter>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="attendance" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Attendance by Grade Level</CardTitle>
								<CardDescription>Average attendance rates</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={ATTENDANCE_DATA}
											margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
										>
											<CartesianGrid strokeDasharray="3 3" vertical={false} />
											<XAxis dataKey="name" />
											<YAxis domain={[80, 100]} />
											<Tooltip />
											<Bar
												dataKey="attendance"
												fill="#10b981"
												name="Attendance Rate"
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
							<CardFooter className="flex justify-center pt-0">
								<p className="text-xs text-muted-foreground">
									Based on daily attendance records
								</p>
							</CardFooter>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Class Attendance Details</CardTitle>
								<CardDescription>
									Individual class attendance statistics
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Class</TableHead>
											<TableHead className="text-center">
												Attendance Rate
											</TableHead>
											<TableHead className="text-right">Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{CLASSES_DATA.map((classData) => (
											<TableRow key={classData.id}>
												<TableCell>{classData.name}</TableCell>
												<TableCell className="text-center">
													{classData.averageAttendance}%
												</TableCell>
												<TableCell className="text-right">
													<Badge
														variant="outline"
														className={
															classData.averageAttendance >= 95
																? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
																: classData.averageAttendance >= 90
																? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
																: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
														}
													>
														{classData.averageAttendance >= 95
															? 'Excellent'
															: classData.averageAttendance >= 90
															? 'Good'
															: 'Needs Improvement'}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
							<CardFooter className="flex justify-center pt-4">
								<Button variant="outline" size="sm">
									View Detailed Attendance Report
								</Button>
							</CardFooter>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="demographics" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Class Size Distribution</CardTitle>
								<CardDescription>
									Number of classes by student count
								</CardDescription>
							</CardHeader>
							<CardContent className="flex justify-center">
								<div className="h-64 w-64">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={CLASS_SIZE_DISTRIBUTION}
												cx="50%"
												cy="50%"
												outerRadius={80}
												fill="#8884d8"
												dataKey="value"
												nameKey="name"
												label={({ name, value }) => `${name}: ${value}`}
											>
												{CLASS_SIZE_DISTRIBUTION.map((entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={COLORS[index % COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
							<CardFooter className="flex justify-center pt-0">
								<div className="flex flex-wrap gap-4 justify-center">
									{CLASS_SIZE_DISTRIBUTION.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COLORS[index % COLORS.length],
												}}
											/>
											<span className="text-sm">
												{entry.name} students: {entry.value} classes
											</span>
										</div>
									))}
								</div>
							</CardFooter>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Student Gender Distribution</CardTitle>
								<CardDescription>
									Overall gender ratio across all classes
								</CardDescription>
							</CardHeader>
							<CardContent className="flex justify-center">
								<div className="h-64 w-64">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={GENDER_DISTRIBUTION}
												cx="50%"
												cy="50%"
												outerRadius={80}
												fill="#8884d8"
												dataKey="value"
												nameKey="name"
												label={({ name, value, percent }) =>
													`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
												}
											>
												{GENDER_DISTRIBUTION.map((entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={GENDER_COLORS[index % GENDER_COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip
												formatter={(value) => [`${value} students`, 'Count']}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
							<CardFooter className="flex justify-center pt-0">
								<div className="flex flex-wrap gap-4 justify-center">
									{GENDER_DISTRIBUTION.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor:
														GENDER_COLORS[index % GENDER_COLORS.length],
												}}
											/>
											<span className="text-sm">
												{entry.name}: {entry.value} students
											</span>
										</div>
									))}
								</div>
							</CardFooter>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
