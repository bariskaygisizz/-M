import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case requestFailed
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Geçersiz API adresi"
        case .requestFailed: return "Sunucuya bağlanılamadı"
        case .decodingFailed: return "Veri çözümlenemedi"
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    var baseURL: URL {
        if let override = UserDefaults.standard.string(forKey: "apiBaseURL"),
           let url = URL(string: override) {
            return url
        }
        #if targetEnvironment(simulator)
        return URL(string: "http://localhost:8080/api")!
        #else
        return URL(string: "https://your-server.example.com/api")!
        #endif
    }

    func fetchMeta() async throws -> MetaResponse {
        try await get(path: "meta", query: [:])
    }

    func fetchLocations(
        types: [String],
        query: String,
        district: String,
        userCoordinate: (lat: Double, lng: Double)?,
        nearbyOnly: Bool
    ) async throws -> LocationsResponse {
        var items: [URLQueryItem] = []
        if !types.isEmpty {
            items.append(URLQueryItem(name: "type", value: types.joined(separator: ",")))
        }
        if !query.isEmpty {
            items.append(URLQueryItem(name: "q", value: query))
        }
        if !district.isEmpty {
            items.append(URLQueryItem(name: "district", value: district))
        }
        if let coord = userCoordinate, nearbyOnly {
            items.append(URLQueryItem(name: "lat", value: String(coord.lat)))
            items.append(URLQueryItem(name: "lng", value: String(coord.lng)))
            items.append(URLQueryItem(name: "radiusKm", value: "3"))
            items.append(URLQueryItem(name: "limit", value: "300"))
        } else {
            items.append(URLQueryItem(name: "limit", value: "500"))
        }
        return try await get(path: "locations", query: items)
    }

    private func get<T: Decodable>(path: String, query: [URLQueryItem]) async throws -> T {
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }
        if !query.isEmpty {
            components.queryItems = query
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.requestFailed
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed
        }
    }
}
