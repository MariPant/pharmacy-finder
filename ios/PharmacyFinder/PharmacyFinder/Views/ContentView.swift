import MapKit
import SwiftUI

/// Main screen: location status, address search, map and the list of nearest pharmacies.
/// Holds only presentation state (camera, scrolling); everything else lives in the view model.
struct ContentView: View {
    @Bindable var viewModel: PharmacyViewModel
    let networkMonitor: NetworkMonitor

    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Overview of Finland until a location is known.
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 64.5, longitude: 26.0),
            span: MKCoordinateSpan(latitudeDelta: 12, longitudeDelta: 12)
        )
    )

    private let mapAnchorID = "map"

    var body: some View {
        NavigationStack {
            ScrollViewReader { scrollProxy in
                ScrollView {
                    VStack(spacing: Theme.spacing) {
                        if !networkMonitor.isConnected {
                            BannerView(message: L10n.offlineBanner, systemImage: "wifi.slash", style: .warning)
                        }

                        LocationStatusCard(origin: viewModel.origin, phase: viewModel.phase)

                        PharmacyMapView(
                            origin: viewModel.origin,
                            pharmacies: viewModel.pharmacies,
                            selectedPharmacyID: $viewModel.selectedPharmacyID,
                            cameraPosition: $cameraPosition
                        )
                        .frame(height: Theme.mapHeight)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous))
                        .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
                        .id(mapAnchorID)

                        resultsSection { id in
                            viewModel.select(id)
                            withAnimation(reduceMotion ? nil : .easeInOut) {
                                scrollProxy.scrollTo(mapAnchorID, anchor: .top)
                            }
                        }

                        Text(L10n.dataAttribution)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .padding(.top, 4)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 24)
                }
                .refreshable {
                    if let refreshTask = viewModel.refresh() {
                        await refreshTask.value
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
            .searchable(
                text: $viewModel.addressQuery,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: L10n.searchPrompt
            )
            .onSubmit(of: .search) {
                viewModel.searchAddress()
            }
            .toolbar { toolbarContent }
            .sheet(item: selectedPharmacyBinding) { pharmacy in
                PharmacyDetailSheet(pharmacy: pharmacy, directionsOrigin: viewModel.directionsOrigin)
                    .presentationDetents([.height(340), .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackgroundInteraction(.enabled(upThrough: .height(340)))
            }
        }
        .tint(.accentColor)
        .task {
            viewModel.onAppear()
        }
        .onChange(of: viewModel.authorizationStatus) {
            viewModel.authorizationDidChange()
        }
        .onChange(of: scenePhase) { _, newPhase in
            // The user may have enabled location access in Settings meanwhile.
            if newPhase == .active {
                viewModel.authorizationDidChange()
            }
        }
        .onChange(of: viewModel.origin?.coordinate) {
            fitCameraToResults()
        }
        .onChange(of: viewModel.pharmacies) {
            fitCameraToResults()
        }
        .onChange(of: viewModel.selectedPharmacyID) {
            focusCameraOnSelection()
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private func resultsSection(onShowOnMap: @escaping (Pharmacy.ID) -> Void) -> some View {
        switch viewModel.resultsState {
        case .welcome:
            WelcomeView(canRequestLocation: viewModel.canRequestLocation) {
                viewModel.locate()
            }
        case .loading:
            LoadingView(message: viewModel.phase == .searching ? L10n.searchingPharmacies : L10n.locating)
        case .failed(let error):
            ErrorStateView(error: error, onRetry: { viewModel.retry() }, onOpenSettings: openSettings)
        case .empty(let radius):
            EmptyResultsView(radius: radius)
        case .results:
            resultsList(onShowOnMap: onShowOnMap)
        }
    }

    private func resultsList(onShowOnMap: @escaping (Pharmacy.ID) -> Void) -> some View {
        LazyVStack(alignment: .leading, spacing: 12) {
            if let error = viewModel.inlineError {
                BannerView(
                    message: error.localizedDescription,
                    systemImage: "exclamationmark.triangle.fill",
                    actionTitle: error.isRetryable ? L10n.tryAgain : nil,
                    action: { viewModel.retry() }
                )
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(L10n.nearbyPharmacies)
                    .font(.title2.weight(.bold))
                Text(resultsSummary)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
            .padding(.top, 4)

            ForEach(viewModel.pharmacies) { pharmacy in
                PharmacyRow(
                    pharmacy: pharmacy,
                    isSelected: pharmacy.id == viewModel.selectedPharmacyID,
                    directionsOrigin: viewModel.directionsOrigin
                ) {
                    onShowOnMap(pharmacy.id)
                }
            }
        }
        .opacity(viewModel.phase == .searching ? 0.55 : 1)
        .animation(.easeOut(duration: 0.2), value: viewModel.phase == .searching)
    }

    private var resultsSummary: String {
        var parts = [L10n.pharmacyCount(viewModel.pharmacies.count)]
        if let radius = viewModel.searchRadius {
            parts.append(L10n.withinRadius(DistanceFormatter.string(fromMeters: radius)))
        }
        if let lastUpdated = viewModel.lastUpdated {
            parts.append(L10n.updatedAt(lastUpdated.formatted(date: .omitted, time: .shortened)))
        }
        return parts.joined(separator: " · ")
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
                viewModel.refresh()
            } label: {
                Label(L10n.refreshResults, systemImage: "arrow.clockwise")
            }
            .disabled(viewModel.origin == nil || viewModel.isBusy)

            Button {
                viewModel.locate()
            } label: {
                Label(L10n.updateLocation, systemImage: "location.fill")
            }
            .disabled(viewModel.phase == .locating)
        }
    }

    // MARK: - Helpers

    /// Bridges the selected id to the item-based sheet API.
    private var selectedPharmacyBinding: Binding<Pharmacy?> {
        Binding(
            get: { viewModel.selectedPharmacy },
            set: { viewModel.select($0?.id) }
        )
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            openURL(url)
        }
    }

    /// Frames the search origin together with the nearest results.
    private func fitCameraToResults() {
        guard let origin = viewModel.origin else { return }
        let nearest = viewModel.pharmacies.prefix(AppConfig.mapFitNearestCount).map(\.coordinate)
        guard let region = MapRegionCalculator.region(fitting: [origin.coordinate] + nearest) else { return }
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.6)) {
            cameraPosition = .region(region)
        }
    }

    private func focusCameraOnSelection() {
        guard let pharmacy = viewModel.selectedPharmacy else { return }
        // Shift the centre slightly south so the pin isn't hidden behind the detail sheet.
        let center = CLLocationCoordinate2D(
            latitude: pharmacy.coordinate.latitude - 0.0012,
            longitude: pharmacy.coordinate.longitude
        )
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.6)) {
            cameraPosition = .region(MKCoordinateRegion(center: center, latitudinalMeters: 700, longitudinalMeters: 700))
        }
    }
}
