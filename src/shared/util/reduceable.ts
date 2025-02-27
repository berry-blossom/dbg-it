import linked_list from "@rbxts/berry-linked-list";

export type ReducerFunc<T extends defined> = (current: T, glob: T) => T | undefined | void;

export class Reduceable<T extends defined> {
	protected readonly _reducers: linked_list<ReducerFunc<T>> = new linked_list();
	public constructor(protected readonly _default: T) {}

	public attach(reducer: ReducerFunc<T>): () => void {
		return this._reducers.add(reducer);
	}

	public reduce(): T {
		let v = this._default;
		this._reducers.forEach((reducer) => {
			v = reducer(v, this._default) ?? v;
		});
		return v;
	}

	public collect(): linked_list<T> {
		const ll = new linked_list<T>();
		this._reducers.forEach((reducer) => {
			const v = reducer(this._default, this._default);
			if (v !== undefined) ll.add(v!);
		});
		return ll;
	}

	public destroy() {
		this._reducers.clear();
	}
}
