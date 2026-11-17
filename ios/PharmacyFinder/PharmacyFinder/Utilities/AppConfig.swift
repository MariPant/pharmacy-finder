import Foundation

enum AppConfig {
    /// Primary source: the public Overpass API (required by the assignment).
    static let overpassEndpoint = URL(string: "https://overpass-api.de/api/interpreter")
    /// Fallback source with the same OpenStreetMap data (Geofabrik's SQL API).
    static let postpassEndpoint = URL(string: "https://postpass.geofabrik.de/api/interpreter")

    /// Searched in order until at least one pharmacy is found.
    static let searchRadii: [Double] = [2_000, 5_000, 10_000]
    /// A short declared timeout gets scheduled sooner by busy Overpass servers;
    /// a pharmacy lookup normally finishes in well under a second.
    static let overpassQueryTimeout = 8
    /// Client-side limit per request.
    static let requestTimeout: TimeInterval = 10
    static let retryDelay: Duration = .milliseconds(300)
    /// A source that just failed is skipped for a while, so every search doesn't wait
    /// for the same timeout again.
    static let sourceCooldown: TimeInterval = 5 * 60
    static let maxResults = 50
    static let cacheTimeToLive: TimeInterval = 5 * 60

    /// "Refresh" reuses data younger than this, so repeated pulls don't hammer the public API.
    static let refreshMinimumAge: TimeInterval = 30

    /// Public OSM services require an application-specific User-Agent and a referrer.
    static let userAgent = "PharmacyFinder-iOS/1.0 (+https://github.com/MariPant/pharmacy-finder)"
    static let referer = "https://github.com/MariPant/pharmacy-finder"

    /// How many nearest results the map zooms to fit.
    static let mapFitNearestCount = 8
}
