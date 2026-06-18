(() => {
  if (window.__X_TWEET_SOURCE_CONTENT__) return;
  window.__X_TWEET_SOURCE_CONTENT__ = true;

  const tweetSources = new Map();
  const processedTweets = new WeakMap();

  function updateRecoveredCount() {
    try {
      chrome.storage.local.set({ recoveredCount: tweetSources.size });
    } catch (e) {
      // Storage may not be ready during very early page startup.
    }
  }

  function handleSourceData(detail) {
    const id = String(detail.id || '');
    const source = detail.source;
    if (!id || !source) return;

    if (!tweetSources.has(id)) {
      tweetSources.set(id, source);
      updateRecoveredCount();
    }

    const tweetEl = findTweetElementById(id);
    if (tweetEl) {
      injectSourceLabel(tweetEl, source);
    }
  }

  window.addEventListener('X-Tweet-Source-Data', (e) => {
    handleSourceData(e.detail || {});
  });

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.type !== 'X_TWEET_SOURCE_DATA') return;
    handleSourceData(e.data.payload || {});
  });

  function injectMainWorldScript() {
    if (!document.documentElement && !document.head) {
      requestAnimationFrame(injectMainWorldScript);
      return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.documentElement || document.head).appendChild(script);
  }

  injectMainWorldScript();
  window.postMessage({ type: 'X_TWEET_SOURCE_REQUEST_DUMP' }, '*');
  window.dispatchEvent(new CustomEvent('X-Tweet-Source-Request-Dump'));

  function findTweetElementById(tweetId) {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    for (const article of articles) {
      if (getTweetId(article) === tweetId) {
        return article;
      }
    }
    return null;
  }

  function getTweetId(tweetEl) {
    const timeEl = tweetEl.querySelector('time');
    if (timeEl) {
      const linkEl = timeEl.closest('a[href*="/status/"]');
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        const match = href.match(/\/status\/(\d+)/);
        if (match) return match[1];
      }
    }

    const matchUrl = window.location.href.match(/\/status\/(\d+)/);
    if (matchUrl) {
      const statusLinks = tweetEl.querySelectorAll('a[href*="/status/"]');
      if (statusLinks.length <= 1) return matchUrl[1];
    }

    const statusLinks = tweetEl.querySelectorAll('a[href*="/status/"]');
    for (const link of statusLinks) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    return null;
  }

  function makeSourceLabel(sourceLabel, isDetail) {
    const sourceSpan = document.createElement('span');
    sourceSpan.className = isDetail ? 'tw-source-label-detail' : 'tw-source-label';
    sourceSpan.style.color = 'rgb(113, 118, 123)';
    sourceSpan.style.fontSize = isDetail ? '14px' : '13px';
    sourceSpan.style.marginLeft = isDetail ? '0' : '4px';
    sourceSpan.style.display = 'inline-block';
    sourceSpan.style.whiteSpace = 'nowrap';
    sourceSpan.textContent = ' \u00b7 ' + sourceLabel;
    return sourceSpan;
  }

  function injectSourceLabel(tweetEl, sourceLabel) {
    const tweetId = getTweetId(tweetEl);
    if (!tweetId || processedTweets.get(tweetEl) === sourceLabel) return;

    const timeEl = tweetEl.querySelector('time');
    if (!timeEl) return;

    const timeLink = timeEl.closest('a[href*="/status/"]');
    if (timeLink) {
      const parent = timeLink.parentElement;
      if (parent && !parent.querySelector('.tw-source-label')) {
        timeLink.parentNode.insertBefore(makeSourceLabel(sourceLabel, false), timeLink.nextSibling);
        processedTweets.set(tweetEl, sourceLabel);
      }
      return;
    }

    const matchUrl = window.location.href.match(/\/status\/(\d+)/);
    if (matchUrl && matchUrl[1] === tweetId) {
      const parent = timeEl.parentElement;
      if (parent && !parent.querySelector('.tw-source-label-detail')) {
        timeEl.parentNode.insertBefore(makeSourceLabel(sourceLabel, true), timeEl.nextSibling);
        processedTweets.set(tweetEl, sourceLabel);
      }
    }
  }

  function processTweetElement(tweetEl) {
    const tweetId = getTweetId(tweetEl);
    if (!tweetId) return;

    const source = tweetSources.get(tweetId);
    if (source) {
      injectSourceLabel(tweetEl, source);
    }
  }

  function processExistingTweets() {
    const existingTweets = document.querySelectorAll('article[data-testid="tweet"]');
    existingTweets.forEach(processTweetElement);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.matches && node.matches('article[data-testid="tweet"]')) {
          processTweetElement(node);
        }

        const tweets = node.querySelectorAll && node.querySelectorAll('article[data-testid="tweet"]');
        if (tweets) tweets.forEach(processTweetElement);
      }
    }
  });

  function start() {
    if (!document.body) {
      requestAnimationFrame(start);
      return;
    }

    observer.observe(document.body, { childList: true, subtree: true });
    processExistingTweets();
    setInterval(processExistingTweets, 1500);
  }

  start();
})();
