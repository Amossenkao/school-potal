import { useSchoolStore } from '@/store/schoolStore';
import { Ban, Mail, Phone, MapPin } from 'lucide-react';

export default function Inactive() {
	const school = useSchoolStore((state) => state.school);

	const contactEmail = school?.emails?.[0] ?? 'support@schoolmesh.com';
	const contactPhone = school?.phones?.[0] ?? null;
	const contactAddress = school?.address?.[0] ?? null;

	return (
		<div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] px-4 py-12">
			<div className="w-full max-w-lg">
				{/* Card */}
				<div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
					{/* Icon */}
					<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
						<Ban className="h-8 w-8 text-red-500" />
					</div>

					{/* School identity */}
					{school?.logoUrl && (
						<img
							src={school.logoUrl}
							alt={school.name}
							className="mx-auto mb-3 h-10 w-10 rounded-xl object-contain"
						/>
					)}
					<h1 className="text-xl font-bold tracking-tight text-[#111827]">
						{school?.name ?? 'Your School'}
					</h1>
					<p className="mt-1 text-xs font-medium uppercase tracking-widest text-[#465fff]">
						Account Inactive
					</p>

					{/* Divider */}
					<div className="my-6 h-px bg-gray-100" />

					{/* Message */}
					<p className="text-sm leading-relaxed text-gray-500">
						This school account has been deactivated. All platform features
						are currently unavailable. Please reach out to your administrator
						or our support team to restore access.
					</p>

					{/* Contact info */}
					<div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
							Get in touch
						</p>
						<div className="space-y-3">
							<a
								href={`mailto:${contactEmail}`}
								className="flex items-center gap-3 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
							>
								<Mail className="h-4 w-4 shrink-0 text-gray-400" />
								{contactEmail}
							</a>
							{contactPhone && (
								<a
									href={`tel:${contactPhone}`}
									className="flex items-center gap-3 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
								>
									<Phone className="h-4 w-4 shrink-0 text-gray-400" />
									{contactPhone}
								</a>
							)}
							{contactAddress && (
								<div className="flex items-start gap-3 text-sm text-gray-600">
									<MapPin className="h-4 w-4 shrink-0 pt-0.5 text-gray-400" />
									{contactAddress}
								</div>
							)}
						</div>
					</div>

					{/* CTA */}
					<a
						href={`mailto:${contactEmail}?subject=Account%20Restoration%20Request${school?.name ? `%20%E2%80%94%20${encodeURIComponent(school.name)}` : ''}`}
						className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#465fff] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3a4fe0] focus:outline-none focus:ring-2 focus:ring-[#465fff]/30 focus:ring-offset-2"
					>
						<Mail className="h-4 w-4" />
						Contact Support
					</a>
				</div>

				{/* Footer */}
				<p className="mt-6 text-center text-xs text-gray-400">
					Powered by{' '}
					<span className="font-semibold text-gray-500">
						School<span className="text-[#465fff]">Mesh</span>
					</span>
				</p>
			</div>
		</div>
	);
}