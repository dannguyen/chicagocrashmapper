import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async () => {
	throw error(404, 'Not found');
};
