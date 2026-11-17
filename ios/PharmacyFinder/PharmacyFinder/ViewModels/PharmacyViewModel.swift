import CoreLocation
import Foundation
import Observation

/// Owns the screen state and orchestrates location → (geocoding) → pharmacy search.
///
/// Every user action starts a new task and cancels the previous one, so a slow response
/// can never overwrite the result of a newer request.
@MainActor
@Observable
final class PharmacyViewModel {
    enum Stage: Equatable, Sendable {
        case location
        case geocoding
        case search
    }

    enum Phase: Equatable {
        case idle
        case locating
        case geocoding
        case searching
        case loaded
        case failed(PharmacyError, Stage)
    }

    /// What the results area should show. Derived, so it can never contradict `phase`.
    enum ResultsState: Equatable {
        case welcome
        case loading
        case failed(PharmacyError)
        case empty(radius: Double)
        case results
    }

    private(set) var phase: Phase = .idle
    private(set) var origin: SearchOrigin?
    private(set) var pharmacies: [Pharmacy] = []
    private(set) var searchRadius: Double?
    private(set) var lastUpdated: Date?
    var selectedPharmacyID: Pharmacy.ID?
    var addressQuery = ""

    private let pharmacyService: PharmacyServicing
    private let locationProvider: LocationProviding
    private let geocoder: Geocoding
    private let now: () -> Date
    @ObservationIgnored private var currentTask: Task<Void, Never>?
    @ObservationIgnored private var lastAddressQuery: String?

    init(
        pharmacyService: PharmacyServicing,
        locationProvider: LocationProviding,
        geocoder: Geocoding,
        now: @escaping () -> Date = { Date() }
    ) {
        self.pharmacyService = pharmacyService
        self.locationProvider = locationProvider
        self.geocoder = geocoder
        self.now = now
    }

    static func live() -> PharmacyViewModel {
        PharmacyViewModel(
            pharmacyService: PharmacyService(),
            locationProvider: LocationManager(),
            geocoder: GeocodingService()
        )
    }

    // MARK: - Derived state

    var authorizationStatus: CLAuthorizationStatus {
        locationProvider.authorizationStatus
    }

    var isAuthorized: Bool {
        authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways
    }

    var canRequestLocation: Bool {
        authorizationStatus != .denied && authorizationStatus != .restricted
    }

    var isBusy: Bool {
        switch phase {
        case .locating, .geocoding, .searching: true
        default: false
        }
    }

    var currentError: PharmacyError? {
        if case .failed(let error, _) = phase { error } else { nil }
    }

    /// An error shown above results that are still on screen (e.g. a failed refresh).
    var inlineError: PharmacyError? {
        pharmacies.isEmpty ? nil : currentError
    }

    var selectedPharmacy: Pharmacy? {
        guard let selectedPharmacyID else { return nil }
        return pharmacies.first { $0.id == selectedPharmacyID }
    }

    /// Route origin for directions: only for address searches. For device locations the
    /// maps app uses its own, more current position.
    var directionsOrigin: Coordinate? {
        origin?.source == .address ? origin?.coordinate : nil
    }

    var resultsState: ResultsState {
        if case .failed(let error, _) = phase, pharmacies.isEmpty {
            return .failed(error)
        }
        if pharmacies.isEmpty {
            if isBusy { return .loading }
            if origin == nil { return .welcome }
            if let searchRadius { return .empty(radius: searchRadius) }
            return .loading
        }
        return .results
    }

    // MARK: - Lifecycle

    /// Locates automatically only if permission was granted before, so the system prompt
    /// always appears in response to a user action.
    @discardableResult
    func onAppear() -> Task<Void, Never>? {
        guard phase == .idle, origin == nil, isAuthorized else { return nil }
        return locate()
    }

    /// Picks up a permission granted in the system prompt or in Settings.
    func authorizationDidChange() {
        guard isAuthorized, origin == nil else { return }
        switch phase {
        case .idle, .failed(_, .location):
            locate()
        default:
            break
        }
    }

