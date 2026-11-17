import Foundation

enum DistanceCalculator {
    /// Mean Earth radius (IUGG), metres.
    static let earthRadius: Double = 6_371_008.8

    /// Great-circle distance using the haversine formula.
    /// Same algorithm as the web app, so both apps show identical distances.
    static func distance(from start: Coordinate, to end: Coordinate) -> Double {
        let deltaLatitude = (end.latitude - start.latitude).radians
        let deltaLongitude = (end.longitude - start.longitude).radians
        let startLatitude = start.latitude.radians
        let endLatitude = end.latitude.radians

        let haversine = pow(sin(deltaLatitude / 2), 2)
            + cos(startLatitude) * cos(endLatitude) * pow(sin(deltaLongitude / 2), 2)

        // Clamping guards against floating-point values slightly above 1.
        return 2 * earthRadius * asin(min(1, sqrt(haversine)))
    }
}

private extension Double {
    var radians: Double { self * .pi / 180 }
}
