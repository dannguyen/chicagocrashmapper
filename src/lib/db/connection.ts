/**
 * Database connection and initialization
 */

import initSqlite from '@sqlite.org/sqlite-wasm';
import { assets } from '$app/paths';
import type { DbInstance } from './types';
import { registerGeospatialFunctions } from './spatial';

export class DatabaseConnection {
	db: DbInstance | null = null;
	url: string;

	constructor(dbUrl: string) {
		this.url = dbUrl;
	}

	async init(): Promise<void> {
		const sqlite3 = await initSqlite({
			locateFile: (name) => `${assets}/${name}`
		});

		const capi = sqlite3.capi;
		const wasm = sqlite3.wasm;

		const buf = await fetch(this.url).then((r) => r.arrayBuffer());
		const bytes = new Uint8Array(buf);

		// allocate WASM memory and copy DB bytes in
		const p = wasm.allocFromTypedArray(bytes);

		// create empty DB
		const db = new sqlite3.oo1.DB();

		// deserialize bytes into DB
		const rc = capi.sqlite3_deserialize(
			db.pointer as number,
			'main',
			p,
			bytes.length,
			bytes.length,
			capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY
		);

		if (rc) throw new Error('deserialize failed');

		registerGeospatialFunctions(db);

		this.db = db;
	}

	getDatabaseSummary(): { type: string; count: number }[] {
		if (!this.db) return [];

		const results = this.db.exec({
			sql: `
				SELECT
					'Locations' AS type
					, COUNT(1) AS count
				FROM locations
				UNION ALL
				SELECT
					'Incidents' AS type
					, COUNT(1) AS count
				FROM incidents
			`,
			rowMode: 'object'
		});

		return results as { type: string; count: number }[];
	}
}

export async function initDb(dbUrl: string): Promise<DatabaseConnection> {
	const conn = new DatabaseConnection(dbUrl);
	await conn.init();
	return conn;
}
