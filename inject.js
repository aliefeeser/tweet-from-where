(function() {
  if (window.__X_TWEET_SOURCE_INJECTED__) return;
  window.__X_TWEET_SOURCE_INJECTED__ = true;

  const sourceCache = new Map();

  function findTweets(obj, callback, seen) {
    if (!obj || typeof obj !== 'object') return;
    if (seen.has(obj)) return;
    seen.add(obj);

    const legacy = obj.legacy && typeof obj.legacy === 'object' ? obj.legacy : null;
    const source = legacy && typeof legacy.source === 'string'
      ? legacy.source
      : (typeof obj.source === 'string' ? obj.source : '');

    if (source) {
      const tweetId = obj.rest_id || obj.id_str || (legacy && legacy.id_str);
      if (tweetId) {
        callback(String(tweetId), source);
      }
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        findTweets(obj[key], callback, seen);
      }
    }
  }

  function sourceHtmlToText(sourceHtml) {
    try {
      const doc = new DOMParser().parseFromString(sourceHtml, 'text/html');
      return (doc.body.textContent || '').trim();
    } catch (e) {
      const match = String(sourceHtml).match(/>([^<]+)</);
      return match ? match[1].trim() : '';
    }
  }

  function dispatchTweetSource(id, sourceText) {
    window.postMessage({
      type: 'X_TWEET_SOURCE_DATA',
      payload: { id, source: sourceText }
    }, '*');

    window.dispatchEvent(new CustomEvent('X-Tweet-Source-Data', {
      detail: { id, source: sourceText }
    }));
  }

  function emitTweetSource(id, sourceHtml) {
    const sourceText = sourceHtmlToText(sourceHtml);
    if (!sourceText) return;

    sourceCache.set(id, sourceText);
    dispatchTweetSource(id, sourceText);
  }

  function processResponseJson(json) {
    try {
      findTweets(json, emitTweetSource, new WeakSet());
    } catch (e) {
      // Never let parser issues affect X itself.
    }
  }

  window.addEventListener('X-Tweet-Source-Request-Dump', () => {
    sourceCache.forEach((source, id) => dispatchTweetSource(id, source));
  });

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.type !== 'X_TWEET_SOURCE_REQUEST_DUMP') return;
    sourceCache.forEach((source, id) => dispatchTweetSource(id, source));
  });

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        response.clone().json().then(processResponseJson).catch(() => {});
      }
    } catch (e) {
      // Safe guard against breaking application flow.
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__xTweetSourceUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        const contentType = this.getResponseHeader('content-type') || '';
        if (contentType.includes('application/json') && this.responseText) {
          processResponseJson(JSON.parse(this.responseText));
        }
      } catch (e) {
        // Safe guard against breaking application flow.
      }
    });
    return originalSend.apply(this, args);
  };
})();
