import MapKit

enum MapRegionCalculator {
    /// Smallest region that contains all coordinates, with some padding around the edges.
    static func region(
        fitting coordinates: [Coordinate],
        paddingFactor: Double = 1.4,
        minimumSpanDegrees: Double = 0.01
    ) -> MKCoordinateRegion? {
        guard let first = coordinates.first else { return nil }

        var minLatitude = first.latitude
        var maxLatitude = first.latitude
        var minLongitude = first.longitude
        var maxLongitude = first.longitude
        for coordinate in coordinates.dropFirst() {
            minLatitude = min(minLatitude, coordinate.latitude)
            maxLatitude = max(maxLatitude, coordinate.latitude)
            minLongitude = min(minLongitude, coordinate.longitude)
            maxLongitude = max(maxLongitude, coordinate.longitude)
        }

        let center = CLLocationCoordinate2D(
            latitude: (minLatitude + maxLatitude) / 2,
            longitude: (minLongitude + maxLongitude) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: min(180, max(minimumSpanDegrees, (maxLatitude - minLatitude) * paddingFactor)),
            longitudeDelta: min(360, max(minimumSpanDegrees, (maxLongitude - minLongitude) * paddingFactor))
        )
        return MKCoordinateRegion(center: center, span: span)
    }
}
