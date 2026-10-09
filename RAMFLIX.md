# RamFLIX source client

This branch builds the actual Jellyfin Web application with RamFLIX components.
It is based on upstream **v12.2**, matching the installed 12.2 server. The fork's
`master` branch remains upstream development; do not deploy that 13.x branch
against this server without a separate upgrade plan.

## Build

Use Node 24 (see `.nvmrc`):

```sh
npm ci --no-audit --no-fund
npm run build:check
npm test -- --run
npm run build:production
```

Serve the contents of `dist` at the existing `/web/` path. The RamFLIX GitHub
workflow checks the modified TypeScript/React code and SCSS, runs tests, and
uploads the compiled web client. No credentials or server configuration are
included in the repository or artifacts.

## Source map

- `src/apps/modern/features/ramflix`: navigation, hero, image/query helpers,
  native touch seeking, service authentication, and compiled SCSS.
- `src/apps/modern/routes/ramflix`: Lists, grouped Guide, Stats, and Voice.
- `src/apps/modern/AppLayout.tsx`: real application composition and theme.
- Native library and Home pages flow below the hero. Existing controls remain
  responsible for filters, sorting, pagination, details, and playback.
- The native player calls its own seek API and display-preference skip lengths.
  The mobile dock unmounts during video playback. SyncPlay and cast buttons use
  their original Jellyfin components.

This client does **not** bootstrap `rfshell.js`, `rfmobile.js`, `rfdesktop.js`,
the Media Bar plugin, or injected replacements for the header. Modern pages
retain user CSS but do not load the old server branding CSS, which would conflict
with source styling. Metadata and artwork come from the user's permitted library.

## Optional server services

- Guide: `/web/rflive-data/channels.json` and logos plus native Jellyfin Live TV.
  Station grouping preserves region, provider, language, and numbered feeds.
  Existing `rflive_favs` favorites are retained. Stream selection uses the native
  player; recording/timer management remains available through native Live TV.
- Stats: `/rfstats/api/sso` and `/rfstats/api/wrapped`.
- Voice: `/rfvoice/api/sso`, `/rfvoice/api/text`, `/rfvoice/api/voice`.
  Microphone support is feature-detected; typing and keyboard dictation work
  without microphone access. Leaving the route releases recording resources.

These features use the current user's Jellyfin token only for same-origin SSO.
They do not introduce a second login or embed an administrative token. Optional
services show loading, empty, and retry states rather than silently failing.

## Hosting and rollback

`deployment/ramflix/Dockerfile` builds an independent static client image:

```sh
docker build -f deployment/ramflix/Dockerfile -t ramflix-client:12.2 .
```

Connect it to the existing Jellyfin Docker network and route `/web/` to it through
the existing gateway. Keep API, stream, feature-service, and WebSocket routes
unchanged. The included nginx configuration falls back to `jellyfin:8096` for
old bundle URLs and server-generated assets. Adjust that internal service name
for a different installation.

Test with a preview cookie before changing the default gateway destination.
Keep the old client and a gateway-config backup. Validate nginx configuration
before a graceful reload; rollback only changes the web destination and requires
no Jellyfin restart. Keep TV devices on the previous client until physical remote
and playback testing is complete. Existing browser service workers may require
a refresh to receive the new entry page.

## Licensing and maintenance

Preserve `LICENSE`, contributor history, and the Outfit font's `OFL.txt`. Built
artifacts include a source link and both licenses under `assets/ramflix/`.
Use `upstream` for Jellyfin updates and deliberately rebase/merge only compatible
release changes. Keep server secrets, live user data, test tokens, and deployment
backups outside this public fork. New RamFLIX UI labels currently use English;
native Jellyfin localization and RTL preferences remain available.
