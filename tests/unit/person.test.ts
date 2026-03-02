import { describe, expect, it } from 'vitest';

import { Person } from '$lib/models/person';
import { makePersonRecord } from './fixtures';

describe('Person', () => {
	it('builds with provided fields', () => {
		const person = new Person(
			makePersonRecord({
				person_id: 'P1',
				sex: 'F',
				age: 30,
				injury_classification: 'FATAL'
			})
		);

		expect(person.person_id).toBe('P1');
		expect(person.person_type).toBe('DRIVER');
		expect(person.sex).toBe('F');
		expect(person.age).toBe(30);
		expect(person.city).toBe('Chicago');
		expect(person.state).toBe('IL');
		expect(person.injury_classification).toBe('FATAL');
	});

	describe('age handling', () => {
		it('preserves numeric ages directly', () => {
			expect(new Person(makePersonRecord({ age: 30 })).age).toBe(30);
			expect(new Person(makePersonRecord({ age: 0 })).age).toBe(0);
		});

		it('treats null age as null', () => {
			expect(new Person(makePersonRecord({ age: null })).age).toBeNull();
		});
	});

	describe('identity bool props', () => {
		describe('isAdult', () => {
			it('based solely on age >= 18', () => {
				expect(new Person(makePersonRecord({ age: 18 })).isAdult).toBe(true);
				expect(new Person(makePersonRecord({ age: 17 })).isAdult).toBe(false);
				expect(new Person(makePersonRecord({ age: null })).isAdult).toBe(false);
				expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: 0 })).isAdult).toBe(false);
			});
		});

		describe('isLikelyInfant', () => {
			it('age is 0, and another indicator', () => {
				expect(
					new Person(makePersonRecord({ age: 0, safety_equipment: 'CHILD RESTRAINT' }))
						.isLikelyInfant
				).toBe(true);
				expect(
					new Person(makePersonRecord({ age: 1, safety_equipment: 'CHILD RESTRAINT' }))
						.isLikelyInfant
				).toBe(false);

				expect(
					new Person(makePersonRecord({ age: 0, safety_equipment: 'SEATBELT' })).isLikelyInfant
				).toBe(false);
			});
		});

		describe('isDriver', () => {
			it('derives isDriver from person_type', () => {
				expect(new Person(makePersonRecord({ person_type: 'DRIVER' })).isDriver).toBe(true);
				expect(new Person(makePersonRecord({ person_type: 'PASSENGER' })).isDriver).toBe(false);
			});
		});

		describe('isCyclist', () => {
			it('derives isCyclist from person_type', () => {
				expect(new Person(makePersonRecord({ person_type: 'BICYCLE' })).isCyclist).toBe(true);
				expect(new Person(makePersonRecord({ person_type: 'NON-MOTOR VEHICLE' })).isCyclist).toBe(
					false
				);
			});
		});

		describe('isPedestrian', () => {
			it('derives isPedestrian from person_type', () => {
				expect(new Person(makePersonRecord({ person_type: 'PEDESTRIAN' })).isPedestrian).toBe(true);
				expect(
					new Person(makePersonRecord({ person_type: 'NON-MOTOR VEHICLE' })).isPedestrian
				).toBe(false);
			});
		});
	});

	describe('basic bool props', () => {
		describe('usedChildSafetyDevice', () => {
			it('looks for CHILD or BOOSTER in the safety_equipment', () => {
				expect(
					new Person(
						makePersonRecord({ age: 20, safety_equipment: 'CHILD RESTRAINT - fORWARD FACING' })
					).usedChildSafetyDevice
				).toBe(true);
				expect(
					new Person(makePersonRecord({ age: 40, safety_equipment: 'BOOSTER seat' }))
						.usedChildSafetyDevice
				).toBe(true);

				expect(
					new Person(makePersonRecord({ age: 0, safety_equipment: 'SEAT BELT' }))
						.usedChildSafetyDevice
				).toBe(false);
			});
		});

		describe('isDriver and ageUnknown', () => {
			it('treats pedestrian age 0 as ageUnknown', () => {
				expect(new Person(makePersonRecord({ person_type: 'PEDESTRIAN', age: 0 })).ageUnknown).toBe(
					true
				);
			});

			it('treats cyclist age 0 as ageUnknown', () => {
				expect(new Person(makePersonRecord({ person_type: 'BICYCLE', age: 0 })).ageUnknown).toBe(
					true
				);
			});

			it('does flags passengers with age 0 and no other detail as ageUnknown', () => {
				expect(new Person(makePersonRecord({ person_type: 'PASSENGER', age: 0 })).ageUnknown).toBe(
					true
				);
			});

			it('a driver with 0/null age is ALWAYS ageUnknown', () => {
				expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: 0 })).ageUnknown).toBe(
					true
				);
				expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: null })).ageUnknown).toBe(
					true
				);
			});

			it('does not flag drivers with age >= 2 as ageUnknown', () => {
				expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: 2 })).ageUnknown).toBe(
					false
				);
			});

			it('treats any person with null age as ageUnknown', () => {
				expect(
					new Person(makePersonRecord({ person_type: 'PASSENGER', age: null })).ageUnknown
				).toBe(true);
				expect(
					new Person(makePersonRecord({ person_type: 'PEDESTRIAN', age: null })).ageUnknown
				).toBe(true);
			});
		});
	});

	describe('ageLabel normal', () => {
		it('returns age-y.o. for positive ages', () => {
			expect(new Person(makePersonRecord({ age: 1, person_type: 'PASSENGER' })).ageLabel).toBe(
				'1-y.o.'
			);
			expect(new Person(makePersonRecord({ age: 123, person_type: 'PASSENGER' })).ageLabel).toBe(
				'123-y.o.'
			);
		});
	});

	describe('ageLabel: 0-age persons', () => {
		it('always returns unknown for drivers', () => {
			expect(new Person(makePersonRecord({ age: 0, person_type: 'DRIVER' })).ageLabel).toBe(
				'unknown age'
			);
		});

		it('returns infant for age-0 passengers, sans other details', () => {
			expect(new Person(makePersonRecord({ age: 0, person_type: 'PASSENGER' })).ageLabel).toBe(
				'unknown age'
			);
		});

		it('returns unknown age for non-passenger with null age', () => {
			expect(new Person(makePersonRecord({ age: null, person_type: 'PASSENGER' })).ageLabel).toBe(
				'unknown age'
			);
		});

		it('returns unknown age for drivers with age 0', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: 0 })).ageLabel).toBe(
				'unknown age'
			);
		});

		it('returns unknown age for drivers with null age', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: null })).ageLabel).toBe(
				'unknown age'
			);
		});
	});

	describe('human_noun', () => {
		it('derives man/woman for adults by sex', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: 30 })).human_noun).toBe('man');
			expect(new Person(makePersonRecord({ sex: 'F', age: 30 })).human_noun).toBe('woman');
		});

		it('derives boy/girl for minors by sex', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: 17 })).human_noun).toBe('boy');
			expect(new Person(makePersonRecord({ sex: 'F', age: 15 })).human_noun).toBe('girl');
		});

		it('returns infant for age-0 passengers sans more detail', () => {
			expect(
				new Person(makePersonRecord({ sex: 'X', age: 0, person_type: 'PASSENGER' })).human_noun
			).toBe('infant or unknown age person');
		});

		it('returns person for non-binary or unknown sex', () => {
			expect(new Person(makePersonRecord({ sex: 'X', age: 20 })).human_noun).toBe('person');
			expect(new Person(makePersonRecord({ sex: null, age: 20 })).human_noun).toBe('person');
		});

		it('returns person when ageUnknown is true (driver with age 0)', () => {
			expect(
				new Person(makePersonRecord({ person_type: 'DRIVER', age: 0, sex: 'M' })).human_noun
			).toBe('infant or unknown age person');
		});
	});

	describe('description', () => {
		it('combines ageLabel and human_noun', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: 30 })).description).toBe('30-y.o. man');
			expect(new Person(makePersonRecord({ sex: 'F', age: 15 })).description).toBe('15-y.o. girl');
		});

		it('says unknown age when age is unknown', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: null })).description).toBe(
				'unknown age male'
			);
			expect(new Person(makePersonRecord({ sex: 'F', age: null })).description).toBe(
				'unknown age female'
			);

			expect(new Person(makePersonRecord({ sex: null, age: null })).description).toBe(
				'unknown age person'
			);
		});

		it('deduplicates when ageLabel and human_noun are the same', () => {
			const infant = new Person(makePersonRecord({ sex: 'X', age: 0, person_type: 'PASSENGER' }));
			expect(infant.description).toBe('infant or unknown age person');
		});
	});

	describe('injury properties', () => {
		it('derives injury_level from classification', () => {
			expect(new Person(makePersonRecord({ injury_classification: 'FATAL' })).injury_level).toBe(
				'fatal'
			);
			expect(
				new Person(makePersonRecord({ injury_classification: 'INCAPACITATING INJURY' }))
					.injury_level
			).toBe('incapacitating');
			expect(
				new Person(makePersonRecord({ injury_classification: 'NONINCAPACITATING INJURY' }))
					.injury_level
			).toBe('non-incapacitating');
			expect(
				new Person(makePersonRecord({ injury_classification: 'NO INDICATION OF INJURY' }))
					.injury_level
			).toBe('none');
			expect(
				new Person(makePersonRecord({ injury_classification: 'REPORTED, NOT EVIDENT' }))
					.injury_level
			).toBe('unclear');
		});

		it('uses correct article (a/an) in injury string', () => {
			expect(new Person(makePersonRecord({ injury_classification: 'FATAL' })).injury).toBe(
				'a fatal injury'
			);
			expect(
				new Person(makePersonRecord({ injury_classification: 'INCAPACITATING INJURY' })).injury
			).toBe('an incapacitating injury');
		});

		it('computes isKilled, isInjured, and isUninjured', () => {
			const fatal = new Person(makePersonRecord({ injury_classification: 'FATAL' }));
			expect(fatal.isKilled).toBe(true);
			expect(fatal.isInjured).toBe(true);
			expect(fatal.isUninjured).toBe(false);

			const none = new Person(
				makePersonRecord({ injury_classification: 'NO INDICATION OF INJURY' })
			);
			expect(none.isKilled).toBe(false);
			expect(none.isInjured).toBe(false);
			expect(none.isUninjured).toBe(true);
		});
	});
});
