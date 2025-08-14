import { PageLoading } from '@/components/loading';

export default function Loading() {
	return (
		<>
			<title>Loading...</title>
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Content Loading, Please wait..."
					fullScreen={false}
				/>
			</div>
		</>
	);
}
