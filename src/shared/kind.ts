import { t } from "@rbxts/t";

export type KindType<T extends Kind<defined> | undefined> = T extends Kind<infer K> ? K : undefined;
export type Kindize<T extends defined[]> = { [K in keyof T]: Kind<T[K]> };

export abstract class Kind<T extends defined> {
	/**
	 * Handles transforming user input into a type and type safety.
	 * @param label Name of this Kind, to be displayed to a user. Usually just the name of the type you represent.
	 */
	protected constructor(public readonly label: string) {}
	/**
	 * Transforms any input string into whatever type this Kind represents
	 *
	 * @param data **Any string input the user passes through**, validate this input!
	 */
	public abstract transform(data: string): T | undefined;
	/**
	 * Type check for the parameter `data`, to ensure it is the same type of the type this Kind represents.
	 *
	 * ## Failure to type check properly will break type saftey!
	 *
	 * @param data Unknown user input
	 */
	public abstract verify(data: unknown): data is T;
	/**
	 * Returns an array of strings that are used for suggestions in autocompletion for this Kind.
	 * An empty array means that no suggestions in autocompletion are desired.
	 */
	public abstract suggestions(): string[];
}

export abstract class tKind<T extends defined> extends Kind<T> {
	protected constructor(
		public readonly label: string,
		protected readonly check: t.check<T>,
	) {
		super(label);
	}
	public verify(data: unknown): data is T {
		return this.check(data);
	}
	public abstract suggestions(): string[];
}
