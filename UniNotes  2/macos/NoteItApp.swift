import AppKit
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 920),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Note'it"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.minSize = NSSize(width: 980, height: 650)
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)

        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        loadApplication()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(
        _ sender: NSApplication,
        hasVisibleWindows flag: Bool
    ) -> Bool {
        if !flag {
            window.makeKeyAndOrderFront(nil)
        }
        return true
    }

    private func loadApplication() {
        guard let resourceURL = Bundle.main.resourceURL else {
            showLaunchError("Appens ressource-mappe kunne ikke findes.")
            return
        }

        let indexURL = resourceURL.appendingPathComponent("index.html")
        guard FileManager.default.fileExists(atPath: indexURL.path) else {
            showLaunchError("index.html mangler i appen.")
            return
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: resourceURL)
    }

    private func showLaunchError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Note'it kunne ikke åbnes"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
        NSApp.terminate(nil)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.isFileURL || url.scheme == "about" || url.scheme == "blob" {
            decisionHandler(.allow)
            return
        }

        if navigationAction.navigationType == .linkActivated {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = "Note'it"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = "Note'it"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Annuller")
        alert.beginSheetModal(for: window) { response in
            completionHandler(response == .alertFirstButtonReturn)
        }
    }
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.run()
