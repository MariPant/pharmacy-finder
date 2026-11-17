import Foundation
import Testing
@testable import PharmacyFinder

@Suite("Sorting pharmacies by distance")
struct PharmacySortingTests {
    @Test func nearestFirst() {
        let pharmacies = [
            Fixtures.pharmacy(id: "node/1", distance: 2_000),
            Fixtures.pharmacy(id: "node/2", distance: 150),
            Fixtures.pharmacy(id: "node/3", distance: 900),
        ]
        #expect(pharmacies.sortedByDistance().map(\.id) == ["node/2", "node/3", "node/1"])
    }

    @Test func tiesAreBrokenByNameWithUnnamedLastThenById() {
        let pharmacies = [
            Fixtures.pharmacy(id: "node/1", name: nil, distance: 300),
            Fixtures.pharmacy(id: "node/2", name: "Beta", distance: 300),
            Fixtures.pharmacy(id: "node/3", name: "Alpha", distance: 300),
            Fixtures.pharmacy(id: "node/0", name: "Alpha", distance: 300),
        ]
        #expect(pharmacies.sortedByDistance().map(\.id) == ["node/0", "node/3", "node/2", "node/1"])
    }

    @Test func emptyListStaysEmpty() {
        #expect([Pharmacy]().sortedByDistance().isEmpty)
    }

    @Test func mapperAppliesLimitAfterSorting() throws {
        let elements = try JSONDecoder().decode(OverpassResponse.self, from: Fixtures.overpassJSON).elements
        let limited = PharmacyMapper.pharmacies(from: elements, origin: Fixtures.origin, limit: 1)
        #expect(limited.map(\.id) == ["node/1"])
    }
}

