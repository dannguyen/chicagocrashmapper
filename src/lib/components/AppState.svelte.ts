import type { Location } from '$lib/location';
import type { Incident } from '$lib/incident';
import type { DatabaseConnection } from '$lib/db';
import { reifyIncidents } from '$lib/incident';
import {
	queryIncidentsMostRecentNearLocation,
	queryIncidentsInsideLocation,
	queryMostRecentFatalIncidents
} from '$lib/db';

class AppStateManager {
	#state = $state({
		database: null as DatabaseConnection | null,
		selectedLocation: null as Location | null,
		incidents: [] as Incident[],
		selectedIncident: null as Incident | null,
		maxDaysAgo: 540,
		selectedDate: new Date(),
		maxDistance: 2500,
		distanceUnits: 'feet' as 'feet' | 'meters'
	});

	// Getters - read-only access to state
	get database() {
		return this.#state.database;
	}

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

	// Computed properties - derived state
	hasDatabase = $derived(this.#state.database?.db != null);
	hasResults = $derived(this.#state.incidents.length > 0);
	hasSelectedLocation = $derived(this.#state.selectedLocation != null);
	incidentCount = $derived(this.#state.incidents.length);

	// Database management
	setDatabase(connection: DatabaseConnection | null) {
		this.#state.database = connection;
	}

	// Location management
	selectLocation(location: Location | null) {
		this.#state.selectedLocation = location;
	}

	clearLocation() {
		this.#state.selectedLocation = null;
		this.#state.incidents = [];
		this.#state.selectedIncident = null;
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

	// Filter management with validation
	setMaxDistance(value: number) {
		if (value < 1) {
			console.warn('maxDistance must be at least 1');
			return;
		}
		this.#state.maxDistance = value;
	}

	setMaxDaysAgo(value: number) {
		if (value < 1) {
			console.warn('maxDaysAgo must be at least 1');
			return;
		}
		this.#state.maxDaysAgo = value;
	}

	setSelectedDate(date: Date) {
		if (!(date instanceof Date) || isNaN(date.getTime())) {
			console.warn('Invalid date provided');
			return;
		}
		this.#state.selectedDate = date;
	}

	// Business logic - search operations
	searchIncidentsByLocation(location: Location) {
		if (!this.#state.database) {
			console.warn('Database not initialized');
			return;
		}

		let results;
		if (location.isShape) {
			results = queryIncidentsInsideLocation(
				this.#state.database,
				location,
				this.#state.maxDaysAgo,
				this.#state.selectedDate
			);
		} else {
			results = queryIncidentsMostRecentNearLocation(
				this.#state.database,
				location,
				this.#state.maxDistance,
				this.#state.maxDaysAgo,
				this.#state.selectedDate
			);
		}

		this.#state.incidents = reifyIncidents(results);
		this.#state.selectedIncident = null; // Clear selected incident when new search occurs
	}

	loadRecentFatalIncidents(limit: number = 10) {
		if (!this.#state.database) {
			console.warn('Database not initialized');
			return;
		}

		this.#state.selectedLocation = null;
		const results = queryMostRecentFatalIncidents(this.#state.database, limit);
		this.#state.incidents = reifyIncidents(results);
		this.#state.selectedIncident = null;
	}

	// Combined operation - select location and search
	selectLocationAndSearch(location: Location) {
		this.#state.selectedLocation = location;
		this.searchIncidentsByLocation(location);
	}

	// Re-run search with current location and filters
	refreshSearch() {
		if (this.#state.selectedLocation) {
			this.searchIncidentsByLocation(this.#state.selectedLocation);
		}
	}

	// Reset to initial state
	reset() {
		this.#state.selectedLocation = null;
		this.#state.incidents = [];
		this.#state.selectedIncident = null;
		this.#state.maxDaysAgo = 540;
		this.#state.selectedDate = new Date();
		this.#state.maxDistance = 2500;
	}
}

// Export singleton instance
export const appState = new AppStateManager();
