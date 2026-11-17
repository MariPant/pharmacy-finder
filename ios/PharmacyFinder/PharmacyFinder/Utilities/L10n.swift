import Foundation

/// All user-facing strings in one place. English text is the key; translations live in
/// `Resources/Localizable.xcstrings` (Finnish). Computed so the current locale is always used.
enum L10n {
    // MARK: Location

    static var yourLocation: String { String(localized: "Your location") }
    static var searchArea: String { String(localized: "Search area") }
    static var locationNotSet: String { String(localized: "Location not set") }
    static var locationNotSetHint: String { String(localized: "Use your location or search for an address") }
    static var locating: String { String(localized: "Determining your location…") }
    static var resolvingAddress: String { String(localized: "Looking up the address…") }
    static func accuracy(meters: Int) -> String { String(localized: "Accuracy ±\(meters) m") }
    static var searchPoint: String { String(localized: "Search point") }

    // MARK: Actions

    static var useMyLocation: String { String(localized: "Use my location") }
    static var updateLocation: String { String(localized: "Update location") }
    static var refreshResults: String { String(localized: "Refresh results") }
    static var tryAgain: String { String(localized: "Try again") }
    static var openSettings: String { String(localized: "Open Settings") }
    static var showOnMap: String { String(localized: "Show on map") }
    static var directions: String { String(localized: "Directions") }
    static var done: String { String(localized: "Done") }
    static var searchPrompt: String { String(localized: "Search by address or city") }

    // MARK: Results

    static var nearbyPharmacies: String { String(localized: "Nearby pharmacies") }
    static func pharmacyCount(_ count: Int) -> String { String(localized: "\(count) pharmacies") }
    static func withinRadius(_ radius: String) -> String { String(localized: "within \(radius)") }
    static func updatedAt(_ time: String) -> String { String(localized: "Updated \(time)") }
    static var searchingPharmacies: String { String(localized: "Searching for pharmacies…") }
    static var welcomeTitle: String { String(localized: "Find a pharmacy near you") }
    static var welcomeBody: String {
        String(localized: "Allow location access to see the nearest pharmacies, or search by address or city.")
    }
    static var emptyTitle: String { String(localized: "No pharmacies found") }
    static func emptyBody(radius: String) -> String {
        String(localized: "OpenStreetMap has no pharmacies within \(radius) of this point. Try another address.")
    }
    static var offlineBanner: String {
        String(localized: "You're offline. Results can't be updated until the connection is restored.")
    }
    static var dataAttribution: String { String(localized: "Pharmacy data © OpenStreetMap contributors") }

    // MARK: Pharmacy

    static var unnamedPharmacy: String { String(localized: "Unnamed pharmacy") }
    static var addressUnavailable: String { String(localized: "Address not available") }
    static var address: String { String(localized: "Address") }
    static var coordinates: String { String(localized: "Coordinates") }
    static var openingHours: String { String(localized: "Opening hours") }
    static var phone: String { String(localized: "Phone") }
    static var distance: String { String(localized: "Distance") }

    // MARK: Errors

    static var errorTitle: String { String(localized: "Something went wrong") }

    enum Errors {
        static var permissionDenied: String {
            String(localized: "Location access is turned off for this app. Turn it on in Settings or search by address.")
        }
        static var permissionRestricted: String {
            String(localized: "Location access is restricted on this device. Search by address instead.")
        }
        static var locationUnavailable: String {
            String(localized: "Your location couldn't be determined. Try again or search by address.")
        }
        static var offline: String { String(localized: "No internet connection. Check your connection and try again.") }
        static var network: String { String(localized: "Couldn't reach the server. Check your connection and try again.") }
        static var timeout: String { String(localized: "The pharmacy service is responding slowly. Try again in a moment.") }
        static var rateLimited: String {
            String(localized: "Too many requests to the map service. Wait a moment and try again.")
        }
        static var server: String {
            String(localized: "The map service is temporarily unavailable. Please try again later.")
        }
        static var invalidResponse: String {
            String(localized: "The map service returned unexpected data. Please try again later.")
        }
        static var addressNotFound: String {
            String(localized: "We couldn't find that place. Check the spelling or try a city name.")
        }
        static var unknown: String { String(localized: "Something unexpected happened. Please try again.") }
    }
}
