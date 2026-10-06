Developer validation (not needed by the end user)
Node.js and Playwright 1.62.1 are used only to run browser tests.
Run npm test. Tests start their own loopback HTTP server.
Set CHROMIUM_PATH to the installed browser executable if not /usr/bin/chromium.
Tests cover persistence, images, export/import, safety and save failures.
They do not establish Windows/Yandex or file:// compatibility.
Temporary test downloads and screenshots are written to the OS temp directory.
