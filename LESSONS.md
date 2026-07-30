# Lessons

- A Neutralino application should keep bundled pages on its local resource
  server. Navigating from that origin to a `file://` viewer can be blocked by
  the embedded webview and also prevents reliable loading of WASM and other
  bundled resources.
- Local replay files should be passed as encoded filesystem paths and read
  through Neutralino's allow-listed filesystem API. A `file://` URL is not a
  reliable substitute for native file access in a webview.
- On Windows-mounted filesystems, replacing the contents of a synchronized
  directory is more reliable than deleting and recreating the directory itself.
- Neutralino CLI 11.7.2 currently carries a high-severity denial-of-service
  advisory through its build-only glob stack. The affected code is not shipped
  in the application and receives only repository-controlled build paths, so
  install-time audit noise is disabled in `desktop/.npmrc` until Neutralino
  updates that dependency chain.
