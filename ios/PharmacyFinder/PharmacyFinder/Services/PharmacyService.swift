import Foundation

protocol PharmacyServicing: Sendable {
    /// - Parameter maxCacheAge: Accept cached data only if it is younger than this.
    ///   `nil` uses the cache's own time-to-live.
    func searchPharmacies(near origin: Coordinate, maxCacheAge: TimeInterval?) async throws -> PharmacySearchResult
}

/// Finds pharmacies in OpenStreetMap data: the Overpass API first, Postpass as a fallback.
///
/// An actor, so the response cache and the source cool-downs are safe to use from
/// concurrent searches.
actor PharmacyService: PharmacyServicing {
    struct Configuration: Sendable {
        /// Tried in order; the first one that answers wins.
        var sources: [any OSMDataSource] = Configuration.defaultSources
        var searchRadii: [Double] = AppConfig.searchRadii
        var requestTimeout: TimeInterval = AppConfig.requestTimeout
        var retryDelay: Duration = AppConfig.retryDelay
        var sourceCooldown: TimeInterval = AppConfig.sourceCooldown
        var maxResults: Int = AppConfig.maxResults
        var cacheTimeToLive: TimeInterval = AppConfig.cacheTimeToLive

        static var defaultSources: [any OSMDataSource] {
            var sources: [any OSMDataSource] = []
            if let overpass = AppConfig.overpassEndpoint {
                sources.append(OverpassSource(endpoint: overpass))
            }
            if let postpass = AppConfig.postpassEndpoint {
                sources.append(PostpassSource(endpoint: postpass))
            }
            return sources
        }
    }

    private struct CacheEntry {
        let elements: [OverpassElement]
        let storedAt: Date
    }

    private let httpClient: HTTPClient
    private let configuration: Configuration
    private let now: @Sendable () -> Date
    private var cache: [String: CacheEntry] = [:]
    private var unavailableUntil: [String: Date] = [:]

    init(
        httpClient: HTTPClient = URLSession.shared,
        configuration: Configuration = Configuration(),
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.httpClient = httpClient
        self.configuration = configuration
        self.now = now
    }

    func searchPharmacies(near origin: Coordinate, maxCacheAge: TimeInterval?) async throws -> PharmacySearchResult {
        // Start small and widen only when nothing is found: dense cities get a fast,
        // light query while rural areas still get results.
        for radius in configuration.searchRadii {
            let elements = try await elements(near: origin, radius: radius, maxCacheAge: maxCacheAge)
            let pharmacies = PharmacyMapper.pharmacies(from: elements, origin: origin, limit: configuration.maxResults)
            if !pharmacies.isEmpty {
                return PharmacySearchResult(pharmacies: pharmacies, radius: radius)
            }
        }
        return PharmacySearchResult(pharmacies: [], radius: configuration.searchRadii.last ?? 0)
    }

    // MARK: - Cache

    /// ~110 m grid: nearby origins reuse the same response.
    private static func cacheKey(for origin: Coordinate, radius: Double) -> String {
        String(format: "%.0f:%.3f:%.3f", radius, origin.latitude, origin.longitude)
    }

    private func elements(near origin: Coordinate, radius: Double, maxCacheAge: TimeInterval?) async throws -> [OverpassElement] {
        let key = Self.cacheKey(for: origin, radius: radius)

        if let entry = cache[key] {
            let age = now().timeIntervalSince(entry.storedAt)
            if age > configuration.cacheTimeToLive {
                cache[key] = nil
            } else if age <= min(maxCacheAge ?? configuration.cacheTimeToLive, configuration.cacheTimeToLive) {
                return entry.elements
            }
        }

        let elements = try await fetchElements(near: origin, radius: radius)
        cache[key] = CacheEntry(elements: elements, storedAt: now())
        return elements
    }

    // MARK: - Sources

    /// Sources that recently failed are skipped, except the last one, which is always tried.
    private var availableSources: [any OSMDataSource] {
        let sources = configuration.sources
        return sources.enumerated().compactMap { index, source in
            let isLast = index == sources.count - 1
            let isCoolingDown = unavailableUntil[source.name].map { $0 > now() } ?? false
            return isLast || !isCoolingDown ? source : nil
        }
    }

    /// Any API failure hands over to the next source; only a missing connection
    /// (no source can help) and cancellation stop immediately.
    private func fetchElements(near center: Coordinate, radius: Double) async throws -> [OverpassElement] {
        var lastError: PharmacyError?

        for (index, source) in availableSources.enumerated() {
            if index > 0 {
                try await Task.sleep(for: configuration.retryDelay)
            }
            do {
                let elements = try await performRequest(to: source, center: center, radius: radius)
                unavailableUntil[source.name] = nil
                return elements
            } catch let error as PharmacyError where error != .offline {
                lastError = error
                unavailableUntil[source.name] = now().addingTimeInterval(configuration.sourceCooldown)
            }
        }

        throw lastError ?? PharmacyError.unknown
    }

    private func performRequest(to source: any OSMDataSource, center: Coordinate, radius: Double) async throws -> [OverpassElement] {
        var request = URLRequest(url: source.endpoint, timeoutInterval: configuration.requestTimeout)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.setValue(AppConfig.userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue(AppConfig.referer, forHTTPHeaderField: "Referer")
        request.httpBody = Data(OverpassQueryBuilder.formBody(for: source.query(around: center, radius: radius)).utf8)

        let result: (Data, URLResponse)
        do {
            result = try await httpClient.send(request)
        } catch {
            if PharmacyError.isCancellation(error) { throw CancellationError() }
            throw PharmacyError.from(error)
        }
        let (data, response) = result

        if let httpResponse = response as? HTTPURLResponse, !(200..<300).contains(httpResponse.statusCode) {
            throw PharmacyError.fromHTTPStatus(httpResponse.statusCode)
        }
        return try source.elements(from: data)
    }
}
