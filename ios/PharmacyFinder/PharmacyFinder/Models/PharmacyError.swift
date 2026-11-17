import CoreLocation
import Foundation

enum PharmacyError: Error, Equatable, Sendable {
    // Location
    case permissionDenied
    case permissionRestricted
    case locationUnavailable
    // Network / API
    case offline
    case network
    case timeout
    case rateLimited
    case server(statusCode: Int)
    case invalidResponse
    // Geocoding
    case addressNotFound
    case unknown
}

extension PharmacyError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .permissionDenied: L10n.Errors.permissionDenied
        case .permissionRestricted: L10n.Errors.permissionRestricted
        case .locationUnavailable: L10n.Errors.locationUnavailable
        case .offline: L10n.Errors.offline
        case .network: L10n.Errors.network
        case .timeout: L10n.Errors.timeout
        case .rateLimited: L10n.Errors.rateLimited
        case .server: L10n.Errors.server
        case .invalidResponse: L10n.Errors.invalidResponse
        case .addressNotFound: L10n.Errors.addressNotFound
        case .unknown: L10n.Errors.unknown
        }
    }
}

extension PharmacyError {
    /// Transient failures worth retrying against another Overpass endpoint.
    var isTransient: Bool {
        switch self {
        case .network, .timeout, .rateLimited, .server: true
        default: false
        }
    }

    /// Whether a "Try again" button can help. Denied permission needs Settings instead.
    var isRetryable: Bool {
        self != .permissionDenied && self != .permissionRestricted
    }

    static func fromHTTPStatus(_ statusCode: Int) -> PharmacyError {
        switch statusCode {
        case 429: .rateLimited
        case 504: .timeout
        default: .server(statusCode: statusCode)
        }
    }

    /// Maps any error from URLSession, CoreLocation or the app into a `PharmacyError`.
    static func from(_ error: Error) -> PharmacyError {
        if let pharmacyError = error as? PharmacyError {
            return pharmacyError
        }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .dataNotAllowed, .internationalRoamingOff:
                return .offline
            case .timedOut:
                return .timeout
            default:
                return .network
            }
        }
        if let clError = error as? CLError {
            switch clError.code {
            case .denied: return .permissionDenied
            case .network: return .network
            case .geocodeFoundNoResult, .geocodeFoundPartialResult, .geocodeCanceled:
                return .addressNotFound
            default: return .locationUnavailable
            }
        }
        return .unknown
    }

    static func isCancellation(_ error: Error) -> Bool {
        error is CancellationError || (error as? URLError)?.code == .cancelled
    }
}
