// TODO: Allow user to meaningfully extend this system somehow.

import { ReplicatedStorage, RunService } from "@rbxts/services";

export enum BOUNDARY {
	S2C, // Server to Client
	C2S, // Client to Server
}

export interface RemoteDef<T extends BOUNDARY> {
	name: string;
	boundary: T;
}

export interface RemoteLoaded<T extends BOUNDARY> {
	loaded: boolean;
	instance?: RemoteEvent;
	name: string;
	boundary: T;
}

export type DefRemotes = { [i: string]: RemoteDef<BOUNDARY> | DefRemotes };

export type LoadedRemotes<T extends DefRemotes> = {
	[K in keyof T]: T[K] extends RemoteDef<infer B>
		? B extends BOUNDARY
			? RemoteLoaded<B>
			: RemoteLoaded<BOUNDARY>
		: T[K] extends DefRemotes
			? LoadedRemotes<T[K]>
			: undefined;
};

// Helper builder function, so we dont have to type table definitions every time.
export function remote<T extends BOUNDARY>(name: string, boundary: T): RemoteDef<T> {
	return {
		name,
		boundary,
	};
}

export class RemotesLoader<T extends DefRemotes> {
	protected loadedRemotes: LoadedRemotes<T>;
	protected constructor(
		protected readonly sharedReplFolder: Folder,
		protected readonly definition: T,
	) {
		this.loadedRemotes = this.reloadRemotesState();
		// TODO There being no way to disconnect these is probably bad.
		// For now I think it's okay, but in the future we may want to be able to have a cleanup state
		// In case theres some kind of use-case for that.
		// If you have a case to be made for this please make a PR :)
		if (RunService.IsClient()) {
			this.sharedReplFolder.DescendantAdded.Connect(() => (this.loadedRemotes = this.reloadRemotesState()));
			this.sharedReplFolder.DescendantRemoving.Connect(() => (this.loadedRemotes = this.reloadRemotesState()));
		}
	}

	protected reloadRemotesState(): LoadedRemotes<T> {
		// This function will recursively transform RemoteDefs into RemoteLoaded and DefRemotes into LoadedRemotes
		function recursiveLoad(
			v: RemoteDef<BOUNDARY> | DefRemotes,
			k: string,
			parent: Folder,
		): RemoteLoaded<BOUNDARY> | LoadedRemotes<DefRemotes> {
			let res: RemoteLoaded<BOUNDARY> | LoadedRemotes<DefRemotes> = undefined!;
			// Ugly check for if this is a remotedef, oh well
			if (
				v.name !== undefined &&
				v.boundary !== undefined &&
				typeIs(v.name, "string") &&
				typeIs(v.boundary, "number")
			) {
				let remote = parent.FindFirstChild(v.name);
				if (!RunService.IsClient() && remote === undefined) {
					remote = new Instance("RemoteEvent");
					remote.Name = v.name;
					remote.Parent = parent;
				}
				res = {
					loaded: remote !== undefined,
					instance: remote,
					name: v.name,
					boundary: v.boundary,
				} as RemoteLoaded<BOUNDARY>;
			} else {
				// This is a folder, recurse properly
				let parentFolder = parent.FindFirstChild(k)! as Folder;
				if (parentFolder === undefined) {
					parentFolder = new Instance("Folder");
					parentFolder.Name = k;
					parentFolder.Parent = parent;
				}
				// Create remotes recursively for this folder
				// I don't like how this is basically the same code as below
				// Maybe we should put this into a function?
				// For now, it's fine to inline.
				const recursive = {} as Record<string, RemoteLoaded<BOUNDARY> | LoadedRemotes<DefRemotes>>;
				for (const [kC, vC] of pairs(v as DefRemotes))
					recursive[kC as string] = recursiveLoad(vC as defined, kC as string, parentFolder);
				res = recursive as never;
			}
			return res;
		}
		const state = {} as Record<string, RemoteLoaded<BOUNDARY> | LoadedRemotes<DefRemotes>>;
		for (const [k, v] of pairs(this.definition)) {
			state[k as string] = recursiveLoad(v, k as string, this.sharedReplFolder);
		}
		return state as never;
	}

	public remotes() {
		return this.loadedRemotes;
	}

	public static async load<T extends DefRemotes>(remotes: T) {
		// This will only yield if the client is loading dbg-it from replicated first.
		// Which, um why would you do that? Please don't do that.
		let sharedRemotes: Folder = undefined!;
		if (RunService.IsClient()) sharedRemotes = ReplicatedStorage.WaitForChild("DBGIT!-REPL")! as Folder;
		if (sharedRemotes === undefined) {
			sharedRemotes = new Instance("Folder");
			sharedRemotes.Name = "DBGIT!-REPL";
			sharedRemotes.Parent = ReplicatedStorage;
		}
		return new RemotesLoader(sharedRemotes, remotes);
	}
}
