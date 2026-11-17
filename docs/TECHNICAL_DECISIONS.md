# Technical decisions

Short architecture decision records for both apps. Each one states the context, the
decision and its consequences, the things worth discussing in a review.

---

## 1. One repository, two independent apps

**Context.** The assignment asks for a web app and a native iOS app with the same
features.

**Decision.** A monorepo with `web/` and `ios/`, no shared code. Both apps follow the same
domain model (`Pharmacy`, `SearchOrigin`, typed errors), the same algorithms (haversine
distance, sorting, name / address fallbacks) and the same query logic, so their
behaviour can be compared side by side.

**Consequences.** The logic exists twice, so the test suites cover the same cases
in both languages to keep them in sync.

---

## 2. Screen state as a state machine

**Context.** The screen moves through locating → (geocoding) → searching → results /
empty / error, and a failed refresh must not wipe results already on screen.

**Decision.**

- Web: `useReducer` with a discriminated union `status` (`idle | locating | geocoding |
searching | success | error`). Reducer is a pure function, tested separately.
- iOS: `@MainActor @Observable` view model with a `Phase` enum and a derived
  `ResultsState` the view switches on.
- "Empty" is derived (success with zero results), not stored.

**Consequences.** Impossible combinations such as "loading and error at once" can't be
represented, and the views are thin.

---

## 3. Every user action supersedes the previous one

**Context.** Users tap _Locate_, search an address and refresh in quick succession.
Network responses can arrive out of order.

**Decision.** Each action starts a new operation and cancels the previous one
(`AbortController` on the web, `Task` cancellation on iOS). Results of a superseded
operation are ignored, and the place name from reverse geocoding is applied only if
the origin hasn't changed meanwhile.

**Consequences.** A slow response can never overwrite a newer one. Cancellation is
passed through as a distinct error and never shown to the user.

---

## 4. Overpass first, Postpass as a fallback

**Context.** The assignment requires the Overpass API. In 2026 the public Overpass
servers are frequently overloaded and enforce stricter limits (user-agent checks,
per-IP quotas). During development the API often returned HTTP 502 or did not answer
at all, while the community mirror timed out.

**Decision.**

- Query Overpass with `nwr[amenity=pharmacy]` and `nwr[healthcare=pharmacy]` around the
  origin and `out center`, so pharmacies mapped as building outlines are included.
- If Overpass fails (429, 5xx, timeout, error page, "runtime error" remark), run the
  equivalent SQL query on [Postpass](https://github.com/woodpeck/postpass), Geofabrik's
  public PostGIS API over the same OpenStreetMap data.
- Both responses are validated and converted to the same internal element type, so
  mapping, sorting and the UI don't know which source answered.
- A source that failed is skipped for 5 minutes, so users don't wait for the same
  timeout on every search. Being offline stops immediately (no source can help).

**Consequences.** The app keeps working when Overpass is down, and still uses only
OpenStreetMap data. The cost is a second query language to maintain, covered by tests.

---

## 5. Being a good citizen of public APIs

**Decision.**

- Short declared timeouts (`[timeout:8]`): busy Overpass servers schedule short queries
  sooner; a pharmacy lookup normally takes well under a second.
- Radius grows 2 → 5 → 10 km only when nothing is found.
- 5-minute response cache on a ~110 m grid; _Refresh_ reuses data younger than 30 s;
  panning the map never triggers a request.
- Nominatim (web) is called only on submit and at most once per second, as its usage
  policy requires. iOS uses Apple's geocoder instead.
- iOS sends an application `User-Agent` and `Referer`; browsers set these themselves.

---

## 6. Dependency injection for testability

**Decision.** Services are created by factories (web) or receive protocols (iOS):
`fetch` / `HTTPClient`, data sources, clock, cache, location provider, geocoder.

**Consequences.** API processing, fallback, cool-down, caching and the view model are
tested offline with fakes and fictional fixtures, including timeouts and cancellation.
No static data is used in the running apps.

---

## 7. Untrusted input is validated at the boundary

**Decision.** Overpass, Postpass and Nominatim JSON is checked at runtime before it
becomes typed data (`unknown` + type guards on the web, `Decodable` on iOS). A single
malformed element is dropped instead of failing the whole response. Missing names and
addresses stay `null` / `nil` in the model, and only the UI decides how to present them.

---

## 8. Errors as a closed set of kinds

**Decision.** All failures map to one typed error (`AppError.kind` on the web,
`enum PharmacyError` on iOS): permission denied, position unavailable, offline,
network, timeout, rate-limited, server, invalid response, address not found. Each kind
has a translated message and the right action (_Try again_, _Open Settings_, or use
address search).

---

## 9. Localisation and accessibility

**Decision.**

- English and Finnish. On the web, the Finnish dictionary is typed against the English
  one, so a missing translation is a compile error. On iOS, a String Catalog with
  plural rules, and the language follows the system.
- Semantic HTML (landmarks, lists, `dl`), visible focus styles, labelled icon buttons,
  `aria-live` for status changes, respect for `prefers-reduced-motion`; SwiftUI
  accessibility labels and system controls on iOS.
- Adding Swedish means adding one dictionary / catalog language; no code changes.

---

## 10. Privacy

**Decision.** The location is used only in memory to build the query. It is not
stored, logged or sent anywhere except the map, geocoding and OSM services that need it. There
is no analytics and no backend. Permission is requested only after a user action.

---

## 11. No extra frameworks

**Decision.** No state-management or UI library on the web, and no third-party
packages on iOS. The apps are small enough that typed hooks / a reducer and plain
SwiftUI + Observation keep them easier to read than a framework would.

**Consequences.** Fewer dependencies to update and audit. A larger product would
introduce a component library and design tokens shared with design tooling.
