import SwiftUI
import RichTextKit
import UniformTypeIdentifiers
import UIKit

struct DiaryRichEditor: View {
    @Binding var attributedText: NSAttributedString
    @StateObject private var context = RichTextContext()
    @State private var isShowingImagePicker = false

    var body: some View {
        VStack(spacing: 0) {
            RichTextEditor(text: $attributedText, context: context)
                .richTextStyle(
                    .default,
                    font: UIFont.preferredFont(forTextStyle: .body)
                )
                .background(Color(uiColor: .systemBackground))

            Divider()

            toolbar
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color(uiColor: .secondarySystemBackground))
        }
        .sheet(isPresented: $isShowingImagePicker) {
            ImagePicker { image in
                insertImage(image)
            }
        }
    }

    private var toolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                RichTextStyleToggleButton(style: .bold, context: context)
                RichTextStyleToggleButton(style: .italic, context: context)
                RichTextStyleToggleButton(style: .underline, context: context)

                Divider().frame(height: 24)

                RichTextAlignmentButton(alignment: .left, context: context)
                RichTextAlignmentButton(alignment: .center, context: context)
                RichTextAlignmentButton(alignment: .right, context: context)

                Divider().frame(height: 24)

                RichTextFontColorPicker(context: context)

                Divider().frame(height: 24)

                Button(action: { isShowingImagePicker = true }) {
                    Image(systemName: "photo")
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func insertImage(_ image: UIImage) {
        guard let attachment = RichTextAttachment(image: image) else { return }
        context.insertAttachment(attachment)
    }
}

private struct ImagePicker: UIViewControllerRepresentable {
    let onImagePicked: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.mediaTypes = [UTType.image.identifier]
        picker.allowsEditing = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImagePicked: onImagePicked)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        private let onImagePicked: (UIImage) -> Void

        init(onImagePicked: @escaping (UIImage) -> Void) {
            self.onImagePicked = onImagePicked
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            picker.dismiss(animated: true)
            if let image = info[.originalImage] as? UIImage {
                onImagePicked(image)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }
}

struct DiaryRichEditor_Previews: PreviewProvider {
    static var previews: some View {
        DiaryRichEditor(attributedText: .constant(NSAttributedString(string: "Sample diary entry")))
            .padding()
            .previewLayout(.sizeThatFits)
    }
}

