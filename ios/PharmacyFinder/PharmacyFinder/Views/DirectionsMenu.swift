import SwiftUI

extension OpenURLAction {
    /// Opens a route in the chosen maps app. Google Maps falls back to the website when
    /// the app isn't installed (no `LSApplicationQueriesSchemes` entry needed).
    func openDirections(with provider: MapsProvider, to destination: Coordinate, from origin: Coordinate?) {
        let webURL = DirectionsURLBuilder.webURL(for: provider, to: destination, from: origin)

        if provider == .google, let appURL = DirectionsURLBuilder.googleMapsAppURL(to: destination, from: origin) {
            self(appURL) { accepted in
                if !accepted, let webURL {
                    self(webURL)
                }
            }
        } else if let webURL {
            self(webURL)
        }
    }
}

/// Compact menu used in list rows.
struct DirectionsMenu: View {
    let destination: Coordinate
    let origin: Coordinate?

    @Environment(\.openURL) private var openURL

    var body: some View {
        Menu {
            ForEach(MapsProvider.allCases) { provider in
                Button(provider.title) {
                    openURL.openDirections(with: provider, to: destination, from: origin)
                }
            }
        } label: {
            Label(L10n.directions, systemImage: "arrow.triangle.turn.up.right.diamond.fill")
        }
    }
}

/// Full-width buttons used in the detail sheet.
struct DirectionsButtons: View {
    let destination: Coordinate
    let origin: Coordinate?

    @Environment(\.openURL) private var openURL

    var body: some View {
        HStack(spacing: 12) {
            ForEach(MapsProvider.allCases) { provider in
                Button {
                    openURL.openDirections(with: provider, to: destination, from: origin)
                } label: {
                    Label(provider.title, systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(provider == .apple ? .accentColor : .accentColor.opacity(0.85))
            }
        }
        .controlSize(.large)
    }
}
