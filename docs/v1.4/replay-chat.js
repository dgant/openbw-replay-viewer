// Replay strings may be UTF-8 (Remastered) or legacy Korean/Western text.
const decodeReplayChat = (() => {
    const decoders = ["utf-8", "euc-kr", "windows-1252"].map((name, i) =>
        new TextDecoder(name, { fatal: i !== 2 }));
    return bytes => {
        for (const decoder of decoders) {
            try { return decoder.decode(bytes); } catch (_) { /* try the next encoding */ }
        }
    };
})();

function readChatFont(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer);
    if (bytes.length < 8 || view.getUint32(0) !== 0x464f4e54) return null;
    const [low, high, width, height] = bytes.subarray(4, 8);
    if (low > high || !width || !height || width > 32 || height > 32 ||
        bytes.length < 8 + 4 * (high - low + 1)) return null;
    const glyphs = [];
    for (let code = low; code <= high; ++code) {
        let p = view.getUint32(8 + 4 * (code - low), true);
        if (!p) continue;
        if (p + 4 > bytes.length) return null;
        const [w, h, x, y] = bytes.subarray(p, p + 4);
        if (w + x > width || h + y > height) return null;
        p += 4;
        const pixels = new Uint8Array(w * h);
        for (let i = 0; i < pixels.length;) {
            if (p === bytes.length) return null;
            const run = bytes[p++];
            i += run >>> 3;
            if (i < pixels.length) pixels[i++] = 1 + (run & 7); // zero marks skipped pixels
        }
        glyphs[code] = { w, h, x, y, pixels };
    }
    return { width, height, glyphs };
}

let replayChatFont;
function loadChatFont() {
    if (!replayChatFont) replayChatFont = fetch(C_MPQ_BASE_URL + "/font10.fnt")
        .then(r => r.ok ? r.arrayBuffer() : null)
        .then(data => data && readChatFont(data)).catch(() => null);
    return replayChatFont;
}

function createReplayChat(canvas, redraw) {
    const strip = document.createElement("canvas"), ctx = strip.getContext("2d");
    const messages = [], atlases = new Map();
    // Control byte -> eight-shade ramp in tfontgam.pcx.
    const ramps = [0,0,0,1,2,3,4,5,8,0,0,6,0,0,9,10,11,12,0,0,7,13,14,15,16,17,0,18,19,20,21,23];
    let palette, font, requested = false, dirty = true;
    function color(ramp, shade) {
        if (!palette) return shade === 1 ? "#f2f2f2" : shade === 2 ? "#bbbbbb" : "#202020";
        const i = (ramp * 8 + shade) * 3;
        const r = palette[i], g = palette[i+1], b = palette[i+2];
        return r === 255 && !g && b === 255 ? null : 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    function atlas(ramp) {
        if (atlases.has(ramp)) return atlases.get(ramp);
        const sheet = document.createElement("canvas");
        sheet.width = 16 * font.width;
        sheet.height = 16 * font.height;
        const paint = sheet.getContext("2d");
        font.glyphs.forEach(({w, x, y, pixels}, code) => {
            pixels.forEach((sample, i) => {
                const ink = sample && color(ramp, sample - 1);
                if (!ink) return;
                paint.fillStyle = ink;
                paint.fillRect((code % 16) * font.width + x + i % w,
                    (code >>> 4) * font.height + y + Math.floor(i / w), 1, 1);
            });
        });
        atlases.set(ramp, sheet);
        return sheet;
    }
    function layout(width) {
        const lines = [[]];
        let x = 0;
        function newline() { lines.push([]); x = 0; }
        function push(g) { lines[lines.length-1].push({ ...g, x }); x += g.width; }
        for (const message of messages) {
            if (x) newline();
            let ramp = 0, locked = false, word = [], gap = 0;
            function flush() {
                if (!word.length) return;
                const total = word.reduce((n, g) => n + g.width, 0);
                if (x && x + gap + total > width) newline();
                if (x) x += gap;
                for (const g of word) {
                    if (x && x + g.width > width) newline();
                    push(g);
                }
                word = []; gap = 0;
            }
            for (const ch of message) {
                const code = ch.codePointAt(0);
                if (ch === "\n") { flush(); newline(); gap = 0; }
                else if (ch === " " || ch === "\t") {
                    flush(); gap += (font ? font.width / 2 : ctx.measureText(" ").width) * (ch === "\t" ? 4 : 1);
                } else if (code < 32) {
                    if (!locked && code !== 13 && code !== 18 && code !== 19 && code !== 12) {
                        ramp = ramps[code]; locked = [5, 11, 20].includes(code);
                    }
                } else {
                    const glyph = font && code < 127 && font.glyphs[code];
                    word.push({ ch, code, ramp, glyph, width: glyph ? glyph.w : ctx.measureText(ch).width });
                }
            }
            flush();
        }
        return lines.slice(-11);
    }
    return {
        clear() { messages.length = 0; dirty = true; },
        add(name, text) {
            const sender = decodeReplayChat(name).replace(/[\x00-\x1f]/g, "") || "Observer";
            messages.push(sender + ": " + decodeReplayChat(text));
            dirty = true;
        },
        setPalette(colors) { palette = colors; atlases.clear(); dirty = true; },
        draw() {
            const width = Math.min(620, canvas.width - 20);
            if (width < 1 || canvas.height < 16) return;
            if (!requested) {
                requested = true;
                loadChatFont().then(result => {
                    if (result) { font = result; dirty = true; redraw(); }
                });
            }
            if (dirty || strip.width !== width) {
                strip.width = width;
                ctx.font = "13px sans-serif";
                const lines = layout(width);
                strip.height = lines.length * 16;
                ctx.font = "13px sans-serif";
                ctx.textBaseline = "top";
                lines.forEach((line, i) => line.forEach(({ch, code, ramp, glyph, x}) => {
                    if (glyph) {
                        ctx.drawImage(atlas(ramp), (code % 16) * font.width, (code >>> 4) * font.height,
                            font.width, font.height, Math.round(x), i * 16, font.width, font.height);
                    } else {
                        const ink = color(ramp, 1);
                        if (!ink) return;
                        ctx.strokeStyle = "#101010"; ctx.lineWidth = 2;
                        ctx.strokeText(ch, x, i * 16);
                        ctx.fillStyle = ink; ctx.fillText(ch, x, i * 16);
                    }
                }));
                dirty = false;
            }
            canvas.getContext("2d").drawImage(strip, 10, Math.min(288, canvas.height - 4) - strip.height);
        }
    };
}
