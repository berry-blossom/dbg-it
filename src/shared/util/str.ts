const START_QUOTE_PATTERN = `^(['"])`;
const END_QUOTE_PATTERN = `(['"])$`;
const ESCAPE_PATTERN = `(\\*)['"]$`;

export function splitString(text: string, separator: string, max = math.huge): string[] {
	function charCode(n: string) {
		return utf8.char(tonumber(n, 16) as number);
	}

	function parseEscapeSequences(text: string): string {
		return text
			.gsub("\\(.)", {
				t: "\t",
				n: "\n",
			})[0]
			.gsub("\\u(%x%x%x%x)", charCode)[0]
			.gsub("\\x(%x%x)", charCode)[0];
	}

	function encodeControlChars(text: string) {
		return text
			.gsub("\\\\", "___!ESCAPE!___")[0]
			.gsub('\\"', "___!QUOTE!___")[0]
			.gsub("\\'", "___!SQUOTE!___")[0]
			.gsub("\\\n", "___!NL!___")[0];
	}

	function decodeControlChars(text: string) {
		return text.gsub("___!ESCAPE!___", "\\")[0].gsub("___!QUOTE!___", '"')[0].gsub("___!NL!___", "\n")[0];
	}

	const resultText = encodeControlChars(text);
	const t: string[] = [];

	let buf: string | undefined;
	let quoted: string | undefined;
	for (let [str] of resultText.gmatch(`[^${separator}]+`)) {
		str = parseEscapeSequences(str as string);

		const startQuote = str.match(START_QUOTE_PATTERN)[0] as string;
		const endQuote = str.match(END_QUOTE_PATTERN)[0] as string;
		const escaped = str.match(ESCAPE_PATTERN)[0] as string;

		if (startQuote !== undefined && quoted === undefined && endQuote === undefined) {
			[buf, quoted] = [str, startQuote];
		} else if (buf !== undefined && endQuote === quoted && escaped.size() % 2 === 0) {
			[str, buf, quoted] = [`${buf}${separator}${str}`, undefined, undefined];
		} else if (buf !== undefined) {
			buf = `${buf}${separator}${str}`;
		}

		if (buf !== undefined) {
			continue;
		}

		const result = decodeControlChars(str.gsub(START_QUOTE_PATTERN, "")[0].gsub(END_QUOTE_PATTERN, "")[0]);
		if (t.size() > max) {
			t[t.size() - 1] = result;
		} else {
			t.push(result);
		}
	}

	if (buf !== undefined) {
		if (t.size() > max) {
			t[t.size() - 1] = decodeControlChars(buf);
		} else {
			t.push(decodeControlChars(buf));
		}
	}

	return t;
}
