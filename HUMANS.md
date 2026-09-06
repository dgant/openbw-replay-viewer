# OpenBW Replay Viewer

## Website

Serve `docs/` with a static HTTP server. The published viewer is hosted at
https://dgant.github.io/openbw-replay-viewer/.

## Standalone desktop viewer

The Neutralino wrapper is in `desktop/`. Install and prepare it with:

```bash
cd desktop
npm install
npm run setup
```

Run its focused regression tests:

```bash
npm test
```

Build all desktop packages:

```bash
npm run build
```

The Windows executable and its required `resources.neu` file are emitted under
`desktop/dist/replay-viewer-desktop/`. Keep those two files together.

Desktop settings are stored outside the release directory under the operating
system's application-data directory for `io.github.dgant.replayviewer`, so
replacing or moving the application does not reset them.

To verify `.rep` launching end to end, associate `.rep` files with
`replay-viewer-desktop-win_x64.exe`, double-click a known replay, and confirm
the game viewport replaces the launcher screen and playback advances.

## Unified local build

From the sibling `openbw` repository, run `./scripts/build_replay_viewer.sh`
to compile the web runtime and package the standalone viewer together. The build
checks that the packaged web files match this repository's `docs/` files.
Running `npm run build` inside `desktop/` repackages the current `docs/` files
without recompiling the engine.

On Windows, run `desktop/scripts/register-file-association.ps1` after the first
build. It registers the executable in `desktop/dist/replay-viewer-desktop/`,
which subsequent builds update in place. Existing user defaults for other apps
may require choosing this viewer in Windows Default Apps.
