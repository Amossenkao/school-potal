// src/components/modals/FilterUsersModal.jsx
import React from 'react';
import { X, Filter } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

const FilterUsersModal = ({
	isOpen,
	onClose,
	statusFilter,
	setStatusFilter,
	gradeFilter,
	setGradeFilter,
	subjectFilter,
	setSubjectFilter,
	resetFilters,
	onApply,
}) => {
	const allSubjects = ['Mathematics', 'Science', 'English', 'History'];
	const allGrades = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-foreground">
						Filter Users
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Status
						</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="w-full p-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Grade (Students)
						</label>
						<select
							value={gradeFilter}
							onChange={(e) => setGradeFilter(e.target.value)}
							className="w-full p-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="all">All Grades</option>
							{allGrades.map((grade) => (
								<option key={grade} value={grade}>
									{grade}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Subject (Teachers)
						</label>
						<select
							value={subjectFilter}
							onChange={(e) => setSubjectFilter(e.target.value)}
							className="w-full p-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="all">All Subjects</option>
							{allSubjects.map((subject) => (
								<option key={subject} value={subject}>
									{subject}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="flex gap-3 mt-6">
					<button
						onClick={resetFilters}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
					>
						Reset
					</button>
					<button
						onClick={onApply}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
					>
						Apply Filters
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default FilterUsersModal;
