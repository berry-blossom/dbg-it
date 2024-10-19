type TOKENIZE_STATE = "WRITE" | "IN_QUOTE" | "FLUSH";

function isWhitespace(character: string) {
	// The %s pattern will match any whitespace, including new lines and tabs.
	// The brackets are to ensure it is only matching one character.
	const [spaced] = character.match("[%s]");
	return spaced !== undefined;
}

function isEscapeSequence(character: string) {
	const [escape] = character.match("[\\]");
	return escape !== undefined;
}

function isQuoteCharacter(character: string) {
	const [quote] = character.match('["]');
	const [squote] = character.match("[']");
	return quote !== undefined || squote !== undefined;
}

/**
 * @returns An array of strings which represent each token of the input string
 */
export function tokenize(str: string): string[] {
	// This approach I'm taking here completely different than the usual way you'd do things and I'd like to give my reasoning as to why.
	//
	// In Lua (and Luau), pattern matching strings has often felt incredibly esoteric.
	// Let's look at how Cmdr, another command library, handles splitting a string into it's tokens.
	// (https://github.com/evaera/Cmdr/blob/232064c4c407ee121b8212d88edbd31ed00f567b/Cmdr/Shared/Util.lua#L209)
	// A lot of this feels like "black magic"
	// Lots of magical strange things going on like: weird arguments to string.gsub that are never used,
	// serializing and deserializing new lines & quotes, and matching a string's utf8 character code...?
	// How is anyone besides the author supposed to understand and/or maintain code like this?
	//
	// This is not the fault of Cmdr or its authors. It's the fault of Lua's poor string manipulation support.
	// The approach I'm going for here, which is a simple state machine, hopefully should make it easier to maintain and iterate on.
	//
	// TLDR; Lua has poor string manipulation support. That's why.

	const result: string[] = [];

	let currentString = "";
	let state = "WRITE" as TOKENIZE_STATE;
	let escapeState = false;

	// Unsure if we need to be able to check the last grapheme or not.
	// I will leave functionality commented out for the future ^^

	// let lastGraphemeStart = 0;
	// let lastGraphemeEnd = 0;

	// const lastGrapheme = (): string | undefined => {
	// 	const grapheme = str.sub(lastGraphemeStart, lastGraphemeEnd);
	// 	return grapheme === "" ? undefined : grapheme;
	// };

	const flushToken = () => {
		if (currentString !== "") result.push(currentString);
		currentString = "";
		state = "WRITE";
	};

	for (const [graphemeStart, graphemeEnd] of utf8.graphemes(str)) {
		const prepareNextGrapheme = (grapheme: string | undefined = undefined) => {
			if (grapheme !== undefined) currentString += grapheme;
			// lastGraphemeStart = graphemeStart;
			// lastGraphemeEnd = graphemeEnd;
		};

		// Reached a new line or space, flush the current token and continue
		if (state === "FLUSH") flushToken();

		const currentCharacter = str.sub(graphemeStart, graphemeEnd);

		// If the current character is whitespace and we aren't inside of a quote, we can add a new token.
		if (isWhitespace(currentCharacter) && state !== "IN_QUOTE" && !escapeState) {
			state = "FLUSH";
			prepareNextGrapheme();
			continue;
		}

		// If the current character is a quote, which is not escaped...
		if (isQuoteCharacter(currentCharacter) && !escapeState) {
			// We are inside of a quote and have reached the end of it.
			if (state === "IN_QUOTE") flushToken();
			// We are outside of the quote and have reached the beginning of it.
			else state = "IN_QUOTE";
			prepareNextGrapheme();
			continue;
		}

		// If the current character begins an escape sequence...
		if (isEscapeSequence(currentCharacter)) {
			// Correctly handles stacked escape sequences e.g. \\ will include the token "\"
			escapeState = !escapeState;
			prepareNextGrapheme(!escapeState ? currentCharacter : "");
			continue;
		}

		escapeState = false;
		prepareNextGrapheme(currentCharacter);
	}

	flushToken();

	return result;
}

export class ReadOnlyTokenStream {
	protected cursor: number = 0;
	protected constructor(protected readonly _tokens: string[]) {}

	public next() {
		this.cursor++;
		return this;
	}

	public previous() {
		this.cursor--;
		return this;
	}

	public get() {
		return this.getPosition(this.cursor);
	}

	public getPosition(position: number) {
		return this._tokens[position];
	}

	public tokens(): ReadonlyArray<string> {
		return this._tokens;
	}

	public whereami() {
		return this.cursor;
	}

	public size() {
		return this._tokens.size();
	}

	public inRange() {
		print(this.cursor, this.size() - 1);
		// Subtract one to handle roblox-ts 0 index stuff
		return this.cursor <= this.size() - 1 && this.cursor >= 0;
	}

	public getAfter() {
		if (!this.inRange()) return "";
		const currentCursor = this.cursor;
		let str = "";
		while (this.inRange()) {
			str += this.get() ?? "";
			if (this.cursor + 1 <= this.size() - 1) str += " ";
			this.next();
			if (!this.inRange()) break;
		}
		this.cursor = currentCursor;
		return str;
	}

	public getBefore() {
		if (!this.inRange()) return "";
		const currentCursor = this.cursor;
		let str = "";
		while (this.inRange()) {
			str += this.get() ?? "";
			if (this.cursor - 1 >= 0) str += " ";
			this.previous();
			if (!this.inRange()) break;
		}
		this.cursor = currentCursor;
		return str;
	}

	public static create(str: string) {
		return new ReadOnlyTokenStream(tokenize(str));
	}
}

/**
 * Represents a stream of tokens from a string.
 */
export class TokenStream extends ReadOnlyTokenStream {
	protected constructor(protected readonly _tokens: string[]) {
		super(_tokens);
	}

	public write(str: string) {
		this._tokens[this.cursor] = str;
	}

	public static create(str: string) {
		return new TokenStream(tokenize(str));
	}
}
