import Vapor

func configure(_ app: Application) async throws {
    let store = try LocationStore()
    app.storage[LocationStoreKey.self] = store

    let fileMiddleware = FileMiddleware(publicDirectory: app.directory.publicDirectory)
    app.middleware.use(fileMiddleware)
    app.middleware.use(ErrorMiddleware.default(environment: app.environment))

    try routes(app)
}

struct LocationStoreKey: StorageKey {
    typealias Value = LocationStore
}

extension Application {
    var locationStore: LocationStore {
        guard let store = storage[LocationStoreKey.self] else {
            fatalError("LocationStore not configured")
        }
        return store
    }
}
