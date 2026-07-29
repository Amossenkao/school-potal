'use client';

import { useEffect, useState, useCallback } from 'react';
import useAuth from '@/store/useAuth';

export default function ScholarshipsPage() {
	const { user } = useAuth();

	const [students, setStudents] = useState<any[]>([]);
	const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
	const [search, setSearch] = useState('');
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [scholarships, setScholarships] = useState<string[]>([]);
	const [wardTeacherId, setWardTeacherId] = useState('');
	const [newScholarship, setNewScholarship] = useState('');
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const loadStudents = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/students');
			const json = await res.json();
			if (json.success) {
				setStudents(json.data);
				setFilteredStudents(json.data);
			}
		} catch {
			setMessage({ type: 'error', text: 'Failed to load students.' });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadStudents();
	}, [loadStudents]);

	useEffect(() => {
		if (!search) {
			setFilteredStudents(students);
			return;
		}
		const q = search.toLowerCase();
		setFilteredStudents(
			students.filter(
				(s) =>
					`${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
					s.studentId.toLowerCase().includes(q),
			),
		);
	}, [search, students]);

	const handleSelectStudent = (student: any) => {
		setSelectedStudent(student);
		setScholarships(student.scholarships || []);
		setWardTeacherId(student.wardTeacherId || '');
		setMessage(null);
	};

	const handleAddScholarship = () => {
		const name = newScholarship.trim();
		if (!name || scholarships.includes(name)) return;
		setScholarships((prev) => [...prev, name]);
		setNewScholarship('');
	};

	const handleRemoveScholarship = (name: string) => {
		setScholarships((prev) => prev.filter((s) => s !== name));
	};

	const handleSave = async () => {
		if (!selectedStudent) return;
		setSaving(true);
		setMessage(null);
		try {
			const res = await fetch('/api/students', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId: selectedStudent.studentId,
					scholarships,
					wardTeacherId,
				}),
			});
			const json = await res.json();
			if (json.success) {
				setMessage({ type: 'success', text: 'Saved successfully.' });
				setStudents((prev) =>
					prev.map((s) =>
						s.studentId === selectedStudent.studentId
							? { ...s, scholarships, wardTeacherId }
							: s,
					),
				);
				setSelectedStudent((prev: any) => ({ ...prev, scholarships, wardTeacherId }));
			} else {
				setMessage({ type: 'error', text: json.message });
			}
		} catch {
			setMessage({ type: 'error', text: 'Failed to save.' });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-black tracking-tight">Scholarships & Ward Assignment</h1>
				<p className="text-sm text-muted-foreground">
					Manage student scholarships and assign ward teachers.
				</p>
			</div>

			{message && (
				<div
					className={`rounded-xl border p-4 text-sm font-bold ${
						message.type === 'success'
							? 'border-green-200 bg-green-50 text-green-800'
							: 'border-red-200 bg-red-50 text-red-800'
					}`}
				>
					{message.text}
				</div>
			)}

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-4">
					<div>
						<label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
							Search Students
						</label>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Name or ID..."
							className="w-full rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
						/>
					</div>

					<div className="max-h-[60vh] divide-y-2 overflow-y-auto rounded-2xl border-2">
						{loading ? (
							<p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>
						) : filteredStudents.length === 0 ? (
							<p className="p-4 text-center text-sm text-muted-foreground">No students found.</p>
						) : (
							filteredStudents.map((s) => (
								<button
									key={s.studentId}
									onClick={() => handleSelectStudent(s)}
									className={`flex w-full items-center justify-between p-4 text-left transition-all hover:bg-slate-50 ${
										selectedStudent?.studentId === s.studentId ? 'bg-blue-50' : ''
									}`}
								>
									<div>
										<p className="font-bold">{s.firstName} {s.lastName}</p>
										<p className="text-xs text-muted-foreground">{s.studentId} &middot; {s.className}</p>
									</div>
									<div className="text-right text-xs">
										{s.scholarships?.length > 0 && (
											<p className="text-green-600">{s.scholarships.length} scholarship(s)</p>
										)}
										{s.wardTeacherId && <p className="text-blue-600">Has Ward Teacher</p>}
									</div>
								</button>
							))
						)}
					</div>
				</div>

				{selectedStudent && (
					<div className="space-y-6">
						<div className="rounded-2xl border-2 bg-slate-50 p-4">
							<h2 className="text-lg font-black">
								{selectedStudent.firstName} {selectedStudent.lastName}
							</h2>
							<p className="text-sm text-muted-foreground">
								{selectedStudent.studentId} &middot; {selectedStudent.className}
							</p>
						</div>

						<div className="rounded-2xl border-2 p-4">
							<h3 className="mb-4 font-black">Scholarships</h3>

							<div className="mb-4 flex gap-2">
								<input
									type="text"
									value={newScholarship}
									onChange={(e) => setNewScholarship(e.target.value)}
									placeholder="Scholarship name..."
									className="flex-1 rounded-xl border-2 p-2 font-bold outline-none focus:border-blue-600"
									onKeyDown={(e) => e.key === 'Enter' && handleAddScholarship()}
								/>
								<button
									onClick={handleAddScholarship}
									className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
								>
									Add
								</button>
							</div>

							<div className="flex flex-wrap gap-2">
								{scholarships.length === 0 ? (
									<p className="text-sm text-muted-foreground">No scholarships assigned.</p>
								) : (
									scholarships.map((name) => (
										<span
											key={name}
											className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800"
										>
											{name}
											<button
												onClick={() => handleRemoveScholarship(name)}
												className="text-green-600 hover:text-green-900"
											>
												&times;
											</button>
										</span>
									))
								)}
							</div>
						</div>

						<div className="rounded-2xl border-2 p-4">
							<h3 className="mb-4 font-black">Ward Teacher</h3>
							<input
								type="text"
								value={wardTeacherId}
								onChange={(e) => setWardTeacherId(e.target.value)}
								placeholder="Teacher ID or username..."
								className="w-full rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								Assign a teacher as the ward/sponsor for this student.
							</p>
						</div>

						<button
							onClick={handleSave}
							disabled={saving}
							className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
