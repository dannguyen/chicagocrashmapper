<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { getTopIntersections } from '$lib/api/client';
	import { SITE_NAME } from '$lib/constants';
	import type { IntersectionStat } from '$lib/db';
	import { parse as parseWkt, type GeoJSONGeometry } from 'wellknown';

	const defaultCenter: [number, number] = [41.8781, -87.6298];

	let topByCount: IntersectionStat[] = $state([]);
	let topByRecent: IntersectionStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let countMapHost: HTMLDivElement | null = $state(null);
	let recentMapHost: HTMLDivElement | null = $state(null);
	let countMap: import('leaflet').Map | null = null;
	let recentMap: import('leaflet').Map | null = null;
	const MIN_POLYGON_DIMENSION_PX = 28;

	function formatStats(item: IntersectionStat): string {
		return `${item.count.toLocaleString()} crashes · ${item.fatal_injuries.toLocaleString()} fatalities · ${item.serious_injuries.toLocaleString()} serious injuries`;
	}

	function escapeHtml(value: string): string {
		return value.replace(/[&<>"']/g, (ch) => {
			if (ch === '&') return '&amp;';
			if (ch === '<') return '&lt;';
			if (ch === '>') return '&gt;';
			if (ch === '"') return '&quot;';
			return '&#39;';
		});
	}

	function destroyMap(map: import('leaflet').Map | null): null {
		if (map) {
			map.remove();
		}
		return null;
	}

	function parseBoundaryWkt(boundaryWkt: string | null | undefined): GeoJSONGeometry | null {
		if (!boundaryWkt) return null;
		try {
			const geometry = parseWkt(boundaryWkt);
			if (!geometry) return null;
			if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null;
			return geometry;
		} catch {
			return null;
		}
	}

	async function buildMap(
		host: HTMLDivElement | null,
		items: IntersectionStat[],
		color: string
	): Promise<import('leaflet').Map | null> {
		if (!host) return null;
		const L = (await import('leaflet')).default;
		const map = L.map(host, {
			scrollWheelZoom: false,
			zoomControl: true
		});

		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);

		type RenderedFeature = {
			bubble: import('leaflet').CircleMarker;
			boundary: import('leaflet').GeoJSON | null;
		};
		const rendered: RenderedFeature[] = [];
		const bounds = L.latLngBounds([]);

		const setFeatureVisibility = () => {
			rendered.forEach((feature) => {
				if (!feature.boundary) {
					if (!map.hasLayer(feature.bubble)) feature.bubble.addTo(map);
					return;
				}

				const boundaryBounds = feature.boundary.getBounds();
				if (!boundaryBounds.isValid()) {
					if (!map.hasLayer(feature.bubble)) feature.bubble.addTo(map);
					if (map.hasLayer(feature.boundary)) map.removeLayer(feature.boundary);
					return;
				}

				const northWest = map.latLngToContainerPoint(boundaryBounds.getNorthWest());
				const southEast = map.latLngToContainerPoint(boundaryBounds.getSouthEast());
				const widthPx = Math.abs(southEast.x - northWest.x);
				const heightPx = Math.abs(southEast.y - northWest.y);
				const showBubble =
					widthPx < MIN_POLYGON_DIMENSION_PX || heightPx < MIN_POLYGON_DIMENSION_PX;

				if (showBubble) {
					if (!map.hasLayer(feature.bubble)) feature.bubble.addTo(map);
					if (map.hasLayer(feature.boundary)) map.removeLayer(feature.boundary);
				} else {
					if (!map.hasLayer(feature.boundary)) feature.boundary.addTo(map);
					if (map.hasLayer(feature.bubble)) map.removeLayer(feature.bubble);
				}
			});
		};

		items.forEach((item, index) => {
			const popupHtml = `${index + 1}. ${escapeHtml(item.name)}<br>${escapeHtml(formatStats(item))}`;
			const bubble = L.circleMarker([item.latitude, item.longitude], {
				radius: 8,
				color,
				weight: 2,
				fillColor: color,
				fillOpacity: 0.55
			});
			bubble.bindTooltip(`${index + 1}`, {
				permanent: true,
				direction: 'center',
				className: 'intersection-rank-marker'
			});
			bubble.bindPopup(popupHtml);
			bounds.extend([item.latitude, item.longitude]);

			let boundary: import('leaflet').GeoJSON | null = null;
			const geometry = parseBoundaryWkt(item.boundary_wkt);
			if (geometry) {
				boundary = L.geoJSON(geometry, {
					style: {
						color,
						weight: 2,
						fillColor: color,
						fillOpacity: 0.16
					}
				});
				boundary.bindTooltip(`${index + 1}`, {
					permanent: true,
					direction: 'center',
					className: 'intersection-rank-marker'
				});
				boundary.bindPopup(popupHtml);
				bounds.extend(boundary.getBounds());
			}

			rendered.push({ bubble, boundary });
		});

		if (bounds.isValid()) {
			map.fitBounds(bounds.pad(0.18));
		} else {
			map.setView(defaultCenter, 11);
		}

		setFeatureVisibility();
		map.on('zoomend moveend', setFeatureVisibility);
		requestAnimationFrame(() => map.invalidateSize());
		return map;
	}

	async function initMaps() {
		countMap = destroyMap(countMap);
		recentMap = destroyMap(recentMap);
		await tick();
		countMap = await buildMap(countMapHost, topByCount, '#1d4ed8');
		recentMap = await buildMap(recentMapHost, topByRecent, '#c2410c');
	}

	onMount(() => {
		let active = true;

		(async () => {
			try {
				const data = await getTopIntersections();
				if (!active) return;
				topByCount = data.by_count;
				topByRecent =
					data.by_recent_90_days && data.by_recent_90_days.length > 0
						? data.by_recent_90_days
						: data.by_recency;
			} catch {
				if (!active) return;
				error = 'Failed to load intersection statistics.';
			} finally {
				if (!active) return;
				loading = false;
				if (!error) {
					await initMaps();
				}
			}
		})();

		return () => {
			active = false;
			countMap = destroyMap(countMap);
			recentMap = destroyMap(recentMap);
		};
	});
