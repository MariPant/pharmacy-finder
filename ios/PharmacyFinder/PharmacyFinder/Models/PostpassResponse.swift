import Foundation

/// Postpass response: a GeoJSON FeatureCollection whose features carry the OSM type, id
/// and tags. Converted to `OverpassElement`, so the rest of the app doesn't know which
/// source answered.
struct PostpassResponse: Decodable, Sendable {
    let elements: [OverpassElement]

    private enum CodingKeys: String, CodingKey {
        case type
        case features
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        guard type == "FeatureCollection" else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Expected a FeatureCollection, got \(type)"
            )
        }
        // A single malformed feature must not fail the whole response.
        let features = try container.decode([LossyDecodable<Feature>].self, forKey: .features)
        elements = features.compactMap { $0.value?.element }
    }
}

private struct Feature: Decodable {
    struct Geometry: Decodable {
        let type: String
        let coordinates: [Double]
    }

    struct Properties: Decodable {
        let osmType: String
        let osmId: Int64
        let tags: [String: String]?

        private enum CodingKeys: String, CodingKey {
            case osmType = "osm_type"
            case osmId = "osm_id"
            case tags
        }
    }

    let geometry: Geometry
    let properties: Properties

    /// `nil` for anything that isn't a point with a known OSM type.
    var element: OverpassElement? {
        let types: [String: OverpassElement.ElementType] = ["N": .node, "W": .way, "R": .relation]
        guard let type = types[properties.osmType],
              geometry.type == "Point",
              geometry.coordinates.count >= 2
        else { return nil }

        // GeoJSON order is [longitude, latitude].
        return OverpassElement(
            type: type,
            id: properties.osmId,
            lat: geometry.coordinates[1],
            lon: geometry.coordinates[0],
            tags: properties.tags
        )
    }
}
