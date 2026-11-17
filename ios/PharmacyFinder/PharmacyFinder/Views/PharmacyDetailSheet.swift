import SwiftUI

/// Shown when a pharmacy is selected on the map or in the list.
struct PharmacyDetailSheet: View {
    let pharmacy: Pharmacy
    let directionsOrigin: Coordinate?

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "cross.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(pharmacy.displayName)
                        .font(.title3.weight(.bold))
                        .italic(pharmacy.name == nil)
                    DistanceBadge(meters: pharmacy.distance)
                }

                Spacer(minLength: 0)

                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.secondary)
                }
                .accessibilityLabel(L10n.done)
            }

            VStack(alignment: .leading, spacing: 8) {
                PharmacyInfoLine(
                    systemImage: "mappin.and.ellipse",
                    text: pharmacy.address ?? L10n.addressUnavailable,
                    isPlaceholder: pharmacy.address == nil
                )
                if let openingHours = pharmacy.openingHours {
                    PharmacyInfoLine(systemImage: "clock", text: openingHours)
                }
                if let phone = pharmacy.phone, let phoneURL = Self.phoneURL(for: phone) {
                    Link(destination: phoneURL) {
                        Label(phone, systemImage: "phone")
                            .font(.subheadline)
                    }
                }
                PharmacyInfoLine(systemImage: "location", text: pharmacy.coordinate.formatted)
            }

            DirectionsButtons(destination: pharmacy.coordinate, origin: directionsOrigin)
                .padding(.top, 4)
        }
        .padding(20)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private static func phoneURL(for phone: String) -> URL? {
        let digits = phone.filter { $0.isNumber || $0 == "+" }
        return digits.isEmpty ? nil : URL(string: "tel:\(digits)")
    }
}
