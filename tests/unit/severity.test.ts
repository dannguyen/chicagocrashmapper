import { describe, expect, it } from 'vitest';

import { Crash } from '$lib/models/crash';
import { Person } from '$lib/models/person';

import { crashSeverity, injuryLabel, personInjuryLevel, severityLabel } from '$lib/severity';
import { makeCrashRecord, makePersonRecord } from './fixtures';

describe('crashSeverity', () => {
	it('returns fatal when there are fatal injuries', () => {
		expect(
			crashSeverity(new Crash(makeCrashRecord({ injuries_fatal: 1, injuries_incapacitating: 0 })))
		).toBe('fatal');
	});

	it('returns serious when there are incapacitating injuries', () => {
		expect(
			crashSeverity(new Crash(makeCrashRecord({ injuries_fatal: 0, injuries_incapacitating: 2 })))
		).toBe('serious');
	});

	it('returns minor for non-incapacitating or not-evident injuries', () => {
		expect(
			crashSeverity(
				new Crash(
					makeCrashRecord({
						injuries_fatal: 0,
						injuries_incapacitating: 0,
						injuries_non_incapacitating: 1
					})
				)
			)
		).toBe('minor');

		expect(
			crashSeverity(
				new Crash(
					makeCrashRecord({
						injuries_fatal: 0,
						injuries_incapacitating: 0,
						injuries_non_incapacitating: 0,
						injuries_reported_not_evident: 1
					})
				)
			)
		).toBe('minor');
	});

	it('returns none when there are no injuries', () => {
		expect(
			crashSeverity(
				new Crash(
					makeCrashRecord({
						injuries_fatal: 0,
						injuries_incapacitating: 0,
						injuries_non_incapacitating: 0,
						injuries_reported_not_evident: 0
					})
				)
			)
		).toBe('none');
	});
});

describe('severityLabel', () => {
	it('maps severity levels to human labels', () => {
		expect(severityLabel('fatal')).toBe('Fatal');
		expect(severityLabel('serious')).toBe('Serious');
		expect(severityLabel('minor')).toBe('Minor');
		expect(severityLabel('none')).toBe('No injury');
	});
});

describe('personInjuryLevel', () => {
	it('maps Person injury_level to InjuryLevel', () => {
		expect(
			personInjuryLevel(new Person(makePersonRecord({ injury_classification: 'FATAL' })))
		).toBe('fatal');
		expect(
			personInjuryLevel(
				new Person(makePersonRecord({ injury_classification: 'INCAPACITATING INJURY' }))
			)
		).toBe('serious');
		expect(
			personInjuryLevel(
				new Person(makePersonRecord({ injury_classification: 'NONINCAPACITATING INJURY' }))
			)
		).toBe('minor');
		expect(
			personInjuryLevel(
				new Person(makePersonRecord({ injury_classification: 'REPORTED, NOT EVIDENT' }))
			)
		).toBe('unclear');
		expect(
			personInjuryLevel(
				new Person(makePersonRecord({ injury_classification: 'NO INDICATION OF INJURY' }))
			)
		).toBe('none');
		expect(
			personInjuryLevel(
				new Person(makePersonRecord({ injury_classification: 'SOMETHING UNEXPECTED' }))
			)
		).toBe('unknown');
	});
});

describe('injuryLabel', () => {
	it('maps injury levels to human labels', () => {
		expect(injuryLabel('fatal')).toBe('Fatal');
		expect(injuryLabel('serious')).toBe('Serious');
		expect(injuryLabel('minor')).toBe('Minor');
		expect(injuryLabel('none')).toBe('Uninjured');
		expect(injuryLabel('unclear')).toBe('Not evident');
		expect(injuryLabel('unknown')).toBe('');
	});
});
