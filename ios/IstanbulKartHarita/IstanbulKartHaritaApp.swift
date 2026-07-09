import SwiftUI

@main
struct IstanbulKartHaritaApp: App {
    @StateObject private var viewModel = LocationViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