    // MARK: - Intents

    @discardableResult
    func locate() -> Task<Void, Never> {
        startOperation { [weak self] in
            await self?.performLocate()
        }
    }

    @discardableResult
    func searchAddress() -> Task<Void, Never>? {
        let query = addressQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return nil }
        lastAddressQuery = query
        return startOperation { [weak self] in
            await self?.performAddressSearch(query)
        }
    }

    @discardableResult
    func refresh() -> Task<Void, Never>? {
        guard let origin else { return nil }
        return startOperation { [weak self] in
            await self?.performSearch(near: origin, maxCacheAge: AppConfig.refreshMinimumAge)
        }
    }

    /// Repeats whichever step failed last.
    @discardableResult
    func retry() -> Task<Void, Never>? {
        guard case .failed(_, let stage) = phase else { return nil }
        switch stage {
        case .location:
            return locate()
        case .geocoding:
            guard let lastAddressQuery else { return nil }
            addressQuery = lastAddressQuery
            return searchAddress()
        case .search:
            return refresh()
        }
    }

    func select(_ id: Pharmacy.ID?) {
        selectedPharmacyID = id
    }

    // MARK: - Operations

    private func startOperation(_ operation: @escaping @MainActor () async -> Void) -> Task<Void, Never> {
        currentTask?.cancel()
        let task = Task { await operation() }
        currentTask = task
        return task
    }

    private func performLocate() async {
        phase = .locating
        do {
            let location = try await locationProvider.requestCurrentLocation()
            guard !Task.isCancelled else { return }

            let origin = SearchOrigin(
                coordinate: location.coordinate,
                source: .device,
                label: nil,
                accuracy: location.accuracy
            )
            setOrigin(origin)
            resolvePlaceName(for: origin.coordinate)
            await performSearch(near: origin, maxCacheAge: nil)
        } catch {
            guard !Task.isCancelled, !PharmacyError.isCancellation(error) else { return }
            phase = .failed(PharmacyError.from(error), .location)
        }
    }

    private func performAddressSearch(_ query: String) async {
        phase = .geocoding
        do {
            let place = try await geocoder.geocode(query)
            guard !Task.isCancelled else { return }

            let origin = SearchOrigin(coordinate: place.coordinate, source: .address, label: place.label, accuracy: nil)
            setOrigin(origin)
            await performSearch(near: origin, maxCacheAge: nil)
        } catch {
            guard !Task.isCancelled, !PharmacyError.isCancellation(error) else { return }
            phase = .failed(PharmacyError.from(error), .geocoding)
        }
    }

    private func performSearch(near origin: SearchOrigin, maxCacheAge: TimeInterval?) async {
        phase = .searching
        do {
            let result = try await pharmacyService.searchPharmacies(near: origin.coordinate, maxCacheAge: maxCacheAge)
            guard !Task.isCancelled else { return }

            pharmacies = result.pharmacies
            searchRadius = result.radius
            lastUpdated = now()
            if let selectedPharmacyID, !pharmacies.contains(where: { $0.id == selectedPharmacyID }) {
                self.selectedPharmacyID = nil
            }
            phase = .loaded
        } catch {
            guard !Task.isCancelled, !PharmacyError.isCancellation(error) else { return }
            // Previous results stay visible, so a failed refresh doesn't wipe the list.
            phase = .failed(PharmacyError.from(error), .search)
        }
    }

    /// Results are relative to the previous origin, so they are cleared.
    private func setOrigin(_ origin: SearchOrigin) {
        self.origin = origin
        pharmacies = []
        searchRadius = nil
        lastUpdated = nil
        selectedPharmacyID = nil
    }

    /// The place name is a nice-to-have: it runs alongside the search and failures are ignored.
    private func resolvePlaceName(for coordinate: Coordinate) {
        let geocoder = geocoder
        Task { [weak self] in
            guard let name = await geocoder.placeName(for: coordinate),
                  let self,
                  self.origin?.coordinate == coordinate
            else { return }
            self.origin?.label = name
        }
    }
}
