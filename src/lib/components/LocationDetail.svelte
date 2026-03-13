<script lang="ts">
	import { Location } from '$lib/location';
	import { getCrashSummary, getCrashesBrief, getNearbyLocations } from '$lib/api/client';
	import type { NearbyLocation } from '$lib/api/client';
	import type { CrashSummary } from '$lib/models/types';
	import type { BriefCrash } from '$lib/models/briefCrash';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import BriefCrashBrowser from '$lib/components/BriefCrashBrowser.svelte';
	import LocationNearbyTable from '$lib/components/LocationNearbyTable.svelte';
	import { showCrashOnMap } from '$lib/pagination';

	let { location } = $props<{ location: Location }>();

	let allCrashes: BriefCrash[] = $state([]);
	let visibleCrashes: BriefCrash[] = $state([]);
	let loading: boolean = $state(true);
	let allTimeSummary: CrashSummary | null = $state(null);
	let nearbyLocations: NearbyLocation[] = $state([]);
	let topMapRef: MapContainer | undefined = $state(undefined);
	const mapRadiusFeet = $derived(location.isPoint ? 500 : 5280);

	$effect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		// Track location.id so this re-runs on navigation
		const locationId = location.id;

		loading = true;
		allCrashes = [];
		visibleCrashes = [];
		allTimeSummary = null;
		nearbyLocations = [];

		(async () => {
			try {
				const [briefResult, summary, nearby] = await Promise.all([
					getCrashesBrief({ locationId }, signal),
					getCrashSummary({ locationId }, signal),
					getNearbyLocations(locationId, 5, signal)
				]);

				if (signal.aborted) return;

				allCrashes = briefResult.crashes;
				visibleCrashes = briefResult.crashes;
				allTimeSummary = summary;
				nearbyLocations = nearby;
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				allCrashes = [];
				visibleCrashes = [];
			} finally {
				if (!signal.aborted) loading = false;
			}
		})();

		return () => controller.abort();
	});
</script>

<div class="location-detail">
	<div class="top-grid">
		<div class="stats-col">
			<LocationSummary crashes={allCrashes} {location} summary={allTimeSummary} compact={true} />
		</div>
		<div class="map-col">
			<div class="map-card top-map-card">
				<MapContainer
					bind:this={topMapRef}
					selectedLocation={location}
					crashes={visibleCrashes}
					defaultGeoCenter={[location.latitude, location.longitude]}
					maxDistance={mapRadiusFeet}
				/>
			</div>
		</div>
	</div>

	<LocationNearbyTable
		title={`Nearby ${location.pluralCategory}`}
		hrefBase={location.pluralCategory}
		locations={nearbyLocations}
	/>

	<BriefCrashBrowser
		crashes={allCrashes}
		{loading}
		emptyMessage="No crashes found for this location."
		showCrashOnMap={(id) => showCrashOnMap(topMapRef, id)}
		onFilteredCrashesChange={(items) => {
			visibleCrashes = items;
		}}
	/>
</div>

<style>
	.location-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.top-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.top-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.stats-col {
		min-width: 0;
	}

	.map-col {
		min-width: 0;
	}

	.map-card {
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #fff;
	}

	.top-map-card :global(.map-root) {
		height: 20rem;
		margin-bottom: 0;
	}

	@media (min-width: 768px) {
		.top-map-card :global(.map-root) {
			height: 28rem;
		}
	}
</style>
