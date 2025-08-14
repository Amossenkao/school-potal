export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="bg-blue-600 text-white p-4">
				<div className="container mx-auto">
					<h1 className="text-xl font-bold">API Documentation</h1>
					<p className="text-blue-100">
						Interactive API documentation powered by Swagger
					</p>
				</div>
			</nav>
			<main>{children}</main>
		</div>
	);
}
