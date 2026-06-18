document.addEventListener('DOMContentLoaded', () => {
  const countElement = document.getElementById('recovered-count');

  // Load the initial value
  chrome.storage.local.get(['recoveredCount'], (result) => {
    if (result.recoveredCount !== undefined) {
      countElement.textContent = result.recoveredCount;
    } else {
      countElement.textContent = '0';
    }
  });

  // Listen for storage changes to update statistics dynamically
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.recoveredCount) {
      countElement.textContent = changes.recoveredCount.newValue;
    }
  });
});
