// modals/ConflictModal.tsx
import React from 'react';
import { AlertTriangle, User, BookOpen, Loader2 } from 'lucide-react';

const ConflictModal = ({
	isOpen,
	onClose,
	conflictState,
	onConfirm,
	isLoading,
	userName,
}) => {
	if (!isOpen || !conflictState) return null;

	const { conflicts, conflictSummary } = conflictState;
	const sponsorshipConflicts = conflicts.filter(
		(c) => c.type === 'sponsorship'
	);
	const subjectConflicts = conflicts.filter((c) => c.type === 'subject');

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl border border-border">
				<div className="p-6">
					<div className="flex">
						<div className="flex-shrink-0">
							<AlertTriangle className="h-8 w-8 text-amber-500" />
						</div>
						<div className="ml-4 flex-1">
							<h3 className="text-xl font-semibold text-foreground mb-2">
								Assignment Conflicts Detected
							</h3>
							<div className="text-sm text-muted-foreground mb-4">
								<p>
									The following assignments are already held by other teachers.
									Proceeding will reassign them to{' '}
									<span className="font-bold">{userName}</span>.
								</p>
							</div>

							<div className="max-h-[40vh] overflow-y-auto pr-2 space-y-4">
								{conflictSummary.sponsorshipConflicts > 0 && (
									<div>
										<h4 className="font-medium flex items-center mb-2 text-foreground">
											<User className="h-4 w-4 mr-2" />
											Class Sponsorship Conflicts (
											{conflictSummary.sponsorshipConflicts})
										</h4>
										<div className="space-y-2">
											{sponsorshipConflicts.map((conflict, i) => (
												<div
													key={i}
													className="bg-muted/50 p-3 rounded-lg text-xs"
												>
													<p className="font-semibold text-foreground">
														Class: {conflict.sponsorClass}
													</p>
													<p>
														Current Sponsor: {conflict.conflictingTeacher.name}{' '}
														({conflict.conflictingTeacher.teacherId})
													</p>
												</div>
											))}
										</div>
									</div>
								)}

								{conflictSummary.subjectConflicts > 0 && (
									<div>
										<h4 className="font-medium flex items-center mb-2 text-foreground">
											<BookOpen className="h-4 w-4 mr-2" />
											Subject Assignment Conflicts (
											{conflictSummary.subjectConflicts})
										</h4>
										<div className="space-y-2">
											{subjectConflicts.map((conflict, i) => (
												<div
													key={i}
													className="bg-muted/50 p-3 rounded-lg text-xs"
												>
													<p className="font-semibold text-foreground">
														{conflict.assignment.subject} -{' '}
														{conflict.assignment.level} (
														{conflict.assignment.session})
													</p>
													<p>
														Current Teacher: {conflict.conflictingTeacher.name}{' '}
														({conflict.conflictingTeacher.teacherId})
													</p>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							<div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-4">
								<h4 className="font-semibold text-amber-900 mb-1">
									⚠️ Warning
								</h4>
								<p className="text-sm text-amber-800">
									Confirming will remove these assignments from the current
									teachers and assign them to{' '}
									<span className="font-bold">{userName}</span>. This action
									cannot be undone.
								</p>
							</div>

							<div className="flex justify-end gap-4 mt-6">
								<button
									type="button"
									onClick={onClose}
									className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={onConfirm}
									disabled={isLoading}
									className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed font-medium flex items-center"
								>
									{isLoading && (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									)}
									{isLoading ? 'Processing...' : 'Confirm Reassignments'}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConflictModal;
