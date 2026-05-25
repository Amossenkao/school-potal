import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface Student {
  id: string;
  name: string;
  className: string;
}

interface StudentMultiSelectProps {
  students: Student[];
  selectedStudents: string[];
  onSelectionChange: (studentIds: string[]) => void;
  placeholder?: string;
  selectAllLabel?: string;
  clearAllLabel?: string;
  searchPlaceholder?: string;
}

export const StudentMultiSelect = React.memo(function StudentMultiSelect({
  students,
  selectedStudents,
  onSelectionChange,
  placeholder = 'Select Specific Students (Optional)',
  selectAllLabel = 'Select All',
  clearAllLabel = 'Clear All',
  searchPlaceholder = 'Search students...',
}: StudentMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [students, searchTerm],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStudentToggle = useCallback(
    (studentId: string) => {
      const newSelection = selectedStudents.includes(studentId)
        ? selectedStudents.filter((id) => id !== studentId)
        : [...selectedStudents, studentId];
      onSelectionChange(newSelection);
    },
    [selectedStudents, onSelectionChange],
  );

  const selectedStudentNames = useMemo(
    () =>
      students
        .filter((s) => selectedStudents.includes(s.id))
        .map((s) => s.name),
    [students, selectedStudents],
  );

  const handleSelectAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange(students.map((s) => s.id));
    },
    [students, onSelectionChange],
  );

  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange([]);
    },
    [onSelectionChange],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">
        {placeholder}
      </label>
      <div
        className="w-full border border-border px-3 py-2 rounded bg-background text-foreground cursor-pointer min-h-[42px] flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          {selectedStudents.length === 0 ? (
            <span className="text-muted-foreground">
              All students in class...
            </span>
          ) : selectedStudents.length <= 3 ? (
            <span>{selectedStudentNames.join(', ')}</span>
          ) : (
            <span>{selectedStudents.length} students selected</span>
          )}
        </div>
        <div className="ml-2">
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStudentToggle(student.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  readOnly
                  className="mr-2"
                />
                <span className="text-sm">{student.name}</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border bg-muted/50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                {selectAllLabel}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
              >
                {clearAllLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});