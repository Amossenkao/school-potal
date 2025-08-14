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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import {
	Search,
	FileText,
	Download,
	CheckCircle,
	XCircle,
	Calendar,
	Clock,
	AlertTriangle,
	MessageSquare,
	Filter,
	Eye,
	MoreHorizontal,
	CheckSquare,
	ThumbsUp,
} from 'lucide-react';

// Mock lesson plan data
const LESSON_PLANS = [
	{
		id: 'LP001',
		teacher: 'Dr. Robert Johnson',
		teacherId: 'TCH001',
		subject: 'Mathematics',
		class: 'Grade 10A',
		topic: 'Quadratic Equations',
		duration: '2 weeks',
		startDate: '2023-10-18',
		endDate: '2023-10-31',
		status: 'pending',
		submittedOn: '2023-10-15',
		lastModified: '2 days ago',
		hasAttachments: true,
		hasComments: true,
		objectives: [
			'Understand the properties of quadratic equations',
			'Learn to solve quadratic equations using different methods',
			'Apply quadratic equations in real-world problems',
		],
	},
	{
		id: 'LP002',
		teacher: 'Prof. Sarah Williams',
		teacherId: 'TCH002',
		subject: 'English Literature',
		class: 'Grade 10A',
		topic: "Shakespeare's Macbeth",
		duration: '3 weeks',
		startDate: '2023-10-20',
		endDate: '2023-11-10',
		status: 'approved',
		submittedOn: '2023-10-12',
		lastModified: '5 days ago',
		hasAttachments: true,
		hasComments: false,
		objectives: [
			'Analyze themes of ambition and moral corruption in Macbeth',
			'Understand Shakespearean tragedy conventions',
			'Develop critical analysis skills through character study',
		],
	},
	{
		id: 'LP003',
		teacher: 'Dr. James Miller',
		teacherId: 'TCH003',
		subject: 'Chemistry',
		class: 'Grade 10B',
		topic: 'Chemical Bonding',
		duration: '2 weeks',
		startDate: '2023-10-25',
		endDate: '2023-11-08',
		status: 'pending',
		submittedOn: '2023-10-16',
		lastModified: '1 day ago',
		hasAttachments: false,
		hasComments: true,
		objectives: [
			'Understand ionic and covalent bonding',
			'Explain molecular geometry using VSEPR theory',
			'Predict properties of compounds based on bonding types',
		],
	},
	{
		id: 'LP004',
		teacher: 'Prof. Emily Davis',
		teacherId: 'TCH004',
		subject: 'History',
		class: 'Grade 9A',
		topic: 'World War II',
		duration: '4 weeks',
		startDate: '2023-11-01',
		endDate: '2023-11-29',
		status: 'rejected',
		submittedOn: '2023-10-10',
		lastModified: '1 week ago',
		hasAttachments: true,
		hasComments: true,
		objectives: [
			'Examine the causes and effects of World War II',
			'Analyze key battles and turning points',
			'Understand the Holocaust and its impact on world history',
		],
	},
	{
		id: 'LP005',
		teacher: 'Dr. Michael Brown',
		teacherId: 'TCH005',
		subject: 'Computer Science',
		class: 'Grade 11B',
		topic: 'Introduction to Python Programming',
		duration: '3 weeks',
		startDate: '2023-10-22',
		endDate: '2023-11-12',
		status: 'pending',
		submittedOn: '2023-10-17',
		lastModified: 'Today',
		hasAttachments: true,
		hasComments: false,
		objectives: [
			'Learn Python syntax and basic programming concepts',
			'Develop simple programs using conditional statements and loops',
			'Implement functions and understand variable scope',
		],
	},
	{
		id: 'LP006',
		teacher: 'Prof. Jennifer Smith',
		teacherId: 'TCH006',
		subject: 'Art',
		class: 'Grade 12A',
		topic: 'Renaissance Art Techniques',
		duration: '2 weeks',
		startDate: '2023-10-19',
		endDate: '2023-11-02',
		status: 'approved',
		submittedOn: '2023-10-14',
		lastModified: '3 days ago',
		hasAttachments: true,
		hasComments: true,
		objectives: [
			'Study perspective techniques developed during the Renaissance',
			'Practice chiaroscuro shading methods',
			'Create a piece inspired by Renaissance masters',
		],
	},
	{
		id: 'LP007',
		teacher: 'Dr. David Wilson',
		teacherId: 'TCH007',
		subject: 'Economics',
		class: 'Grade 11A',
		topic: 'Market Structures and Competition',
		duration: '2 weeks',
		startDate: '2023-10-23',
		endDate: '2023-11-06',
		status: 'approved',
		submittedOn: '2023-10-13',
		lastModified: '4 days ago',
		hasAttachments: false,
		hasComments: false,
		objectives: [
			'Understand different market structures (perfect competition, monopoly, etc.)',
			'Analyze how market structures affect pricing and output decisions',
			'Evaluate the impact of market structures on consumer welfare',
		],
	},
];

