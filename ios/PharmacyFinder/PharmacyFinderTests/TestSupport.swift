import CoreLocation
import Foundation
@testable import PharmacyFinder

// Demonstration data for tests only. Names and addresses are deliberately fictional.

enum Fixtures {
    static let origin = Coordinate(latitude: 60.9827, longitude: 25.6615)

    /// Raw Overpass payload covering the edge cases the mapper must handle.
    static let overpassJSON = Data("""
    {
      "version": 0.6,
      "generator": "Overpass API (test fixture)",
      "elements": [
        {
          "type": "node", "id": 1, "lat": 60.984, "lon": 25.66,
          "tags": {
            "amenity": "pharmacy",
            "name": "Test Pharmacy North",
            "addr:street": "Testikatu",
            "addr:housenumber": "1",
            "addr:postcode": "15100",
            "addr:city": "Lahti",
            "opening_hours": "Mo-Fr 09:00-18:00",
            "phone": "+358 3 000 0000"
          }
        },
        {
          "type": "way", "id": 2, "center": { "lat": 60.98, "lon": 25.665 },
          "nodes": [10, 11, 12],
          "tags": { "healthcare": "pharmacy", "brand": "Test Brand" }
        },
        { "type": "node", "id": 3, "lat": 60.99, "lon": 25.67, "tags": { "amenity": "pharmacy" } },
        { "type": "node", "id": 1, "lat": 60.984, "lon": 25.66, "tags": { "amenity": "pharmacy", "name": "Duplicate" } },
        { "type": "node", "id": 4, "tags": { "amenity": "pharmacy", "name": "Nowhere" } },
        { "type": "node", "id": 5, "lat": "not-a-number", "lon": 25.6 }
      ]
    }
    """.utf8)

    static let emptyOverpassJSON = Data(#"{ "version": 0.6, "elements": [] }"#.utf8)

    /// Postpass (GeoJSON) payload with the same pharmacies as the Overpass fixture.
    static let postpassJSON = Data("""
    {
      "postpass_properties": { "generator": "Postpass API (test fixture)" },
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": { "type": "Point", "coordinates": [25.66, 60.984] },
          "properties": {
            "osm_type": "N", "osm_id": 1,
            "tags": { "amenity": "pharmacy", "name": "Test Pharmacy North", "addr:street": "Testikatu" }
          }
        },
        {
          "type": "Feature",
          "geometry": { "type": "Point", "coordinates": [25.665, 60.98] },
          "properties": { "osm_type": "W", "osm_id": 2, "tags": { "healthcare": "pharmacy", "brand": "Test Brand" } }
        },
        {
          "type": "Feature",
          "geometry": { "type": "Point", "coordinates": [25.67, 60.99] },
          "properties": { "osm_type": "X", "osm_id": 3, "tags": {} }
        },
        { "type": "Feature", "geometry": null, "properties": { "osm_type": "N", "osm_id": 4, "tags": {} } }
      ]
    }
    """.utf8)

    static func pharmacy(
        id: String = "node/100",
        name: String? = "Test Pharmacy",
        address: String? = "Testikatu 1, 15100 Lahti",
        distance: Double = 250
    ) -> Pharmacy {
        Pharmacy(
            id: id,
            name: name,
            address: address,
            coordinate: Coordinate(latitude: 60.98, longitude: 25.66),
            distance: distance,
            openingHours: nil,
            phone: nil
        )
    }

    static let deviceLocation = DeviceLocation(coordinate: origin, accuracy: 15)
}

// MARK: - Mocks

actor MockPharmacyService: PharmacyServicing {
    struct Call: Equatable {
        let origin: Coordinate
        let maxCacheAge: TimeInterval?
    }

    private var results: [Result<PharmacySearchResult, PharmacyError>]
    private(set) var calls: [Call] = []

    init(results: [Result<PharmacySearchResult, PharmacyError>]) {
        self.results = results
    }

    func searchPharmacies(near origin: Coordinate, maxCacheAge: TimeInterval?) async throws -> PharmacySearchResult {
        calls.append(Call(origin: origin, maxCacheAge: maxCacheAge))
        // The last result repeats once the queue is exhausted.
        let result = results.count > 1 ? results.removeFirst() : results.first
        guard let result else { throw PharmacyError.unknown }
        return try result.get()
    }
}

@MainActor
final class MockLocationProvider: LocationProviding {
    var authorizationStatus: CLAuthorizationStatus
    var result: Result<DeviceLocation, PharmacyError>

    init(
        authorizationStatus: CLAuthorizationStatus = .authorizedWhenInUse,
        result: Result<DeviceLocation, PharmacyError> = .success(Fixtures.deviceLocation)
    ) {
        self.authorizationStatus = authorizationStatus
        self.result = result
    }

    func requestCurrentLocation() async throws -> DeviceLocation {
        try result.get()
    }
}

struct MockGeocoder: Geocoding {
    var geocodeResult: Result<GeocodedPlace, PharmacyError> = .failure(.addressNotFound)
    var placeName: String?

    func geocode(_ address: String) async throws -> GeocodedPlace {
        try geocodeResult.get()
    }

    func placeName(for coordinate: Coordinate) async -> String? {
        placeName
    }
}

/// Returns queued HTTP responses in order and records the requests.
actor MockHTTPClient: HTTPClient {
    enum Reply {
        case status(Int, Data)
        case failure(URLError.Code)
    }

    private var replies: [Reply]
    private(set) var requests: [URLRequest] = []

    init(_ replies: [Reply]) {
        self.replies = replies
    }

    func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        requests.append(request)
        guard !replies.isEmpty, let url = request.url else {
            throw URLError(.badServerResponse)
        }
        switch replies.removeFirst() {
        case .failure(let code):
            throw URLError(code)
        case .status(let statusCode, let data):
            guard let response = HTTPURLResponse(url: url, statusCode: statusCode, httpVersion: nil, headerFields: nil) else {
                throw URLError(.badServerResponse)
            }
            return (data, response)
        }
    }
}
