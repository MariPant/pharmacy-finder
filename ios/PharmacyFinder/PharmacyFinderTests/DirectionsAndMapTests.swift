import Foundation
import MapKit
import Testing
@testable import PharmacyFinder

@Suite("Directions URLs and map framing")
struct DirectionsAndMapTests {
    private let destination = Coordinate(latitude: 60.98, longitude: 25.66)
    private let origin = Coordinate(latitude: 61.0, longitude: 25.7)

    @Test func appleMapsURL() {
        let url = DirectionsURLBuilder.webURL(for: .apple, to: destination)
        #expect(url?.absoluteString == "https://maps.apple.com/?daddr=60.98,25.66")
    }

    @Test func googleMapsURLWithOrigin() {
        let url = DirectionsURLBuilder.webURL(for: .google, to: destination, from: origin)
        #expect(url?.absoluteString == "https://www.google.com/maps/dir/?api=1&origin=61.0,25.7&destination=60.98,25.66")
    }

    @Test func googleMapsAppURL() {
        let url = DirectionsURLBuilder.googleMapsAppURL(to: destination)
        #expect(url?.absoluteString == "comgooglemaps://?daddr=60.98,25.66")
    }

    @Test func regionContainsAllCoordinatesWithPadding() throws {
        let coordinates = [
            Coordinate(latitude: 60.0, longitude: 25.0),
            Coordinate(latitude: 61.0, longitude: 26.0),
        ]
        let region = try #require(MapRegionCalculator.region(fitting: coordinates))
        #expect(abs(region.center.latitude - 60.5) < 1e-9)
        #expect(abs(region.center.longitude - 25.5) < 1e-9)
        #expect(abs(region.span.latitudeDelta - 1.4) < 1e-9)
    }

    @Test func regionHasAMinimumSpanForASinglePoint() throws {
        let region = try #require(MapRegionCalculator.region(fitting: [destination]))
        #expect(region.span.latitudeDelta == 0.01)
    }

    @Test func noRegionForNoCoordinates() {
        #expect(MapRegionCalculator.region(fitting: []) == nil)
    }
}
