import { Location } from '$lib/location';
import type { Incident } from '$lib/incident';
import { reifyIncidents } from '$lib/incident';
import { getIncidentsNearPoint, getIncidentsWithin, getRecentIncidents } from '$lib/api/client';
import type { LocationRecord } from '$lib/db/types';

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
		incidents: [] as Incident[],
		selectedIncident: null as Incident | null,
		maxDaysAgo: 540,
		selectedDate: new Date(),
		maxDistance: 2500,
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

	get incidents() {
		return this.#state.incidents;
	}

	get selectedIncident() {
		return this.#state.selectedIncident;
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
	hasResults = $derived(this.#state.incidents.length > 0);
	hasSelectedLocation = $derived(this.#state.selectedLocation != null);
	incidentCount = $derived(this.#state.incidents.length);
	filteredIncidents = $derived(
		this.#state.causeFilter
			? this.#state.incidents.filter((i) => i.primary_cause === this.#state.causeFilter)
			: this.#state.incidents
	);

	// Location management
	selectLocation(location: Location | null) {
		this.#state.selectedLocation = location;
	}

	clearLocation() {
		this.#state.selectedLocation = null;
		this.#state.incidents = [];
		this.#state.selectedIncident = null;
		this.#state.causeFilter = null;
	}

	setCauseFilter(cause: string | null) {
		this.#state.causeFilter = cause;
	}

	// Incident management
	selectIncident(incident: Incident | null) {
		this.#state.selectedIncident = incident;
	}

	clearSelectedIncident() {
		this.#state.selectedIncident = null;
	}

	setIncidents(incidents: Incident[]) {
		this.#state.incidents = incidents;
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
	async searchIncidentsByLocation(location: Location) {
		this.#state.loading = true;
		this.#state.selectedIncident = null;
		this.#state.causeFilter = null;
		try {
			const since = toDateStr(addDays(this.#state.selectedDate, -this.#state.maxDaysAgo));
			const until = toDateStr(addDays(this.#state.selectedDate, this.#state.maxDaysAgo));

			let records;
			if (location.isShape) {
				records = await getIncidentsWithin(location.id, since, until);
			} else {
				records = await getIncidentsNearPoint(
					location.latitude,
					location.longitude,
					since,
					until,
					this.#state.maxDistance
				);
			}
			this.#state.incidents = reifyIncidents(records);
		} catch (e) {
			console.error('Failed to fetch incidents:', e);
			this.#state.incidents = [];
		} finally {
			this.#state.loading = false;
		}
	}

	async loadRecentSeriousIncidents(limit: number = 10) {
		this.#state.loading = true;
		this.#state.selectedLocation = null;
		this.#state.selectedIncident = null;
		try {
			const records = await getRecentIncidents(limit);
			this.#state.incidents = reifyIncidents(records);
		} catch (e) {
			console.error('Failed to fetch recent serious incidents:', e);
			this.#state.incidents = [];
		} finally {
			this.#state.loading = false;
		}
	}

	selectLocationAndSearch(location: Location) {
		this.#state.selectedLocation = location;
		this.searchIncidentsByLocation(location);
	}

	refreshSearch() {
		if (this.#state.selectedLocation) {
			this.searchIncidentsByLocation(this.#state.selectedLocation);
		}
	}

	reset() {
		this.#state.selectedLocation = null;
		this.#state.incidents = [];
		this.#state.selectedIncident = null;
		this.#state.maxDaysAgo = 540;
		this.#state.selectedDate = new Date();
		this.#state.maxDistance = 2500;
		this.#state.causeFilter = null;
		this.#state.geoError = null;
	}
}

export const appState = new AppStateManager();
