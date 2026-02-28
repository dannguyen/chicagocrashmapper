import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const year = parseInt(params.year, 10);
	const month = parseInt(params.month, 10);
	const currentYear = new Date().getFullYear();
	if (isNaN(year) || year < 2000 || year > currentYear) {
		error(404, `No data for year ${params.year}`);
	}
	if (isNaN(month) || month < 1 || month > 12) {
		error(404, `Invalid month ${params.month}`);
	}
	return { year, month };
};
