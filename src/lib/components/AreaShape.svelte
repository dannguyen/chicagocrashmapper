<script lang="ts">
	/**
	 * Renders a WKT polygon/multipolygon as an inline SVG thumbnail.
	 * Parses the WKT coordinate string and projects to SVG path coordinates.
	 */

	let {
		wkt,
		size = 48,
		fill = '#dbeafe',
		stroke = '#3b82f6'
	} = $props<{
		wkt: string;
		size?: number;
		fill?: string;
		stroke?: string;
	}>();

	type Ring = [number, number][];

	function parseCoords(s: string): Ring {
		const pairs: Ring = [];
		const re = /([-\d.]+)\s+([-\d.]+)/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s)) !== null) {
			pairs.push([parseFloat(m[1]), parseFloat(m[2])]);
		}
		return pairs;
	}

	function parsePolygonRings(wkt: string): Ring[] {
		const rings: Ring[] = [];
		let depth = 0;
		let ringStart = -1;
		for (let i = 0; i < wkt.length; i++) {
			if (wkt[i] === '(') {
				depth++;
				if (depth === 2) ringStart = i + 1;
			} else if (wkt[i] === ')') {
				if (depth === 2) {
					rings.push(parseCoords(wkt.slice(ringStart, i)));
				}
				depth--;
			}
		}
		return rings;
	}

	function parseMultiPolygonRings(wkt: string): Ring[][] {
		const polygons: Ring[][] = [];
		let currentPoly: Ring[] = [];
		let depth = 0;
		let ringStart = -1;
		for (let i = 0; i < wkt.length; i++) {
			if (wkt[i] === '(') {
				depth++;
				if (depth === 2) currentPoly = [];
				else if (depth === 3) ringStart = i + 1;
			} else if (wkt[i] === ')') {
				if (depth === 3) {
					currentPoly.push(parseCoords(wkt.slice(ringStart, i)));
				} else if (depth === 2) {
					if (currentPoly.length) polygons.push(currentPoly);
					currentPoly = [];
				}
				depth--;
			}
		}
		return polygons;
	}

	let pathData = $derived.by(() => {
		if (!wkt) return '';

		const upper = wkt.trimStart().toUpperCase();
		let allRings: Ring[];

		if (upper.startsWith('MULTIPOLYGON')) {
			const polys = parseMultiPolygonRings(wkt);
			allRings = polys.flat();
		} else if (upper.startsWith('POLYGON')) {
			allRings = parsePolygonRings(wkt);
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
