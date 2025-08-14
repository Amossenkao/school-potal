'use client';
import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

// Gender-aware config
const config = {
	seeds: {
		male: [
			'Kingston',
			'Caleb',
			'Alexander',
			'Felix',
			'Oscar',
			'Leo',
			'Milo',
			'Noah',
			'Ethan',
			'Lucas',
			'Jack',
			'Kai',
			'Riley',
			'Max',
			'Sky',
		],
		female: [
			'Sara',
			'Nova',
			'Juno',
			'Alice',
			'Luna',
			'Chloe',
			'Zoe',
			'Emma',
			'Lily',
			'Sophie',
			'Maya',
			'Chloe',
			'Lily',
			'Sophie',
			'Maya',
		],
		other: [
			'Sunny',
			'Taylor',
			'Sam',
			'Alex',
			'Casey',
			'Jordan',
			'Morgan',
			'Skyler',
			'Avery',
			'Riley',
			'Harper',
			'Jamie',
			'Rowan',
			'Emery',
			'Quinn',
		],
	},
	skinColors: ['694d3d', 'ae5d29'],
	clothingColors: [
		'8fa7df',
		'9ddadb',
		'78e185',
		'e279c7',
		'e78276',
		'fdea6b',
		'ffcf77',
	],
	backgroundColors: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
	faces: {
		male: [
			'angryWithFang',
			'awe',
			'blank',
			'calm',
			'cheeky',
			'concerned',
			'concernedFear',
			'contempt',
			'cute',
			'cyclops',
			'driven',
			'eatingHappy',
			'explaining',
			'eyesClosed',
			'fear',
			'hectic',
			'lovingGrin1',
			'lovingGrin2',
			'monster',
			'old',
			'rage',
			'serious',
			'smile',
			'smileBig',
			'smileLOL',
		],
		female: [
			'blank',
			'calm',
			'cheeky',
			'cute',
			'driven',
			'eatingHappy',
			'explaining',
			'eyesClosed',
			'hectic',
			'lovingGrin1',
			'lovingGrin2',
			'old',
			'serious',
			'smile',
			'smileBig',
			'smileLOL',
			'smileTeethGap',
			'solemn',
			'suspicious',
			'tired',
		],
		other: [
			'blank',
			'calm',
			'cyclops',
			'monster',
			'old',
			'serious',
			'smile',
			'smileBig',
			'smileLOL',
		],
	},
	heads: {
		male: [
			'mohawk',
			'mohawk2',
			'noHair1',
			'noHair2',
			'noHair3',
			'pomp',
			'shaved1',
			'shaved2',
			'shaved3',
			'short1',
			'short2',
			'short3',
			'short4',
			'short5',
			'flatTop',
			'flatTopLong',
			'bear',
		],
		female: [
			'afro',
			'bangs',
			'bangs2',
			'bantuKnots',
			'bun',
			'bun2',
			'buns',
			'cornrows',
			'cornrows2',
			'dreads1',
			'dreads2',
			'grayBun',
			'grayMedium',
			'grayShort',
			'hatBeanie',
			'hatHip',
			'hijab',
			'long',
			'longAfro',
			'longBangs',
			'longCurly',
			'medium1',
			'medium2',
			'medium3',
			'mediumBangs',
			'mediumBangs2',
			'mediumBangs3',
			'mediumStraight',
			'turban',
			'twists',
			'twists2',
		],
		other: [
			'noHair1',
			'noHair2',
			'noHair3',
			'turban',
			'hijab',
			'hatBeanie',
			'hatHip',
			'afro',
		],
	},
};

function getAvatarUrl(gender = 'female') {
	const getRandomItem = (array) =>
		array[Math.floor(Math.random() * array.length)];
	// Defensive fallback if invalid gender
	const seeds = config.seeds[gender] || config.seeds.other;
	const faces = config.faces[gender] || config.faces.other;
	const heads = config.heads[gender] || config.heads.other;

	return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${getRandomItem(
		seeds
	)}&skinColor=${getRandomItem(config.skinColors)}&face=${getRandomItem(
		faces
	)}&head=${getRandomItem(heads)}&clothingColor=${getRandomItem(
		config.clothingColors
	)}&backgroundColor=${getRandomItem(config.backgroundColors)}`;
}
console.log(getAvatarUrl('male'));
export function AvatarPickerModal({
	open,
	gender = 'female',
	onClose,
	onSelect,
}) {
	const [avatars, setAvatars] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const generateAvatars = React.useCallback(async () => {
		setIsLoading(true);
		// Add a small delay to show the loading state
		await new Promise((resolve) => setTimeout(resolve, 300));
		const newAvatars = Array.from({ length: 25 }, () => getAvatarUrl(gender));
		setAvatars(newAvatars);
		setIsLoading(false);
	}, [gender]);

	React.useEffect(() => {
		if (open) {
			generateAvatars();
		}
	}, [open, gender, generateAvatars]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center">
			<div className="bg-white rounded-lg shadow-lg p-6 min-w-[340px] max-w-[96vw] w-full max-w-lg">
				<h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
					Choose Your Avatar
				</h2>
				<div className="flex justify-end mb-2">
					<button
						className="px-3 py-1 rounded bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors border border-gray-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={generateAvatars}
						disabled={isLoading}
						type="button"
					>
						<RotateCcw
							size={14}
							className={`${isLoading ? 'animate-spin' : ''}`}
						/>
						{isLoading ? 'Loading...' : 'Refresh Avatars'}
					</button>
				</div>
				<div className="grid grid-cols-5 gap-4 mb-6">
					{isLoading
						? // Loading skeleton
						  Array.from({ length: 25 }, (_, idx) => (
								<div
									key={idx}
									className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"
								/>
						  ))
						: avatars.map((url, idx) => (
								<button
									key={idx}
									type="button"
									className="focus:outline-none border-2 border-transparent hover:border-blue-500 rounded-full transition-colors p-0 bg-gray-100"
									onClick={() => {
										onSelect(url);
										onClose();
									}}
									title={`Avatar ${idx + 1}`}
								>
									<img
										src={url}
										alt={`avatar-${idx}`}
										className="w-16 h-16 rounded-full object-cover"
									/>
								</button>
						  ))}
				</div>
				<button
					onClick={onClose}
					className="w-full mt-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
					type="button"
				>
					Close
				</button>
			</div>
		</div>
	);
}
