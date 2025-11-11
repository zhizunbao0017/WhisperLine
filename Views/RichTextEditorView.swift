import SwiftUI
import Combine
import UIKit
import UniformTypeIdentifiers

@available(iOS 18.0, *)
struct RichTextEditorView: UIViewRepresentable {
    @Binding var attributedTextData: Data?

    func makeUIView(context: Context) -> RichTextEditorUIView {
        let view = RichTextEditorUIView()
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ uiView: RichTextEditorUIView, context: Context) {
        uiView.update(with: attributedTextData)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, RichTextEditorUIViewDelegate {
        private let parent: RichTextEditorView

        init(parent: RichTextEditorView) {
            self.parent = parent
            super.init()
        }

        func richTextEditorView(_ editor: RichTextEditorUIView, didUpdateAttributedText attributedString: NSAttributedString) {
            parent.attributedTextData = try? NSKeyedArchiver.archivedData(withRootObject: attributedString, requiringSecureCoding: true)
        }
    }
}

// MARK: - UIView Implementation

@available(iOS 18.0, *)
protocol RichTextEditorUIViewDelegate: AnyObject {
    func richTextEditorView(_ editor: RichTextEditorUIView, didUpdateAttributedText attributedString: NSAttributedString)
}

@available(iOS 18.0, *)
final class RichTextEditorUIView: UIView {
    weak var delegate: RichTextEditorUIViewDelegate?

    private let textView: UITextView = {
        let tv = UITextView()
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.backgroundColor = .systemBackground
        tv.isEditable = true
        tv.isScrollEnabled = true
        tv.adjustsFontForContentSizeCategory = true
        tv.font = UIFont.preferredFont(forTextStyle: .body)
        tv.alwaysBounceVertical = true
        tv.textDragInteraction?.isEnabled = true
        tv.linkTextAttributes = [.foregroundColor: UIColor.systemBlue]
        return tv
    }()

    private lazy var toolbar: UIToolbar = {
        let tb = UIToolbar()
        tb.translatesAutoresizingMaskIntoConstraints = false
        tb.items = toolbarItems
        return tb
    }()

    private lazy var toolbarItems: [UIBarButtonItem] = {
        let flexible = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)

        return [
            makeToggleItem(symbol: "bold", action: #selector(toggleBold)),
            makeToggleItem(symbol: "italic", action: #selector(toggleItalic)),
            makeToggleItem(symbol: "underline", action: #selector(toggleUnderline)),
            flexible,
            makeAlignmentMenu(),
            flexible,
            UIBarButtonItem(barButtonSystemItem: .camera, target: self, action: #selector(insertImageTapped))
        ]
    }()

    private var cancellables = Set<AnyCancellable>()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = .systemBackground

        addSubview(toolbar)
        addSubview(textView)

        textView.delegate = self

        NSLayoutConstraint.activate([
            toolbar.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor),
            toolbar.leadingAnchor.constraint(equalTo: leadingAnchor),
            toolbar.trailingAnchor.constraint(equalTo: trailingAnchor),

            textView.topAnchor.constraint(equalTo: toolbar.bottomAnchor),
            textView.leadingAnchor.constraint(equalTo: safeAreaLayoutGuide.leadingAnchor, constant: 12),
            textView.trailingAnchor.constraint(equalTo: safeAreaLayoutGuide.trailingAnchor, constant: -12),
            textView.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor)
        ])

        textView.inputAccessoryView = toolbar
    }

    func update(with data: Data?) {
        guard let data else { return }
        if let attributed = try? NSKeyedUnarchiver.unarchivedObject(ofClasses: [NSAttributedString.self, NSTextAttachment.self], from: data) as? NSAttributedString {
            textView.attributedText = attributed
        }
    }

    private func selectedRangeAttributes() -> [NSAttributedString.Key: Any] {
        if textView.selectedRange.length == 0 {
            return textView.typingAttributes
        }
        let range = textView.selectedRange
        let attributedSubstring = textView.attributedText.attributedSubstring(from: range)
        var attributes = attributedSubstring.attributes(at: 0, effectiveRange: nil)
        attributes[.font] = attributes[.font] ?? textView.font ?? UIFont.preferredFont(forTextStyle: .body)
        return attributes
    }

    private func applyAttributes(_ attributes: [NSAttributedString.Key: Any]) {
        let range = textView.selectedRange
        if range.length > 0 {
            let mutable = NSMutableAttributedString(attributedString: textView.attributedText ?? NSAttributedString(string: ""))
            mutable.setAttributes(attributes, range: range)
            textView.attributedText = mutable
            textView.selectedRange = range
        } else {
            textView.typingAttributes = attributes
        }
        notifyChange()
    }

    private func makeToggleItem(symbol: String, action: Selector) -> UIBarButtonItem {
        let image = UIImage(systemName: symbol == "underline" ? "underline" : "textformat.\(symbol)")
        return UIBarButtonItem(image: image, style: .plain, target: self, action: action)
    }

