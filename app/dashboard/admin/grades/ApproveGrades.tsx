'use client';

import React, { useState, useMemo } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	MoreHorizontal,
	Search,
	Filter,
	Download,
	FileText,
	Calendar,
	Users,
	BookOpen,
	CheckCircle,
	AlertCircle,
	Clock,
	Eye,
	Edit,
	Share,
	Printer,
} from 'lucide-react';

interface GradeSheet {
	id: string;
	className: string;
	level: string;
	term: string;
	year: string;
	subject: string;
	teacher: string;
	studentsCount: number;
	submittedCount: number;
	status: 'pending' | 'partial' | 'completed' | 'approved' | 'rejected';
	submissionDate?: string;
	approvalDate?: string;
	approver?: string;
	lastModified: string;
}

const GRADE_SHEETS: GradeSheet[] = [
	{
		id: 'GS001',
		className: 'Grade 12A',
		level: 'Senior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Mathematics',
		teacher: 'Samuel Johnson',
		studentsCount: 28,
		submittedCount: 28,
		status: 'approved',
		submissionDate: '2024-11-15',
		approvalDate: '2024-11-20',
		approver: 'Jessica Martinez',
		lastModified: '2024-11-20',
	},
	{
		id: 'GS002',
		className: 'Grade 11B',
		level: 'Senior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'English',
		teacher: 'Grace Wesseh',
		studentsCount: 25,
		submittedCount: 25,
		status: 'completed',
		submissionDate: '2024-11-18',
		lastModified: '2024-11-18',
	},
	{
		id: 'GS003',
		className: 'Grade 10A',
		level: 'Senior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Biology',
		teacher: 'Timothy Kollie',
		studentsCount: 30,
		submittedCount: 22,
		status: 'partial',
		lastModified: '2024-11-19',
	},
	{
		id: 'GS004',
		className: 'Grade 9A',
		level: 'Junior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Science',
		teacher: 'Mark Dolo',
		studentsCount: 32,
		submittedCount: 0,
		status: 'pending',
		lastModified: '2024-11-10',
	},
	{
		id: 'GS005',
		className: 'Grade 8B',
		level: 'Junior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Mathematics',
		teacher: 'Rachel Gbassay',
		studentsCount: 26,
		submittedCount: 26,
		status: 'rejected',
		submissionDate: '2024-11-12',
		lastModified: '2024-11-16',
	},
	{
		id: 'GS006',
		className: 'Grade 7A',
		level: 'Junior High',
		term: 'First Term',
		year: '2024/2025',
		subject: 'History',
		teacher: 'Linda Brooks',
		studentsCount: 29,
		submittedCount: 15,
		status: 'partial',
		lastModified: '2024-11-17',
	},
	{
		id: 'GS007',
		className: 'Grade 6A',
		level: 'Elementary',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Christian Education',
		teacher: 'Gloria Nyepan',
		studentsCount: 24,
		submittedCount: 24,
		status: 'approved',
		submissionDate: '2024-11-14',
		approvalDate: '2024-11-19',
		approver: 'Jessica Martinez',
		lastModified: '2024-11-19',
	},
	{
		id: 'GS008',
		className: 'Grade 4A',
		level: 'Elementary',
		term: 'First Term',
		year: '2024/2025',
		subject: 'Computer',
		teacher: 'Amos Senkao',
		studentsCount: 22,
		submittedCount: 0,
		status: 'pending',
		lastModified: '2024-11-08',
	},
];

function getStatusBadge(status: string) {
	switch (status) {
		case 'approved':
			return (
				<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
					<CheckCircle className="mr-1 h-3 w-3" /> Approved
				</Badge>
			);
		case 'completed':
			return (
				<Badge variant="default">
					<CheckCircle className="mr-1 h-3 w-3" /> Completed
				</Badge>
			);
		case 'partial':
			return (
				<Badge variant="secondary">
					<Clock className="mr-1 h-3 w-3" /> Partial
				</Badge>
			);
		case 'rejected':
			return (
				<Badge variant="destructive">
					<AlertCircle className="mr-1 h-3 w-3" /> Rejected
				</Badge>
			);
		default:
			return (
				<Badge variant="outline">
					<Clock className="mr-1 h-3 w-3" /> Pending
				</Badge>
			);
	}
}

function getCompletionPercentage(submitted: number, total: number): number {
	return total === 0 ? 0 : Math.round((submitted / total) * 100);
}

