/**
 * Shared pagination derived-state logic used by LocationDetail and PeriodDetail.
 */

export function paginationState(
	getTotalCrashes: () => number,
	getCurrentPage: () => number,
	perPage: number
) {
	return {
		get rangeStart() {
			return getTotalCrashes() === 0 ? 0 : getCurrentPage() * perPage + 1;
		},
		get rangeEnd() {
			return Math.min((getCurrentPage() + 1) * perPage, getTotalCrashes());
		},
		get totalPages() {
			return Math.ceil(getTotalCrashes() / perPage);
		},
		get hasPrev() {
			return getCurrentPage() > 0;
		},
		get hasNext() {
			return getCurrentPage() < this.totalPages - 1;
		},
		get pageNumbers(): (number | null)[] {
			const tp = this.totalPages;
			return tp <= 6
				? Array.from({ length: tp }, (_, i) => i)
				: [0, 1, 2, null, tp - 3, tp - 2, tp - 1];
		}
	};
}

/**
 * Scroll to the map and open a crash popup.
 */
export function showCrashOnMap(
	mapRef:
		| {
				openCrashPopup(id: string): void;
				scrollIntoView?(): void;
		  }
		| undefined,
	crashId: string
) {
	if (mapRef) {
		mapRef.openCrashPopup(crashId);
		mapRef.scrollIntoView?.();
	}
}
