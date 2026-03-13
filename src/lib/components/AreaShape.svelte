<script lang="ts">
	/**
	 * Renders a GeoJSON polygon/multipolygon as an inline SVG thumbnail.
	 */
	import type { Geometry, MultiPolygon, Polygon } from 'geojson';

	let {
		geometry,
		size = 48,
		fill = '#dbeafe',
		stroke = '#3b82f6'
	} = $props<{
		geometry: Geometry | null;
		size?: number;
		fill?: string;
		stroke?: string;
	}>();

	type Ring = [number, number][];

	let pathData = $derived.by(() => {
		if (!geometry) return '';

		let allRings: Ring[] = [];
		if (geometry.type === 'Polygon') {
			allRings = (geometry as Polygon).coordinates as Ring[];
		} else if (geometry.type === 'MultiPolygon') {
			allRings = (geometry as MultiPolygon).coordinates.flat() as Ring[];
		} else {
			return '';
		}

		if (allRings.length === 0) return '';

		// Compute bounding box across all rings
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const ring of allRings) {
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

		// Scale to fit, preserving aspect ratio
		const scale = Math.min(drawSize / rangeX, drawSize / rangeY);
		const offsetX = padding + (drawSize - rangeX * scale) / 2;
		const offsetY = padding + (drawSize - rangeY * scale) / 2;

		// Project: lon→x, lat→y (flip Y since SVG y goes down)
		function project(lon: number, lat: number): [number, number] {
			return [offsetX + (lon - minX) * scale, offsetY + (maxY - lat) * scale];
		}

		let d = '';
		for (const ring of allRings) {
			if (ring.length < 3) continue;
			const [sx, sy] = project(ring[0][0], ring[0][1]);
			d += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
			for (let i = 1; i < ring.length; i++) {
				const [px, py] = project(ring[i][0], ring[i][1]);
				d += `L${px.toFixed(1)},${py.toFixed(1)}`;
			}
			d += 'Z';
		}

		return d;
	});
</script>

{#if pathData}
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="area-shape" aria-hidden="true">
		<path d={pathData} {fill} {stroke} stroke-width="1.5" fill-rule="evenodd" />
	</svg>
{/if}

<style>
	.area-shape {
		flex-shrink: 0;
		display: block;
	}
</style>
