'use client';
import {
	RotateCcw,
	Pencil,
	Link,
	Sparkles,
	AlertCircle,
	Upload,
	ImagePlus,
	Loader2,
	X,
	Trash2,
	UserRound,
	type LucideIcon,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

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

// --- UPLOAD CONFIGURATION ---
const OUTPUT_SIZE = 512;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let supportsWebpCache: boolean | null = null;
function supportsWebp() {
	if (supportsWebpCache !== null) return supportsWebpCache;
	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	supportsWebpCache = canvas
		.toDataURL('image/webp')
		.startsWith('data:image/webp');
	return supportsWebpCache;
}

/**
 * Center-crops the image to a square and downscales it to 512x512 before upload, so
 * the request body stays around 50-150 KB regardless of the original photo's size.
 */
async function processImageFile(
	file: File,
): Promise<{ blob: Blob; fileName: string }> {
	const bitmap = await createImageBitmap(file);

	try {
		const side = Math.min(bitmap.width, bitmap.height);
		const sx = (bitmap.width - side) / 2;
		const sy = (bitmap.height - side) / 2;

		const canvas = document.createElement('canvas');
		canvas.width = OUTPUT_SIZE;
		canvas.height = OUTPUT_SIZE;

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Could not process this image.');

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

		const useWebp = supportsWebp();
		const mimeType = useWebp ? 'image/webp' : 'image/jpeg';

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, mimeType, 0.85),
		);
		if (!blob) throw new Error('Could not process this image.');

		return { blob, fileName: useWebp ? 'avatar.webp' : 'avatar.jpg' };
	} finally {
		bitmap.close();
	}
}

type Tab = 'upload' | 'generated' | 'custom';

