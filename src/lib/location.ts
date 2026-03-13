import type { LocationRecord, LocationCategory } from '$lib/models/types';
import type { Geometry } from 'geojson';

export class Location {
	name: string;
	category: LocationCategory;
	longitude: number;
	latitude: number;
	id: string;
	geometry: Geometry | null;
	get isShape(): boolean {
		return this.category !== 'intersection' && this.geometry != null;
	}
	get isPoint(): boolean {
		return this.category === 'intersection';
	}

	get pluralCategory(): string {
		return `${this.category}s`;
	}

	constructor(data: LocationRecord) {
		this.name = data.name;
		this.category = data.category;
		this.longitude = data.longitude;
		this.latitude = data.latitude;
		this.id = data.id;
		this.geometry = data.geometry ?? null;
	}
}
