import Foundation

/// Thin abstraction over URLSession so services can be tested without the network.
protocol HTTPClient: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HTTPClient {
    func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        try await data(for: request)
    }
}
