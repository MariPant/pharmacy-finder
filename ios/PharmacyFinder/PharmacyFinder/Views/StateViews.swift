import SwiftUI

struct WelcomeView: View {
    let canRequestLocation: Bool
    let onUseLocation: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label(L10n.welcomeTitle, systemImage: "cross.case.fill")
                .foregroundStyle(Color.accentColor, .primary)
        } description: {
            Text(L10n.welcomeBody)
        } actions: {
            if canRequestLocation {
                Button(L10n.useMyLocation, systemImage: "location.fill", action: onUseLocation)
                    .buttonStyle(.borderedProminent)
            }
        }
        .card()
    }
}

struct LoadingView: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text(message)
            } icon: {
                ProgressView()
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)

            ForEach(0..<3, id: \.self) { _ in
                PlaceholderRow()
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(message)
    }
}

/// Skeleton card shaped like `PharmacyRow`.
private struct PlaceholderRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(verbatim: "Placeholder pharmacy name").font(.headline)
            Text(verbatim: "Placeholder street 1, 00000 City").font(.subheadline)
            Text(verbatim: "00.00000, 00.00000").font(.caption)
        }
        .redacted(reason: .placeholder)
        .card()
    }
}

struct ErrorStateView: View {
    let error: PharmacyError
    let onRetry: () -> Void
    let onOpenSettings: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label(L10n.errorTitle, systemImage: systemImage)
        } description: {
            Text(error.localizedDescription)
        } actions: {
            if error == .permissionDenied {
                Button(L10n.openSettings, action: onOpenSettings)
                    .buttonStyle(.borderedProminent)
            } else if error.isRetryable {
                Button(L10n.tryAgain, action: onRetry)
                    .buttonStyle(.borderedProminent)
            }
        }
        .card()
    }

    private var systemImage: String {
        switch error {
        case .offline, .network: "wifi.exclamationmark"
        case .permissionDenied, .permissionRestricted, .locationUnavailable: "location.slash"
        case .addressNotFound: "mappin.slash"
        default: "exclamationmark.triangle"
        }
    }
}

struct EmptyResultsView: View {
    let radius: Double

    var body: some View {
        ContentUnavailableView {
            Label(L10n.emptyTitle, systemImage: "cross.case")
        } description: {
            Text(L10n.emptyBody(radius: DistanceFormatter.string(fromMeters: radius)))
        }
        .card()
    }
}

/// Inline message above content that is still useful (offline, failed refresh).
struct BannerView: View {
    enum Style {
        case warning
        case error
    }

    let message: String
    let systemImage: String
    var style: Style = .error
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.body.weight(.semibold))
            Text(message)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.subheadline.weight(.semibold))
                    .buttonStyle(.borderless)
            }
        }
        .foregroundStyle(style == .warning ? Color.orange : Color.red)
        .padding(14)
        .background(
            (style == .warning ? Color.orange : Color.red).opacity(0.1),
            in: RoundedRectangle(cornerRadius: Theme.smallCornerRadius, style: .continuous)
        )
    }
}
