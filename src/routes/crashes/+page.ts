import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	const currentYear = new Date().getFullYear();
	redirect(307, `/periods/${currentYear}`);
};
