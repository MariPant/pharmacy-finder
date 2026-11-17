import Foundation

struct Pharmacy: Identifiable, Hashable, Codable, Sendable {
    /// Stable OpenStreetMap identifier, e.g. "node/123456".
    let id: String
    /// `nil` when OSM has no name, brand or operator for the object.
    let name: String?
    /// `nil` when OSM has no address tags for the object.
    let address: String?
    let coordinate: Coordinate
    /// Great-circle distance from the search origin, in metres.
    let distance: Double
    let openingHours: String?
    let phone: String?

    var displayName: String {
        name ?? L10n.unnamedPharmacy
    }
}

struct PharmacySearchResult: Equatable, Sendable {
    let pharmacies: [Pharmacy]
    /// The radius that produced the results (the largest one if nothing was found).
    let radius: Double
}
