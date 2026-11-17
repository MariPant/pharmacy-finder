import Foundation

/// A service that can answer "OpenStreetMap pharmacies within a radius".
protocol OSMDataSource: Sendable {
    /// Identifies the source for cool-down bookkeeping.
    var name: String { get }
    var endpoint: URL { get }
    /// Query sent as the `data` form field of a POST request.
    func query(around center: Coordinate, radius: Double) -> String
    /// Decodes the response body; throws `PharmacyError` on invalid data.
    func elements(from data: Data) throws -> [OverpassElement]
}

struct OverpassSource: OSMDataSource {
    let endpoint: URL
    var queryTimeout: Int = AppConfig.overpassQueryTimeout

    var name: String { "overpass" }

    func query(around center: Coordinate, radius: Double) -> String {
        OverpassQueryBuilder.pharmacyQuery(around: center, radius: radius, timeout: queryTimeout)
    }

    func elements(from data: Data) throws -> [OverpassElement] {
        let response: OverpassResponse
        do {
            response = try JSONDecoder().decode(OverpassResponse.self, from: data)
        } catch {
            throw PharmacyError.invalidResponse
        }
        // Overpass returns HTTP 200 with a remark when the query hit its server-side limits.
        if let remark = response.remark, remark.localizedCaseInsensitiveContains("runtime error") {
            throw PharmacyError.timeout
        }
        return response.elements
    }
}

struct PostpassSource: OSMDataSource {
    let endpoint: URL

    var name: String { "postpass" }

    func query(around center: Coordinate, radius: Double) -> String {
        PostpassQueryBuilder.pharmacyQuery(around: center, radius: radius)
    }

    func elements(from data: Data) throws -> [OverpassElement] {
        do {
            return try JSONDecoder().decode(PostpassResponse.self, from: data).elements
        } catch {
            throw PharmacyError.invalidResponse
        }
    }
}
