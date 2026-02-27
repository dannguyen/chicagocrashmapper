import { Location } from '$lib/location';
import type { Crash } from '$lib/crash';
import { reifyCrashes } from '$lib/crash';
import { getCrashesNearPoint, getCrashesWithin, getRecentCrashes } from '$lib/api/client';
import type { LocationRecord } from '$lib/db/types';
import { DEFAULT_MAX_DISTANCE_FT, DEFAULT_MAX_DAYS } from '$lib/constants';

function toDateStr(d: Date): string {
	return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
	const result = new Date(d);
	result.setDate(result.getDate() + days);
	return result;
}

class AppStateManager {
	#state = $state({
		selectedLocation: null as Location | null,
		crashes: [] as Crash[],
		selectedCrash: null as Crash | null,
		maxDaysAgo: DEFAULT_MAX_DAYS,
		selectedDate: new Date(),
		maxDistance: DEFAULT_MAX_DISTANCE_FT,
		distanceUnits: 'feet' as 'feet' | 'meters',
		loading: false,
		causeFilter: null as string | null,
		geoLoading: false,
		geoError: null as string | null
	});

	// Getters
	get selectedLocation() {
		return this.#state.selectedLocation;
	}

	get crashes() {
		return this.#state.crashes;
	}

	get selectedCrash() {
		return this.#state.selectedCrash;
	}

	get maxDaysAgo() {
		return this.#state.maxDaysAgo;
	}

	get selectedDate() {
		return this.#state.selectedDate;
	}

	get maxDistance() {
		return this.#state.maxDistance;
	}

	get distanceUnits() {
		return this.#state.distanceUnits;
	}

	get loading() {
		return this.#state.loading;
	}

	get causeFilter() {
		return this.#state.causeFilter;
	}

	get geoLoading() {
		return this.#state.geoLoading;
	}

	get geoError() {
		return this.#state.geoError;
	}

	// Computed
	hasResults = $derived(this.#state.crashes.length > 0);
	hasSelectedLocation = $derived(this.#state.selectedLocation != null);
	crashCount = $derived(this.#state.crashes.length);
	filteredCrashes = $derived(
		this.#state.causeFilter
			? this.#state.crashes.filter((i) => i.primary_cause === this.#state.causeFilter)
			: this.#state.crashes
	);

	// Location management
	selectLocation(location: Location | null) {
		this.#state.selectedLocation = location;
	}

	clearLocation() {
		this.#state.selectedLocation = null;
		this.#state.crashes = [];
		this.#state.selectedCrash = null;
		this.#state.causeFilter = null;
	}

	setCauseFilter(cause: string | null) {
		this.#state.causeFilter = cause;
	}

	// Crash management
	selectCrash(crash: Crash | null) {
		this.#state.selectedCrash = crash;
	}

	clearSelectedCrash() {
		this.#state.selectedCrash = null;
	}

	setCrashes(crashes: Crash[]) {
		this.#state.crashes = crashes;
	}

	// Filter management
	setMaxDistance(value: number) {
		if (value < 1) return;
		this.#state.maxDistance = value;
	}

	setMaxDaysAgo(value: number) {
		if (value < 1) return;
		this.#state.maxDaysAgo = value;
	}

	setSelectedDate(date: Date) {
		if (!(date instanceof Date) || isNaN(date.getTime())) return;
		this.#state.selectedDate = date;
	}

	async useMyLocation() {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			this.#state.geoError = 'Geolocation is not supported by your browser';
			return;
		}
		this.#state.geoLoading = true;
		this.#state.geoError = null;

		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					timeout: 10000,
					maximumAge: 60000
				})
			);
			const { latitude, longitude } = pos.coords;
			const record: LocationRecord = {
				id: '',
				name: 'My Location',
				category: 'intersection',
				latitude,
				longitude,
				the_geom: `POINT(${longitude} ${latitude})`
			};
			this.selectLocation(new Location(record));
		} catch (e: unknown) {
			const err = e as GeolocationPositionError;
			if (err?.code === 1) {
				this.#state.geoError = 'Location access denied. Please allow location access.';
			} else {
				this.#state.geoError = 'Could not get your location. Try searching by name instead.';
			}
		} finally {
			this.#state.geoLoading = false;
		}
	}

	// Business logic
	async searchCrashesByLocation(location: Location) {
		this.#state.loading = true;
		this.#state.selectedCrash = null;
		this.#state.causeFilter = null;
		try {
			const since = toDateStr(addDays(this.#state.selectedDate, -this.#state.maxDaysAgo));
			const until = toDateStr(addDays(this.#state.selectedDate, this.#state.maxDaysAgo));

			let records;
			if (location.isShape) {
				records = await getCrashesWithin(location.id, since, until);
			} else {
				records = await getCrashesNearPoint(
					location.latitude,
					location.longitude,
					since,
					until,
					this.#state.maxDistance
				);
			}
			this.#state.crashes = reifyCrashes(records);
		} catch (e) {
			this.#state.crashes = [];
		} finally {
			this.#state.loading = false;
		}
	}

	async loadRecentSeriousCrashes(limit: number = 10) {
		this.#state.loading = true;
		this.#state.selectedLocation = null;
		this.#state.selectedCrash = null;
		try {
			const records = await getRecentCrashes(limit);
			this.#state.crashes = reifyCrashes(records);
		} catch (e) {
			this.#state.crashes = [];
		} finally {
			this.#state.loading = false;
		}
	}

	selectLocationAndSearch(location: Location) {
		this.#state.selectedLocation = location;
		this.searchCrashesByLocation(location);
	}

	refreshSearch() {
		if (this.#state.selectedLocation) {
			this.searchCrashesByLocation(this.#state.selectedLocation);
		}
	}

	reset() {
		this.#state.selectedLocation = null;
		this.#state.crashes = [];
		this.#state.selectedCrash = null;
		this.#state.maxDaysAgo = DEFAULT_MAX_DAYS;
		this.#state.selectedDate = new Date();
		this.#state.maxDistance = DEFAULT_MAX_DISTANCE_FT;
		this.#state.causeFilter = null;
		this.#state.geoError = null;
	}
}

export const appState = new AppStateManager();
