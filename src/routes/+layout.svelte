<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	import MobileNav from '$lib/components/ui/MobileNav.svelte';
	import DesktopSidebar from '$lib/components/ui/DesktopSidebar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<div class="desktop-nav">
		<DesktopSidebar />
	</div>
	
	<main class="main-content">
		{@render children()}
	</main>

	<div class="mobile-nav-wrapper">
		<MobileNav />
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.desktop-nav {
		display: none;
	}

	.mobile-nav-wrapper {
		display: block;
	}

	.main-content {
		flex: 1;
		padding-bottom: 100px; /* Space for mobile nav */
		width: 100%;
		max-width: 100%;
	}

	@media (min-width: 1024px) {
		.desktop-nav {
			display: block;
			width: 280px; /* Match sidebar width */
			flex-shrink: 0;
		}

		.mobile-nav-wrapper {
			display: none;
		}

		.main-content {
			padding-bottom: 0;
		}
	}
</style>