export default function MasterGradeSheets() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLevel, setSelectedLevel] = useState<string>('All');
	const [selectedTerm, setSelectedTerm] = useState<string>('All');
	const [statusFilter, setStatusFilter] = useState<string>('All');
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [rowsPerPage, setRowsPerPage] = useState<number>(10);

	const levels = useMemo(() => {
		const uniqueLevels = Array.from(new Set(GRADE_SHEETS.map((s) => s.level)));
		return ['All', ...uniqueLevels];
	}, []);

	const terms = useMemo(() => {
		const uniqueTerms = Array.from(new Set(GRADE_SHEETS.map((s) => s.term)));
		return ['All', ...uniqueTerms];
	}, []);

	const filteredSheets = useMemo(() => {
		return GRADE_SHEETS.filter((sheet) => {
			const matchesSearch =
				sheet.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
				sheet.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
				sheet.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
				sheet.id.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesLevel =
				selectedLevel === 'All' || sheet.level === selectedLevel;
			const matchesTerm = selectedTerm === 'All' || sheet.term === selectedTerm;
			const matchesStatus =
				statusFilter === 'All' || sheet.status === statusFilter;

			return matchesSearch && matchesLevel && matchesTerm && matchesStatus;
		});
	}, [searchQuery, selectedLevel, selectedTerm, statusFilter]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredSheets.length / rowsPerPage)
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredSheets.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage
	);

	const stats = useMemo(() => {
		const total = GRADE_SHEETS.length;
		const approved = GRADE_SHEETS.filter((s) => s.status === 'approved').length;
		const completed = GRADE_SHEETS.filter(
			(s) => s.status === 'completed'
		).length;
		const pending = GRADE_SHEETS.filter((s) => s.status === 'pending').length;
		const partial = GRADE_SHEETS.filter((s) => s.status === 'partial').length;
		const rejected = GRADE_SHEETS.filter((s) => s.status === 'rejected').length;
		return { total, approved, completed, pending, partial, rejected };
	}, []);

	const resetPage = () => setCurrentPage(1);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Master Grade Sheets
					</h1>
					<p className="text-muted-foreground">
						Manage and review grade submissions across all classes
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline">
						<Download className="mr-2 h-4 w-4" /> Export All
					</Button>
					<Button>
						<FileText className="mr-2 h-4 w-4" /> Generate Report
					</Button>
				</div>
			</div>

			{/* Table Filters */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Grade Sheets Overview</CardTitle>
					<CardDescription>
						Track and manage grade submissions across all classes and subjects
					</CardDescription>
					<div className="flex flex-col sm:flex-row gap-4 pt-4 items-start sm:items-center justify-between">
						<div className="relative w-full max-w-sm">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by class, subject, or teacher..."
								className="pl-8 w-full"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									resetPage();
								}}
							/>
						</div>

						<div className="flex flex-wrap gap-4 items-center">
							{/* Rows */}
							<div className="flex items-center space-x-2">
								<span className="text-sm">Rows:</span>
								<Select
									value={rowsPerPage.toString()}
									onValueChange={(val) => {
										setRowsPerPage(Number(val));
										resetPage();
									}}
								>
									<SelectTrigger className="w-[80px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="25">25</SelectItem>
										<SelectItem value="50">50</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Level */}
							<Select
								value={selectedLevel}
								onValueChange={(val) => {
									setSelectedLevel(val);
									resetPage();
								}}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Level" />
								</SelectTrigger>
								<SelectContent>
									{levels.map((level) => (
										<SelectItem key={level} value={level}>
											{level === 'All' ? 'All Levels' : level}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Term */}
							<Select
								value={selectedTerm}
								onValueChange={(val) => {
									setSelectedTerm(val);
									resetPage();
								}}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Term" />
								</SelectTrigger>
								<SelectContent>
									{terms.map((term) => (
										<SelectItem key={term} value={term}>
											{term === 'All' ? 'All Terms' : term}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Status */}
							<Select
								value={statusFilter}
								onValueChange={(val) => {
									setStatusFilter(val);
									resetPage();
								}}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="All">All Status</SelectItem>
									<SelectItem value="approved">Approved</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="partial">Partial</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
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
								<TableHead>Subject</TableHead>
								<TableHead>Teacher</TableHead>
								<TableHead>Students</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Last Modified</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{currentSlice.map((sheet) => (
								<TableRow key={sheet.id}>
									<TableCell>{sheet.className}</TableCell>
									<TableCell>{sheet.subject}</TableCell>
									<TableCell>{sheet.teacher}</TableCell>
									<TableCell>
										{sheet.submittedCount}/{sheet.studentsCount} (
										{getCompletionPercentage(
											sheet.submittedCount,
											sheet.studentsCount
										)}
										%)
									</TableCell>
									<TableCell>{getStatusBadge(sheet.status)}</TableCell>
									<TableCell>
										<p className="text-sm">{sheet.lastModified}</p>
										{sheet.submissionDate && (
											<p className="text-xs text-muted-foreground">
												Submitted: {sheet.submissionDate}
											</p>
										)}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" className="h-8 w-8 p-0">
													<span className="sr-only">Open menu</span>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem>
													<Eye className="mr-2 h-4 w-4" />
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Edit className="mr-2 h-4 w-4" />
													Edit Grades
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem>
													<Download className="mr-2 h-4 w-4" />
													Export Sheet
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Printer className="mr-2 h-4 w-4" />
													Print Sheet
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Share className="mr-2 h-4 w-4" />
													Share with Parents
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												{sheet.status === 'completed' && (
													<DropdownMenuItem className="text-green-600">
														<CheckCircle className="mr-2 h-4 w-4" />
														Approve Sheet
													</DropdownMenuItem>
												)}
												{(sheet.status === 'completed' ||
													sheet.status === 'approved') && (
													<DropdownMenuItem className="text-red-600">
														<AlertCircle className="mr-2 h-4 w-4" />
														Reject Sheet
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
							{currentSlice.length === 0 && (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										No grade sheets found matching your filters.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					{/* Pagination */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
						<div className="text-sm text-muted-foreground">
							Showing <strong>{(currentPageSafe - 1) * rowsPerPage + 1}</strong>
							–
							<strong>
								{Math.min(currentPageSafe * rowsPerPage, filteredSheets.length)}
							</strong>{' '}
							of <strong>{filteredSheets.length}</strong> grade sheets
						</div>

						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
								disabled={currentPageSafe === 1}
							>
								Previous
							</Button>
							<div className="text-sm">
								Page {currentPageSafe} of {totalPages}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setCurrentPage((p) => Math.min(p + 1, totalPages))
								}
								disabled={currentPageSafe === totalPages}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
