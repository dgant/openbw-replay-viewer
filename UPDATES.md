# Collaboration Practices

- Build classic and Remastered from peer C++ source directories in `openbw`.
  Neither engine requires an upstream checkout or build-time patches. Do not
  introduce a Go toolchain or GPL/LGPL-derived port code without explicit approval.

- Run native desktop UI verification minimized or headlessly. Do not foreground
  windows, move the user's pointer, or otherwise interrupt their desktop unless
  they explicitly request interactive testing.

- Keep the default web build and standalone viewer synchronized; use the maintained desktop output for `.rep`.

- Name Remastered implementation files, directories, and documentation after the
  feature, not the upstream author. Keep author names only for source provenance.
- Maintain documentation as a current reference: requirements, operating
  instructions, and reusable lessons. Keep progress reports, incident timelines,
  and completed-work summaries in Git history, not in these files.
- Describe the local implementation directly. Omit unnecessary external project
  names and license disclaimers from prose; preserve factual asset provenance.
- Remastered must be a minimal local fork of the pre-Remastered OpenBW engine,
  without code imported from other engine forks. Keep the viewer, controls,
  notifications, and playback paths shared wherever possible.
- Keep PR history free of discarded external integrations. Squash the final
  required changes before review rather than preserving unnecessary imported
  code in intermediate commits or task milestone tags.
- Validate this as a production viewer. Do not use "experimental" to excuse
  broken behavior; test the supported scope, report evidence gaps, and obtain
  approval before merging or publishing.
