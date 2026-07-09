import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            MapTabView()
                .tabItem {
                    Label("Harita", systemImage: "map.fill")
                }

            ListTabView()
                .tabItem {
                    Label("Liste", systemImage: "list.bullet")
                }
        }
        .tint(Color("AccentRed"))
    }
}

#Preview {
    ContentView()
        .environmentObject(LocationViewModel())
}
