import Foundation

/// The point pharmacies are searched around.
struct SearchOrigin: Equatable, Sendable {
    enum Source: Equatable, Sendable {
        case device
        case address
    }

    let coordinate: Coordinate
    let source: Source
    /// Human-readable place name; `nil` until (or if) it can be resolved.
    var label: String?
    /// Horizontal accuracy in metres; only available for device locations.
    let accuracy: Double?
}

struct DeviceLocation: Equatable, Sendable {
    let coordinate: Coordinate
    let accuracy: Double
}
