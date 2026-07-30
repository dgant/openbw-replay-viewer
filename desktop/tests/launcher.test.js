const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const launcherSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "launcher.js"),
  "utf8",
);

async function runLauncher(args) {
  let replacedUrl = "";
  const context = {
    document: {
      getElementById() {
        return { set textContent(_value) {} };
      },
    },
    Neutralino: {
      init() {},
    },
    window: {
      NL_ARGS: args,
      location: {
        replace(value) {
          replacedUrl = value;
        },
      },
    },
  };

  vm.runInNewContext(launcherSource, context);
  await Promise.resolve();
  return replacedUrl;
}

test("opens the bundled viewer through Neutralino's resource server", async () => {
  assert.equal(
    await runLauncher(["replay-viewer-desktop.exe"]),
    "/viewer/index.html",
  );
});

test("passes an associated replay as a local filesystem path", async () => {
  const replayPath = "E:\\Replays\\A match #1.rep";

  assert.equal(
    await runLauncher(["replay-viewer-desktop.exe", replayPath]),
    "/viewer/index.html?desktopReplayPath=" + encodeURIComponent(replayPath),
  );
});
