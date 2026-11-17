import Foundation
import Testing
@testable import PharmacyFinder

@Suite("Distance calculation and formatting")
struct DistanceTests {
    @Test func identicalPointsAreZeroApart() {
        let point = Coordinate(latitude: 60.17, longitude: 24.94)
        #expect(DistanceCalculator.distance(from: point, to: point) == 0)
    }

    @Test func oneDegreeOfLatitude() {
        let distance = DistanceCalculator.distance(
            from: Coordinate(latitude: 0, longitude: 0),
            to: Coordinate(latitude: 1, longitude: 0)
        )
        #expect(abs(distance - 111_195) < 1)
    }

    @Test func knownCityDistanceHelsinkiToTampere() {
        let distance = DistanceCalculator.distance(
            from: Coordinate(latitude: 60.1699, longitude: 24.9384),
            to: Coordinate(latitude: 61.4978, longitude: 23.761)
        )
        #expect((158_000...162_000).contains(distance))
    }

    @Test func distanceIsSymmetric() {
        let a = Coordinate(latitude: 60.9827, longitude: 25.6615)
        let b = Coordinate(latitude: 60.99, longitude: 25.67)
        #expect(abs(DistanceCalculator.distance(from: a, to: b) - DistanceCalculator.distance(from: b, to: a)) < 1e-6)
    }

    @Test func crossingTheAntimeridian() {
        let distance = DistanceCalculator.distance(
            from: Coordinate(latitude: 0, longitude: 179.9),
            to: Coordinate(latitude: 0, longitude: -179.9)
        )
        #expect(distance < 23_000)
    }

    struct FormatCase: Sendable, CustomTestStringConvertible {
        let meters: Double
        let localeIdentifier: String
        let expected: String
        var testDescription: String { "\(meters) m (\(localeIdentifier)) → \(expected)" }
    }

    @Test(arguments: [
        FormatCase(meters: 0, localeIdentifier: "en_US", expected: "0 m"),
        FormatCase(meters: 42.4, localeIdentifier: "en_US", expected: "42 m"),
        FormatCase(meters: 349.6, localeIdentifier: "en_US", expected: "350 m"),
        FormatCase(meters: 999.4, localeIdentifier: "en_US", expected: "999 m"),
        FormatCase(meters: 999.6, localeIdentifier: "en_US", expected: "1.0 km"),
        FormatCase(meters: 1_234, localeIdentifier: "en_US", expected: "1.2 km"),
        FormatCase(meters: 1_234, localeIdentifier: "fi_FI", expected: "1,2 km"),
        FormatCase(meters: 9_949, localeIdentifier: "en_US", expected: "9.9 km"),
        FormatCase(meters: 12_345, localeIdentifier: "en_US", expected: "12 km"),
    ])
    func formatting(_ testCase: FormatCase) {
        let formatted = DistanceFormatter.string(
            fromMeters: testCase.meters,
            locale: Locale(identifier: testCase.localeIdentifier)
        )
        #expect(formatted == testCase.expected)
    }

    @Test func formattingHandlesInvalidInput() {
        #expect(DistanceFormatter.string(fromMeters: -5) == "0 m")
        #expect(DistanceFormatter.string(fromMeters: .nan) == "—")
    }
}
