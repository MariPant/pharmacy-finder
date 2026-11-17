import SwiftUI

/// Design tokens shared by all views. The accent green comes from the AccentColor asset.
enum Theme {
    static let cornerRadius: CGFloat = 20
    static let smallCornerRadius: CGFloat = 14
    static let spacing: CGFloat = 16
    static let mapHeight: CGFloat = 320
    static let userLocation = Color.blue
}

/// White rounded card with a soft shadow, the base of most surfaces in the app.
struct CardModifier: ViewModifier {
    var padding: CGFloat = Theme.spacing

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                Color(.secondarySystemGroupedBackground),
                in: RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
            )
            .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
    }
}

extension View {
    func card(padding: CGFloat = Theme.spacing) -> some View {
        modifier(CardModifier(padding: padding))
    }
}
