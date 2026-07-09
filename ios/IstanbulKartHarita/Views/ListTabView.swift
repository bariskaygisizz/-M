import SwiftUI

struct ListTabView: View {
    @EnvironmentObject private var viewModel: LocationViewModel

    var body: some View {
        NavigationStack {
            List(viewModel.locations) { location in
                Button {
                    viewModel.selectedLocation = location
                } label: {
                    LocationRowView(location: location)
                }
                .buttonStyle(.plain)
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                }
            }
            .navigationTitle("Noktalar")
            .searchable(text: $viewModel.searchText, prompt: "İlçe veya terminal ara")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Yenile") {
                        Task { await viewModel.loadLocations() }
                    }
                }
            }
            .task { await viewModel.loadInitial() }
        }
    }
}

struct LocationRowView: View {
    let location: LocationRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(location.type)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color("AccentRed"))

            Text(location.district)
                .font(.headline)

            if let address = location.address {
                Text(address)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let terminalId = location.terminalId {
                Text("Terminal: \(terminalId)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let distance = location.distanceKm {
                Text(String(format: "%.2f km", distance))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    ListTabView()
        .environmentObject(LocationViewModel())
}
