<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	import MobileNav from '$lib/components/ui/MobileNav.svelte';
	import DesktopSidebar from '$lib/components/ui/DesktopSidebar.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { page } from '$app/stores';
	import { getTransitionDirection, getTransitionParams } from '$lib/transitions';
	import { onMount } from 'svelte';
    import { initializeAuth } from '$lib/auth';
    import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	let width = $state(0);
	let height = $state(0);
	let reducedMotion = $state(false);
	let transitionsEnabled = $state(false);

	// Track navigation history for direction calculation
	let previousUrl = $state<URL | null>(null);

	onMount(() => {
        // Initialize previousUrl with current url so first navigation works
        previousUrl = new URL($page.url.href);
        initializeAuth(() => { console.log('[Auth] Initialized in Layout'); });
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mediaQuery.matches;
		transitionsEnabled = true;
	});

    // Handle history updates for direction calculation
    afterNavigate((nav) => {
        if (nav.to) {
            previousUrl = new URL(nav.to.url.href);
        }
    });

</script>



<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<div class="desktop-nav">
		<DesktopSidebar />
	</div>
	
	<div class="main-content">
		{#if reducedMotion || !transitionsEnabled}
			<div class="transition-wrapper">
				{@render children()}
			</div>
		{:else}
			{#key $page.url.pathname}
				{@const direction = previousUrl ? getTransitionDirection(previousUrl, $page.url) : 'crossfade'}
				{@const config = getTransitionParams(direction, width, height)}

				<div 
					class="transition-wrapper"
					in:config.in={config.inParams}
					out:config.out={config.outParams}
				>
					{@render children()}
				</div>
			{/key}
		{/if}
	</div>

	<div class="mobile-nav-wrapper">
		<MobileNav />
	</div>

    <ToastContainer />
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
		
		/* Grid Stacking for Transitions */
		display: grid;
		grid-template-areas: "content";
		overflow-x: hidden; /* Prevent horizontal scrollbar during slide */
	}

	.transition-wrapper {
		grid-area: content;
		width: 100%;
		/* Ensure wrapper takes full height/width of the cell */
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
