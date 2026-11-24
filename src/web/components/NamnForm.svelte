<script lang="ts">
  // A one-field form for naming something: used to create and to rename.
  type Props = {
    label: string;
    value?: string;
    submitLabel: string;
    onsubmit: (namn: string) => Promise<void>;
    oncancel: () => void;
  };
  let { label, value = "", submitLabel, onsubmit, oncancel }: Props = $props();

  // svelte-ignore state_referenced_locally
  let namn = $state(value);
  let error = $state("");
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    try {
      await onsubmit(namn);
    } catch (e) {
      error = e instanceof Error ? e.message : "Något gick fel";
    } finally {
      busy = false;
    }
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "Escape") oncancel();
  }
</script>

<form onsubmit={submit}>
  <label>
    <span class="cap">{label}</span>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      bind:value={namn}
      onkeydown={keydown}
      onfocus={(e) => e.currentTarget.select()}
      autofocus
      maxlength="200"
      required
    />
  </label>
  <button class="pr" disabled={busy}>{submitLabel}</button>
  <button type="button" onclick={oncancel}>Avbryt</button>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</form>

<style>
  form {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin: 16px 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1 1 260px;
    max-width: 420px;
  }
  p {
    flex-basis: 100%;
  }
</style>
