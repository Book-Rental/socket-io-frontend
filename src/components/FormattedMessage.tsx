interface FormattedMessageProps {
    text: string;
}

export default function FormattedMessage({
    text,
}: FormattedMessageProps) {
    const renderFormattedText = (text: string): React.ReactNode[] => {
        const result: React.ReactNode[] = [];

        let remaining = text;

        while (remaining.length > 0) {
            // Bold
            const boldMatch = remaining.match(/^\*([^*]+)\*/);

            if (boldMatch) {
                result.push(
                    <strong key={result.length}>
                        {renderFormattedText(boldMatch[1])}
                    </strong>
                );

                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }

            // Italic
            const italicMatch = remaining.match(/^_([^_]+)_/);

            if (italicMatch) {
                result.push(
                    <em key={result.length}>
                        {renderFormattedText(italicMatch[1])}
                    </em>
                );

                remaining = remaining.slice(italicMatch[0].length);
                continue;
            }

            // Strikethrough
            const strikeMatch = remaining.match(/^~([^~]+)~/);

            if (strikeMatch) {
                result.push(
                    <del key={result.length}>
                        {renderFormattedText(strikeMatch[1])}
                    </del>
                );

                remaining = remaining.slice(strikeMatch[0].length);
                continue;
            }

            // Normal text
            result.push(remaining[0]);
            remaining = remaining.slice(1);
        }

        return result;
    };

    return (
        <p className="break-words text-sm">
            {renderFormattedText(text)}
        </p>
    );
}
