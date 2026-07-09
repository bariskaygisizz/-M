import Vapor

func routes(_ app: Application) throws {
    app.get("api", "health") { _ -> HealthResponse in
        HealthResponse(ok: true, service: "istanbul-kart-harita-vapor")
    }

    app.get("api", "config") { _ -> ConfigResponse in
        let token = Environment.get("MAPKIT_JS_TOKEN")
        return ConfigResponse(
            mapKitJSTokenConfigured: token != nil && !(token?.isEmpty ?? true),
            mapKitJSKey: token
        )
    }

    app.get("api", "meta") { req async throws -> MetaResponse in
        try req.application.locationStore.meta()
    }

    app.get("api", "locations") { req async throws -> LocationsResponse in
        let query = try req.query.decode(LocationQuery.self)
        return try req.application.locationStore.locations(query: query)
    }

    app.get { req async throws -> Response in
        try await req.fileio.asyncStreamFile(at: req.application.directory.publicDirectory + "index.html")
    }
}
