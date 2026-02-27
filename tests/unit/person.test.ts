import { describe, expect, it } from 'vitest';

import { Person } from '$lib/crash';
import { makePersonRecord } from './fixtures';

describe('Person', () => {
	it('builds with provided fields', () => {
		const person = new Person(
			makePersonRecord({
				person_id: 'P1',
				sex: 'F',
				age: '30',
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

	it('defaults all fields to null with empty constructor', () => {
		const person = new Person();
		expect(person.person_id).toBeNull();
		expect(person.person_type).toBeNull();
		expect(person.sex).toBeNull();
		expect(person.age).toBeNull();
		expect(person.city).toBeNull();
	});

	describe('age normalization', () => {
		it('parses numeric string ages', () => {
			expect(new Person(makePersonRecord({ age: '30' })).age).toBe(30);
			expect(new Person(makePersonRecord({ age: '0' })).age).toBe(0);
			expect(new Person(makePersonRecord({ age: '0.5' })).age).toBe(0.5);
		});

		it('treats blank, whitespace, and non-numeric ages as null', () => {
			expect(new Person(makePersonRecord({ age: '' })).age).toBeNull();
			expect(new Person(makePersonRecord({ age: '  ' })).age).toBeNull();
			expect(new Person(makePersonRecord({ age: 'not-a-number' })).age).toBeNull();
		});

		it('treats undefined/null age as null', () => {
			expect(new Person(makePersonRecord({ age: undefined })).age).toBeNull();
			expect(new Person(makePersonRecord({ age: null })).age).toBeNull();
		});
	});

	describe('ageLabel', () => {
		it('returns age-year-old for positive ages', () => {
			expect(new Person(makePersonRecord({ age: '1', person_type: 'PASSENGER' })).ageLabel).toBe(
				'1-year-old'
			);
			expect(new Person(makePersonRecord({ age: '123', person_type: 'PASSENGER' })).ageLabel).toBe(
				'123-year-old'
			);
		});

		it('returns baby label for age < 1', () => {
			expect(new Person(makePersonRecord({ age: '0', person_type: 'PASSENGER' })).ageLabel).toBe(
				'baby (or age unknown)'
			);
		});

		it('returns (age unknown) for non-driver with missing age', () => {
			expect(new Person(makePersonRecord({ age: null, person_type: 'PASSENGER' })).ageLabel).toBe(
				'(age unknown)'
			);
		});

		it('returns age unknown for drivers with age 0 or 1', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '0' })).ageLabel).toBe(
				'age unknown'
			);
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '1' })).ageLabel).toBe(
				'age unknown'
			);
		});
	});

	describe('noun', () => {
		it('derives man/woman for adults by sex', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: '30' })).noun).toBe('man');
			expect(new Person(makePersonRecord({ sex: 'F', age: '30' })).noun).toBe('woman');
		});

		it('derives boy/girl for minors by sex', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: '15' })).noun).toBe('boy');
			expect(new Person(makePersonRecord({ sex: 'F', age: '15' })).noun).toBe('girl');
		});

		it('returns baby for non-gendered infants under 1', () => {
			expect(
				new Person(makePersonRecord({ sex: 'X', age: '0.5', person_type: 'PASSENGER' })).noun
			).toBe('baby (or age unknown)');
		});

		it('returns person for non-binary or unknown sex', () => {
			expect(new Person(makePersonRecord({ sex: 'X', age: '20' })).noun).toBe('person');
			expect(new Person(makePersonRecord({ sex: null, age: '20' })).noun).toBe('person');
		});

		it('returns person when ageUnknown is true (driver with age <= 1)', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '0', sex: 'M' })).noun).toBe(
				'person'
			);
		});
	});

	describe('description', () => {
		it('combines ageLabel and noun', () => {
			expect(new Person(makePersonRecord({ sex: 'M', age: '30' })).description).toBe(
				'30-year-old man'
			);
			expect(new Person(makePersonRecord({ sex: 'F', age: '15' })).description).toBe(
				'15-year-old girl'
			);
		});

		it('deduplicates when ageLabel and noun are the same', () => {
			const infant = new Person(
				makePersonRecord({ sex: 'X', age: '0.5', person_type: 'PASSENGER' })
			);
			expect(infant.description).toBe('baby (or age unknown)');
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
			expect(new Person(makePersonRecord({ injury_classification: null })).injury_level).toBe(
				'unknown'
			);
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

	describe('isDriver and ageUnknown', () => {
		it('derives isDriver from person_type', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER' })).isDriver).toBe(true);
			expect(new Person(makePersonRecord({ person_type: 'PASSENGER' })).isDriver).toBe(false);
		});

		it('treats driver age 0, 1, or missing as ageUnknown', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '0' })).ageUnknown).toBe(
				true
			);
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '1' })).ageUnknown).toBe(
				true
			);
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: null })).ageUnknown).toBe(
				true
			);
		});

		it('does not flag passengers with age 0 as ageUnknown', () => {
			expect(new Person(makePersonRecord({ person_type: 'PASSENGER', age: '0' })).ageUnknown).toBe(
				false
			);
		});

		it('does not flag drivers with age >= 2 as ageUnknown', () => {
			expect(new Person(makePersonRecord({ person_type: 'DRIVER', age: '2' })).ageUnknown).toBe(
				false
			);
		});
	});
});
