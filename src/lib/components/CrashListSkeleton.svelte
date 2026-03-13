<div class="loading-stack">
	{#each Array(5) as _}
		<div class="loading-card">
			<div class="loading-line loading-line-wide"></div>
			<div class="loading-line loading-line-narrow"></div>
		</div>
	{/each}
</div>

<style>
	.loading-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.loading-card {
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem;
	}

	.loading-line {
		background: #e5e7eb;
		border-radius: 0.375rem;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.loading-line-wide {
		height: 1rem;
		width: 75%;
		margin-bottom: 0.5rem;
	}

	.loading-line-narrow {
		height: 0.75rem;
		width: 50%;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
