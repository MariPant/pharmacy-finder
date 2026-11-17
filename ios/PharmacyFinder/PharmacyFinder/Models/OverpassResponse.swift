import Foundation

/// Overpass API JSON response (`[out:json]`).
struct OverpassResponse: Decodable, Sendable {
    let elements: [OverpassElement]
    /// Overpass reports server-side problems (e.g. query timeouts) here with HTTP 200.
    let remark: String?

    init(elements: [OverpassElement], remark: String? = nil) {
        self.elements = elements
        self.remark = remark
    }

    private enum CodingKeys: String, CodingKey {
        case elements
        case remark
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // A single malformed element must not fail the whole response.
        let lossyElements = try container.decode([LossyDecodable<OverpassElement>].self, forKey: .elements)
        elements = lossyElements.compactMap(\.value)
        remark = try container.decodeIfPresent(String.self, forKey: .remark)
    }
}

struct OverpassElement: Decodable, Equatable, Sendable {
    enum ElementType: String, Decodable, Sendable {
        case node
        case way
        case relation
    }

    struct Center: Decodable, Equatable, Sendable {
        let lat: Double
        let lon: Double
    }

    let type: ElementType
    let id: Int64
    /// Present on nodes.
    let lat: Double?
    let lon: Double?
    /// Present on ways and relations when the query uses `out center`.
    let center: Center?
    let tags: [String: String]?

    init(
        type: ElementType,
        id: Int64,
        lat: Double? = nil,
        lon: Double? = nil,
        center: Center? = nil,
        tags: [String: String]? = nil
    ) {
        self.type = type
        self.id = id
        self.lat = lat
        self.lon = lon
        self.center = center
        self.tags = tags
    }
}

/// Decodes `T` if possible and yields `nil` instead of throwing.
struct LossyDecodable<T: Decodable>: Decodable {
    let value: T?

    init(from decoder: Decoder) throws {
        value = try? T(from: decoder)
    }
}
