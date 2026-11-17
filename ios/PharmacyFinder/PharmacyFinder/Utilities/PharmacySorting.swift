import Foundation

extension Array where Element == Pharmacy {
    /// Nearest first. Ties are broken by name (unnamed last) and then by id, so the
    /// order is deterministic and the list doesn't reshuffle between identical refreshes.
    func sortedByDistance() -> [Pharmacy] {
        sorted { lhs, rhs in
            if lhs.distance != rhs.distance {
                return lhs.distance < rhs.distance
            }
            switch (lhs.name, rhs.name) {
            case let (lhsName?, rhsName?) where lhsName != rhsName:
                return lhsName.localizedStandardCompare(rhsName) == .orderedAscending
            case (.some, nil):
                return true
            case (nil, .some):
                return false
            default:
                return lhs.id < rhs.id
            }
        }
    }
}
