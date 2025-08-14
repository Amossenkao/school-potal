import { componentsMap } from '@/utils/componentsMap';
import { getCurrentUser } from '@/lib/auth';
import { PageLoading } from '@/components/loading';

interface PageProps {
	params: {
		page: string;
	};
}

export default async function DynamicDashboardPage({ params }: PageProps) {
	const user: any = await getCurrentUser();

	if (!user) {
		return <PageLoading variant="not-found" message="" />;
	}

	const { page } = await params;

	const entry =
		componentsMap[user.role]?.items[page] || componentsMap.shared?.items[page];

	if (!entry) {
		return (
			<PageLoading
				variant="dashboard-not-found"
				fullScreen={false}
				message=""
			/>
		);
	}

	const Component = entry.component;
	return (
		<>
			<title>{page.split('-').join(' ')}</title>
			<Component />
		</>
	);
}