    private func makeAlignmentMenu() -> UIBarButtonItem {
        let alignLeft = UIAction(title: "Left", image: UIImage(systemName: "text.alignleft")) { [weak self] _ in
            self?.setParagraphStyleAlignment(.left)
        }
        let alignCenter = UIAction(title: "Center", image: UIImage(systemName: "text.aligncenter")) { [weak self] _ in
            self?.setParagraphStyleAlignment(.center)
        }
        let alignRight = UIAction(title: "Right", image: UIImage(systemName: "text.alignright")) { [weak self] _ in
            self?.setParagraphStyleAlignment(.right)
        }
        let menu = UIMenu(title: "Alignment", children: [alignLeft, alignCenter, alignRight])
        return UIBarButtonItem(title: nil, image: UIImage(systemName: "text.alignleft"), primaryAction: nil, menu: menu)
    }

    private func setParagraphStyleAlignment(_ alignment: NSTextAlignment) {
        var attributes = selectedRangeAttributes()
        let paragraphStyle = (attributes[.paragraphStyle] as? NSMutableParagraphStyle) ?? {
            let style = NSMutableParagraphStyle()
            style.alignment = alignment
            return style
        }()
        paragraphStyle.alignment = alignment
        attributes[.paragraphStyle] = paragraphStyle
        applyAttributes(attributes)
    }

    @objc
    private func toggleBold() {
        toggleTrait(.traitBold)
    }

    @objc
    private func toggleItalic() {
        toggleTrait(.traitItalic)
    }

    @objc
    private func toggleUnderline() {
        var attributes = selectedRangeAttributes()
        let currentValue = (attributes[.underlineStyle] as? Int) ?? 0
        attributes[.underlineStyle] = currentValue == 0 ? NSUnderlineStyle.single.rawValue : 0
        applyAttributes(attributes)
    }

    private func toggleTrait(_ trait: UIFontDescriptor.SymbolicTraits) {
        var attributes = selectedRangeAttributes()
        let baseFont = (attributes[.font] as? UIFont) ?? textView.font ?? UIFont.preferredFont(forTextStyle: .body)
        var traits = baseFont.fontDescriptor.symbolicTraits

        if traits.contains(trait) {
            traits.remove(trait)
        } else {
            traits.insert(trait)
        }

        if let descriptor = baseFont.fontDescriptor.withSymbolicTraits(traits) {
            attributes[.font] = UIFont(descriptor: descriptor, size: baseFont.pointSize)
        } else {
            attributes[.font] = baseFont
        }
        applyAttributes(attributes)
    }

    @objc
    private func insertImageTapped() {
        guard let controller = findViewController() else { return }
        let picker = UIImagePickerController()
        picker.delegate = self
        picker.mediaTypes = [UTType.image.identifier]
        picker.allowsEditing = false
        controller.present(picker, animated: true)
    }

    private func insertImage(_ image: UIImage) {
        let attachment = NSTextAttachment()
        attachment.image = image
        let maxWidth = textView.bounds.width - textView.textContainer.lineFragmentPadding * 2
        let aspectRatio = image.size.width > 0 ? image.size.height / image.size.width : 1
        attachment.bounds = CGRect(x: 0, y: 0, width: maxWidth, height: maxWidth * aspectRatio)
        let attributedImage = NSAttributedString(attachment: attachment)

        let mutable = NSMutableAttributedString(attributedString: textView.attributedText)
        mutable.replaceCharacters(in: textView.selectedRange, with: attributedImage)
        textView.attributedText = mutable
        notifyChange()
    }

    private func notifyChange() {
        delegate?.richTextEditorView(self, didUpdateAttributedText: textView.attributedText)
    }

    private func findViewController() -> UIViewController? {
        sequence(first: self, next: { $0.next }).first(where: { $0 is UIViewController }) as? UIViewController
    }
}

@available(iOS 18.0, *)
extension RichTextEditorUIView: UITextViewDelegate {
    func textViewDidChange(_ textView: UITextView) {
        notifyChange()
    }
}

@available(iOS 18.0, *)
extension RichTextEditorUIView: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
    ) {
        picker.dismiss(animated: true)
        guard let image = info[.originalImage] as? UIImage else { return }
        insertImage(image)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

// MARK: - SwiftUI Preview

@available(iOS 18.0, *)
struct RichTextEditorView_Previews: PreviewProvider {
    struct PreviewContainer: View {
        @State private var data: Data? = {
            let attributedString = NSAttributedString(string: "Write something beautiful...",
                                                      attributes: [
                                                        .font: UIFont.preferredFont(forTextStyle: .body),
                                                        .foregroundColor: UIColor.label
                                                      ])
            return try? NSKeyedArchiver.archivedData(withRootObject: attributedString, requiringSecureCoding: true)
        }()

        var body: some View {
            RichTextEditorView(attributedTextData: $data)
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }

    static var previews: some View {
        PreviewContainer()
    }
}
