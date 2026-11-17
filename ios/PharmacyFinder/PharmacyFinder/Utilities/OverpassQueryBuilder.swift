import Foundation

enum OverpassQueryBuilder {
    /// `nwr` covers nodes, ways and relations: many pharmacies are mapped as building
    /// outlines, not points. `out center` gives those a single coordinate. A union of
    /// sets in Overpass QL is already de-duplicated.
    static func pharmacyQuery(around center: Coordinate, radius: Double, timeout: Int) -> String {
        let around = String(
            format: "around:%ld,%.6f,%.6f",
            Int(radius.rounded()),
            center.latitude,
            center.longitude
        )
        return """
            [out:json][timeout:\(timeout)];
            (
              nwr["amenity"="pharmacy"](\(around));
              nwr["healthcare"="pharmacy"](\(around));
            );
            out center;
            """
    }

    /// `application/x-www-form-urlencoded` body: `data=<percent-encoded query>`.
    static func formBody(for query: String) -> String {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: unreservedCharacters) ?? query
        return "data=\(encoded)"
    }

    /// RFC 3986 unreserved characters; everything else is percent-encoded.
    private static let unreservedCharacters = CharacterSet(
        charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
    )
}
