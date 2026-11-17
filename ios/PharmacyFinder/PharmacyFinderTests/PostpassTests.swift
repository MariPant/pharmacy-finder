import Foundation
import Testing
@testable import PharmacyFinder

@Suite("Postpass fallback source")
struct PostpassTests {
    @Test func queryUsesTheSameTagsAsOverpass() {
        let query = PostpassQueryBuilder.pharmacyQuery(around: Fixtures.origin, radius: 2_000)
        #expect(query.contains("tags->>'amenity' = 'pharmacy' OR tags->>'healthcare' = 'pharmacy'"))
        #expect(query.contains("FROM postpass_pointpolygon"))
        #expect(query.contains("ST_PointOnSurface(geom)"))
    }

    @Test func queryIsLimitedToTheRadiusAroundTheOrigin() {
        let query = PostpassQueryBuilder.pharmacyQuery(around: Fixtures.origin, radius: 2_000)
        #expect(query.contains("ST_MakePoint(25.661500, 60.982700)"))
        #expect(query.contains("::geography, 2000)"))
        #expect(query.contains("ST_MakeEnvelope("))
    }

    @Test func decodingConvertsFeaturesAndSkipsMalformedOnes() throws {
        let elements = try JSONDecoder().decode(PostpassResponse.self, from: Fixtures.postpassJSON).elements
        #expect(elements == [
            OverpassElement(
                type: .node,
                id: 1,
                lat: 60.984,
                lon: 25.66,
                tags: ["amenity": "pharmacy", "name": "Test Pharmacy North", "addr:street": "Testikatu"]
            ),
            OverpassElement(
                type: .way,
                id: 2,
                lat: 60.98,
                lon: 25.665,
                tags: ["healthcare": "pharmacy", "brand": "Test Brand"]
            ),
        ])
    }

    @Test func decodingRejectsNonFeatureCollections() {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(PostpassResponse.self, from: Data(#"{ "type": "Feature", "features": [] }"#.utf8))
        }
    }

    @Test func sourceMapsInvalidDataToAPharmacyError() throws {
        let source = PostpassSource(endpoint: try #require(URL(string: "https://postpass.test")))
        #expect(throws: PharmacyError.invalidResponse) {
            try source.elements(from: Data("<html>oops</html>".utf8))
        }
    }
}
