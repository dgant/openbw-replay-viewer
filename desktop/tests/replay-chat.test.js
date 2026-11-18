const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({TextDecoder, Uint8Array, DataView});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../docs/v1.4/replay-chat.js"), "utf8"), ctx);
const decode = vm.runInContext("decodeReplayChat", ctx);

test("chat decodes UTF-8 and CP949 before interpreting inline colors", () => {
  const text = "\u0007\uac00";
  assert.equal(decode(Buffer.from(text)), text);
  assert.equal(decode(Buffer.from([7, 0xb0, 0xa1])), text);
  assert.equal(decode(Buffer.from([0x63, 0x61, 0x66, 0xe9])), "caf\u00e9");
});

test("missing and malformed fonts fall back without throwing", () => {
  for (const bytes of [
    [], [70,79,78,84,65,65,8,8], [70,79,78,84,65,65,8,8,255,255,255,255],
    [70,79,78,84,65,65,8,8,12,0,0,0,4,4,0,0]
  ]) assert.equal(ctx.readChatFont(Uint8Array.from(bytes).buffer), null);
});
