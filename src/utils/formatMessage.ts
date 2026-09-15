export function htmlToFormattedText(html: string): string {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const convertNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent ?? "";
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        const element = node as HTMLElement;

        const content = Array.from(element.childNodes)
            .map(convertNode)
            .join("");

        switch (element.tagName.toLowerCase()) {
            case "strong":
            case "b":
                return `*${content}*`;

            case "em":
            case "i":
                return `_${content}_`;

            case "del":
            case "s":
            case "strike":
                return `~${content}~`;

            case "br":
                return "\n";

            default:
                return content;
        }
    };

    return Array.from(tempDiv.childNodes)
        .map(convertNode)
        .join("")
        .trim();
}