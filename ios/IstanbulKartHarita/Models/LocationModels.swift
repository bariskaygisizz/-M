import Foundation

struct LocationRecord: Codable, Identifiable, Hashable {
    let id: String
    let terminalId: String?
    let type: String
    let district: String
    let address: String?
    let lat: Double
    let lng: Double
    var distanceKm: Double?
}

struct LocationsResponse: Codable {
    let updatedAt: String
    let source: String
    let total: Int
    let summary: [String: Int]
    let locations: [LocationRecord]
}

struct MetaResponse: Codable {
    let updatedAt: String
    let source: String
    let total: Int
    let summary: [String: Int]
    let districts: [String]
    let types: [String]
}

enum LocationType: String, CaseIterable {
    case biletmatik = "Biletmatik"
    case biletmatik4 = "Biletmatik 4"
    case bayi = "Bayi / Dolum Noktası"
    case dolum = "Dolum Merkezi"

    var colorName: String {
        switch self {
        case .biletmatik: return "BiletmatikBlue"
        case .biletmatik4: return "BiletmatikPurple"
        case .bayi: return "BayiGreen"
        case .dolum: return "DolumOrange"
        }
    }
}
