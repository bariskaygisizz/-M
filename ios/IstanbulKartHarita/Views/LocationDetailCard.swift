import SwiftUI

struct LocationDetailCard: View {
    let location: LocationRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(location.type)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color("AccentRed"))

            Text(location.district)
                .font(.title3.weight(.semibold))

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
                Label(String(format: "%.2f km uzaklıkta", distance), systemImage: "location.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Link(destination: mapsURL) {
                Label("Apple Haritalar'da Aç", systemImage: "map")
                    .font(.subheadline.weight(.semibold))
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var mapsURL: URL {
        URL(string: "http://maps.apple.com/?ll=\(location.lat),\(location.lng)&q=\(location.district.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
    }
}

#Preview {
    LocationDetailCard(
        location: LocationRecord(
            id: "1",
            terminalId: "301684",
            type: "Biletmatik",
            district: "Beyoğlu",
            address: nil,
            lat: 41.038878,
            lng: 28.961898,
            distanceKm: 0.8
        )
    )
    .padding()
}
