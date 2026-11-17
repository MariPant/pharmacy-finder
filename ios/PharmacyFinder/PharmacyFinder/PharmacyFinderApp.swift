import SwiftUI

@main
struct PharmacyFinderApp: App {
    @State private var viewModel = PharmacyViewModel.live()
    @State private var networkMonitor = NetworkMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: viewModel, networkMonitor: networkMonitor)
        }
    }
}
