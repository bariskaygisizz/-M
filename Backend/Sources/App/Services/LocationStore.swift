import Foundation
import Vapor

final class LocationStore: Sendable {
    private let dataset: LocationDataset?

    init() throws {
        let candidates = [
            Environment.get("LOCATIONS_FILE"),
            "./data/locations.json",
            "../data/locations.json",
            "../../data/locations.json"
        ].compactMap { $0 }

        var loaded: LocationDataset?
        for path in candidates {
            let url = URL(fileURLWithPath: path)
            if FileManager.default.fileExists(atPath: url.path),
               let data = try? Data(contentsOf: url) {
                loaded = try JSONDecoder().decode(LocationDataset.self, from: data)
                break
            }
        }
        dataset = loaded
    }

    var isLoaded: Bool { dataset != nil }

    func meta() throws -> MetaResponse {
        guard let dataset else {
            throw Abort(.serviceUnavailable, reason: "Veri yok")
        }

        let districts = Array(Set(dataset.locations.map(\.district)))
            .sorted { $0.localizedCompare($1) == .orderedAscending }
        let types = Array(Set(dataset.locations.map(\.type)))
            .sorted { $0.localizedCompare($1) == .orderedAscending }

        return MetaResponse(
            updatedAt: dataset.updatedAt,
            source: dataset.source,
            total: dataset.total,
            summary: dataset.summary,
            districts: districts,
            types: types
        )
    }

    func locations(query: LocationQuery) throws -> LocationsResponse {
        guard let dataset else {
            throw Abort(.serviceUnavailable, reason: "Konum verisi henüz yüklenmedi. Önce npm run sync-data çalıştırın.")
        }

        var results = dataset.locations

        if let type = query.type, !type.isEmpty {
            let types = Set(type.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) })
            results = results.filter { types.contains($0.type) }
        }

        if let district = query.district, !district.isEmpty {
            let needle = district.folding(options: .diacriticInsensitive, locale: Locale(identifier: "tr_TR")).lowercased()
            results = results.filter {
                $0.district.folding(options: .diacriticInsensitive, locale: Locale(identifier: "tr_TR")).lowercased().contains(needle)
            }
        }

        if let q = query.q, !q.isEmpty {
            let needle = q.folding(options: .diacriticInsensitive, locale: Locale(identifier: "tr_TR")).lowercased()
            results = results.filter { loc in
                let haystack = [loc.district, loc.address, loc.terminalId, loc.type]
                    .compactMap { $0 }
                    .joined(separator: " ")
                    .folding(options: .diacriticInsensitive, locale: Locale(identifier: "tr_TR"))
                    .lowercased()
                return haystack.contains(needle)
            }
        }

        let maxLimit = min(query.limit ?? 200, 1000)
        let radius = query.radiusKm ?? 2

        if let userLat = query.lat, let userLng = query.lng {
            results = results.map { loc in
                var copy = loc
                copy.distanceKm = haversineKm(lat1: userLat, lng1: userLng, lat2: loc.lat, lng2: loc.lng)
                return copy
            }
            .filter { $0.distanceKm ?? .infinity <= radius }
            .sorted { ($0.distanceKm ?? 0) < ($1.distanceKm ?? 0) }
        }

        return LocationsResponse(
            updatedAt: dataset.updatedAt,
            source: dataset.source,
            total: results.count,
            summary: dataset.summary,
            locations: Array(results.prefix(maxLimit))
        )
    }
}

private func haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
    let earthRadius = 6371.0
    let dLat = (lat2 - lat1) * .pi / 180
    let dLng = (lng2 - lng1) * .pi / 180
    let a = sin(dLat / 2) * sin(dLat / 2)
        + cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) * sin(dLng / 2) * sin(dLng / 2)
    return earthRadius * 2 * atan2(sqrt(a), sqrt(1 - a))
}
