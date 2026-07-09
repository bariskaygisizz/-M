import Foundation
import CoreLocation

@MainActor
final class LocationViewModel: NSObject, ObservableObject {
    @Published var locations: [LocationRecord] = []
    @Published var districts: [String] = []
    @Published var types: [String] = []
    @Published var selectedTypes: Set<String> = ["Biletmatik", "Biletmatik 4"]
    @Published var searchText = ""
    @Published var selectedDistrict = ""
    @Published var selectedLocation: LocationRecord?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var nearbyOnly = false

    private let locationManager = CLLocationManager()
    private(set) var userCoordinate: CLLocationCoordinate2D?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func loadInitial() async {
        await loadMeta()
        await loadLocations()
    }

    func loadMeta() async {
        do {
            let meta = try await APIClient.shared.fetchMeta()
            districts = meta.districts
            types = meta.types
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadLocations() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let coord = userCoordinate.map { (lat: $0.latitude, lng: $0.longitude) }
            let response = try await APIClient.shared.fetchLocations(
                types: Array(selectedTypes),
                query: searchText,
                district: selectedDistrict,
                userCoordinate: coord,
                nearbyOnly: nearbyOnly
            )
            locations = response.locations
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func toggleType(_ type: String) {
        if selectedTypes.contains(type) {
            selectedTypes.remove(type)
        } else {
            selectedTypes.insert(type)
        }
    }

    func requestNearby() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            nearbyOnly = true
            locationManager.requestLocation()
        default:
            errorMessage = "Konum izni verilmedi. Ayarlar'dan izin verin."
        }
    }
}

extension LocationViewModel: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
                manager.requestLocation()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }
        Task { @MainActor in
            userCoordinate = location.coordinate
            nearbyOnly = true
            await loadLocations()
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            errorMessage = "Konum alınamadı: \(error.localizedDescription)"
        }
    }
}
