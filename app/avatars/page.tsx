'use client';
import { RotateCcw, Pencil } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

// --- AVATAR GENERATION CONFIGURATION ---
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
	skinColors: ['694d3d', 'ae5d29', 'f2d3b1'],
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

// --- AVATAR GENERATION UTILITY ---
function getAvatarUrl(gender = 'other') {
	const validGender = config.seeds[gender] ? gender : 'other';
	const getRandomItem = (array) =>
		array[Math.floor(Math.random() * array.length)];

	const seed = getRandomItem(config.seeds[validGender]);
	const face = getRandomItem(config.faces[validGender]);
	const head = getRandomItem(config.heads[validGender]);
	const skinColor = getRandomItem(config.skinColors);
	const clothingColor = getRandomItem(config.clothingColors);
	const backgroundColor = getRandomItem(config.backgroundColors);

	return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${seed}&skinColor=${skinColor}&face=${face}&head=${head}&clothingColor=${clothingColor}&backgroundColor=${backgroundColor}`;
}

// --- AVATAR PICKER MODAL COMPONENT ---
function AvatarPickerModal({ open, gender = 'other', onClose, onSelect }) {
	const [avatars, setAvatars] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	const generateAvatars = useCallback(async () => {
		setIsLoading(true);
		await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network delay
		const newAvatars = Array.from({ length: 15 }, () => getAvatarUrl(gender));
		setAvatars(newAvatars);
		setIsLoading(false);
	}, [gender]);

	useEffect(() => {
		if (open) {
			generateAvatars();
		}
	}, [open, generateAvatars]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
			<div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-md border border-border">
				<h2 className="text-xl font-semibold text-foreground mb-4 text-center">
					Choose Your Avatar
				</h2>
				<div className="flex justify-end mb-4">
					<button
						className="px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors border border-border flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={generateAvatars}
						disabled={isLoading}
						type="button"
					>
						<RotateCcw
							size={14}
							className={`${isLoading ? 'animate-spin' : ''}`}
						/>
						{isLoading ? 'Loading...' : 'Refresh'}
					</button>
				</div>
				<div className="grid grid-cols-5 gap-4 mb-6">
					{isLoading
						? Array.from({ length: 15 }, (_, idx) => (
								<div
									key={idx}
									className="w-16 h-16 rounded-full bg-muted animate-pulse"
								/>
						  ))
						: avatars.map((url, idx) => (
								<button
									key={idx}
									type="button"
									className="p-1 bg-muted rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card transition-all hover:scale-105"
									onClick={() => {
										onSelect(url);
										onClose();
									}}
									title={`Avatar ${idx + 1}`}
								>
									<img
										src={url}
										alt={`avatar-${idx}`}
										className="w-full h-full rounded-full object-cover"
									/>
								</button>
						  ))}
				</div>
				<button
					onClick={onClose}
					className="w-full mt-2 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
					type="button"
				>
					Close
				</button>
			</div>
		</div>
	);
}

// --- MAIN AVATAR PICKER COMPONENT ---
export default function AvatarPicker({
	gender,
	onAvatarSelect,
	initialAvatarUrl = '',
}) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentAvatar, setCurrentAvatar] = useState(initialAvatarUrl);

	useEffect(() => {
		// Generate an initial avatar if none is provided
		if (!initialAvatarUrl) {
			setCurrentAvatar(getAvatarUrl(gender));
		}
	}, [initialAvatarUrl, gender]);

	const handleSelect = (url) => {
		setCurrentAvatar(url);
		onAvatarSelect(url);
	};

	return (
		<div className="relative w-32 h-32">
			<img
				src={currentAvatar}
				alt="Selected Avatar"
				className="w-full h-full rounded-full object-cover border-4 border-border shadow-md"
			/>
			<button
				type="button"
				onClick={() => setIsModalOpen(true)}
				className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
				aria-label="Change Avatar"
			>
				<Pencil size={16} />
			</button>
			<AvatarPickerModal
				open={isModalOpen}
				gender={gender}
				onClose={() => setIsModalOpen(false)}
				onSelect={handleSelect}
			/>
		</div>
	);
}
