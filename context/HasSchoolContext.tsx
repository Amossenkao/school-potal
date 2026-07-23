'use client';

import { createContext, useContext } from 'react';

const HasSchoolContext = createContext<boolean>(false);

export const HasSchoolProvider = HasSchoolContext.Provider;

export function useHasSchool(): boolean {
	return useContext(HasSchoolContext);
}
