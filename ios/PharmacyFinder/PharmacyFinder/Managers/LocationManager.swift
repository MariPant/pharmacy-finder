import CoreLocation
import Observation

@MainActor
protocol LocationProviding: AnyObject {
    var authorizationStatus: CLAuthorizationStatus { get }
    /// Asks for permission if needed, then returns a single location fix.
    func requestCurrentLocation() async throws -> DeviceLocation
}

/// Wraps `CLLocationManager`'s delegate callbacks in async/await.
@MainActor
@Observable
final class LocationManager: NSObject, LocationProviding {
    private(set) var authorizationStatus: CLAuthorizationStatus

    private let manager: CLLocationManager
    @ObservationIgnored private var locationContinuation: CheckedContinuation<DeviceLocation, Error>?
    @ObservationIgnored private var authorizationContinuation: CheckedContinuation<CLAuthorizationStatus, Never>?

    override init() {
        let manager = CLLocationManager()
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        self.manager = manager
        self.authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
    }

    func requestCurrentLocation() async throws -> DeviceLocation {
        if manager.authorizationStatus == .notDetermined {
            _ = await requestAuthorization()
        }

        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            break
        case .restricted:
            throw PharmacyError.permissionRestricted
        case .denied, .notDetermined:
            throw PharmacyError.permissionDenied
        @unknown default:
            throw PharmacyError.locationUnavailable
        }

        // A newer request supersedes one that is still waiting for a fix.
        locationContinuation?.resume(throwing: CancellationError())
        return try await withCheckedThrowingContinuation { continuation in
            locationContinuation = continuation
            manager.requestLocation()
        }
    }

    private func requestAuthorization() async -> CLAuthorizationStatus {
        await withCheckedContinuation { continuation in
            authorizationContinuation?.resume(returning: manager.authorizationStatus)
            authorizationContinuation = continuation
            manager.requestWhenInUseAuthorization()
        }
    }

    private func handleAuthorizationChange(_ status: CLAuthorizationStatus) {
        authorizationStatus = status
        // The delegate also reports `.notDetermined` right after it is assigned; only a
        // real decision should resume a pending permission request.
        guard status != .notDetermined else { return }
        authorizationContinuation?.resume(returning: status)
        authorizationContinuation = nil
    }

    private func completeLocationRequest(with result: Result<DeviceLocation, PharmacyError>) {
        locationContinuation?.resume(with: result)
        locationContinuation = nil
    }
}

extension LocationManager: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.handleAuthorizationChange(status)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let deviceLocation = DeviceLocation(
            coordinate: Coordinate(location.coordinate),
            accuracy: location.horizontalAccuracy
        )
        Task { @MainActor in
            self.completeLocationRequest(with: .success(deviceLocation))
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let pharmacyError = PharmacyError.from(error)
        Task { @MainActor in
            self.completeLocationRequest(with: .failure(pharmacyError))
        }
    }
}
