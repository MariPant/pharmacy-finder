import Foundation

enum MapsProvider: String, CaseIterable, Identifiable, Sendable {
    case apple
    case google

    var id: String { rawValue }

    var title: String {
        switch self {
        case .apple: "Apple Maps"
        case .google: "Google Maps"
        }
    }
}

enum DirectionsURLBuilder {
    /// Universal link: opens the Maps app when installed, the website otherwise.
    /// Without an origin, the maps app routes from the device's current location.
    static func webURL(for provider: MapsProvider, to destination: Coordinate, from origin: Coordinate? = nil) -> URL? {
        switch provider {
        case .apple:
            var components = URLComponents(string: "https://maps.apple.com/")
            components?.queryItems = queryItems([
                ("saddr", origin.map(point)),
                ("daddr", point(destination)),
            ])
            return components?.url
        case .google:
            var components = URLComponents(string: "https://www.google.com/maps/dir/")
            components?.queryItems = queryItems([
                ("api", "1"),
                ("origin", origin.map(point)),
                ("destination", point(destination)),
            ])
            return components?.url
        }
    }

    /// Google Maps app URL scheme. Opening it fails gracefully when the app isn't installed.
    static func googleMapsAppURL(to destination: Coordinate, from origin: Coordinate? = nil) -> URL? {
        var components = URLComponents(string: "comgooglemaps://")
        components?.queryItems = queryItems([
            ("saddr", origin.map(point)),
            ("daddr", point(destination)),
        ])
        return components?.url
    }

    private static func point(_ coordinate: Coordinate) -> String {
        "\(coordinate.latitude),\(coordinate.longitude)"
    }

    private static func queryItems(_ pairs: [(String, String?)]) -> [URLQueryItem] {
        pairs.compactMap { name, value in
            value.map { URLQueryItem(name: name, value: $0) }
        }
    }
}
