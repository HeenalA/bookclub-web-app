# Why these headers

`vercel.json` sets a handful of HTTP response headers. Each one closes a
specific, real attack; none of them is cargo-culting.

## Content-Security-Policy

The big one. It tells the browser exactly which sources of code, styles, fonts
and network calls are allowed, and to refuse everything else.

| Directive | What it does |
|---|---|
| `script-src 'self'` | **Only** JavaScript served from this domain runs. No inline `<script>`, no `eval`, nothing from a CDN. This is what turns a successful content injection into a non-event: even if an attacker got a `<script>` tag into the page, the browser would refuse to execute it. |
| `connect-src 'self' https://*.supabase.co` | The page can only make network requests to itself and to Supabase. If something did manage to run, it could not quietly POST your reviews to an attacker's server. |
| `frame-ancestors 'none'` | Nobody can put this app inside an `<iframe>` on their own site. Blocks clickjacking, where an invisible frame of your app is layered under a decoy page so your clicks land on real buttons. |
| `object-src 'none'` | No Flash/Java/embed plugins. A legacy hole with no modern use. |
| `base-uri 'self'` | Stops an injected `<base>` tag from silently rewriting every relative URL on the page to point somewhere else. |
| `form-action 'self'` | Forms cannot be made to submit to another domain. |
| `upgrade-insecure-requests` | Any stray `http://` URL is fetched over HTTPS instead. |

Note what is **not** in `script-src`: `'unsafe-inline'`. Most CSPs are
weakened by including it, which removes most of the protection. This app does
not need it because Vite's production build emits no inline scripts — verified
by reading `dist/index.html`.

`style-src` does include `'unsafe-inline'`, and that is a deliberate,
understood trade-off: the app sets member colours through React `style` props,
which are inline style attributes. The risk from injected *styles* is far
lower than from injected scripts.

## The rest

- **`X-Content-Type-Options: nosniff`** — stops the browser guessing a file's
  type from its content. Without it, something uploaded as a `.txt` but
  containing HTML can be sniffed and executed as HTML.
- **`X-Frame-Options: DENY`** — same job as `frame-ancestors`, for older
  browsers that do not support CSP level 2.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — when you click a
  link out of the app, the other site is told you came from
  `yourapp.vercel.app`, not the full path. Paths can carry club ids.
- **`Permissions-Policy`** — explicitly turns off camera, microphone,
  geolocation and payment APIs. A book club app has no business asking for any
  of them, so denying them up front means a compromise cannot either.
- **`Strict-Transport-Security`** — the browser refuses to talk to this domain
  over plain HTTP for two years, even if someone types `http://`.
- **`X-Robots-Tag: noindex`** — keeps a private app out of search results.
  (Belt and braces with the `<meta name="robots">` tag in `index.html`.)

## Checking it worked

After deploying:

```bash
curl -sI https://<your-app>.vercel.app | grep -i -E 'content-security|x-frame|strict-transport|referrer|permissions'
```

Or paste the URL into <https://securityheaders.com>.
