import CoreLocation

struct GeocodedPlace: Equatable, Sendable {
    let coordinate: Coordinate
    let label: String
}

protocol Geocoding: Sendable {
    /// Address or city → coordinate. Throws `PharmacyError.addressNotFound` if nothing matches.
    func geocode(_ address: String) async throws -> GeocodedPlace
    /// Coordinate → short place name, or `nil` if it can't be resolved.
    func placeName(for coordinate: Coordinate) async -> String?
}

/// Native Apple geocoder. Unlike the public Nominatim service used by the web app,
/// it has no strict usage policy and follows the device language automatically.
struct GeocodingService: Geocoding {
    func geocode(_ address: String) async throws -> GeocodedPlace {
        let placemarks: [CLPlacemark]
        do {
            placemarks = try await CLGeocoder().geocodeAddressString(address)
        } catch {
            throw PharmacyError.from(error)
        }

        guard let placemark = placemarks.first, let location = placemark.location else {
            throw PharmacyError.addressNotFound
        }
        return GeocodedPlace(
            coordinate: Coordinate(location.coordinate),
            label: Self.label(for: placemark) ?? address
        )
    }

    func placeName(for coordinate: Coordinate) async -> String? {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        guard let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first else {
            return nil
        }
        return Self.label(for: placemark)
    }

    /// "Aleksanterinkatu 18, Lahti" rather than the full administrative chain.
    private static func label(for placemark: CLPlacemark) -> String? {
        let street = [placemark.thoroughfare, placemark.subThoroughfare]
            .compactMap { $0 }
            .joined(separator: " ")
        let candidates = [street.isEmpty ? placemark.name : street, placemark.locality]
            .compactMap { $0 }
            .filter { !$0.isEmpty }

        var parts: [String] = []
        for candidate in candidates where !parts.contains(candidate) {
            parts.append(candidate)
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }
}
