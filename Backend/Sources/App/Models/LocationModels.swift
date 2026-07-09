import Vapor

struct LocationRecord: Content, Codable, Sendable {
    let id: String
    let terminalId: String?
    let type: String
    let district: String
    let address: String?
    let lat: Double
    let lng: Double
    var distanceKm: Double?
}

struct LocationDataset: Codable, Sendable {
    let updatedAt: String
    let source: String
    let total: Int
    let summary: [String: Int]
    let locations: [LocationRecord]
}

struct LocationsResponse: Content, Sendable {
    let updatedAt: String
    let source: String
    let total: Int
    let summary: [String: Int]
    let locations: [LocationRecord]
}

struct MetaResponse: Content, Sendable {
    let updatedAt: String
    let source: String
    let total: Int
    let summary: [String: Int]
    let districts: [String]
    let types: [String]
}

struct HealthResponse: Content, Sendable {
    let ok: Bool
    let service: String
}

struct ConfigResponse: Content, Sendable {
    let mapKitJSTokenConfigured: Bool
    let mapKitJSKey: String?
}

struct ErrorResponse: Content, Sendable {
    let error: String
}

struct LocationQuery: Content, Sendable {
    var type: String?
    var district: String?
    var q: String?
    var lat: Double?
    var lng: Double?
    var radiusKm: Double?
    var limit: Int?
}
