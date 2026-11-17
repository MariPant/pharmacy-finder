import SwiftUI

struct PharmacyRow: View {
    let pharmacy: Pharmacy
    let isSelected: Bool
    let directionsOrigin: Coordinate?
    let onShowOnMap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(pharmacy.displayName)
                    .font(.headline)
                    .italic(pharmacy.name == nil)
                    .foregroundStyle(pharmacy.name == nil ? .secondary : .primary)
                Spacer(minLength: 0)
                DistanceBadge(meters: pharmacy.distance)
            }

            VStack(alignment: .leading, spacing: 6) {
                PharmacyInfoLine(
                    systemImage: "mappin.and.ellipse",
                    text: pharmacy.address ?? L10n.addressUnavailable,
                    isPlaceholder: pharmacy.address == nil
                )
                .accessibilityLabel(Text(verbatim: "\(L10n.address): \(pharmacy.address ?? L10n.addressUnavailable)"))

                if let openingHours = pharmacy.openingHours {
                    PharmacyInfoLine(systemImage: "clock", text: openingHours)
                        .accessibilityLabel(Text(verbatim: "\(L10n.openingHours): \(openingHours)"))
                }

                Text(pharmacy.coordinate.formatted)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.tertiary)
                    .accessibilityLabel(Text(verbatim: "\(L10n.coordinates): \(pharmacy.coordinate.formatted)"))
            }

            HStack(spacing: 8) {
                Button(L10n.showOnMap, systemImage: "map", action: onShowOnMap)
                    .buttonStyle(.bordered)
                    .tint(.secondary)
                DirectionsMenu(destination: pharmacy.coordinate, origin: directionsOrigin)
                    .buttonStyle(.bordered)
            }
            .controlSize(.small)
            .font(.subheadline.weight(.semibold))
        }
        .card()
        .overlay {
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .strokeBorder(Color.accentColor, lineWidth: isSelected ? 2 : 0)
        }
        .animation(.easeOut(duration: 0.2), value: isSelected)
    }
}

struct DistanceBadge: View {
    let meters: Double

    var body: some View {
        Text(DistanceFormatter.string(fromMeters: meters))
            .font(.subheadline.weight(.semibold).monospacedDigit())
            .foregroundStyle(Color.accentColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Color.accentColor.opacity(0.12), in: Capsule())
            .accessibilityLabel(Text(verbatim: "\(L10n.distance): \(DistanceFormatter.string(fromMeters: meters))"))
    }
}

struct PharmacyInfoLine: View {
    let systemImage: String
    let text: String
    var isPlaceholder = false

    var body: some View {
        Label {
            Text(text)
                .italic(isPlaceholder)
                .foregroundStyle(isPlaceholder ? .tertiary : .secondary)
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(.tertiary)
        }
        .font(.subheadline)
    }
}
