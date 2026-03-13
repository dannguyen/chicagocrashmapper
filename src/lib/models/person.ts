import type { PersonRecord } from '$lib/models/types';

export class Person {
	age: number | null;
	airbag_deployed: string | null;
	city: string | null;
	driver_action: string | null;
	driver_vision: string | null;
	drivers_license_state: string | null;
	ejection: string | null;
	hospital: string | null;
	injury_classification: string;
	person_id: string;
	person_type: string;
	physical_condition: string | null;
	safety_equipment: string | null;
	sex: string | null;
	state: string | null;

	constructor(record: PersonRecord) {
		this.age = record.age ?? null;
		this.airbag_deployed = record.airbag_deployed ?? null;
		this.city = record.city ?? null;
		this.driver_action = record.driver_action ?? null;
		this.driver_vision = record.driver_vision ?? null;
		this.drivers_license_state = record.drivers_license_state ?? null;
		this.ejection = record.ejection ?? null;
		this.hospital = record.hospital ?? null;
		this.injury_classification = record.injury_classification;
		this.person_id = record.person_id;
		this.person_type = record.person_type;
		this.physical_condition = record.physical_condition ?? null;
		this.safety_equipment = record.safety_equipment ?? null;
		this.sex = record.sex ?? null;
		this.state = record.state ?? null;
	}

	get ageAmbiguousZero(): boolean {
		return this.ageZero && !this.isLikelyInfant;
	}

	get ageLabel(): string | null {
		if (this.isLikelyInfant) {
			return 'baby';
		} else if (!this.ageUnknown) {
			return `${this.age}-y.o.`;
		} else {
			return 'unknown age';
		}
	}

	get ageUnknown(): boolean {
		return this.age === null || (this.ageZero && !this.isLikelyInfant);
	}

	get ageZero(): boolean {
		return this.age === 0;
	}

	get category(): string {
		return this.person_type;
	}

	get description(): string {
		if (this.ageAmbiguousZero) {
			return this.human_noun;
		} else {
			return `${this.ageLabel} ${this.human_noun}`;
		}
	}

	get human_noun(): string {
		if (this.ageAmbiguousZero) {
			return 'infant or unknown age person';
		} else if (this.ageZero) {
			return this.isFemale ? 'female' : 'male';
		} else if (this.ageUnknown) {
			if (this.sexUnknown) {
				return 'person';
			} else {
				return this.isFemale ? 'female' : 'male';
			}
		} else if (this.isChild) {
			if (this.sexUnknown) {
				return 'child';
			} else {
				return this.isFemale ? 'girl' : 'boy';
			}
		} else if (this.isAdult) {
			if (this.sexUnknown) {
				return 'person';
			} else {
				return this.isFemale ? 'woman' : 'man';
			}
		} else {
			return 'person';
		}
	}

	get injury(): string {
		if (['a', 'e', 'i', 'o', 'u'].includes(this.injury_level[0])) {
			return `an ${this.injury_level} injury`;
		} else {
			return `a ${this.injury_level} injury`;
		}
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

	get isAdult(): boolean {
		return this.age !== null && this.age >= 18;
	}

	get isChild(): boolean {
		return this.isLikelyInfant || (this.age !== null && this.age > 0 && this.age < 18);
	}

	get isCyclist(): boolean {
		return this.category === 'BICYCLE';
	}

	get isDriver(): boolean {
		return this.category === 'DRIVER';
	}

	get isFemale(): boolean {
		return this.sex === 'F';
	}

	get isInjured(): boolean {
		return ['fatal', 'incapacitating', 'non-incapacitating', 'unclear'].includes(this.injury_level);
	}

	get isKilled(): boolean {
		return this.injury_level === 'fatal';
	}

	get isLikelyInfant(): boolean {
		return this.age === 0 && this.usedChildSafetyDevice;
	}

	get isMale(): boolean {
		return this.sex === 'M';
	}

	get isPedestrian(): boolean {
		return this.category === 'PEDESTRIAN';
	}

	get isSeriouslyInjured(): boolean {
		return this.injury_level === 'incapacitating';
	}

	get isUninjured(): boolean {
		return ['none'].includes(this.injury_level);
	}

	get sexUnknown(): boolean {
		return (this.isFemale || this.isMale) === false;
	}

	get usedChildSafetyDevice(): boolean {
		return this.safety_equipment !== null && /CHILD|BOOSTER/i.test(this.safety_equipment);
	}
}

export class People extends Array<Person> {
	// Category filters
	get cyclists(): People {
		return new People(...this.filter((p) => p.isCyclist));
	}
	get drivers(): People {
		return new People(...this.filter((p) => p.isDriver));
	}
	get pedestrians(): People {
		return new People(...this.filter((p) => p.isPedestrian));
	}

	// Demographic filters
	get adults(): People {
		return new People(...this.filter((p) => p.isAdult));
	}
	get children(): People {
		return new People(...this.filter((p) => p.isChild));
	}

	// Injury filters
	get injured(): People {
		return new People(...this.filter((p) => p.isInjured));
	}
	get killed(): People {
		return new People(...this.filter((p) => p.isKilled));
	}
	get seriously_harmed(): People {
		return new People(...this.filter((p) => p.isKilled || p.isSeriouslyInjured));
	}
	get seriously_injured(): People {
		return new People(...this.filter((p) => p.isSeriouslyInjured));
	}
	get uninjured(): People {
		return new People(...this.filter((p) => p.isUninjured));
	}
}
