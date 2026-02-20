import type { PageLoad } from './$types';
import { getIncidentById } from '$lib/api/client';
import { Incident } from '$lib/incident';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ params }) => {
	const result = await getIncidentById(params.crash_record_id);

	if (!result) {
		throw error(404, `Incident '${params.crash_record_id}' not found.`);
	}

	return {
		incident: new Incident(result.incident),
		neighborhood: result.neighborhood,
		ward: result.ward
	};
};
