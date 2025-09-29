export function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;

	try {
		const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
		return match ? decodeURIComponent(match[2]) : null;
	} catch (error) {
		console.error('Error reading cookie:', name, error);
		return null;
	}
}

/**
 * Finds the next or previous class in the sequence given a class ID.
 *
 * @param {object} levelsData - The nested object containing all class levels.
 * @param {string} currentClassId - The ID of the current class.
 * @param {string} [direction='next'] - The direction to look for ('next' or 'previous').
 * @returns {object|null} The adjacent class object, or null if not found or at the beginning/end of the sequence.
 */
export function getAdjacentClass(
	levelsData,
	currentClassId,
	direction = 'next'
) {
	// First, we create a single, flat array of all classes in order.
	const allClasses = [];
	for (const session in levelsData) {
		for (const level in levelsData[session]) {
			if (levelsData[session][level].classes) {
				allClasses.push(...levelsData[session][level].classes);
			}
		}
	}

	// Find the index of the current class in our flattened array.
	const currentIndex = allClasses.findIndex(
		(cls) => cls.classId === currentClassId
	);

	// Return null if the class isn't found
	if (currentIndex === -1) {
		return null;
	}

	// Find the next class
	if (direction === 'next' && currentIndex < allClasses.length - 1) {
		return allClasses[currentIndex + 1];
	}

	// Find the previous class
	if (direction === 'previous' && currentIndex > 0) {
		return allClasses[currentIndex - 1];
	}

	// Otherwise, return null.
	return null;
}