export default function ViewLessonPlans() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedSubject, setSelectedSubject] = useState<string>('');
	const [selectedClass, setSelectedClass] = useState<string>('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [viewLessonPlan, setViewLessonPlan] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

	// Apply filters to lesson plan data
	const filteredPlans = LESSON_PLANS.filter((plan) => {
		const matchesSearch =
			plan.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plan.topic.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesSubject = selectedSubject
			? plan.subject === selectedSubject
			: true;
		const matchesClass = selectedClass ? plan.class === selectedClass : true;
		const matchesStatus = selectedStatus
			? plan.status === selectedStatus
			: true;

		return matchesSearch && matchesSubject && matchesClass && matchesStatus;
	});

	// Get unique values for filters
	const getUniqueValues = (field: string) => {
		return Array.from(new Set(LESSON_PLANS.map((item: any) => item[field])));
	};

	const subjects = getUniqueValues('subject');
	const classes = getUniqueValues('class');

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">View Lesson Plans</h1>
				<div className="flex gap-2">
					<Button variant="outline">
						<Filter className="mr-2 h-4 w-4" />
						Advanced Filters
					</Button>
					<Button>
						<Download className="mr-2 h-4 w-4" />
						Export Data
					</Button>
				</div>
			</div>

			<Tabs defaultValue="pending" className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="pending">
						Pending Review (
						{LESSON_PLANS.filter((s) => s.status === 'pending').length})
					</TabsTrigger>
					<TabsTrigger value="approved">
						Approved (
						{LESSON_PLANS.filter((s) => s.status === 'approved').length})
					</TabsTrigger>
					<TabsTrigger value="rejected">
						Needs Revision (
						{LESSON_PLANS.filter((s) => s.status === 'rejected').length})
					</TabsTrigger>
					<TabsTrigger value="all">All Plans</TabsTrigger>
				</TabsList>

				<TabsContent value="pending" className="space-y-6">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>Pending Lesson Plans</CardTitle>
							<CardDescription>
								Review and approve teacher lesson plans
							</CardDescription>

							<div className="flex flex-col sm:flex-row gap-4 pt-4 items-start sm:items-center justify-between">
								<div className="relative w-full max-w-sm">
									<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by teacher or topic..."
										className="pl-8 w-full"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<div className="flex flex-wrap gap-2 items-center">
									<Select
										value={selectedSubject}
										onValueChange={setSelectedSubject}
									>
										<SelectTrigger className="w-[160px]">
											<SelectValue placeholder="Filter by Subject" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="All">All Subjects</SelectItem>
											{subjects.map((subject) => (
												<SelectItem key={subject} value={subject}>
													{subject}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select
										value={selectedClass}
										onValueChange={setSelectedClass}
									>
										<SelectTrigger className="w-[160px]">
											<SelectValue placeholder="Filter by Class" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="All">All Classes</SelectItem>
											{classes.map((cls) => (
												<SelectItem key={cls} value={cls}>
													{cls}
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
										<TableHead className="w-12">
											<Checkbox id="select-all" />
										</TableHead>
										<TableHead>Teacher</TableHead>
										<TableHead>Subject</TableHead>
										<TableHead>Class</TableHead>
										<TableHead>Topic</TableHead>
										<TableHead>Timeline</TableHead>
										<TableHead className="text-center">Files</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredPlans
										.filter((plan) => plan.status === 'pending')
										.map((plan) => (
											<TableRow key={plan.id}>
												<TableCell>
													<Checkbox id={`select-${plan.id}`} />
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="h-8 w-8">
															<AvatarFallback>
																{plan.teacher
																	.split(' ')
																	.map((n) => n[0])
																	.join('')}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-medium text-sm">
																{plan.teacher}
															</p>
															<p className="text-xs text-muted-foreground">
																{plan.teacherId}
															</p>
														</div>
													</div>
												</TableCell>
												<TableCell>{plan.subject}</TableCell>
												<TableCell>{plan.class}</TableCell>
												<TableCell>
													<div className="max-w-[200px]">
														<p className="font-medium truncate">{plan.topic}</p>
														<p className="text-xs text-muted-foreground">
															{plan.id}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-col text-sm">
														<div className="flex items-center gap-1">
															<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
															<span>
																{plan.startDate} to {plan.endDate}
															</span>
														</div>
														<div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
															<Clock className="h-3 w-3" />
															<span>Submitted {plan.lastModified}</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-center">
													{plan.hasAttachments ? (
														<Badge
															variant="outline"
															className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer"
														>
															<FileText className="h-3.5 w-3.5 mr-1" />
															View Files
														</Badge>
													) : (
														<span className="text-xs text-muted-foreground">
															No files
														</span>
													)}
												</TableCell>
												<TableCell className="text-center">
													<Badge
														variant={
															plan.status === 'approved'
																? 'outline'
																: plan.status === 'rejected'
																? 'destructive'
																: 'secondary'
														}
														className={
															plan.status === 'approved'
																? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
																: ''
														}
													>
														{plan.status === 'approved' && 'Approved'}
														{plan.status === 'pending' && 'Pending'}
														{plan.status === 'rejected' && 'Needs Revision'}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-2">
														<Button
															variant="outline"
															size="sm"
															className="h-8"
															onClick={() => {
																setSelectedPlan(plan.id);
																setViewLessonPlan(true);
															}}
														>
															<Eye className="h-3.5 w-3.5 mr-1" />
															View
														</Button>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0"
																>
																	<span className="sr-only">Open menu</span>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuLabel>Actions</DropdownMenuLabel>
																<DropdownMenuItem>
																	View Complete Plan
																</DropdownMenuItem>
																<DropdownMenuItem>
																	Download Materials
																</DropdownMenuItem>
																<DropdownMenuItem>
																	Teacher Profile
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem className="text-green-600">
																	Approve Plan
																</DropdownMenuItem>
																<DropdownMenuItem className="text-amber-600">
																	Request Revision
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</TableCell>
											</TableRow>
										))}
									{filteredPlans.filter((plan) => plan.status === 'pending')
										.length === 0 && (
										<TableRow>
											<TableCell colSpan={9} className="h-24 text-center">
												No pending lesson plans found matching your criteria
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
						<CardFooter className="flex justify-between pt-2">
							<div className="text-sm text-muted-foreground">
								Showing{' '}
								<strong>
									{
										filteredPlans.filter((plan) => plan.status === 'pending')
											.length
									}
								</strong>{' '}
								of{' '}
								<strong>
									{
										LESSON_PLANS.filter((plan) => plan.status === 'pending')
											.length
									}
								</strong>{' '}
								pending plans
							</div>
							<Button variant="outline" size="sm">
								<CheckSquare className="h-4 w-4 mr-2" />
								Bulk Actions
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>

				<TabsContent value="approved" className="space-y-6">
					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold">Approved Lesson Plans</h3>
							<p className="text-muted-foreground">
								Lesson plans that have been reviewed and approved
							</p>
							{/* Similar table structure as above, filtered for approved plans */}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="rejected" className="space-y-6">
					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold">
								Lesson Plans Needing Revision
							</h3>
							<p className="text-muted-foreground">
								Lesson plans that require changes before approval
							</p>
							{/* Similar table structure as above, filtered for rejected plans */}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="all" className="space-y-6">
					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold">All Lesson Plans</h3>
							<p className="text-muted-foreground">
								Complete history of all submitted lesson plans
							</p>
							{/* Similar table structure as above, showing all plans */}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Lesson Plan Details Dialog */}
			<Dialog open={viewLessonPlan} onOpenChange={setViewLessonPlan}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>Lesson Plan Details</DialogTitle>
						<DialogDescription>
							{selectedPlan && (
								<div className="flex flex-wrap gap-2 mt-2">
									<Badge variant="outline">
										{LESSON_PLANS.find((p) => p.id === selectedPlan)?.subject}
									</Badge>
									<Badge variant="outline">
										{LESSON_PLANS.find((p) => p.id === selectedPlan)?.class}
									</Badge>
									<Badge variant="outline">
										Duration:{' '}
										{LESSON_PLANS.find((p) => p.id === selectedPlan)?.duration}
									</Badge>
								</div>
							)}
						</DialogDescription>
					</DialogHeader>

					{selectedPlan && (
						<div className="space-y-6">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle>
										{LESSON_PLANS.find((p) => p.id === selectedPlan)?.topic}
									</CardTitle>
									<CardDescription>
										By{' '}
										{LESSON_PLANS.find((p) => p.id === selectedPlan)?.teacher} •
										Submitted{' '}
										{
											LESSON_PLANS.find((p) => p.id === selectedPlan)
												?.submittedOn
										}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div>
											<h4 className="text-sm font-semibold mb-2">
												Learning Objectives
											</h4>
											<ul className="list-disc pl-5 space-y-1">
												{LESSON_PLANS.find(
													(p) => p.id === selectedPlan
												)?.objectives.map((objective, idx) => (
													<li key={idx} className="text-sm">
														{objective}
													</li>
												))}
											</ul>
										</div>

										<div>
											<h4 className="text-sm font-semibold mb-2">Timeline</h4>
											<div className="flex items-center gap-2 text-sm">
												<Calendar className="h-4 w-4 text-muted-foreground" />
												<span>
													{
														LESSON_PLANS.find((p) => p.id === selectedPlan)
															?.startDate
													}
												</span>
												<span>to</span>
												<span>
													{
														LESSON_PLANS.find((p) => p.id === selectedPlan)
															?.endDate
													}
												</span>
												<Badge variant="outline">
													{
														LESSON_PLANS.find((p) => p.id === selectedPlan)
															?.duration
													}
												</Badge>
											</div>
										</div>

										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-2">
												Teaching Methods & Resources
											</h4>
											<div className="text-sm">
												<p>
													The lesson plan uses a combination of lecture, group
													activities, and practical exercises to engage
													students.
												</p>
												<p className="mt-2">
													Required resources include textbooks, handouts, and
													multimedia presentations.
												</p>
											</div>
										</div>

										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-2">
												Assessment Strategy
											</h4>
											<div className="text-sm">
												<p>
													Students will be assessed through quizzes, class
													participation, and a final project.
												</p>
												<p className="mt-2">
													Formative assessments will be conducted throughout the
													unit to monitor understanding.
												</p>
											</div>
										</div>

										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-2">
												Additional Notes
											</h4>
											<div className="text-sm">
												<p>
													Special accommodations will be made for students with
													learning differences.
												</p>
												<p className="mt-2">
													Extension activities are planned for advanced students
													who complete work early.
												</p>
											</div>
										</div>

										<div className="border-t pt-4">
											<h4 className="text-sm font-semibold mb-2">
												Attachments
											</h4>
											{LESSON_PLANS.find((p) => p.id === selectedPlan)
												?.hasAttachments ? (
												<div className="flex flex-col gap-2">
													<div className="flex items-center justify-between p-2 border rounded-md">
														<div className="flex items-center gap-2">
															<FileText className="h-4 w-4 text-blue-600" />
															<span className="text-sm">
																Lesson_Plan_Detailed.pdf
															</span>
														</div>
														<Button variant="outline" size="sm">
															Download
														</Button>
													</div>
													<div className="flex items-center justify-between p-2 border rounded-md">
														<div className="flex items-center gap-2">
															<FileText className="h-4 w-4 text-blue-600" />
															<span className="text-sm">
																Worksheets_and_Activities.pdf
															</span>
														</div>
														<Button variant="outline" size="sm">
															Download
														</Button>
													</div>
													<div className="flex items-center justify-between p-2 border rounded-md">
														<div className="flex items-center gap-2">
															<FileText className="h-4 w-4 text-blue-600" />
															<span className="text-sm">
																Assessment_Rubrics.pdf
															</span>
														</div>
														<Button variant="outline" size="sm">
															Download
														</Button>
													</div>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No attachments provided
												</p>
											)}
										</div>
									</div>
								</CardContent>
							</Card>

							<div className="space-y-4">
								<div>
									<h4 className="text-sm font-semibold mb-2">Your Feedback</h4>
									<Textarea
										placeholder="Provide feedback on this lesson plan..."
										className="min-h-24"
									/>
								</div>
							</div>
						</div>
					)}

					<DialogFooter className="gap-2 sm:justify-between sm:gap-0">
						<Button variant="outline" className="w-full sm:w-auto">
							<MessageSquare className="mr-2 h-4 w-4" />
							Request Revisions
						</Button>
						<div className="flex gap-2 w-full sm:w-auto">
							<Button variant="destructive" className="flex-1 sm:flex-initial">
								<XCircle className="mr-2 h-4 w-4" />
								Reject
							</Button>
							<Button className="flex-1 sm:flex-initial">
								<ThumbsUp className="mr-2 h-4 w-4" />
								Approve
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
