import Foundation
import Testing
@testable import PharmacyFinder

@Suite("PharmacyService with a mock HTTP client")
struct PharmacyServiceTests {
    private let overpassURL = URL(string: "https://overpass.test/api/interpreter")
    private let postpassURL = URL(string: "https://postpass.test/api/interpreter")

    private func makeService(
        _ client: MockHTTPClient,
        now: @escaping @Sendable () -> Date = { Date(timeIntervalSince1970: 0) }
    ) throws -> PharmacyService {
        var configuration = PharmacyService.Configuration()
        configuration.sources = [
            OverpassSource(endpoint: try #require(overpassURL)),
            PostpassSource(endpoint: try #require(postpassURL)),
        ]
        configuration.searchRadii = [1_000, 3_000]
        configuration.retryDelay = .zero
        configuration.sourceCooldown = 60
        return PharmacyService(httpClient: client, configuration: configuration, now: now)
    }

    private func sentQuery(_ request: URLRequest?) -> String {
        guard let body = request?.httpBody, let form = String(data: body, encoding: .utf8) else { return "" }
        return form.removingPercentEncoding ?? ""
    }

    @Test func queriesOverpassFirstAndReturnsSortedPharmacies() async throws {
        let client = MockHTTPClient([.status(200, Fixtures.overpassJSON)])
        let result = try await makeService(client).searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)

        let requests = await client.requests
        #expect(requests.count == 1)
        #expect(requests.first?.httpMethod == "POST")
        #expect(requests.first?.url == overpassURL)
        #expect(requests.first?.value(forHTTPHeaderField: "User-Agent") == AppConfig.userAgent)
        #expect(sentQuery(requests.first).contains("around:1000,"))
        #expect(result.radius == 1_000)
        #expect(result.pharmacies.map(\.id) == ["node/1", "way/2", "node/3"])
    }

    @Test func widensTheRadiusWhenNothingIsFound() async throws {
        let client = MockHTTPClient([
            .status(200, Fixtures.emptyOverpassJSON),
            .status(200, Fixtures.overpassJSON),
        ])
        let result = try await makeService(client).searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)

        #expect(sentQuery(await client.requests.last).contains("around:3000,"))
        #expect(result.radius == 3_000)
        #expect(result.pharmacies.count == 3)
    }

    @Test func returnsEmptyResultWithLargestRadius() async throws {
        let client = MockHTTPClient([
            .status(200, Fixtures.emptyOverpassJSON),
            .status(200, Fixtures.emptyOverpassJSON),
        ])
        let result = try await makeService(client).searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)
        #expect(result == PharmacySearchResult(pharmacies: [], radius: 3_000))
    }

    @Test(arguments: [
        MockHTTPClient.Reply.status(429, Data()),
        .status(502, Data()),
        .status(200, Data("<html>Bad gateway</html>".utf8)),
        .status(200, Data(#"{ "elements": [], "remark": "runtime error: Query timed out" }"#.utf8)),
        .failure(.timedOut),
    ])
    func fallsBackToPostpassWhenOverpassFails(_ overpassReply: MockHTTPClient.Reply) async throws {
        let client = MockHTTPClient([overpassReply, .status(200, Fixtures.postpassJSON)])
        let result = try await makeService(client).searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)

        let requests = await client.requests
        #expect(requests.last?.url == postpassURL)
        #expect(sentQuery(requests.last).contains("FROM postpass_pointpolygon"))
        #expect(result.pharmacies.map(\.id) == ["node/1", "way/2"])
    }

    @Test func skipsAFailedSourceUntilItsCooldownHasPassed() async throws {
        let clock = TestClock()
        let client = MockHTTPClient([
            .status(502, Data()), // Overpass fails…
            .status(200, Fixtures.postpassJSON), // …Postpass answers.
            .status(200, Fixtures.postpassJSON), // Next search goes straight to Postpass.
            .status(200, Fixtures.overpassJSON), // After the cool-down, Overpass is tried again.
        ])
        let service = try makeService(client, now: { clock.now })

        _ = try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)
        _ = try await service.searchPharmacies(near: Coordinate(latitude: 60.17, longitude: 24.94), maxCacheAge: nil)
        #expect(await client.requests[2].url == postpassURL)

        clock.advance(by: 61)
        _ = try await service.searchPharmacies(near: Coordinate(latitude: 61.5, longitude: 23.76), maxCacheAge: nil)
        #expect(await client.requests[3].url == overpassURL)
    }

    @Test func reportsTheLastErrorWhenEverySourceFails() async throws {
        let client = MockHTTPClient([.status(429, Data()), .status(503, Data())])
        let service = try makeService(client)
        await #expect(throws: PharmacyError.server(statusCode: 503)) {
            try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)
        }
    }

    @Test func reportsOfflineWithoutTryingOtherSources() async throws {
        let client = MockHTTPClient([.failure(.notConnectedToInternet)])
        let service = try makeService(client)
        await #expect(throws: PharmacyError.offline) {
            try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)
        }
        #expect(await client.requests.count == 1)
    }

    @Test func servesRepeatedSearchesFromCacheUntilTooOld() async throws {
        let clock = TestClock()
        let client = MockHTTPClient([
            .status(200, Fixtures.overpassJSON),
            .status(200, Fixtures.overpassJSON),
        ])
        let service = try makeService(client, now: { clock.now })

        _ = try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: nil)
        _ = try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: 30)
        #expect(await client.requests.count == 1)

        clock.advance(by: 31)
        _ = try await service.searchPharmacies(near: Fixtures.origin, maxCacheAge: 30)
        #expect(await client.requests.count == 2)
    }
}

/// Manually advanced clock for cache and cool-down tests.
private final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current = Date(timeIntervalSince1970: 0)

    var now: Date {
        lock.withLock { current }
    }

    func advance(by seconds: TimeInterval) {
        lock.withLock { current += seconds }
    }
}
