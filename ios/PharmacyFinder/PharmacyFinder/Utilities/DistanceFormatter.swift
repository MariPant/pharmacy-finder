import Foundation

enum DistanceFormatter {
    /// "350 m" below one kilometre, "1.2 km" / "1,2 km" up to ten, "12 km" beyond.
    static func string(fromMeters meters: Double, locale: Locale = .current) -> String {
        guard meters.isFinite else { return "—" }

        let safeMeters = max(0, meters)
        let roundedMeters = Int(safeMeters.rounded())
        if roundedMeters < 1_000 {
            return "\(roundedMeters) m"
        }

        let kilometers = safeMeters / 1_000
        let fractionDigits = kilometers < 10 ? 1 : 0

        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.roundingMode = .halfUp
        formatter.minimumFractionDigits = fractionDigits
        formatter.maximumFractionDigits = fractionDigits

        let number = formatter.string(from: NSNumber(value: kilometers))
            ?? String(format: "%.\(fractionDigits)f", kilometers)
        return "\(number) km"
    }
}
