<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { getTopIntersections } from '$lib/api/client';
	import { SITE_TITLE, CHICAGO_CENTER } from '$lib/constants';
	import { Mapper, type MapLibreMarker } from '$lib/mapping';
	import type { IntersectionStat } from '$lib/models/types';
	import { escapeHtml } from '$lib/inputHelpers';

	const defaultCenter = CHICAGO_CENTER;

	type BuiltMap = {
		mapper: Mapper;
		markers: MapLibreMarker[];
	};

	let topByCount: IntersectionStat[] = $state([]);
	let topByRecent: IntersectionStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let countMapHost: HTMLDivElement | null = $state(null);
	let recentMapHost: HTMLDivElement | null = $state(null);
	let countMap: BuiltMap | null = $state(null);
	let recentMap: BuiltMap | null = $state(null);

	function formatStats(item: IntersectionStat): string {
		return `${item.count.toLocaleString()} crashes · ${item.fatal_injuries.toLocaleString()} fatalities · ${item.serious_injuries.toLocaleString()} serious injuries`;
	}

	function createRankMarker(index: number, color: string) {
		const marker = document.createElement('button');
		marker.type = 'button';
		marker.className = 'intersection-rank-marker';
		marker.style.background = color;
		marker.textContent = String(index + 1);
		return marker;
	}

	function destroyMap(state: BuiltMap | null): null {
		if (state) {
			for (const marker of state.markers) {
				marker.remove();
			}
			state.mapper.destroy();
		}
		return null;
	}

	async function buildMap(
		host: HTMLDivElement | null,
		items: IntersectionStat[],
		color: string
	): Promise<BuiltMap | null> {
		if (!host) return null;

		const mapper = new Mapper();
		await mapper.init(host, defaultCenter, 11, {
			scrollZoom: false
		});

		if (!mapper.map || !mapper.maplibre) {
			return null;
		}

		const markers: MapLibreMarker[] = [];
		let bounds = mapper.getPointsBounds([]);

		for (const [index, item] of items.entries()) {
			const popupHtml = `${index + 1}. ${escapeHtml(item.name)}<br>${escapeHtml(formatStats(item))}`;
			const popup = mapper.createPopup(popupHtml, '260px');
			const marker = new mapper.maplibre.Marker({
				element: createRankMarker(index, color),
				anchor: 'center'
			})
				.setLngLat([item.longitude, item.latitude])
				.addTo(mapper.map);

			if (popup) {
				marker.setPopup(popup);
			}

			markers.push(marker);
			bounds = mapper.extendBounds(
				bounds,
				mapper.getPointsBounds([[item.latitude, item.longitude]])
			);
		}

		if (bounds) {
			mapper.fitBounds(bounds, 40);
		} else {
			mapper.setView(defaultCenter, 11, { animate: false });
		}

		requestAnimationFrame(() => mapper.resize());
		return { mapper, markers };
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
				topByRecent = data.by_recent;
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
	<title>Dangerous Intersections — {SITE_TITLE}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Dangerous Intersections</h1>
		<p class="mt-1 text-sm text-gray-500">Top 20 intersections by severe-crash volume.</p>
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
						All-Time Most Crashes
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
						Most Crashes Past 90 days
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
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 9999px;
		border: 2px solid rgba(255, 255, 255, 0.9);
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
		cursor: pointer;
	}
</style>
