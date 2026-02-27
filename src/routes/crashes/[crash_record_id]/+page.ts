import type { PageLoad } from './$types';
import { getCrashById } from '$lib/api/client';
import { Crash } from '$lib/crash';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ params }) => {
	const result = await getCrashById(params.crash_record_id);
	if (!result) {
		throw error(404, `Crash '${params.crash_record_id}' not found.`);
	}

	return {
		crash: new Crash(result.crash),
		neighborhood: result.neighborhood,
		ward: result.ward
	};
};
