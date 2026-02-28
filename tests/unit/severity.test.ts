import { describe, expect, it } from 'vitest';

import { Crash, Person } from '$lib/crash';
import {
	crashSeverity,
	injuryDotClass,
	injuryLabel,
	injuryTextClass,
	personInjuryLevel,
	severityBadgeClass,
	severityBorderClass,
	severityLabel,
	severityLabelClass,
	severityPinClass
} from '$lib/severity';
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

describe('severity CSS helpers', () => {
	it('maps severity levels to border classes', () => {
		expect(severityBorderClass('fatal')).toBe('border-l-red-600');
		expect(severityBorderClass('serious')).toBe('border-l-purple-600');
		expect(severityBorderClass('minor')).toBe('border-l-amber-500');
		expect(severityBorderClass('none')).toBe('border-l-gray-200');
	});

	it('maps severity levels to badge classes', () => {
		expect(severityBadgeClass('fatal')).toBe('bg-red-100 text-red-700');
		expect(severityBadgeClass('serious')).toBe('bg-purple-100 text-purple-700');
		expect(severityBadgeClass('minor')).toBe('bg-amber-100 text-amber-700');
		expect(severityBadgeClass('none')).toBe('bg-gray-100 text-gray-600');
	});

	it('maps severity levels to pin classes', () => {
		expect(severityPinClass('fatal')).toBe('bg-red-600');
		expect(severityPinClass('serious')).toBe('bg-purple-600');
		expect(severityPinClass('minor')).toBe('bg-amber-500');
		expect(severityPinClass('none')).toBe('bg-gray-400');
	});

	it('maps severity levels to human labels', () => {
		expect(severityLabel('fatal')).toBe('Fatal');
		expect(severityLabel('serious')).toBe('Serious');
		expect(severityLabel('minor')).toBe('Minor');
		expect(severityLabel('none')).toBe('No injury');
	});

	it('maps severity levels to label text classes', () => {
		expect(severityLabelClass('fatal')).toBe('text-red-600');
		expect(severityLabelClass('serious')).toBe('text-purple-600');
		expect(severityLabelClass('minor')).toBe('text-amber-600');
		expect(severityLabelClass('none')).toBe('text-gray-400');
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

describe('injury CSS and label helpers', () => {
	it('maps injury levels to dot classes', () => {
		expect(injuryDotClass('fatal')).toBe('bg-red-600');
		expect(injuryDotClass('serious')).toBe('bg-purple-600');
		expect(injuryDotClass('minor')).toBe('bg-amber-500');
		expect(injuryDotClass('none')).toBe('bg-green-600');
		expect(injuryDotClass('unknown')).toBe('bg-gray-400');
	});

	it('maps injury levels to text classes', () => {
		expect(injuryTextClass('fatal')).toBe('text-red-600 font-semibold');
		expect(injuryTextClass('serious')).toBe('text-purple-600 font-semibold');
		expect(injuryTextClass('minor')).toBe('text-amber-600');
		expect(injuryTextClass('none')).toBe('text-green-600');
		expect(injuryTextClass('unknown')).toBe('text-gray-400');
	});

	it('maps injury levels to human labels', () => {
		expect(injuryLabel('fatal')).toBe('Fatal');
		expect(injuryLabel('serious')).toBe('Serious');
		expect(injuryLabel('minor')).toBe('Minor');
		expect(injuryLabel('none')).toBe('Uninjured');
		expect(injuryLabel('unclear')).toBe('Not evident');
		expect(injuryLabel('unknown')).toBe('');
	});
});
