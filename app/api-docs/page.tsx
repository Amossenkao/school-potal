'use client';

import { useEffect } from 'react';

export default function ApiDocs() {
	useEffect(() => {
		// Load Swagger UI from CDN
		const loadSwaggerUI = () => {
			// Add CSS
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css';
			document.head.appendChild(link);

			// Add JavaScript
			const script = document.createElement('script');
			script.src =
				'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
			script.onload = () => {
				// Initialize Swagger UI
				(window as any).SwaggerUIBundle({
					url: '/api/swagger.json',
					dom_id: '#swagger-ui',
					deepLinking: true,
					presets: [
						(window as any).SwaggerUIBundle.presets.apis,
						(window as any).SwaggerUIBundle.presets.standalone,
					],
					plugins: [(window as any).SwaggerUIBundle.plugins.DownloadUrl],
					// layout: 'StandaloneLayout',
					tryItOutEnabled: true,
					filter: true,
					displayRequestDuration: true,
				});
			};
			document.head.appendChild(script);
		};

		loadSwaggerUI();
	}, []);

	return (
		<div className="min-h-screen bg-white">
			<div className="container mx-auto py-8">
				<h1 className="text-3xl font-bold mb-6 text-center">
					API Documentation
				</h1>
				<div id="swagger-ui"></div>
			</div>
		</div>
	);
}
