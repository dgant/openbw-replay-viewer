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

The regression suite covers the top-right replay-download behavior and control
layout as well as the desktop launcher and settings bridge.

Build all desktop packages:

```bash
npm run build
```

The Windows executable and its required `resources.neu` file are emitted under
`desktop/dist/replay-viewer-desktop/`. Keep those two files together.

Desktop settings are stored outside the release directory under the operating
system's application-data directory for `io.github.dgant.replayviewer`, so
replacing or moving the application does not reset them.

The app intentionally does not restore Neutralino's saved window coordinates.
It restores, centers, and shows the window on every launch so a prior minimized
launch or disconnected monitor cannot leave the viewer off-screen.

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

To check Windows registration after running the registration script:

```powershell
./desktop/tests/file-association.test.ps1
```

This checks both the legacy and current viewer handlers and the effective user
choice. For end-to-end validation, open a `.rep` through Windows ShellExecute
and verify that the maintained executable loads the replay.
