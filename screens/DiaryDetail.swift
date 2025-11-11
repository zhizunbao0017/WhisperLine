import SwiftUI

@available(iOS 18.0, *)
struct DiaryDetailView: View {
    @State private var attributedTextData: Data? = DiaryStorage.shared.load()
    @State private var reloadToken = UUID()

    var body: some View {
        NavigationStack {
            Group {
                if let data = attributedTextData {
                    RichTextDisplayView(data: data, reloadToken: reloadToken)
                        .padding()
                } else {
                    Text("No diary entry saved yet.")
                        .foregroundStyle(.secondary)
                        .padding()
                }
            }
            .navigationTitle("Diary Detail")
            .toolbarTitleDisplayMode(.inline)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color(uiColor: .systemBackground))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: reload) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("Reload entry")
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button("Load Test") {
                        loadTestEntry()
                    }
                }
            }
        }
        .onAppear {
            attributedTextData = DiaryStorage.shared.load()
        }
    }

    private func reload() {
        // Force-refresh data from storage and update the view.
        attributedTextData = DiaryStorage.shared.load()
        reloadToken = UUID()
    }

    private func loadTestEntry() {
        let sample = NSMutableAttributedString(string: "Test entry before image\n\n")

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 220, height: 140))
        let image = renderer.image { context in
            UIColor.systemIndigo.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 220, height: 140))
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 24),
                .foregroundColor: UIColor.white
            ]
            let text = "Test"
            let textSize = text.size(withAttributes: attributes)
            let rect = CGRect(x: (220 - textSize.width) / 2, y: (140 - textSize.height) / 2, width: textSize.width, height: textSize.height)
            text.draw(in: rect, withAttributes: attributes)
        }

        let attachment = NSTextAttachment()
        attachment.image = image
        attachment.contents = image.pngData()
        sample.append(NSAttributedString(attachment: attachment))
        sample.append(NSAttributedString(string: "\n\nAfter image text."))

        if let data = try? NSKeyedArchiver.archivedData(withRootObject: sample, requiringSecureCoding: true) {
            DiaryStorage.shared.save(data: data)
            attributedTextData = data
            reloadToken = UUID()
        }
    }
}

