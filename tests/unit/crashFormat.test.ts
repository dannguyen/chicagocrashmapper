import { describe, expect, it } from 'vitest';

import { Crash } from '$lib/crash';
import { contextInfo, fmtCause, peopleSummary, popupHtml } from '$lib/crashFormat';
import { makeCrashRecord, makePersonRecord, makeVehicleRecord } from './fixtures';

describe('fmtCause', () => {
	it('title-cases known causes', () => {
		expect(fmtCause('FAILING TO REDUCE SPEED TO AVOID CRASH')).toBe(
			'Failing To Reduce Speed To Avoid Crash'
		);
	});

	it('replaces UNABLE TO DETERMINE with Unknown cause', () => {
		expect(fmtCause('UNABLE TO DETERMINE')).toBe('Unknown cause');
	});

	it('replaces NOT APPLICABLE with N/A', () => {
		expect(fmtCause('NOT APPLICABLE')).toBe('N/A');
	});
});

describe('peopleSummary', () => {
	it('describes a single killed person', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({
								person_id: 'k1',
								injury_classification: 'FATAL',
								age: '40',
								sex: 'M'
							})
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe('40-year-old man killed');
	});

	it('uses count for multiple killed people', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({ person_id: 'k1', injury_classification: 'FATAL' }),
							makePersonRecord({ person_id: 'k2', injury_classification: 'FATAL' })
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toContain('2 people killed');
	});

	it('summarizes killed, serious, and minor injuries together', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({ person_id: 'k', injury_classification: 'FATAL', age: '40' }),
							makePersonRecord({
								person_id: 's',
								injury_classification: 'INCAPACITATING INJURY',
								age: '12',
								sex: 'F'
							}),
							makePersonRecord({
								person_id: 'm',
								injury_classification: 'REPORTED, NOT EVIDENT'
							})
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe(
			'40-year-old man killed, 12-year-old girl seriously injured, 1 minor injury'
		);
	});

	it('returns empty string when no people', () => {
		const crash = new Crash(makeCrashRecord({ vehicles: [], non_passengers: [] }));
		expect(peopleSummary(crash)).toBe('');
	});

	it('returns empty string when all people are uninjured', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ injury_classification: 'NO INDICATION OF INJURY' })]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe('');
	});
});

describe('contextInfo', () => {
	it('formats weather and trafficway', () => {
		const crash = new Crash(
			makeCrashRecord({ weather_condition: 'RAIN', trafficway_type: 'FOUR WAY' })
		);
		expect(contextInfo(crash)).toBe('Rain · Four Way');
	});

	it('excludes NOT DIVIDED trafficway', () => {
		const crash = new Crash(
			makeCrashRecord({ weather_condition: 'CLEAR', trafficway_type: 'NOT DIVIDED' })
		);
		expect(contextInfo(crash)).toBe('Clear');
	});

	it('returns empty string when both are null', () => {
		const crash = new Crash(makeCrashRecord({ weather_condition: null, trafficway_type: null }));
		expect(contextInfo(crash)).toBe('');
	});
});

describe('popupHtml', () => {
	it('includes severity label, formatted cause, and detail link', () => {
		const crash = new Crash(
			makeCrashRecord({
				crash_record_id: 'abc123',
				injuries_fatal: 1,
				prim_contributory_cause: 'UNABLE TO DETERMINE',
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ injury_classification: 'FATAL' })]
					})
				]
			})
		);

		const html = popupHtml(crash, 0);
		expect(html).toContain('FATAL');
		expect(html).toContain('Unknown Cause');
		expect(html).toContain('See details');
		expect(html).toContain('/crashes/abc123');
	});
});
