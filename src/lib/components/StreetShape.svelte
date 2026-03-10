<script lang="ts">
	/**
	 * Renders a street linestring overlaid on the Chicago city boundary outline.
	 * Uses the static chicago-city-boundaries.json for the city silhouette and
	 * projects the street's WKT geometry on top.
	 */
	import { base } from '$app/paths';

	let {
		wkt,
		cityGeoJson,
		size = 48,
		cityFill = '#f3f4f6',
		cityStroke = '#d1d5db',
		streetStroke = '#2563eb',
		streetWidth = 2
	} = $props<{
		wkt: string;
		cityGeoJson: GeoJSON.FeatureCollection;
		size?: number;
		cityFill?: string;
		cityStroke?: string;
		streetStroke?: string;
		streetWidth?: number;
	}>();

	type Ring = [number, number][];

	function parseLineCoords(s: string): Ring {
		const pairs: Ring = [];
		const re = /([-\d.]+)\s+([-\d.]+)/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s)) !== null) {
			pairs.push([parseFloat(m[1]), parseFloat(m[2])]);
		}
		return pairs;
	}

	function parseWktLines(wkt: string): Ring[] {
		const upper = wkt.trimStart().toUpperCase();
		if (upper.startsWith('MULTILINESTRING')) {
			// Parse each linestring within the multi
			const lines: Ring[] = [];
			let depth = 0;
			let start = -1;
			for (let i = 0; i < wkt.length; i++) {
				if (wkt[i] === '(') {
					depth++;
					if (depth === 2) start = i + 1;
				} else if (wkt[i] === ')') {
					if (depth === 2) {
						lines.push(parseLineCoords(wkt.slice(start, i)));
					}
					depth--;
				}
			}
			return lines;
		} else if (upper.startsWith('LINESTRING')) {
			const parenStart = wkt.indexOf('(');
			const parenEnd = wkt.lastIndexOf(')');
			if (parenStart >= 0 && parenEnd > parenStart) {
				return [parseLineCoords(wkt.slice(parenStart + 1, parenEnd))];
			}
		}
		return [];
	}

	function extractCityRings(geoJson: GeoJSON.FeatureCollection): Ring[] {
		const rings: Ring[] = [];
		for (const feature of geoJson.features) {
			const geom = feature.geometry;
			if (geom.type === 'Polygon') {
				for (const ring of geom.coordinates) {
					rings.push(ring as Ring);
				}
			} else if (geom.type === 'MultiPolygon') {
				for (const polygon of geom.coordinates) {
					for (const ring of polygon) {
						rings.push(ring as Ring);
					}
				}
			}
		}
		return rings;
	}

	let paths = $derived.by(() => {
		if (!wkt || !cityGeoJson) return { city: '', street: '' };

		const cityRings = extractCityRings(cityGeoJson);
		const streetLines = parseWktLines(wkt);
		if (cityRings.length === 0) return { city: '', street: '' };

		// Compute bounding box from city boundary
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const ring of cityRings) {
			for (const [x, y] of ring) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}

		const rangeX = maxX - minX || 1e-6;
		const rangeY = maxY - minY || 1e-6;
		const padding = 2;
		const drawSize = size - padding * 2;
		const scale = Math.min(drawSize / rangeX, drawSize / rangeY);
		const offsetX = padding + (drawSize - rangeX * scale) / 2;
		const offsetY = padding + (drawSize - rangeY * scale) / 2;

		function project(lon: number, lat: number): [number, number] {
			return [offsetX + (lon - minX) * scale, offsetY + (maxY - lat) * scale];
		}

		// Build city outline path
		let cityD = '';
		for (const ring of cityRings) {
			if (ring.length < 3) continue;
			const [sx, sy] = project(ring[0][0], ring[0][1]);
			cityD += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
			for (let i = 1; i < ring.length; i++) {
				const [px, py] = project(ring[i][0], ring[i][1]);
				cityD += `L${px.toFixed(1)},${py.toFixed(1)}`;
			}
			cityD += 'Z';
		}

		// Build street line path
		let streetD = '';
		for (const line of streetLines) {
			if (line.length < 2) continue;
			const [sx, sy] = project(line[0][0], line[0][1]);
			streetD += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
			for (let i = 1; i < line.length; i++) {
				const [px, py] = project(line[i][0], line[i][1]);
				streetD += `L${px.toFixed(1)},${py.toFixed(1)}`;
			}
		}

		return { city: cityD, street: streetD };
	});
</script>

{#if paths.city}
	<svg
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		class="street-shape"
		aria-hidden="true"
	>
		<path
			d={paths.city}
			fill={cityFill}
			stroke={cityStroke}
			stroke-width="0.5"
			fill-rule="evenodd"
		/>
		{#if paths.street}
			<path
				d={paths.street}
				fill="none"
				stroke={streetStroke}
				stroke-width={streetWidth}
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}
	</svg>
{/if}

<style>
	.street-shape {
		flex-shrink: 0;
		display: block;
	}
</style>
