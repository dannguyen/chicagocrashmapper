import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const year = parseInt(params.year, 10);
	const currentYear = new Date().getFullYear();
	if (isNaN(year) || year < 2000 || year > currentYear) {
		error(404, `No data for year ${params.year}`);
	}
	return { year };
};
