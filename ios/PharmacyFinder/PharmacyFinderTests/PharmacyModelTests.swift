import Foundation
import Testing
@testable import PharmacyFinder

@Suite("Pharmacy model and Overpass mapping")
struct PharmacyModelTests {
    private func decodeFixture() throws -> OverpassResponse {
        try JSONDecoder().decode(OverpassResponse.self, from: Fixtures.overpassJSON)
    }

    @Test func decodingSkipsMalformedElements() throws {
        let response = try decodeFixture()
        #expect(response.elements.count == 5)
        #expect(!response.elements.contains { $0.id == 5 })
    }

    @Test func decodingFailsWithoutElementsArray() {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(OverpassResponse.self, from: Data(#"{ "foo": 1 }"#.utf8))
        }
    }

    @Test func mappingDeduplicatesSkipsMissingCoordinatesAndSorts() throws {
        let pharmacies = PharmacyMapper.pharmacies(from: try decodeFixture().elements, origin: Fixtures.origin)

        #expect(pharmacies.map(\.id) == ["node/1", "way/2", "node/3"])
        #expect(pharmacies.first?.name == "Test Pharmacy North")
        #expect(pharmacies.map(\.distance) == pharmacies.map(\.distance).sorted())
    }

    @Test func mappingKeepsAllAvailableFields() throws {
        let pharmacy = try #require(
            PharmacyMapper.pharmacies(from: try decodeFixture().elements, origin: Fixtures.origin).first
        )
        #expect(pharmacy.address == "Testikatu 1, 15100 Lahti")
        #expect(pharmacy.openingHours == "Mo-Fr 09:00-18:00")
        #expect(pharmacy.phone == "+358 3 000 0000")
        #expect(pharmacy.coordinate == Coordinate(latitude: 60.984, longitude: 25.66))
        #expect(pharmacy.distance > 150 && pharmacy.distance < 180)
    }

    @Test func waysUseTheirCentre() {
        let element = OverpassElement(
            type: .way,
            id: 2,
            center: .init(lat: 60.98, lon: 25.665),
            tags: ["brand": "Test Brand"]
        )
        let pharmacy = PharmacyMapper.pharmacy(from: element, origin: Fixtures.origin)
        #expect(pharmacy?.id == "way/2")
        #expect(pharmacy?.coordinate == Coordinate(latitude: 60.98, longitude: 25.665))
    }

    @Test func invalidCoordinatesAreRejected() {
        let element = OverpassElement(type: .node, id: 9, lat: 95, lon: 25)
        #expect(PharmacyMapper.pharmacy(from: element, origin: Fixtures.origin) == nil)
    }

    @Test func nameFallsBackToBrandThenOperatorButIsNeverInvented() {
        #expect(PharmacyMapper.name(from: ["name": "A", "brand": "B", "operator": "C"]) == "A")
        #expect(PharmacyMapper.name(from: ["brand": "B", "operator": "C"]) == "B")
        #expect(PharmacyMapper.name(from: ["operator": "C"]) == "C")
        #expect(PharmacyMapper.name(from: ["amenity": "pharmacy"]) == nil)
        #expect(PharmacyMapper.name(from: ["name": "   "]) == nil)
        #expect(PharmacyMapper.name(from: nil) == nil)
    }

    @Test func addressFormatting() {
        let full = [
            "addr:street": "Testikatu",
            "addr:housenumber": "1",
            "addr:postcode": "15100",
            "addr:city": "Lahti",
        ]
        #expect(PharmacyMapper.address(from: full) == "Testikatu 1, 15100 Lahti")
        #expect(PharmacyMapper.address(from: ["addr:full": "Testikatu 5 B, Lahti"]) == "Testikatu 5 B, Lahti")
        #expect(PharmacyMapper.address(from: ["addr:street": "Testikatu"]) == "Testikatu")
        #expect(PharmacyMapper.address(from: ["addr:city": "Lahti"]) == "Lahti")
        #expect(PharmacyMapper.address(from: ["addr:housenumber": "7"]) == nil)
        #expect(PharmacyMapper.address(from: nil) == nil)
    }

    @Test func displayNameUsesPlaceholderOnlyForMissingNames() {
        #expect(Fixtures.pharmacy(name: "Real Name").displayName == "Real Name")
        #expect(Fixtures.pharmacy(name: nil).displayName == L10n.unnamedPharmacy)
    }

    @Test func pharmacyRoundTripsThroughCodable() throws {
        let pharmacy = Fixtures.pharmacy()
        let decoded = try JSONDecoder().decode(Pharmacy.self, from: JSONEncoder().encode(pharmacy))
        #expect(decoded == pharmacy)
    }

    @Test func queryContainsBothTagsAndCentreOutput() {
        let query = OverpassQueryBuilder.pharmacyQuery(around: Fixtures.origin, radius: 2_000, timeout: 25)
        #expect(query.contains("[out:json][timeout:25];"))
        #expect(query.contains(#"nwr["amenity"="pharmacy"](around:2000,60.982700,25.661500);"#))
        #expect(query.contains(#"nwr["healthcare"="pharmacy"](around:2000,60.982700,25.661500);"#))
        #expect(query.contains("out center;"))
    }

    @Test func formBodyIsPercentEncoded() {
        #expect(OverpassQueryBuilder.formBody(for: #"a="b" c;"#) == "data=a%3D%22b%22%20c%3B")
    }
}
