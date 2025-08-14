//

async function findSchoolByHost(host: string | null) {
	// TODO: Fetch the actual school information from the database
	const schools = [
		{
			id: 'school_1',
			name: 'Upstairs Christian Academy',
			shortName: 'Upstairs',
			subdomain: 'uca',
			address: 'Kpelleh Town, Lower Johnsonville, Montserrado Liberia',
			dbName: 'uca',
		},
		{
			id: 'school_2',
			name: 'Samore Christian Academy',
			shortName: 'Samore',
			subdomain: 'samore',
			address: '456 River Rd',
			dbName: 'samore',
		},
	];

	const subdomain = host?.split('.')[0];

	if (subdomain == host) return schools[0];

	return schools.find((school) => school.subdomain === subdomain);
}

export default findSchoolByHost;
