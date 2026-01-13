<script lang="ts">
    import { signOut } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { base } from '$app/paths';

    function handleSignOut() {
        signOut();
        goto(`${base}/`);
    }
</script>

<div class="settings-page">
    <h1>Settings</h1>
    <div class="glass-panel p-4">
        <button class="sign-out-btn" onclick={handleSignOut}>Sign Out</button>
    </div>
</div>

<style>
    .settings-page {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
        color: white;
    }
    .p-4 { padding: 2rem; }
    
    .sign-out-btn {
        background: #dc3545;
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        width: 100%;
        font-size: 1rem;
    }
</style>
