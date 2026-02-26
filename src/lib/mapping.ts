import type { Location } from '$lib/location';
import type { Map, LayerGroup, Circle, Marker, GeoJSON, Layer } from 'leaflet';
import type L_Type from 'leaflet';
import wellknown from 'wellknown';

export class Mapper {
	L: typeof L_Type | null = null;
	map: Map | null = null;

	async init(elementId: string, center: [number, number], zoom: number) {
		this.L = (await import('leaflet')).default;
		this.map = this.L.map(elementId).setView(center, zoom);

		this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(this.map!); // Non-null assertion because we just assigned it

		return this.map;
	}

	destroy() {
		if (this.map) {
			this.map.remove(); // Leaflet cleanup
			this.map = null;
			this.L = null; // Clear Leaflet reference as well
		}
	}

	makeMapCircle(
		longitude: number,
		latitude: number,
		radius: number,
		color: string = '#3c80ff',
		opacity: number = 0.1
	): Circle {
		// radius should be in meters
		const circle = this.L!.circle([latitude, longitude], {
			color: color,
			fillColor: color,
			fillOpacity: opacity,
			weight: 1,
			radius: radius
		});
		return circle;
	}

	makePointMarker(location: Location): Marker {
		const mk = this.L!.marker([location.latitude, location.longitude]);
		mk.bindPopup(location.name).openPopup();
		return mk;
	}

	makeShapeMarker(location: Location): GeoJSON {
		const geometry = wellknown.parse(location.the_geom);
		const features = [
			{
				type: 'Feature',
				geometry,
				properties: {
					id: location.id,
					name: location.name,
					category: location.category
				}
			}
		];

		const mk = this.L!.geoJSON(
			{
				type: 'FeatureCollection',
				features
			} as import('geojson').FeatureCollection,
			{
				style: () => ({
					weight: 1,
					color: '#4455bb',
					fillOpacity: 0.4
				}),
				onEachFeature: (feature: import('geojson').Feature, layer: Layer) => {
					const p = feature.properties as Record<string, unknown>;
					if (p?.name) {
						layer.bindPopup(String(p.name));
					}
				}
			}
		);

		return mk;
	}
}
