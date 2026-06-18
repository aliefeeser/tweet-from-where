# Tweet From Where

Tweet From Where is a Microsoft Edge extension that brings back the hidden X/Twitter tweet source text.

It shows where a tweet was posted from, such as:

- Twitter for iPhone
- Twitter for Android
- Twitter Web App
- Other official or third-party clients when X still provides that data

The source appears next to the tweet timestamp, for example:

```text
@username · 2m · Twitter for iPhone
```

## Why

X/Twitter used to show the posting client directly on tweets. The source value still appears in some X API responses, but the website no longer displays it in the interface.

This extension reads that existing source field and restores it in the timeline UI.

## Install on Microsoft Edge

1. Download or clone this repository.
2. Open Edge and go to `edge://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder.
6. Open or refresh `x.com` / `twitter.com`.

## Notes

- The extension does not guess or generate random source names.
- If X does not provide source data for a tweet, nothing is shown for that tweet.
- The label is displayed directly on the tweet, next to the timestamp.

## Privacy

Tweet From Where runs locally in your browser. It does not send your browsing data, tweets, account information, or recovered source labels to any external server.

## Browser Support

Built for Microsoft Edge with Manifest V3. It may also work in Chromium-based browsers that support the same extension APIs.
