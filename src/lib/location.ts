import type { LocationRecord, LocationCategory } from '$lib/models/types';

export class Location {
	name: string;
	category: LocationCategory;
	longitude: number;
	latitude: number;
	id: string;
	the_geom: string;
	get isShape(): boolean {
		return this.category !== 'intersection';
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
		this.the_geom = data.the_geom;
	}
}
