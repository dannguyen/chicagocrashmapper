import type { PageLoad } from './$types';
import { getLocationById } from '$lib/api/client';
import { Location } from '$lib/location';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const id = params.id;
	const record = await getLocationById(id);

	if (!record || record.category !== 'street') {
		throw error(404, `Street '${id}' not found.`);
	}

	return {
		location: new Location(record)
	};
};
