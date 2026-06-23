import React from 'react';
import { ShieldX, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
	title?: string;
	message?: string;
	description?: string;
	showBackButton?: boolean;
}

export default function AccessDenied({
	title = 'Access Denied',
	message = "You don't have permission to access this resource.",
	description = 'If you believe this is an error, please contact your administrator or try logging in with different credentials.',
	showBackButton = true,
}: AccessDeniedProps) {
	const handleGoBack = () => {
		window.history.back();
	};

	return (
		<div className="min-h-[60vh] bg-background flex items-center justify-center px-4">
			<div className="max-w-md w-full text-center">
				<div className="mb-8">
					<div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
						<ShieldX className="w-12 h-12 text-destructive" />
					</div>

					<h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>

					<p className="text-muted-foreground text-lg mb-2">{message}</p>

					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>

				{showBackButton && (
					<button
						onClick={handleGoBack}
						className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
					>
						<ArrowLeft className="w-4 h-4" />
						Go Back
					</button>
				)}
			</div>
		</div>
	);
}
