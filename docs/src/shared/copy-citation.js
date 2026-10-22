document.querySelectorAll("[data-copy-target]").forEach((copyCitationButton) => {
  const target = document.getElementById(copyCitationButton.dataset.copyTarget);
  let copyResetTimer;
  copyCitationButton.addEventListener("click", async () => {
    const citation = target.textContent.replace(/\s+/g, " ").trim();
    try {
      await navigator.clipboard.writeText(citation);
      clearTimeout(copyResetTimer);
      copyCitationButton.classList.add("is-copied");
      copyCitationButton.setAttribute("aria-label", "Citation copied");
      copyCitationButton.title = "Citation copied";
      copyResetTimer = setTimeout(() => {
        copyCitationButton.classList.remove("is-copied");
        copyCitationButton.setAttribute("aria-label", "Copy citation");
        copyCitationButton.title = "Copy citation";
      }, 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyCitationButton.title = "Select the citation text to copy it";
    }
  });
});
