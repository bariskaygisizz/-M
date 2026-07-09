import SwiftUI
import MapKit

struct MapTabView: View {
    @EnvironmentObject private var viewModel: LocationViewModel
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 41.015137, longitude: 28.97953),
            span: MKCoordinateSpan(latitudeDelta: 0.25, longitudeDelta: 0.25)
        )
    )

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar

                Map(position: $cameraPosition, selection: $viewModel.selectedLocation) {
                    UserAnnotation()

                    ForEach(viewModel.locations) { location in
                        Annotation(location.district, coordinate: location.coordinate) {
                            LocationMarker(type: location.type, isSelected: viewModel.selectedLocation?.id == location.id)
                        }
                        .tag(location)
                    }
                }
                .mapStyle(.standard(elevation: .realistic))
                .overlay(alignment: .bottom) {
                    if let selected = viewModel.selectedLocation {
                        LocationDetailCard(location: selected)
                            .padding()
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
            }
            .navigationTitle("İstanbul Kart")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadInitial() }
            .onChange(of: viewModel.selectedLocation) { _, newValue in
                guard let loc = newValue else { return }
                withAnimation {
                    cameraPosition = .region(
                        MKCoordinateRegion(
                            center: loc.coordinate,
                            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                        )
                    )
                }
            }
        }
    }

    private var filterBar: some View {
        VStack(spacing: 10) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Ara: ilçe, terminal...", text: $viewModel.searchText)
                    .textInputAutocapitalization(.never)
                    .submitLabel(.search)
                    .onSubmit { Task { await viewModel.loadLocations() } }
            }
            .padding(10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(viewModel.types, id: \.self) { type in
                        FilterChip(
                            title: type,
                            isSelected: viewModel.selectedTypes.contains(type)
                        ) {
                            viewModel.toggleType(type)
                        }
                    }
                }
            }

            HStack {
                Button("Filtrele") {
                    Task { await viewModel.loadLocations() }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color("AccentRed"))

                Button("Yakınım") {
                    viewModel.requestNearby()
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(.thinMaterial)
    }
}

private struct LocationMarker: View {
    let type: String
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(markerColor)
                .frame(width: isSelected ? 18 : 14, height: isSelected ? 18 : 14)
            Circle()
                .stroke(.white, lineWidth: 2)
                .frame(width: isSelected ? 18 : 14, height: isSelected ? 18 : 14)
        }
        .shadow(radius: 2)
    }

    private var markerColor: Color {
        switch type {
        case "Biletmatik": return .blue
        case "Biletmatik 4": return .purple
        case "Dolum Merkezi": return .orange
        default: return .green
        }
    }
}

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color("AccentRed") : Color(.systemGray6))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }
}

private extension LocationRecord {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

#Preview {
    MapTabView()
        .environmentObject(LocationViewModel())
}
