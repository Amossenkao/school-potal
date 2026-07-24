'use client';
import { RotateCcw, Pencil, Link, Sparkles, AlertCircle } from 'lucide-react';
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
	const getRandomItem = (arr: string[]) =>
		arr[Math.floor(Math.random() * arr.length)];

	const seed = getRandomItem(config.seeds[validGender]);
	const face = getRandomItem(config.faces[validGender]);
	const head = getRandomItem(config.heads[validGender]);
	const skinColor = getRandomItem(config.skinColors);
	const clothingColor = getRandomItem(config.clothingColors);
	const backgroundColor = getRandomItem(config.backgroundColors);

	return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${seed}&skinColor=${skinColor}&face=${face}&head=${head}&clothingColor=${clothingColor}&backgroundColor=${backgroundColor}`;
}

type Tab = 'generated' | 'custom';

// --- AVATAR PICKER MODAL COMPONENT ---
export function AvatarPickerModal({
	open,
	gender = 'other',
	onClose,
	onSelect,
	currentAvatar,
}: {
	open: boolean;
	gender?: string;
	onClose: () => void;
	onSelect: (url: string) => void;
	currentAvatar: string;
}) {
	const [tab, setTab] = useState<Tab>('generated');
	const [avatars, setAvatars] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Custom URL tab state
	const [customUrl, setCustomUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [previewError, setPreviewError] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);

	const generateAvatars = useCallback(async () => {
		setIsLoading(true);
		await new Promise((resolve) => setTimeout(resolve, 300));
		setAvatars(Array.from({ length: 15 }, () => getAvatarUrl(gender)));
		setIsLoading(false);
	}, [gender]);

	useEffect(() => {
		if (open) {
			generateAvatars();
			setTab('generated');
			setCustomUrl('');
			setPreviewUrl('');
			setPreviewError(false);
		}
	}, [open, generateAvatars]);

	// Debounce custom URL preview
	useEffect(() => {
		if (!customUrl.trim()) {
			setPreviewUrl('');
			setPreviewError(false);
			return;
		}
		setPreviewLoading(true);
		setPreviewError(false);
		const timer = setTimeout(() => {
			setPreviewUrl(customUrl.trim());
		}, 500);
		return () => clearTimeout(timer);
	}, [customUrl]);

	const handleCustomConfirm = () => {
		if (previewUrl && !previewError) {
			onSelect(previewUrl);
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
			<div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border flex flex-col">
				{/* Header */}
				<div className="p-6 pb-4">
					<h2 className="text-xl font-semibold text-foreground text-center">
						Choose Avatar
					</h2>
				</div>

				{/* Tabs */}
				<div className="px-6 pb-4">
					<div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
						<button
							type="button"
							onClick={() => setTab('generated')}
							className={`flex items-center justify-center gap-2 rounded-md py-2 transition-colors ${
								tab === 'generated'
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<Sparkles size={14} />
							Generated
						</button>
						<button
							type="button"
							onClick={() => setTab('custom')}
							className={`flex items-center justify-center gap-2 rounded-md py-2 transition-colors ${
								tab === 'custom'
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<Link size={14} />
							Custom URL
						</button>
					</div>
				</div>

				{/* Tab content */}
				<div className="px-6 pb-6 flex flex-col gap-4">
					{tab === 'generated' ? (
						<>
							<div className="flex justify-end">
								<button
									type="button"
									onClick={generateAvatars}
									disabled={isLoading}
									className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<RotateCcw
										size={14}
										className={isLoading ? 'animate-spin' : ''}
									/>
									{isLoading ? 'Loading…' : 'Refresh'}
								</button>
							</div>
							<div className="grid grid-cols-5 gap-3">
								{isLoading
									? Array.from({ length: 15 }, (_, i) => (
											<div
												key={i}
												className="w-16 h-16 rounded-full bg-muted animate-pulse"
											/>
										))
									: avatars.map((url, i) => (
											<button
												key={i}
												type="button"
												onClick={() => {
													onSelect(url);
													onClose();
												}}
												className={`p-1 rounded-full transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card ${
													currentAvatar === url
														? 'ring-2 ring-primary ring-offset-2 ring-offset-card'
														: 'bg-muted'
												}`}
												title={`Avatar ${i + 1}`}
											>
												<img
													src={url}
													alt={`avatar-${i}`}
													className="w-full h-full rounded-full object-cover"
												/>
											</button>
										))}
							</div>
						</>
					) : (
						<>
							{/* URL input */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">
									Photo URL
								</label>
								<input
									type="url"
									value={customUrl}
									onChange={(e) => setCustomUrl(e.target.value)}
									placeholder="https://example.com/photo.jpg"
									className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
									autoFocus
								/>
								<p className="text-xs text-muted-foreground">
									Paste any publicly accessible image URL.
								</p>
							</div>

							{/* Preview */}
							<div className="flex flex-col items-center gap-3 py-2">
								{!previewUrl ? (
									<div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
										<span className="text-xs text-muted-foreground text-center px-2">
											Preview appears here
										</span>
									</div>
								) : previewError ? (
									<div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 flex flex-col items-center justify-center gap-1">
										<AlertCircle size={20} className="text-red-500" />
										<span className="text-[10px] text-red-500 text-center px-2">
											Can't load image
										</span>
									</div>
								) : (
									<div className="relative">
										{previewLoading && (
											<div className="absolute inset-0 rounded-full bg-muted animate-pulse" />
										)}
										<img
											src={previewUrl}
											alt="Preview"
											className="w-24 h-24 rounded-full object-cover border-4 border-border shadow-md"
											onLoad={() => setPreviewLoading(false)}
											onError={() => {
												setPreviewError(true);
												setPreviewLoading(false);
											}}
										/>
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={handleCustomConfirm}
								disabled={!previewUrl || previewError}
								className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								Use This Photo
							</button>
						</>
					)}

					<button
						type="button"
						onClick={onClose}
						className="w-full py-2 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/80 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}

// --- MAIN AVATAR PICKER COMPONENT ---
export default function AvatarPicker({
	gender,
	onAvatarSelect,
	initialAvatarUrl = '',
}: {
	gender?: string;
	onAvatarSelect: (url: string) => void;
	initialAvatarUrl?: string;
}) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentAvatar, setCurrentAvatar] = useState(initialAvatarUrl);

	useEffect(() => {
		if (!initialAvatarUrl && !currentAvatar) {
			const generated = getAvatarUrl(gender);
			setCurrentAvatar(generated);
			onAvatarSelect(generated);
		}
	}, [initialAvatarUrl, currentAvatar, gender, onAvatarSelect]);

	useEffect(() => {
		if (initialAvatarUrl && initialAvatarUrl !== currentAvatar) {
			setCurrentAvatar(initialAvatarUrl);
		}
	}, [initialAvatarUrl, currentAvatar]);

	const handleSelect = (url: string) => {
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
				currentAvatar={currentAvatar}
			/>
		</div>
	);
}