// Display order of the picker tabs. The first entry is also the default.
const TABS = [
	{ id: 'upload', label: 'Upload', icon: Upload },
	{ id: 'generated', label: 'Generated', icon: Sparkles },
	{ id: 'custom', label: 'URL', icon: Link },
] as const satisfies readonly { id: Tab; label: string; icon: LucideIcon }[];

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
	const [tab, setTab] = useState<Tab>('upload');
	const [avatars, setAvatars] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Custom URL tab state
	const [customUrl, setCustomUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [previewError, setPreviewError] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);

	// Upload tab state
	const fileInputRef = useRef<HTMLInputElement>(null);
	const uploadPreviewRef = useRef<string>('');
	const [processed, setProcessed] = useState<{
		blob: Blob;
		fileName: string;
	} | null>(null);
	const [uploadPreview, setUploadPreview] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState('');
	const [isDragging, setIsDragging] = useState(false);

	const clearUpload = useCallback(() => {
		if (uploadPreviewRef.current) {
			URL.revokeObjectURL(uploadPreviewRef.current);
			uploadPreviewRef.current = '';
		}
		setProcessed(null);
		setUploadPreview('');
		setIsProcessing(false);
		setIsUploading(false);
		setUploadError('');
		setIsDragging(false);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}, []);

	// Release the last object URL when the modal unmounts.
	useEffect(
		() => () => {
			if (uploadPreviewRef.current) {
				URL.revokeObjectURL(uploadPreviewRef.current);
				uploadPreviewRef.current = '';
			}
		},
		[],
	);

	const handleFile = useCallback(
		async (file: File | undefined | null) => {
			if (!file) return;

			setUploadError('');

			if (!ACCEPTED_TYPES.includes(file.type)) {
				setUploadError('Please choose a JPEG, PNG, WebP or GIF image.');
				return;
			}
			if (file.size > MAX_INPUT_BYTES) {
				setUploadError(
					`That image is ${formatBytes(file.size)}. Please choose one under 10 MB.`,
				);
				return;
			}

			setIsProcessing(true);
			try {
				const result = await processImageFile(file);
				if (uploadPreviewRef.current) {
					URL.revokeObjectURL(uploadPreviewRef.current);
				}
				const objectUrl = URL.createObjectURL(result.blob);
				uploadPreviewRef.current = objectUrl;
				setProcessed(result);
				setUploadPreview(objectUrl);
			} catch (error: any) {
				setUploadError(error?.message || 'Could not read that image.');
				setProcessed(null);
				setUploadPreview('');
			} finally {
				setIsProcessing(false);
			}
		},
		[],
	);

	const handleUploadConfirm = async () => {
		if (!processed) return;

		setIsUploading(true);
		setUploadError('');

		try {
			const formData = new FormData();
			formData.append('file', processed.blob, processed.fileName);

			const response = await fetch('/api/upload/avatar', {
				method: 'POST',
				body: formData,
			});
			const result = await response.json();

			if (!response.ok || !result?.data?.url) {
				throw new Error(result?.message || 'Upload failed. Please try again.');
			}

			onSelect(result.data.url);
			onClose();
		} catch (error: any) {
			setUploadError(error?.message || 'Upload failed. Please try again.');
		} finally {
			setIsUploading(false);
		}
	};

	const generateAvatars = useCallback(async () => {
		setIsLoading(true);
		await new Promise((resolve) => setTimeout(resolve, 300));
		setAvatars(Array.from({ length: 15 }, () => getAvatarUrl(gender)));
		setIsLoading(false);
	}, [gender]);

	useEffect(() => {
		if (open) {
			generateAvatars();
			setTab('upload');
			setCustomUrl('');
			setPreviewUrl('');
			setPreviewError(false);
			clearUpload();
		}
	}, [open, generateAvatars, clearUpload]);

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
					<div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-sm font-medium">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setTab(id)}
								className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
									tab === id
										? 'bg-card text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Icon size={14} />
								{label}
							</button>
						))}
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
					) : tab === 'upload' ? (
						<>
							{/* Drop zone */}
							<input
								ref={fileInputRef}
								type="file"
								accept={ACCEPTED_TYPES.join(',')}
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									// Reset so re-picking the same file still fires onChange.
									e.target.value = '';
									handleFile(file);
								}}
							/>

							{!uploadPreview ? (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									onDragOver={(e) => {
										e.preventDefault();
										setIsDragging(true);
									}}
									onDragLeave={() => setIsDragging(false)}
									onDrop={(e) => {
										e.preventDefault();
										setIsDragging(false);
										handleFile(e.dataTransfer.files?.[0]);
									}}
									disabled={isProcessing}
									className={`flex flex-col items-center justify-center gap-2 w-full py-10 rounded-xl border-2 border-dashed transition-colors ${
										isDragging
											? 'border-primary bg-primary/5'
											: 'border-border bg-muted/40 hover:bg-muted/70'
									} disabled:cursor-wait`}
								>
									{isProcessing ? (
										<>
											<Loader2
												size={24}
												className="text-muted-foreground animate-spin"
											/>
											<span className="text-sm text-muted-foreground">
												Processing…
											</span>
										</>
									) : (
										<>
											<ImagePlus size={24} className="text-muted-foreground" />
											<span className="text-sm font-medium text-foreground">
												Drop a photo, or click to browse
											</span>
											<span className="text-xs text-muted-foreground">
												JPEG, PNG, WebP or GIF · up to 10 MB
											</span>
										</>
									)}
								</button>
							) : (
								<div className="flex flex-col items-center gap-3 py-2">
									<div className="relative">
										<img
											src={uploadPreview}
											alt="Upload preview"
											className="w-24 h-24 rounded-full object-cover border-4 border-border shadow-md"
										/>
										<button
											type="button"
											onClick={clearUpload}
											disabled={isUploading}
											className="absolute -top-1 -right-1 rounded-full bg-muted text-foreground border border-border p-1 hover:bg-muted/80 transition-colors disabled:opacity-40"
											aria-label="Remove photo"
										>
											<X size={12} />
										</button>
									</div>
									<p className="text-xs text-muted-foreground text-center">
										Saved as {OUTPUT_SIZE}×{OUTPUT_SIZE} ·{' '}
										{formatBytes(processed?.blob.size ?? 0)}
									</p>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isUploading}
										className="text-xs text-primary hover:underline disabled:opacity-40"
									>
										Choose a different photo
									</button>
								</div>
							)}

							{uploadError && (
								<div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2">
									<AlertCircle
										size={14}
										className="text-red-500 mt-0.5 shrink-0"
									/>
									<span className="text-xs text-red-500">{uploadError}</span>
								</div>
							)}

							<button
								type="button"
								onClick={handleUploadConfirm}
								disabled={!processed || isProcessing || isUploading}
								className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{isUploading && <Loader2 size={14} className="animate-spin" />}
								{isUploading ? 'Uploading…' : 'Use This Photo'}
							</button>
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
	onAvatarDelete,
	autoGenerate = true,
}: {
	gender?: string;
	onAvatarSelect: (url: string) => void;
	initialAvatarUrl?: string;
	/** When provided, a remove button appears and the avatar may be left empty. */
	onAvatarDelete?: () => void | Promise<void>;
	/**
	 * Assign a random generated avatar on mount when the user has none. Callers that
	 * allow removal must turn this off, otherwise deleting an avatar immediately
	 * regenerates and re-saves one.
	 */
	autoGenerate?: boolean;
}) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentAvatar, setCurrentAvatar] = useState(initialAvatarUrl);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (autoGenerate && !initialAvatarUrl && !currentAvatar) {
			const generated = getAvatarUrl(gender);
			setCurrentAvatar(generated);
			onAvatarSelect(generated);
		}
	}, [autoGenerate, initialAvatarUrl, currentAvatar, gender, onAvatarSelect]);

	useEffect(() => {
		if (initialAvatarUrl && initialAvatarUrl !== currentAvatar) {
			setCurrentAvatar(initialAvatarUrl);
		}
	}, [initialAvatarUrl, currentAvatar]);

	const handleSelect = (url: string) => {
		setCurrentAvatar(url);
		onAvatarSelect(url);
	};

	const handleDelete = async () => {
		if (!onAvatarDelete || isDeleting) return;
		setIsDeleting(true);
		try {
			await onAvatarDelete();
			setCurrentAvatar('');
		} catch {
			// The consumer owns error reporting; keep showing the existing avatar so the
			// UI doesn't claim a removal that never persisted.
		} finally {
			setIsDeleting(false);
		}
	};

	const canDelete = Boolean(onAvatarDelete) && Boolean(currentAvatar);

	return (
		<div className="relative w-32 h-32">
			{currentAvatar ? (
				<img
					src={currentAvatar}
					alt="Selected Avatar"
					className="w-full h-full rounded-full object-cover border-4 border-border shadow-md"
				/>
			) : (
				<div className="w-full h-full rounded-full bg-muted border-4 border-border shadow-md flex items-center justify-center">
					<UserRound size={48} className="text-muted-foreground" />
				</div>
			)}
			{canDelete && (
				<button
					type="button"
					onClick={handleDelete}
					disabled={isDeleting}
					className="absolute bottom-0 left-0 bg-card text-red-500 border border-border rounded-full p-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
					aria-label="Remove Avatar"
					title="Remove photo"
				>
					{isDeleting ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						<Trash2 size={16} />
					)}
				</button>
			)}
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
