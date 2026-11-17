import CoreLocation
import Foundation
import Testing
@testable import PharmacyFinder

@MainActor
@Suite("PharmacyViewModel with mock services")
struct PharmacyViewModelTests {
    private let sampleResult = PharmacySearchResult(
        pharmacies: [
            Fixtures.pharmacy(id: "node/1", distance: 120),
            Fixtures.pharmacy(id: "node/2", distance: 480),
        ],
        radius: 2_000
    )

    private func makeViewModel(
        service: MockPharmacyService,
        location: MockLocationProvider = MockLocationProvider(),
        geocoder: MockGeocoder = MockGeocoder()
    ) -> PharmacyViewModel {
        PharmacyViewModel(
            pharmacyService: service,
            locationProvider: location,
            geocoder: geocoder,
            now: { Date(timeIntervalSince1970: 1_000) }
        )
    }

    @Test func startsInWelcomeState() {
        let viewModel = makeViewModel(service: MockPharmacyService(results: []))
        #expect(viewModel.phase == .idle)
        #expect(viewModel.resultsState == .welcome)
    }

    @Test func locateLoadsPharmaciesAroundTheDeviceLocation() async {
        let service = MockPharmacyService(results: [.success(sampleResult)])
        let viewModel = makeViewModel(service: service)

        await viewModel.locate().value

        #expect(viewModel.phase == .loaded)
        #expect(viewModel.resultsState == .results)
        #expect(viewModel.origin?.source == .device)
        #expect(viewModel.origin?.accuracy == 15)
        #expect(viewModel.pharmacies.map(\.id) == ["node/1", "node/2"])
        #expect(viewModel.searchRadius == 2_000)
        #expect(viewModel.lastUpdated == Date(timeIntervalSince1970: 1_000))
        #expect(await service.calls == [.init(origin: Fixtures.origin, maxCacheAge: nil)])
    }

    @Test func deniedPermissionFailsAtLocationStage() async {
        let location = MockLocationProvider(authorizationStatus: .denied, result: .failure(.permissionDenied))
        let viewModel = makeViewModel(service: MockPharmacyService(results: []), location: location)

        await viewModel.locate().value

        #expect(viewModel.phase == .failed(.permissionDenied, .location))
        #expect(viewModel.resultsState == .failed(.permissionDenied))
        #expect(!viewModel.canRequestLocation)
        #expect(viewModel.origin == nil)
    }

    @Test func searchFailureIsReported() async {
        let viewModel = makeViewModel(service: MockPharmacyService(results: [.failure(.offline)]))

        await viewModel.locate().value

        #expect(viewModel.phase == .failed(.offline, .search))
        #expect(viewModel.resultsState == .failed(.offline))
    }

    @Test func emptyResultIsDistinguishedFromLoading() async {
        let empty = PharmacySearchResult(pharmacies: [], radius: 10_000)
        let viewModel = makeViewModel(service: MockPharmacyService(results: [.success(empty)]))

        await viewModel.locate().value

        #expect(viewModel.resultsState == .empty(radius: 10_000))
    }

    @Test func addressSearchUsesGeocodedOrigin() async {
        let place = GeocodedPlace(coordinate: Coordinate(latitude: 61.0, longitude: 25.7), label: "Testikatu, Lahti")
        let service = MockPharmacyService(results: [.success(sampleResult)])
        let viewModel = makeViewModel(service: service, geocoder: MockGeocoder(geocodeResult: .success(place)))
        viewModel.addressQuery = "  Testikatu, Lahti  "

        _ = await viewModel.searchAddress()?.value

        #expect(viewModel.origin?.source == .address)
        #expect(viewModel.origin?.label == "Testikatu, Lahti")
        #expect(viewModel.directionsOrigin == place.coordinate)
        #expect(await service.calls.first?.origin == place.coordinate)
    }

    @Test func blankAddressQueryDoesNothing() {
        let viewModel = makeViewModel(service: MockPharmacyService(results: []))
        viewModel.addressQuery = "   "
        #expect(viewModel.searchAddress() == nil)
        #expect(viewModel.phase == .idle)
    }

    @Test func unknownAddressFailsAtGeocodingStage() async {
        let viewModel = makeViewModel(service: MockPharmacyService(results: []))
        viewModel.addressQuery = "Nowhere"

        _ = await viewModel.searchAddress()?.value

        #expect(viewModel.phase == .failed(.addressNotFound, .geocoding))
    }

    @Test func failedRefreshKeepsPreviousResults() async {
        let service = MockPharmacyService(results: [.success(sampleResult), .failure(.timeout)])
        let viewModel = makeViewModel(service: service)
        await viewModel.locate().value

        _ = await viewModel.refresh()?.value

        #expect(viewModel.pharmacies.count == 2)
        #expect(viewModel.resultsState == .results)
        #expect(viewModel.inlineError == .timeout)
        #expect(await service.calls.last?.maxCacheAge == AppConfig.refreshMinimumAge)
    }

    @Test func retryRepeatsTheFailedStep() async {
        let service = MockPharmacyService(results: [.failure(.server(statusCode: 503)), .success(sampleResult)])
        let viewModel = makeViewModel(service: service)
        await viewModel.locate().value
        #expect(viewModel.phase == .failed(.server(statusCode: 503), .search))

        _ = await viewModel.retry()?.value

        #expect(viewModel.phase == .loaded)
        #expect(viewModel.pharmacies.count == 2)
    }

    @Test func selectionIsClearedWhenThePharmacyDisappears() async {
        let refreshed = PharmacySearchResult(pharmacies: [Fixtures.pharmacy(id: "node/1")], radius: 2_000)
        let service = MockPharmacyService(results: [.success(sampleResult), .success(refreshed)])
        let viewModel = makeViewModel(service: service)
        await viewModel.locate().value

        viewModel.select("node/2")
        #expect(viewModel.selectedPharmacy?.id == "node/2")

        _ = await viewModel.refresh()?.value
        #expect(viewModel.selectedPharmacyID == nil)
    }

    @Test func onAppearLocatesOnlyWhenAlreadyAuthorized() async {
        let notDetermined = MockLocationProvider(authorizationStatus: .notDetermined)
        let waiting = makeViewModel(service: MockPharmacyService(results: [.success(sampleResult)]), location: notDetermined)
        #expect(waiting.onAppear() == nil)
        #expect(waiting.phase == .idle)

        let authorized = makeViewModel(service: MockPharmacyService(results: [.success(sampleResult)]))
        _ = await authorized.onAppear()?.value
        #expect(authorized.phase == .loaded)
    }
}