</script>

<svelte:head>
	<title>Dangerous Intersections — {SITE_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Dangerous Intersections</h1>
		<p class="mt-1 text-sm text-gray-500">
			Top 20 intersections by severe-crash volume, counting crashes inside each intersection
			polygon.
		</p>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each Array(2) as _}
				<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
					<div class="bg-gray-50 border-b border-gray-200 px-5 py-4">
						<div class="h-3 bg-gray-200 rounded w-56 animate-pulse"></div>
					</div>
					<div class="h-72 bg-gray-100 border-b border-gray-100 animate-pulse"></div>
					<ul class="divide-y divide-gray-100">
						{#each Array(8) as _}
							<li class="px-5 py-3">
								<div class="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
								<div class="mt-2 h-3 bg-gray-200 rounded animate-pulse w-full"></div>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				<div class="bg-gray-50 border-b border-gray-200 px-5 py-4">
					<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						All-Time Most Crashes (inside polygon)
					</h2>
				</div>
				<div class="intersection-map" bind:this={countMapHost}></div>
				<ul class="divide-y divide-gray-100">
					{#each topByCount as item, i}
						<li class="px-5 py-3 hover:bg-blue-50 transition-colors">
							<div class="flex items-start gap-3">
								<span class="text-xl font-bold text-gray-300 w-8 shrink-0 tabular-nums"
									>{i + 1}</span
								>
								<div class="min-w-0">
									<a
										href="{base}/intersections/{item.id}"
										class="font-semibold text-gray-900 hover:text-blue-700 hover:underline text-sm leading-snug block"
									>
										{item.name}
									</a>
									<div class="text-sm text-gray-600 mt-0.5">{formatStats(item)}</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				<div class="bg-gray-50 border-b border-gray-200 px-5 py-4">
					<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Most Crashes Past 90 days (inside polygon)
					</h2>
				</div>
				<div class="intersection-map" bind:this={recentMapHost}></div>
				<ul class="divide-y divide-gray-100">
					{#each topByRecent as item, i}
						<li class="px-5 py-3 hover:bg-orange-50 transition-colors">
							<div class="flex items-start gap-3">
								<span class="text-xl font-bold text-gray-300 w-8 shrink-0 tabular-nums"
									>{i + 1}</span
								>
								<div class="min-w-0">
									<a
										href="{base}/intersections/{item.id}"
										class="font-semibold text-gray-900 hover:text-orange-700 hover:underline text-sm leading-snug block"
									>
										{item.name}
									</a>
									<div class="text-sm text-gray-600 mt-0.5">{formatStats(item)}</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.intersection-map {
		height: 18rem;
		width: 100%;
		border-bottom: 1px solid #f3f4f6;
	}

	:global(.intersection-rank-marker) {
		border: 0;
		background: transparent;
		box-shadow: none;
		color: #111827;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		margin: 0;
	}
</style>
