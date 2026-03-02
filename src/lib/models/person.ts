export class Person {
	person_id: string;
	person_type: string;
	sex: string | null;
	age: number | null;
	city: string | null;
	state: string | null;
	injury_classification: string;
	drivers_license_state: string | null;
	airbag_deployed: string | null;
	ejection: string | null;
	safety_equipment: string | null;
	hospital: string | null;
	physical_condition: string | null;
	driver_vision: string | null;
	driver_action: string | null;

	constructor(record: PersonRecord) {
		this.person_id = record.person_id;
		this.person_type = record.person_type;
		this.sex = record.sex ?? null;
		this.age = record.age ?? null;
		this.city = record.city ?? null;
		this.state = record.state ?? null;
		this.injury_classification = record.injury_classification;
		this.drivers_license_state = record.drivers_license_state ?? null;
		this.airbag_deployed = record.airbag_deployed ?? null;
		this.ejection = record.ejection ?? null;
		this.safety_equipment = record.safety_equipment ?? null;
		this.hospital = record.hospital ?? null;
		this.physical_condition = record.physical_condition ?? null;
		this.driver_vision = record.driver_vision ?? null;
		this.driver_action = record.driver_action ?? null;
	}

	get noun(): string {
		if (this.ageUnknown) {
			return 'person';
		} else if (this.age === 0 && this.person_type === 'PASSENGER') {
			return 'baby or person of unknown age';
		} else if (this.sex === 'M') {
			return this.age != null && this.age >= 18 ? 'man' : 'boy';
		} else if (this.sex === 'F') {
			return this.age != null && this.age >= 18 ? 'woman' : 'girl';
		} else {
			return 'person';
		}
	}

	get ageLabel(): string {
		if (this.ageUnknown) {
			return 'age unknown';
		} else if (this.age === 0 && this.person_type === 'PASSENGER') {
			return 'baby or person of unknown age';
		} else if (this.age != null && this.age > 0) {
			return `${this.age}-year-old`;
		} else {
			return 'age unknown';
		}
	}

	get description(): string {
		const thing = [this.ageLabel, this.noun].filter((t) => t != null && t !== '');
		return [...new Set(thing)].join(' ');
	}

	get injury_level(): string {
		if (this.injury_classification === 'FATAL') {
			return 'fatal';
		} else if (this.injury_classification === 'INCAPACITATING INJURY') {
			return 'incapacitating';
		} else if (this.injury_classification === 'NONINCAPACITATING INJURY') {
			return 'non-incapacitating';
		} else if (this.injury_classification === 'NO INDICATION OF INJURY') {
			return 'none';
		} else if (this.injury_classification === 'REPORTED, NOT EVIDENT') {
			return 'unclear';
		} else {
			return 'unknown';
		}
	}

	get isInjured(): boolean {
		return ['fatal', 'incapacitating', 'non-incapacitating', 'unclear'].includes(this.injury_level);
	}

	get injury(): string {
		if (['a', 'e', 'i', 'o', 'u'].includes(this.injury_level[0])) {
			return `an ${this.injury_level} injury`;
		} else {
			return `a ${this.injury_level} injury`;
		}
	}

	get isUninjured(): boolean {
		return ['none'].includes(this.injury_level);
	}

	get isKilled(): boolean {
		return this.injury_level === 'fatal';
	}

	get category(): string {
		return this.person_type;
	}
	get isDriver(): boolean {
		return this.category === 'DRIVER';
	}

	get ageUnknown(): boolean {
		return this.age === null || (this.age === 0 && this.person_type !== 'PASSENGER');
	}
}

export interface PersonRecord {
	person_id: string;
	person_type: string;
	sex: string | null;
	age: number | null;
	city: string | null;
	state: string | null;
	injury_classification: string;
	drivers_license_state: string | null;
	airbag_deployed: string | null;
	ejection: string | null;
	safety_equipment: string | null;
	hospital: string | null;
	physical_condition: string | null;
	driver_vision: string | null;
	driver_action: string | null;
}
