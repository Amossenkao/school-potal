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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	Search,
	Plus,
	MoreHorizontal,
	UserPlus,
	Users,
	BookOpen,
	Calendar,
	Clock,
	Save,
	Filter,
	FileEdit,
	UserMinus,
} from 'lucide-react';

// Mock class data
const CLASSES_DATA = [
	{
		id: 'CLS001',
		name: 'Grade 10A',
		classTeacher: 'Dr. Robert Johnson',
		teacherId: 'TCH001',
		studentsCount: 28,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Science', teacher: 'Dr. James Miller' },
			{ name: 'History', teacher: 'Prof. Emily Davis' },
			{ name: 'Computer Science', teacher: 'Dr. Michael Brown' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 101',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS002',
		name: 'Grade 10B',
		classTeacher: 'Prof. Emily Davis',
		teacherId: 'TCH004',
		studentsCount: 26,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Science', teacher: 'Dr. James Miller' },
			{ name: 'History', teacher: 'Prof. Emily Davis' },
			{ name: 'Art', teacher: 'Prof. Jennifer Smith' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 102',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS003',
		name: 'Grade 9A',
		classTeacher: 'Prof. Sarah Williams',
		teacherId: 'TCH002',
		studentsCount: 30,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Science', teacher: 'Dr. James Miller' },
			{ name: 'Geography', teacher: 'Prof. Emily Davis' },
			{ name: 'Music', teacher: 'Prof. Jennifer Smith' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 103',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS004',
		name: 'Grade 11A',
		classTeacher: 'Dr. James Miller',
		teacherId: 'TCH003',
		studentsCount: 25,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Physics', teacher: 'Dr. James Miller' },
			{ name: 'Chemistry', teacher: 'Dr. James Miller' },
			{ name: 'Biology', teacher: 'Dr. Michael Brown' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 201',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS005',
		name: 'Grade 11B',
		classTeacher: 'Dr. Michael Brown',
		teacherId: 'TCH005',
		studentsCount: 24,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Physics', teacher: 'Dr. James Miller' },
			{ name: 'Chemistry', teacher: 'Dr. James Miller' },
			{ name: 'Computer Science', teacher: 'Dr. Michael Brown' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 202',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS006',
		name: 'Grade 12A',
		classTeacher: 'Prof. Jennifer Smith',
		teacherId: 'TCH006',
		studentsCount: 22,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Physics', teacher: 'Dr. James Miller' },
			{ name: 'Economics', teacher: 'Dr. David Wilson' },
			{ name: 'Art', teacher: 'Prof. Jennifer Smith' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 203',
		createdOn: '2023-05-15',
	},
	{
		id: 'CLS007',
		name: 'Grade 9B',
		classTeacher: 'Dr. David Wilson',
		teacherId: 'TCH007',
		studentsCount: 29,
		subjects: [
			{ name: 'Mathematics', teacher: 'Dr. Robert Johnson' },
			{ name: 'English', teacher: 'Prof. Sarah Williams' },
			{ name: 'Science', teacher: 'Dr. James Miller' },
			{ name: 'History', teacher: 'Prof. Emily Davis' },
			{ name: 'Physical Education', teacher: 'Dr. David Wilson' },
		],
		schedule: 'Monday - Friday, 8:00 AM - 2:30 PM',
		room: 'Room 104',
		createdOn: '2023-05-15',
	},
];

// Mock student data for class detail view
const MOCK_STUDENTS = [
	{ id: 'STD001', name: 'John Doe', gender: 'Male', joinDate: '2023-01-15' },
	{
		id: 'STD002',
		name: 'Jane Smith',
		gender: 'Female',
		joinDate: '2023-01-15',
	},
	{
		id: 'STD003',
		name: 'Michael Johnson',
		gender: 'Male',
		joinDate: '2023-01-15',
	},
	{
		id: 'STD004',
		name: 'Emily Brown',
		gender: 'Female',
		joinDate: '2023-01-15',
	},
	{
		id: 'STD005',
		name: 'David Wilson',
		gender: 'Male',
		joinDate: '2023-01-15',
	},
	{
		id: 'STD006',
		name: 'Sophia Martinez',
		gender: 'Female',
		joinDate: '2023-02-01',
	},
	{
		id: 'STD007',
		name: 'Ethan Taylor',
		gender: 'Male',
		joinDate: '2023-02-01',
	},
	{
		id: 'STD008',
		name: 'Olivia Anderson',
		gender: 'Female',
		joinDate: '2023-02-01',
	},
];

// Mock teacher data for dropdown
const TEACHERS = [
	{ id: 'TCH001', name: 'Dr. Robert Johnson', subject: 'Mathematics' },
	{ id: 'TCH002', name: 'Prof. Sarah Williams', subject: 'English' },
	{ id: 'TCH003', name: 'Dr. James Miller', subject: 'Science' },
	{ id: 'TCH004', name: 'Prof. Emily Davis', subject: 'History' },
	{ id: 'TCH005', name: 'Dr. Michael Brown', subject: 'Computer Science' },
	{ id: 'TCH006', name: 'Prof. Jennifer Smith', subject: 'Art' },
	{ id: 'TCH007', name: 'Dr. David Wilson', subject: 'Physical Education' },
];

// Mock subjects
const SUBJECTS = [
	'Mathematics',
	'English',
	'Science',
	'History',
	'Computer Science',
	'Physics',
	'Chemistry',
	'Biology',
	'Geography',
	'Economics',
	'Art',
	'Music',
	'Physical Education',
];

export default function ManageClasses() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
	const [viewClassDetails, setViewClassDetails] = useState(false);
	const [selectedClass, setSelectedClass] = useState<string | null>(null);
	const [editingClass, setEditingClass] = useState(false);
	const [newClassDialog, setNewClassDialog] = useState(false);

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

	// Get class by ID
	const getClassById = (id: string) => {
		return CLASSES_DATA.find((classData) => classData.id === id);
	};

	const currentClass = selectedClass ? getClassById(selectedClass) : null;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">Manage Classes</h1>
				<Button onClick={() => setNewClassDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create New Class
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Class Directory</CardTitle>
					<CardDescription>
						View, edit, and manage school classes
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

							<Button variant="outline">
								<Filter className="mr-2 h-4 w-4" />
								More Filters
							</Button>
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
								<TableHead>Room</TableHead>
								<TableHead>Schedule</TableHead>
								<TableHead className="text-center">Subjects</TableHead>
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
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback>
													{classData.classTeacher
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>
											<span className="text-sm">{classData.classTeacher}</span>
										</div>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline">
											<Users className="h-3.5 w-3.5 mr-1" />
											{classData.studentsCount}
										</Badge>
									</TableCell>
									<TableCell>{classData.room}</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<Clock className="h-3.5 w-3.5 text-muted-foreground" />
											<span className="truncate max-w-[150px]">
												{classData.schedule}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline">
											<BookOpen className="h-3.5 w-3.5 mr-1" />
											{classData.subjects.length}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												className="h-8"
												onClick={() => {
													setSelectedClass(classData.id);
													setViewClassDetails(true);
													setEditingClass(false);
												}}
											>
												Manage
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
													<DropdownMenuItem
														onClick={() => {
															setSelectedClass(classData.id);
															setViewClassDetails(true);
															setEditingClass(true);
														}}
													>
														<FileEdit className="h-4 w-4 mr-2" />
														Edit Class
													</DropdownMenuItem>
													<DropdownMenuItem>
														<Calendar className="h-4 w-4 mr-2" />
														View Schedule
													</DropdownMenuItem>
													<DropdownMenuItem>
														<BookOpen className="h-4 w-4 mr-2" />
														Subject Allocation
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem className="text-red-600">
														Delete Class
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</TableCell>
								</TableRow>
							))}
							{filteredClasses.length === 0 && (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										No classes found matching your criteria
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Class Details Dialog */}
			<Dialog open={viewClassDetails} onOpenChange={setViewClassDetails}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>
							{editingClass ? 'Edit Class' : 'Class Details'}
							{currentClass && !editingClass && (
								<Badge variant="outline" className="ml-2">
									{currentClass.name}
								</Badge>
							)}
						</DialogTitle>
						<DialogDescription>
							{editingClass
								? 'Modify class information, assign teachers, and manage students'
								: `Manage students and view details for ${currentClass?.name}`}
						</DialogDescription>
					</DialogHeader>

					{currentClass && (
						<Tabs defaultValue={editingClass ? 'details' : 'students'}>
							<TabsList className="mb-4">
								<TabsTrigger value="details">Class Details</TabsTrigger>
								<TabsTrigger value="students">Students</TabsTrigger>
								<TabsTrigger value="subjects">Subjects</TabsTrigger>
								<TabsTrigger value="schedule">Schedule</TabsTrigger>
							</TabsList>

							<TabsContent value="details" className="space-y-4">
								<div className="grid gap-4 py-2">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="className">Class Name</Label>
											<Input
												id="className"
												defaultValue={currentClass.name}
												readOnly={!editingClass}
												className={!editingClass ? 'bg-muted' : ''}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="room">Classroom</Label>
											<Input
												id="room"
												defaultValue={currentClass.room}
												readOnly={!editingClass}
												className={!editingClass ? 'bg-muted' : ''}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="classTeacher">Class Teacher</Label>
										{editingClass ? (
											<Select defaultValue={currentClass.teacherId}>
												<SelectTrigger id="classTeacher">
													<SelectValue placeholder="Select class teacher" />
												</SelectTrigger>
												<SelectContent>
													{TEACHERS.map((teacher) => (
														<SelectItem key={teacher.id} value={teacher.id}>
															{teacher.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<Input
												id="classTeacher"
												value={currentClass.classTeacher}
												readOnly
												className="bg-muted"
											/>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="schedule">Schedule</Label>
										<Input
											id="schedule"
											defaultValue={currentClass.schedule}
											readOnly={!editingClass}
											className={!editingClass ? 'bg-muted' : ''}
										/>
									</div>
								</div>

								{editingClass && (
									<div className="flex justify-end">
										<Button>
											<Save className="h-4 w-4 mr-2" />
											Save Changes
										</Button>
									</div>
								)}
							</TabsContent>

							<TabsContent value="students">
								<div className="space-y-4">
									<div className="flex justify-between items-center">
										<h4 className="text-sm font-medium">
											Students in {currentClass.name}
										</h4>
										<Button size="sm">
											<UserPlus className="h-4 w-4 mr-2" />
											Add Student
										</Button>
									</div>

									<div className="border rounded-md">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>ID</TableHead>
													<TableHead>Name</TableHead>
													<TableHead>Gender</TableHead>
													<TableHead>Join Date</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{MOCK_STUDENTS.map((student) => (
													<TableRow key={student.id}>
														<TableCell className="font-medium">
															{student.id}
														</TableCell>
														<TableCell>{student.name}</TableCell>
														<TableCell>{student.gender}</TableCell>
														<TableCell>{student.joinDate}</TableCell>
														<TableCell className="text-right">
															<Button
																variant="ghost"
																size="sm"
																className="h-8 w-8 p-0 text-red-600"
															>
																<span className="sr-only">Remove student</span>
																<UserMinus className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="subjects">
								<div className="space-y-4">
									<div className="flex justify-between items-center">
										<h4 className="text-sm font-medium">
											Subjects Taught in {currentClass.name}
										</h4>
										{editingClass && (
											<Button size="sm">
												<Plus className="h-4 w-4 mr-2" />
												Add Subject
											</Button>
										)}
									</div>

									<div className="border rounded-md">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Subject</TableHead>
													<TableHead>Teacher</TableHead>
													{editingClass && (
														<TableHead className="text-right">
															Actions
														</TableHead>
													)}
												</TableRow>
											</TableHeader>
											<TableBody>
												{currentClass.subjects.map((subject, idx) => (
													<TableRow key={idx}>
														<TableCell className="font-medium">
															{subject.name}
														</TableCell>
														<TableCell>
															{editingClass ? (
																<Select
																	defaultValue={
																		TEACHERS.find(
																			(t) => t.name === subject.teacher
																		)?.id
																	}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue placeholder="Select teacher" />
																	</SelectTrigger>
																	<SelectContent>
																		{TEACHERS.map((teacher) => (
																			<SelectItem
																				key={teacher.id}
																				value={teacher.id}
																			>
																				{teacher.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															) : (
																subject.teacher
															)}
														</TableCell>
														{editingClass && (
															<TableCell className="text-right">
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0 text-red-600"
																>
																	<span className="sr-only">
																		Remove subject
																	</span>
																	<UserMinus className="h-4 w-4" />
																</Button>
															</TableCell>
														)}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>

									{editingClass && (
										<div className="flex justify-end">
											<Button>
												<Save className="h-4 w-4 mr-2" />
												Save Changes
											</Button>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="schedule">
								<div className="space-y-4">
									<h4 className="text-sm font-medium">Class Schedule</h4>
									<div className="border rounded-md p-4">
										<p className="text-center text-muted-foreground">
											Schedule details will be displayed here
										</p>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					)}
				</DialogContent>
			</Dialog>

			{/* Create New Class Dialog */}
			<Dialog open={newClassDialog} onOpenChange={setNewClassDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Class</DialogTitle>
						<DialogDescription>
							Add a new class to the school system
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="gradeLevel">Grade Level</Label>
								<Select>
									<SelectTrigger id="gradeLevel">
										<SelectValue placeholder="Select grade" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="9">Grade 9</SelectItem>
										<SelectItem value="10">Grade 10</SelectItem>
										<SelectItem value="11">Grade 11</SelectItem>
										<SelectItem value="12">Grade 12</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="section">Section</Label>
								<Select>
									<SelectTrigger id="section">
										<SelectValue placeholder="Select section" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="A">A</SelectItem>
										<SelectItem value="B">B</SelectItem>
										<SelectItem value="C">C</SelectItem>
										<SelectItem value="D">D</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newClassTeacher">Class Teacher</Label>
							<Select>
								<SelectTrigger id="newClassTeacher">
									<SelectValue placeholder="Select class teacher" />
								</SelectTrigger>
								<SelectContent>
									{TEACHERS.map((teacher) => (
										<SelectItem key={teacher.id} value={teacher.id}>
											{teacher.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newClassRoom">Classroom</Label>
							<Input id="newClassRoom" placeholder="e.g., Room 101" />
						</div>

						<div className="space-y-2">
							<Label htmlFor="newClassSchedule">Schedule</Label>
							<Input
								id="newClassSchedule"
								placeholder="e.g., Monday - Friday, 8:00 AM - 2:30 PM"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="submit" onClick={() => setNewClassDialog(false)}>
							Create Class
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
