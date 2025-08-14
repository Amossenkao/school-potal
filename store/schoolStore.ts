import { create } from 'zustand';

type School = {
	id: string;
	name: string;
};

type SchoolStore = {
	school: School | null;
	setSchool: (school: School) => void;
};

export const useSchoolStore = create<SchoolStore>((set) => ({
	school: null,
	setSchool: (school) => set({ school }),
}));
