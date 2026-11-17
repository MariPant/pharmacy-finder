import MapKit
import SwiftUI

struct PharmacyMapView: View {
    let origin: SearchOrigin?
    let pharmacies: [Pharmacy]
    @Binding var selectedPharmacyID: Pharmacy.ID?
    @Binding var cameraPosition: MapCameraPosition

    var body: some View {
        Map(position: $cameraPosition, selection: $selectedPharmacyID) {
            if let origin {
                if origin.source == .device {
                    if let accuracy = origin.accuracy, accuracy < 2_000 {
                        MapCircle(center: origin.coordinate.clCoordinate, radius: accuracy)
                            .foregroundStyle(Theme.userLocation.opacity(0.12))
                    }
                    Annotation(L10n.yourLocation, coordinate: origin.coordinate.clCoordinate, anchor: .center) {
                        UserLocationDot()
                    }
                } else {
                    Marker(L10n.searchPoint, systemImage: "mappin", coordinate: origin.coordinate.clCoordinate)
                        .tint(.gray)
                }
            }

            ForEach(pharmacies) { pharmacy in
                Marker(pharmacy.displayName, systemImage: "cross.fill", coordinate: pharmacy.coordinate.clCoordinate)
                    .tint(Color.accentColor)
                    .tag(pharmacy.id)
            }
        }
        // Hide Apple's own points of interest so only OpenStreetMap pharmacies appear.
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControls {
            MapCompass()
            MapScaleView()
        }
    }
}

private struct UserLocationDot: View {
    var body: some View {
        Circle()
            .fill(Theme.userLocation)
            .frame(width: 16, height: 16)
            .overlay(Circle().stroke(.white, lineWidth: 3))
            .shadow(color: .black.opacity(0.25), radius: 3, y: 1)
    }
}
