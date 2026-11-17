import CoreLocation

/// Value-type coordinate that is `Codable`, `Hashable` and `Sendable`
/// (unlike `CLLocationCoordinate2D`), so it can live in models and tests.
struct Coordinate: Hashable, Codable, Sendable {
    let latitude: Double
    let longitude: Double
}

extension Coordinate {
    init(_ coordinate: CLLocationCoordinate2D) {
        self.init(latitude: coordinate.latitude, longitude: coordinate.longitude)
    }

    var clCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var isValid: Bool {
        latitude.isFinite && longitude.isFinite && abs(latitude) <= 90 && abs(longitude) <= 180
    }

    /// Five decimals ≈ 1 m precision. Always uses "." as the decimal separator.
    var formatted: String {
        String(format: "%.5f, %.5f", latitude, longitude)
    }
}
