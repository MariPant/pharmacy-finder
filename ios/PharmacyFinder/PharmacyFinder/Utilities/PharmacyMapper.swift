import Foundation

/// Converts raw Overpass elements into `Pharmacy` models. Uses only what OSM provides:
/// a missing name or address stays `nil` and is never invented.
enum PharmacyMapper {
    static func pharmacies(
        from elements: [OverpassElement],
        origin: Coordinate,
        limit: Int? = nil
    ) -> [Pharmacy] {
        var seenIDs = Set<String>()
        var pharmacies: [Pharmacy] = []

        for element in elements {
            guard let pharmacy = pharmacy(from: element, origin: origin),
                  seenIDs.insert(pharmacy.id).inserted
            else { continue }
            pharmacies.append(pharmacy)
        }

        let sorted = pharmacies.sortedByDistance()
        guard let limit else { return sorted }
        return Array(sorted.prefix(limit))
    }

    static func pharmacy(from element: OverpassElement, origin: Coordinate) -> Pharmacy? {
        guard let coordinate = coordinate(of: element) else { return nil }
        let tags = element.tags

        return Pharmacy(
            id: "\(element.type.rawValue)/\(element.id)",
            name: name(from: tags),
            address: address(from: tags),
            coordinate: coordinate,
            distance: DistanceCalculator.distance(from: origin, to: coordinate),
            openingHours: tag("opening_hours", in: tags),
            phone: tag("phone", in: tags) ?? tag("contact:phone", in: tags)
        )
    }

    /// Nodes carry `lat`/`lon`; ways and relations carry `center`.
    static func coordinate(of element: OverpassElement) -> Coordinate? {
        guard let latitude = element.lat ?? element.center?.lat,
              let longitude = element.lon ?? element.center?.lon
        else { return nil }

        let coordinate = Coordinate(latitude: latitude, longitude: longitude)
        return coordinate.isValid ? coordinate : nil
    }

    static func name(from tags: [String: String]?) -> String? {
        tag("name", in: tags) ?? tag("brand", in: tags) ?? tag("operator", in: tags)
    }

    /// "Street 1, 00100 City", or `nil` if OSM has no address.
    static func address(from tags: [String: String]?) -> String? {
        if let fullAddress = tag("addr:full", in: tags) {
            return fullAddress
        }

        let street = tag("addr:street", in: tags) ?? tag("addr:place", in: tags)
        let streetLine = street.map { street in
            [street, tag("addr:housenumber", in: tags)].compactMap { $0 }.joined(separator: " ")
        }

        let cityLine = [tag("addr:postcode", in: tags), tag("addr:city", in: tags)]
            .compactMap { $0 }
            .joined(separator: " ")

        let parts = [streetLine, cityLine.isEmpty ? nil : cityLine].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    /// Trimmed tag value, or `nil` if missing or blank.
    private static func tag(_ key: String, in tags: [String: String]?) -> String? {
        guard let value = tags?[key]?.trimmingCharacters(in: .whitespacesAndNewlines),
              !value.isEmpty
        else { return nil }
        return value
    }
}