@available(iOS 18.0, *)
struct RichTextDisplayView: UIViewRepresentable {
    var data: Data
    var reloadToken: UUID

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.backgroundColor = .clear
        textView.isEditable = false
        textView.isScrollEnabled = true
        textView.adjustsFontForContentSizeCategory = true
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 0, bottom: 12, right: 0)
        textView.showsVerticalScrollIndicator = true
        context.coordinator.textView = textView
        return textView
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        // Attempt to decode archived NSAttributedString first.
        var htmlStringUsed: String?
        let attributedString: NSAttributedString?
        if let archived = try? NSKeyedUnarchiver.unarchivedObject(
            ofClasses: [NSAttributedString.self, NSTextAttachment.self, UIImage.self, UIColor.self, UIFont.self],
            from: data
        ) as? NSAttributedString {
            attributedString = archived
        } else if let htmlString = String(data: data, encoding: .utf8) {
            htmlStringUsed = htmlString
            attributedString = convertHTMLString(htmlString)
        } else {
            attributedString = nil
        }

        guard let attributedString else {
            uiView.text = ""
            context.coordinator.attributedText = nil
            return
        }

        let mutable = NSMutableAttributedString(attributedString: attributedString)
        let sources = htmlStringUsed.flatMap { extractImageSources(from: $0) } ?? []

        func adjustAttachments(for textView: UITextView) {
            // Fit attachments to the device screen width, respecting insets and padding.
            let screenWidth = UIScreen.main.bounds.width
            let maxWidth = screenWidth - 20
            guard maxWidth > 0 else { return }

            var sourceIndex = 0

            mutable.enumerateAttribute(.attachment, in: NSRange(location: 0, length: mutable.length)) { value, range, _ in
                guard let attachment = value as? NSTextAttachment else { return }

                var resolvedImage: UIImage? = attachment.image

                if resolvedImage == nil, let contents = attachment.contents {
                    resolvedImage = UIImage(data: contents)
                }

                if resolvedImage == nil, let data = attachment.fileWrapper?.regularFileContents {
                    resolvedImage = UIImage(data: data)
                }

                if resolvedImage == nil,
                   let path = attachment.userInfo?["localFileURL"] as? String,
                   FileManager.default.fileExists(atPath: path) {
                    resolvedImage = UIImage(contentsOfFile: path)
                }

                if resolvedImage == nil, sourceIndex < sources.count {
                    let src = sources[sourceIndex]
                    resolvedImage = loadImage(from: src)
                    sourceIndex += 1
                } else {
                    sourceIndex += 1
                }

                guard let image = resolvedImage else {
                    print("Attachment at range", range, "has no image data")
                    return
                }

                attachment.image = image
                attachment.contents = image.pngData() ?? attachment.contents

                let aspectRatio = image.size.width > 0 ? image.size.height / image.size.width : 1
                attachment.bounds = CGRect(x: 0, y: 0, width: maxWidth, height: maxWidth * aspectRatio)
                print("Attachment resolved: imageData=\(attachment.contents != nil) bounds=", attachment.bounds)
            }
        }

        adjustAttachments(for: uiView)
        context.coordinator.attributedText = mutable

        // Second pass after layout to ensure attachments respect final bounds.
        DispatchQueue.main.async {
            adjustAttachments(for: uiView)
            context.coordinator.attributedText = mutable
            uiView.invalidateIntrinsicContentSize()
            uiView.layoutIfNeeded()
            uiView.setNeedsDisplay()
        }
    }

    final class Coordinator {
        weak var textView: UITextView?
        var attributedText: NSAttributedString? {
            didSet {
                guard let textView, let attributedText else { return }
                textView.attributedText = attributedText
                textView.setNeedsDisplay()
            }
        }
    }

    private func convertHTMLString(_ html: String) -> NSAttributedString? {
        guard let data = html.data(using: .utf8) else { return nil }
        return try? NSAttributedString(
            data: data,
            options: [
                .documentType: NSAttributedString.DocumentType.html,
                .characterEncoding: String.Encoding.utf8.rawValue
            ],
            documentAttributes: nil
        )
    }

    private func extractImageSources(from html: String) -> [String] {
        guard let regex = try? NSRegularExpression(pattern: "<img[^>]*src=[\"']([^\"']+)[\"'][^>]*>", options: .caseInsensitive) else {
            return []
        }
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        return regex.matches(in: html, options: [], range: range).compactMap { match in
            guard match.numberOfRanges > 1, let range = Range(match.range(at: 1), in: html) else { return nil }
            return String(html[range])
        }
    }

    private func loadImage(from source: String) -> UIImage? {
        if source.hasPrefix("data:image") {
            if let dataRange = source.range(of: ",") {
                let base64String = String(source[dataRange.upperBound...])
                if let data = Data(base64Encoded: base64String) {
                    return UIImage(data: data)
                }
            }
        }

        let cleanedSource: String
        if source.hasPrefix("file://") {
            cleanedSource = String(source.dropFirst("file://".count))
        } else {
            cleanedSource = source
        }

        if FileManager.default.fileExists(atPath: cleanedSource) {
            return UIImage(contentsOfFile: cleanedSource)
        }

        if let url = URL(string: source), url.isFileURL {
            return UIImage(contentsOfFile: url.path)
        }

        print("Unable to load image from source:", source)
        return nil
    }
}

#if DEBUG
@available(iOS 18.0, *)
struct DiaryDetailView_Previews: PreviewProvider {
    static var previews: some View {
        // Build a sample attributed string with a test image attachment.
        let sample = NSMutableAttributedString(string: "Sample diary entry before image\n\n")
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 200, height: 120))
        let image = renderer.image { context in
            UIColor.systemTeal.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 200, height: 120))
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 22),
                .foregroundColor: UIColor.white
            ]
            let text = "Test Image"
            let textSize = text.size(withAttributes: attributes)
            let rect = CGRect(
                x: (200 - textSize.width) / 2,
                y: (120 - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )
            text.draw(in: rect, withAttributes: attributes)
        }
        let attachment = NSTextAttachment()
        attachment.image = image
        sample.append(NSAttributedString(attachment: attachment))
        sample.append(NSAttributedString(string: "\n\nAfter image text."))

        let data = try? NSKeyedArchiver.archivedData(withRootObject: sample, requiringSecureCoding: true)

        return DiaryDetailView()
            .task {
                DiaryStorage.shared.save(data: data)
            }
    }
}
#endif

