import Foundation

enum PostpassQueryBuilder {
    private static let metersPerDegreeLatitude = 111_320.0

    /// Same filter as the Overpass query: `amenity=pharmacy` or `healthcare=pharmacy` on
    /// points and building outlines. `ST_PointOnSurface` turns outlines into a single point.
    /// All values are numbers formatted by the app, so no user input reaches the SQL.
    static func pharmacyQuery(around center: Coordinate, radius: Double) -> String {
        let deltaLatitude = radius / metersPerDegreeLatitude
        let cosLatitude = max(cos(center.latitude * .pi / 180), 0.01)
        let deltaLongitude = radius / (metersPerDegreeLatitude * cosLatitude)

        let envelope = String(
            format: "ST_MakeEnvelope(%.6f, %.6f, %.6f, %.6f, 4326)",
            center.longitude - deltaLongitude,
            center.latitude - deltaLatitude,
            center.longitude + deltaLongitude,
            center.latitude + deltaLatitude
        )
        let point = String(
            format: "ST_SetSRID(ST_MakePoint(%.6f, %.6f), 4326)",
            center.longitude,
            center.latitude
        )

        return """
            SELECT osm_type, osm_id, tags, ST_PointOnSurface(geom) AS geom
            FROM postpass_pointpolygon
            WHERE (tags->>'amenity' = 'pharmacy' OR tags->>'healthcare' = 'pharmacy')
              AND geom && \(envelope)
              AND ST_DWithin(geom::geography, \(point)::geography, \(Int(radius.rounded())))
            LIMIT 200
            """
    }
}
