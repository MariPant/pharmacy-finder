import Network
import Observation

/// Publishes connectivity so the UI can show an offline banner before a request fails.
@MainActor
@Observable
final class NetworkMonitor {
    private(set) var isConnected = true

    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let isConnected = path.status == .satisfied
            Task { @MainActor in
                self?.isConnected = isConnected
            }
        }
        monitor.start(queue: DispatchQueue(label: "PharmacyFinder.NetworkMonitor"))
    }

    deinit {
        monitor.cancel()
    }
}
