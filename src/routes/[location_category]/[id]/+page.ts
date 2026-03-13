import type { PageLoad } from './$types';
import { getLocationById } from '$lib/api/client';
import { Location } from '$lib/location';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
	const id = params.id;

	const record = await getLocationById(id, fetch);

	if (!record) {
		throw error(404, `Location '${id}' not found.`);
	}

	return {
		location: new Location(record)
	};
};
