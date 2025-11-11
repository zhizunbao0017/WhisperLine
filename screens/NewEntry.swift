import SwiftUI

@available(iOS 18.0, *)
struct NewEntryView: View {
    @State private var attributedTextData: Data? = DiaryStorage.shared.load()
    @State private var showSavedToast = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                RichTextEditorView(attributedTextData: $attributedTextData)
                    .ignoresSafeArea(.keyboard, edges: .bottom)

                Button(action: saveEntry) {
                    Text("Save Entry")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundStyle(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .padding(.horizontal)
                        .padding(.vertical)
                }
            }
            .navigationTitle("New Diary Entry")
            .toolbarTitleDisplayMode(.inline)
            .toast(isPresented: $showSavedToast) {
                Text("Saved!")
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
            }
        }
    }

    private func saveEntry() {
        guard var data = attributedTextData else {
            print("Save skipped: no rich text data available")
            DiaryStorage.shared.save(data: nil)
            return
        }

        if let attributed = decodeAttributedString(from: data) {
            let mutable = NSMutableAttributedString(attributedString: attributed)
            let attachmentsPersisted = persistAttachments(in: mutable)

            print("Saving entry: \(attachmentsPersisted) attachment(s) processed")

            if let reencoded = archiveAttributedString(mutable) {
                data = reencoded
                attributedTextData = data
            }
        } else {
            print("Warning: Unable to decode attributed string before saving")
        }

        DiaryStorage.shared.save(data: data)
        showSavedToast = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showSavedToast = false
        }
    }

    private func decodeAttributedString(from data: Data) -> NSAttributedString? {
        try? NSKeyedUnarchiver.unarchivedObject(
            ofClasses: [NSAttributedString.self, NSTextAttachment.self, UIImage.self, UIColor.self, UIFont.self, NSDictionary.self, NSString.self],
            from: data
        ) as? NSAttributedString
    }

    private func archiveAttributedString(_ attributed: NSAttributedString) -> Data? {
        try? NSKeyedArchiver.archivedData(withRootObject: attributed, requiringSecureCoding: true)
    }

    private func persistAttachments(in attributed: NSMutableAttributedString) -> Int {
        let fileManager = FileManager.default
        let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("DiaryImages", isDirectory: true)

        if !fileManager.fileExists(atPath: directory.path) {
            do {
                try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
            } catch {
                print("Failed to create DiaryImages directory:", error)
            }
        }

        var count = 0

        attributed.enumerateAttribute(.attachment, in: NSRange(location: 0, length: attributed.length)) { value, _, _ in
            guard let attachment = value as? NSTextAttachment else { return }
            count += 1

            let hasInlineImage = attachment.image != nil
            let hasContents = attachment.contents != nil
            let hasWrapperData = attachment.fileWrapper?.regularFileContents != nil
            print("Attachment initial state - image:\(hasInlineImage) contents:\(hasContents) wrapper:\(hasWrapperData)")

            let existingInfo = attachment.userInfo?["localFileURL"] as? String
            if let path = existingInfo, fileManager.fileExists(atPath: path) {
                print("Attachment already persisted at:", path)
                if attachment.contents == nil, let data = try? Data(contentsOf: URL(fileURLWithPath: path)) {
                    attachment.contents = data
                }
                return
            }

            guard let image = attachment.image ?? attachment.contents.flatMap({ UIImage(data: $0) }) ?? attachment.fileWrapper?.regularFileContents.flatMap({ UIImage(data: $0) }) else {
                print("Attachment missing image data")
                return
            }

            guard let imageData = image.pngData() ?? image.jpegData(compressionQuality: 0.9) else {
                print("Failed to encode attachment image")
                return
            }

            let filename = "diary_image_\(UUID().uuidString).png"
            let fileURL = directory.appendingPathComponent(filename)

            do {
                try imageData.write(to: fileURL, options: .atomic)
                let wrapper = FileWrapper(regularFileWithContents: imageData)
                wrapper.preferredFilename = filename
                attachment.fileWrapper = wrapper
                attachment.contents = imageData

                var info = attachment.userInfo ?? [:]
                info["localFileURL"] = fileURL.path
                attachment.userInfo = info

                print("Attachment persisted to:", fileURL.path)
            } catch {
                print("Failed to persist attachment image:", error)
            }
        }

        return count
    }
}

