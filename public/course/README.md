# Full-course files
Per-chapter, per-track deep course material (30+ min audio, notes PDF, formula sheet PDF).

Scheme: course/<chapter-id>/<track>/ where
  chapter-id = DATA prefix+num+slug, e.g. P12-01-Rotational-Dynamics
  track      = board | jee | mht-cet
Files per track: audio.m4a, notes.pdf, formula-sheet.pdf
Add a chapter to the COURSE map in index.html when its first track is ready.

## Audio hosting switch
Player URLs resolve through `COURSE_MEDIA_BASE` in index.html (same value in public/index.html):
- `""` (default) = audio served from this repo at course/<chapter-id>/<track>/audio.mp4
- set to an external base (e.g. "https://pub-xxxx.r2.dev/") = audio loads from <base>course/<chapter-id>/<track>/audio.mp4
- an absolute https URL in a track's `audio` field in the COURSE map always wins
notes.pdf / formula-sheet.pdf are always same-origin.
