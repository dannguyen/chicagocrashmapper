<script lang="ts">
	import { base } from '$app/paths';
	import type { NearbyLocation } from '$lib/api/client';

	let { title, hrefBase, locations } = $props<{
		title: string;
		hrefBase: string;
		locations: NearbyLocation[];
	}>();
</script>

{#if locations.length > 0}
	<div class="nearby-locations-card">
		<p class="info-title">{title}</p>
		<table class="nearby-table">
			<thead>
				<tr>
					<th class="nearby-th">Name</th>
					<th class="nearby-th nearby-th-right">Crashes</th>
				</tr>
			</thead>
			<tbody>
				{#each locations as loc}
					<tr class="nearby-tr">
						<td class="nearby-td">
							<a href={`${base}/${hrefBase}/${loc.id}`} class="nearby-link">{loc.name}</a>
						</td>
						<td class="nearby-td nearby-td-right">{loc.total_crashes.toLocaleString()}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.nearby-locations-card {
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem;
	}

	.info-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		margin-bottom: 0.75rem;
	}

	.nearby-table {
		width: 100%;
		border-collapse: collapse;
	}

	.nearby-th,
	.nearby-td {
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	.nearby-th {
		text-align: left;
		color: #6b7280;
		font-weight: 600;
	}

	.nearby-th-right,
	.nearby-td-right {
		text-align: right;
	}

	.nearby-tr:last-child .nearby-td {
		border-bottom: 0;
	}

	.nearby-link {
		color: #2563eb;
		text-decoration: none;
	}

	.nearby-link:hover {
		text-decoration: underline;
	}
</style>
