import SwiftUI

struct LocationStatusCard: View {
    let origin: SearchOrigin?
    let phase: PharmacyViewModel.Phase

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isAddress ? "mappin" : "location.fill")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(isAddress ? Color.primary : Theme.userLocation)
                .frame(width: 40, height: 40)
                .background(
                    (isAddress ? Color.secondary : Theme.userLocation).opacity(0.12),
                    in: Circle()
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(isAddress ? L10n.searchArea : L10n.yourLocation)
                    .font(.caption.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.body.weight(.semibold))
                    .lineLimit(1)
                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer(minLength: 0)

            if phase == .locating || phase == .geocoding {
                ProgressView()
            }
        }
        .card(padding: 14)
        .accessibilityElement(children: .combine)
    }

    private var isAddress: Bool {
        origin?.source == .address
    }

    private var title: String {
        switch phase {
        case .locating: return L10n.locating
        case .geocoding: return L10n.resolvingAddress
        default: break
        }
        guard let origin else { return L10n.locationNotSet }
        return origin.label ?? origin.coordinate.formatted
    }

    private var detail: String? {
        guard let origin else {
            return phase == .idle ? L10n.locationNotSetHint : nil
        }
        return origin.accuracy.map { L10n.accuracy(meters: Int($0.rounded())) }
    }
}
